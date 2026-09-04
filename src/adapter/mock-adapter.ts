/**
 * MockAdapter — deterministic {@link AgentAdapter} implementation for tests.
 *
 * The MockAdapter replaces the real Kiro host so the pure controller/state core
 * can be exercised deterministically by unit and property-based tests. It has
 * two responsibilities:
 *
 *  1. Record every {@link AgentAdapter.startTurn} invocation (agent, monotonic
 *     count, and the full request) so tests can assert routing (Req 5.1/5.2)
 *     and single-invocation (Req 2.2) properties.
 *
 *  2. Emit an arbitrary, test-scripted, ordered sequence of
 *     {@link AgentStreamEvent}s for each turn. Emission is driven *explicitly*
 *     by the test (via {@link ScriptedTurn.emitNext} / {@link ScriptedTurn.emitAll}
 *     or the adapter-level {@link MockAdapter.emitNext}) rather than by real
 *     timers, so tests using a fake clock stay fully deterministic. Leaving a
 *     turn's script partially (or wholly) un-emitted, with no terminal
 *     `completed`/`failed` event, simulates a stall.
 *
 * This module deliberately has no dependency on real timers, `setTimeout`, or
 * any VS Code / host runtime. See design.md "MockAdapter (tests)".
 */

import type { AgentId } from "../core/types";
import type {
  AgentAdapter,
  AgentStreamEvent,
  StartTurnRequest,
  TurnHandle,
} from "./agent-adapter";

/**
 * A record of a single {@link AgentAdapter.startTurn} call, captured so tests
 * can assert which agent was invoked, in what order, and with what request.
 */
export interface StartTurnInvocation {
  /** 1-based invocation order across the whole adapter. */
  count: number;
  /** The agent the turn was routed to. */
  agent: AgentId;
  /** The full request passed to {@link AgentAdapter.startTurn}. */
  request: StartTurnRequest;
  /** The turnId assigned to this turn's handle. */
  turnId: string;
}

/**
 * Configuration controlling {@link MockAdapter.isAvailable}. Availability can be
 * set globally and/or overridden per agent. A per-agent override takes
 * precedence over the global default.
 */
export interface AvailabilityConfig {
  /** Default availability applied when no per-agent override is present. */
  default?: boolean;
  /** Per-agent overrides keyed by {@link AgentId}. */
  perAgent?: Partial<Record<AgentId, boolean>>;
}

export interface MockAdapterOptions {
  /**
   * Initial availability configuration. Defaults to available (`true`) for all
   * agents when omitted.
   */
  availability?: AvailabilityConfig;
}

/**
 * Handle to one scripted turn produced by {@link MockAdapter.startTurn}.
 *
 * Holds the ordered script of remaining events and drives explicit emission.
 * Tests call {@link emitNext}/{@link emitAll} to push events into the
 * controller's `onEvent` callback deterministically.
 */
export class ScriptedTurn {
  /** Events not yet emitted, in emission order. */
  private readonly pending: AgentStreamEvent[] = [];
  private cancelled = false;
  private terminated = false;

  constructor(
    readonly turnId: string,
    readonly agent: AgentId,
    private readonly onEvent: (e: AgentStreamEvent) => void,
  ) {}

  /** Whether this turn's {@link TurnHandle.cancel} has been called. */
  get isCancelled(): boolean {
    return this.cancelled;
  }

  /** Whether a terminal (`completed`/`failed`) event has been emitted. */
  get isTerminated(): boolean {
    return this.terminated;
  }

  /** Number of events still queued for emission. */
  get pendingCount(): number {
    return this.pending.length;
  }

  /**
   * Append one event to this turn's script. Returns `this` for chaining. Events
   * are emitted in the order they are scripted.
   */
  script(event: AgentStreamEvent): this {
    this.pending.push(event);
    return this;
  }

  /** Append several events to this turn's script, in order. */
  scriptAll(events: readonly AgentStreamEvent[]): this {
    for (const e of events) {
      this.pending.push(e);
    }
    return this;
  }

  /**
   * Emit the next scripted event via `onEvent`, if any remain and the turn is
   * neither cancelled nor already terminated. Returns the emitted event, or
   * `undefined` when nothing was emitted (empty queue, cancelled, or
   * terminated). This is the primary deterministic "pump" used by tests.
   */
  emitNext(): AgentStreamEvent | undefined {
    if (this.cancelled || this.terminated) {
      return undefined;
    }
    const event = this.pending.shift();
    if (event === undefined) {
      return undefined;
    }
    if (event.kind === "completed" || event.kind === "failed") {
      this.terminated = true;
    }
    this.onEvent(event);
    return event;
  }

  /**
   * Emit all currently-queued events in order, stopping early if the turn
   * becomes terminated or cancelled. Returns the events actually emitted.
   *
   * Note: a turn left without a terminal `completed`/`failed` in its script
   * simply drains to empty and stays un-terminated — this is how a stall is
   * simulated (the controller's watchdog is expected to fire on its own clock).
   */
  emitAll(): AgentStreamEvent[] {
    const emitted: AgentStreamEvent[] = [];
    // Loop until nothing more is emitted; emitNext returns undefined when the
    // queue drains or the turn terminates/cancels.
    for (;;) {
      const e = this.emitNext();
      if (e === undefined) {
        break;
      }
      emitted.push(e);
    }
    return emitted;
  }

  /** Marks the turn cancelled; subsequent emissions become no-ops. */
  cancel(): void {
    this.cancelled = true;
  }
}

/**
 * Deterministic, dependency-free {@link AgentAdapter} for tests.
 */
export class MockAdapter implements AgentAdapter {
  private availabilityDefault: boolean;
  private readonly availabilityPerAgent: Partial<Record<AgentId, boolean>>;

  /** All recorded startTurn invocations, in call order. */
  readonly invocations: StartTurnInvocation[] = [];
  /** Per-agent invocation counters for convenient routing assertions. */
  readonly startTurnCountByAgent: Record<AgentId, number> = {
    builder: 0,
    helper: 0,
  };
  /** Every turn produced, in creation order; the last is the most recent. */
  readonly turns: ScriptedTurn[] = [];

  private turnSeq = 0;

  constructor(options: MockAdapterOptions = {}) {
    const availability = options.availability ?? {};
    this.availabilityDefault = availability.default ?? true;
    this.availabilityPerAgent = { ...(availability.perAgent ?? {}) };
  }

  /**
   * Configurable availability. A per-agent override wins over the global
   * default; otherwise the global default is returned. Defaults to `true`.
   */
  isAvailable(agent: AgentId): Promise<boolean> {
    const override = this.availabilityPerAgent[agent];
    return Promise.resolve(override ?? this.availabilityDefault);
  }

  /** Set the global default availability for agents without an override. */
  setAvailable(available: boolean): void {
    this.availabilityDefault = available;
  }

  /** Set (or clear) a per-agent availability override. */
  setAgentAvailable(agent: AgentId, available: boolean | undefined): void {
    if (available === undefined) {
      delete this.availabilityPerAgent[agent];
    } else {
      this.availabilityPerAgent[agent] = available;
    }
  }

  /**
   * Records the invocation and creates a {@link ScriptedTurn}. The returned
   * {@link TurnHandle} resolves immediately ("turn accepted"); no events are
   * emitted until the test drives emission explicitly.
   */
  startTurn(
    req: StartTurnRequest,
    onEvent: (e: AgentStreamEvent) => void,
  ): Promise<TurnHandle> {
    this.turnSeq += 1;
    const turnId = `mock-turn-${this.turnSeq}`;

    const invocation: StartTurnInvocation = {
      count: this.turnSeq,
      agent: req.agent,
      request: req,
      turnId,
    };
    this.invocations.push(invocation);
    this.startTurnCountByAgent[req.agent] += 1;

    const turn = new ScriptedTurn(turnId, req.agent, onEvent);
    this.turns.push(turn);

    const handle: TurnHandle = {
      turnId,
      cancel: () => turn.cancel(),
    };
    return Promise.resolve(handle);
  }

  /** The most recently created turn, or `undefined` if none started yet. */
  get lastTurn(): ScriptedTurn | undefined {
    return this.turns[this.turns.length - 1];
  }

  /** Total number of startTurn invocations recorded. */
  get invocationCount(): number {
    return this.invocations.length;
  }

  /**
   * Convenience pump that emits the next scripted event of the most recently
   * created turn. Returns the emitted event or `undefined` when there is no
   * turn or nothing to emit.
   */
  emitNext(): AgentStreamEvent | undefined {
    return this.lastTurn?.emitNext();
  }
}
