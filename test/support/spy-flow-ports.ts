/**
 * Call-recording, scriptable {@link FlowPorts} test double.
 *
 * {@link SpyFlowPorts} implements both the {@link DiscoveryPort} and
 * {@link SpecPort} halves of the flow port boundary. Its two purposes:
 *
 * 1. **Call recording.** Every op appends a `{ op, req, env }` record to the
 *    public readonly {@link SpyFlowPorts.calls} array, so tests can assert
 *    exactly-once enveloped invocation (design "Property 2") and inspect the
 *    {@link RequestEnvelope} (correlationId / idempotencyKey / expectedRevision)
 *    each call carried.
 * 2. **Scriptable results.** By default each op resolves a synchronous `ok`
 *    result with a minimal, valid domain payload (built by an internal
 *    {@link MockDiscoveryPort} driven by an injected {@link FakeClock}, so the
 *    payloads are shape-valid and monotonic without any real waits). Any op can
 *    be overridden — per construction or via {@link SpyFlowPorts.setResult} —
 *    to instead resolve a scripted `ok(value)`, `err(PortError)`, or to hang as
 *    a never-resolving promise (`"pending"`) for single-flight / timeout tests.
 *
 * ## Determinism guarantees
 *
 * - No randomness beyond the seeded {@link MockDiscoveryPort} used for default
 *   payloads (a fixed seed is used, so defaults are repeatable).
 * - No real timers: default payloads are produced by advancing the injected
 *   {@link FakeClock} synchronously inside each call, so ops resolve on the
 *   microtask queue rather than after wall-clock latency.
 * - `"pending"` ops return a promise that never resolves, deterministically
 *   modeling an in-flight op for lock/timeout assertions.
 */

import type { Clock } from "../../src/core/clock";
import type {
  CandidateRevisionReference,
  CandidateRound,
  DiscoveryFeedback,
  DiscoveryInput,
  DiscoverySession,
  LearningSpecRevision,
  PreparedBuilderTask,
  PreviewRound,
  ProjectCandidateRevision,
} from "../../src/core/flow/flow-types";
import type {
  DiscoveryPort,
  FlowPorts,
  PortError,
  PortResult,
  RequestEnvelope,
  SpecPort,
} from "../../src/adapter/flow/discovery-port";
import { MockDiscoveryPort } from "../../src/adapter/flow/mock-flow-port";
import { FakeClock } from "./fake-clock";

/** The eight scriptable flow operations. */
export type FlowOp =
  | "startDiscovery"
  | "generatePreviewRound"
  | "enrichCandidate"
  | "submitFeedback"
  | "generateSpecDraft"
  | "refineSpec"
  | "confirmSpec"
  | "prepareBuilderTask";

/** A single recorded port invocation. */
export interface RecordedCall {
  /** The op kind (see {@link FlowOp}). */
  op: FlowOp;
  /** The typed request object the op received. */
  req: unknown;
  /** The {@link RequestEnvelope} the op received. */
  env: RequestEnvelope;
}

/**
 * A scripted result for an op: a concrete {@link PortResult}, or the sentinel
 * `"pending"` for a never-resolving promise (models an in-flight op).
 */
export type ScriptedResult<T> = PortResult<T> | "pending";

/** Construction options for {@link SpyFlowPorts}. */
export interface SpyFlowPortsOptions {
  /**
   * Injected clock used to drive the internal {@link MockDiscoveryPort} that
   * produces default payloads. Defaults to a fresh {@link FakeClock}. Pass the
   * SAME clock the {@link FlowController} uses so default payloads and the
   * controller share one virtual timeline.
   */
  clock?: Clock;
  /** Seed for the internal mock's payload PRNG (defaults to a fixed value). */
  seed?: number;
  /** Optional initial per-op scripted results. */
  results?: Partial<Record<FlowOp, ScriptedResult<unknown>>>;
}

/** A promise that never resolves — models a permanently in-flight op. */
const NEVER: Promise<never> = new Promise<never>(() => {
  /* intentionally never settles */
});

const DEFAULT_SEED = 0x11_22_33_44;

/**
 * Records every enveloped call and returns configurable results per op. Use it
 * as the {@link FlowPorts} passed to a {@link FlowController} in tests.
 */
export class SpyFlowPorts implements DiscoveryPort, SpecPort, FlowPorts {
  /** Both halves of {@link FlowPorts} are satisfied by this same instance. */
  readonly discovery: DiscoveryPort = this;
  readonly spec: SpecPort = this;

  /** Every recorded call, in invocation order (Property 2 assertions). */
  readonly calls: RecordedCall[] = [];

  private readonly clock: FakeClock;
  private readonly mock: MockDiscoveryPort;
  private readonly scripted = new Map<FlowOp, ScriptedResult<unknown>>();

  constructor(options: SpyFlowPortsOptions = {}) {
    // The internal mock only needs a FakeClock to produce default payloads. We
    // always keep our OWN FakeClock for the mock (even if the caller injected a
    // Clock for the controller) so we can synchronously advance it to resolve
    // the mock's op body without perturbing the controller's timeout timers.
    this.clock = new FakeClock();
    this.mock = new MockDiscoveryPort({
      seed: options.seed ?? DEFAULT_SEED,
      clock: this.clock,
      // Zero-latency so a single advance(1) resolves the op body.
      latency: { minMs: 0, maxMs: 0 },
    });
    if (options.results) {
      for (const [op, result] of Object.entries(options.results) as [
        FlowOp,
        ScriptedResult<unknown>,
      ][]) {
        this.scripted.set(op, result);
      }
    }
  }

  /** Scripts the result for a single op (overriding the default `ok` payload). */
  setResult<T>(op: FlowOp, result: ScriptedResult<T>): void {
    this.scripted.set(op, result as ScriptedResult<unknown>);
  }

  /** Scripts an op to resolve `err(error)`. */
  setError(op: FlowOp, error: PortError): void {
    this.scripted.set(op, { ok: false, error });
  }

  /** Scripts an op to hang forever (models an in-flight op). */
  setPending(op: FlowOp): void {
    this.scripted.set(op, "pending");
  }

  /** Clears any scripted result for an op, restoring the default `ok` payload. */
  clearResult(op: FlowOp): void {
    this.scripted.delete(op);
  }

  /** How many times a given op was invoked (convenience for assertions). */
  callCountOf(op: FlowOp): number {
    return this.calls.filter((c) => c.op === op).length;
  }

  // --- DiscoveryPort ---

  startDiscovery(
    req: { projectId: string; input: DiscoveryInput },
    env: RequestEnvelope,
  ): Promise<PortResult<DiscoverySession>> {
    return this.run("startDiscovery", req, env, () =>
      this.mock.startDiscovery(req, env),
    );
  }

  generatePreviewRound(
    req: { discoverySessionId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<PreviewRound>> {
    return this.run("generatePreviewRound", req, env, () =>
      this.mock.generatePreviewRound(req, env),
    );
  }

  enrichCandidate(
    req: { discoverySessionId: string; target: CandidateRevisionReference },
    env: RequestEnvelope,
  ): Promise<PortResult<ProjectCandidateRevision>> {
    return this.run("enrichCandidate", req, env, () =>
      this.mock.enrichCandidate(req, env),
    );
  }

  submitFeedback(
    req: { discoverySessionId: string; feedback: DiscoveryFeedback },
    env: RequestEnvelope,
  ): Promise<PortResult<CandidateRound>> {
    return this.run("submitFeedback", req, env, () =>
      this.mock.submitFeedback(req, env),
    );
  }

  // --- SpecPort ---

  generateSpecDraft(
    req: { projectId: string; selectedCandidate: CandidateRevisionReference },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    return this.run("generateSpecDraft", req, env, () =>
      this.mock.generateSpecDraft(req, env),
    );
  }

  refineSpec(
    req: { projectId: string; learningSpecId: string; message: string },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    return this.run("refineSpec", req, env, () => this.mock.refineSpec(req, env));
  }

  confirmSpec(
    req: { projectId: string; learningSpecId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    return this.run("confirmSpec", req, env, () => this.mock.confirmSpec(req, env));
  }

  prepareBuilderTask(
    req: { projectId: string; learningSpecId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<PreparedBuilderTask>> {
    return this.run("prepareBuilderTask", req, env, () =>
      this.mock.prepareBuilderTask(req, env),
    );
  }

  // --- internals ---

  /**
   * Records the enveloped call, then returns the scripted result for `op` if
   * one is set (`"pending"` -> a never-resolving promise; otherwise the scripted
   * {@link PortResult}), or falls back to the default `ok` payload produced by
   * the internal {@link MockDiscoveryPort} (resolved synchronously by advancing
   * the mock's own {@link FakeClock}).
   */
  private run<T>(
    op: FlowOp,
    req: unknown,
    env: RequestEnvelope,
    produceDefault: () => Promise<PortResult<T>>,
  ): Promise<PortResult<T>> {
    this.calls.push({ op, req, env });

    const scripted = this.scripted.get(op);
    if (scripted === "pending") {
      return NEVER;
    }
    if (scripted !== undefined) {
      return Promise.resolve(scripted as PortResult<T>);
    }

    // Default: kick the mock op, then advance the mock's clock so its
    // zero-latency scheduled body resolves on the microtask queue.
    const promise = produceDefault();
    this.clock.advance(1);
    return promise;
  }
}
