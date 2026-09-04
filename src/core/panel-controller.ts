/**
 * PanelController: the pure extension-host core that owns the Agent_Panel's
 * per-tab state and orchestration.
 *
 * This module implements the **tab-selection surface** of the controller
 * (task 5.1), the **submit / input-validation / agent-routing** surface
 * (task 5.3), and the **per-tab submission-lock + turn lifecycle wiring**
 * (task 6.1): fresh-panel initial state, `selectTab`, the `activeTab` getter,
 * the per-tab {@link TabState} accessor, {@link PanelController.submit}, and
 * the stream-driven {@link PanelController.handleStreamEvent}.
 * The exactly-one-active-tab invariant is maintained by storing a single
 * `activeTab` value that always equals the most recently selected tab
 * (Req 1.3, 1.4).
 *
 * Task 6.1 wires the normalized {@link AgentStreamEvent} stream into each tab's
 * {@link TabState}: `started` creates the Agent_Response, `message_chunk` and
 * `work_item` append in receipt order, and `completed`/`failed` release the
 * per-tab submission lock so that tab can submit again (Req 2.6, 3.3, 3.5,
 * 5.4). Streamed events always target the *originating* tab captured at submit
 * time and never change `activeTab`.
 *
 * Task 7.1 adds the injectable {@link Clock} and the two time-based failure
 * paths: the start-timeout (Req 6.1) armed at accept and cancelled by the
 * `started` event, and the stall watchdog (Req 3.7) armed on `started` and
 * reset by every subsequent event. Every error/unavailability path — over-limit
 * rejection, unavailability, start-timeout, stall, and mid-turn stream failure —
 * emits a {@link Notice} and only appends notices or flips response state,
 * never removing or editing prior entries (Req 6.5). A render-failure hook
 * (Req 1.7) surfaces an error notice without mutating conversation entries.
 *
 * The controller's validation/routing logic is pure and testable; the external
 * dependencies are the injected {@link AgentAdapter} and {@link Clock}, both
 * exercised deterministically in tests (a MockAdapter and a fake clock).
 */

import type { AgentId, TabId, TabStateSnapshot } from "./types";
import { TabState } from "./tab-state";
import { SystemClock, type Clock, type TimerId } from "./clock";
import type {
  AgentAdapter,
  AgentStreamEvent,
  StartTurnRequest,
  TurnHandle,
} from "../adapter/agent-adapter";

/** The tab selected on a freshly constructed panel (Req 1.3). */
const INITIAL_ACTIVE_TAB: TabId = "builder";

/** Maximum accepted User_Message length in characters (Req 2.1, 2.5). */
const MAX_MESSAGE_LENGTH = 10_000;

/**
 * Start-timeout budget: if no `started` event arrives within this window after
 * a turn is accepted, the turn is treated as a start failure (Req 6.1).
 */
const START_TIMEOUT_MS = 30_000;

/**
 * Stall-watchdog budget: the response is marked failed if no new stream event
 * arrives within this window (reset on each received event) (Req 3.7).
 */
const STALL_TIMEOUT_MS = 30_000;

/**
 * Classification of a notice the controller emits so a later task (webview
 * messaging, task 11.1) can forward it as a `HostToWebview` `notice` message.
 *
 * - `length_limit`: over-limit submission was rejected (Req 2.5).
 * - `unavailable`: the target agent was unavailable at submit time (Req 6.4).
 * - `error`: a start-timeout, stall, stream error, or render failure occurred
 *   (Req 1.7, 2.7, 3.7, 6.1, 6.2).
 */
export type NoticeKind = "error" | "unavailable" | "length_limit";

/**
 * A single notice emitted by the controller. Notices are additive surface —
 * they never remove or edit conversation entries (Req 6.5).
 */
export interface Notice {
  tab: TabId;
  kind: NoticeKind;
  message: string;
}

/**
 * Optional callback sink for controller notices (error / unavailable /
 * length_limit). Injected via {@link PanelControllerOptions} so a later task can
 * forward notices to the webview without this task binding to the messaging
 * protocol. When omitted, notices are still recorded on
 * {@link PanelController.notices} for inspection/testing.
 */
export type NoticeSink = (notice: Notice) => void;

/** Construction options for {@link PanelController}. */
export interface PanelControllerOptions {
  /** Deterministic timing source; defaults to a {@link SystemClock}. */
  clock?: Clock;
  /** Optional callback invoked for every emitted notice. */
  onNotice?: NoticeSink;
}

/**
 * Result of a {@link PanelController.submit} call.
 *
 * - `accepted`: the message was validated, appended, and routed to the agent
 *   (Req 2.2); `messageId` identifies the appended User_Message entry.
 * - `rejected`: validation failed. `empty` for empty/whitespace-only input
 *   (Req 2.4); `too_long` for input over the character limit (Req 2.5).
 *   `retainedText` echoes the composed text so the caller can keep it.
 * - `locked`: a turn is already in flight for that tab (Req 2.6).
 * - `unavailable`: the target agent was unavailable at submit time (Req 6.4);
 *   the composed text is retained and submission stays enabled.
 */
export type SubmitResult =
  | { status: "accepted"; messageId: string }
  | { status: "rejected"; reason: "empty" | "too_long"; retainedText: string }
  | { status: "locked" }
  | { status: "unavailable" };

/**
 * Per-tab bookkeeping for a single in-flight turn.
 *
 * Its presence in {@link PanelController}'s `inFlight` map *is* the submission
 * lock for that tab (Req 2.6): while it is non-`null` the tab is locked, and it
 * is cleared on the terminal `completed`/`failed` stream event to re-enable
 * submission (Req 3.3).
 */
interface InFlightRecord {
  /** Handle to the accepted turn (used for cancellation and watchdog teardown). */
  handle: TurnHandle;
  /** The User_Message id this turn is replying to; used by `beginResponse`. */
  pendingMessageId: string;
  /**
   * The Agent_Response entry id for this turn, assigned once the `started`
   * event arrives. `null` before `started`, after which chunk/work-item events
   * target it.
   */
  responseId: string | null;
  /**
   * The composed User_Message text, retained so a start-timeout can restore it
   * to the draft for resubmission (Req 6.1).
   */
  composedText: string;
  /**
   * Active timer id. Before `started` this is the start-timeout (Req 6.1);
   * after `started` it is repurposed as the stall watchdog, reset on each
   * received event (Req 3.7). `null` when no timer is currently armed.
   */
  timerId: TimerId | null;
}

/**
 * Owns one {@link TabState} per agent (Builder and Helper) and tracks which tab
 * is currently active.
 *
 * Fresh-panel initial state (Req 1.3): the Builder tab is active and both tabs
 * start with an empty conversation and an empty draft (guaranteed by
 * constructing fresh {@link TabState} instances).
 */
export class PanelController {
  /** One isolated TabState per agent; never shared between tabs (Req 1.6). */
  private readonly tabs: Record<TabId, TabState> = {
    builder: new TabState("builder"),
    helper: new TabState("helper"),
  };

  /** The currently active tab; always equals the most recently selected tab. */
  private _activeTab: TabId = INITIAL_ACTIVE_TAB;

  /**
   * Per-tab in-flight turn record backing the submission lock (Req 2.6) and
   * the stream-driven turn lifecycle (task 6.1). It is `null` exactly when the
   * tab has no turn in flight and may therefore submit; it is non-`null` from
   * the moment `startTurn` is accepted until the terminal `completed`/`failed`
   * stream event clears it.
   *
   * The record is strictly per tab: setting or clearing `inFlight.builder`
   * never touches `inFlight.helper` and vice versa, so Builder and Helper can
   * stream concurrently and one tab's lock never affects the other (Req 5.4).
   *
   * `pendingMessageId` is captured at submit time (the User_Message the turn is
   * replying to) so the `started` event can call `beginResponse(pendingMessageId)`
   * (Req 3.1). `responseId` is filled in once `started` arrives so subsequent
   * `message_chunk`/`work_item` events target the right Agent_Response entry.
   */
  private readonly inFlight: Record<TabId, InFlightRecord | null> = {
    builder: null,
    helper: null,
  };

  /** Deterministic timing source for the start-timeout and stall watchdog. */
  private readonly clock: Clock;

  /** Optional external sink notified of every emitted notice. */
  private readonly noticeSink?: NoticeSink;

  /**
   * All notices emitted so far, in order (error / unavailable / length_limit).
   * Exposed so tests and a later webview-forwarding task can inspect them; the
   * list is append-only and never rewrites conversation history (Req 6.5).
   */
  readonly notices: Notice[] = [];

  /**
   * @param adapter Agent invocation boundary. Injected so the controller can
   *   check availability (Req 6.4) and start turns (Req 2.2) without binding to
   *   a concrete host; a MockAdapter is used in tests.
   * @param options Optional {@link Clock} (defaults to a real {@link SystemClock}
   *   so existing single-argument construction keeps working) and an optional
   *   {@link NoticeSink}. Tests pass a fake clock to drive timeouts/stalls
   *   deterministically.
   */
  constructor(
    private readonly adapter: AgentAdapter,
    options: PanelControllerOptions = {},
  ) {
    this.clock = options.clock ?? new SystemClock();
    this.noticeSink = options.onNotice;
  }

  /**
   * Emit a notice: record it on {@link notices} and forward it to the injected
   * {@link NoticeSink} if any. Purely additive — never mutates conversation
   * entries (Req 6.5).
   */
  private emitNotice(tab: TabId, kind: NoticeKind, message: string): void {
    const notice: Notice = { tab, kind, message };
    this.notices.push(notice);
    this.noticeSink?.(notice);
  }

  /**
   * The currently active tab. Exactly one tab is active at any time; on a fresh
   * panel this is the Builder tab (Req 1.3), and after any {@link selectTab} it
   * equals the most recently selected tab (Req 1.4).
   */
  get activeTab(): TabId {
    return this._activeTab;
  }

  /**
   * Marks `tab` as the active tab and, implicitly, the previously active tab as
   * inactive (Req 1.4). Because activeness is represented by a single value,
   * exactly one tab is active at all times and it equals the most recently
   * selected tab. Selecting the already-active tab is a no-op that leaves the
   * active tab unchanged.
   */
  selectTab(tab: TabId): void {
    this._activeTab = tab;
  }

  /**
   * Returns the {@link TabState} for a tab. Later tasks (submit, streaming,
   * re-hydration) use this to mutate and snapshot per-tab conversation state.
   */
  getTabState(tab: TabId): TabState {
    return this.tabs[tab];
  }

  /**
   * Convenience accessor returning an immutable snapshot of a tab's state for
   * re-hydration (Req 1.5, 3.5). Submission is enabled exactly when the tab has
   * no in-flight turn; while a turn is in flight the tab is locked (Req 2.6).
   * Because the lock is tracked per tab, one tab's snapshot never reflects the
   * other tab's lock state (Req 5.4).
   */
  getTabSnapshot(tab: TabId): TabStateSnapshot {
    return this.tabs[tab].snapshot(this.inFlight[tab] === null);
  }

  /**
   * Validates and submits `text` from `tab` to that tab's agent (Req 2, 5.1,
   * 5.2, 6.4). Returns a {@link SubmitResult} describing the outcome.
   *
   * Validation and routing rules (in order):
   * 1. Empty or whitespace-only input is rejected as `empty` with no adapter
   *    call and no state change (Req 2.4). The tab's conversation and draft are
   *    left untouched.
   * 2. Input longer than {@link MAX_MESSAGE_LENGTH} characters is rejected as
   *    `too_long`; the composed text is retained via `retainedText` and the
   *    caller is expected to surface a length-limit notice (Req 2.5). No
   *    adapter call and no state change.
   * 3. If a turn is already in flight for this tab, submission is refused as
   *    `locked` (Req 2.6). (The full lock lifecycle is completed in task 6.1.)
   * 4. Otherwise the input is accepted (1..10,000 non-whitespace chars, Req
   *    2.1): availability is checked (Req 6.4), and if the agent is available a
   *    single User_Message is appended, the draft is cleared (Req 2.3), and the
   *    adapter's `startTurn` is invoked exactly once for this tab's agent only
   *    (Req 2.2, 5.1, 5.2).
   *
   * Availability (Req 6.4): if `isAvailable` reports the agent is unavailable —
   * or `startTurn` fails immediately, which is treated equivalently — the
   * result is `unavailable`, the composed text is retained (not appended, not
   * cleared), no User_Message is created, no turn is started, and submission
   * remains enabled.
   *
   * Asynchronous because {@link AgentAdapter.isAvailable} and
   * {@link AgentAdapter.startTurn} are async.
   */
  async submit(tab: TabId, text: string): Promise<SubmitResult> {
    // (2.4) Empty / whitespace-only: reject before any adapter call; the tab's
    // state (entries + draft) is left completely unchanged.
    if (text.trim().length === 0) {
      return { status: "rejected", reason: "empty", retainedText: text };
    }

    // (2.5) Over-limit: reject and retain the composed text for the caller to
    // re-surface alongside a length-limit notice. No adapter call, no mutation
    // of conversation entries. The length_limit notice is additive (Req 6.5).
    if (text.length > MAX_MESSAGE_LENGTH) {
      this.emitNotice(
        tab,
        "length_limit",
        `Message exceeds the ${MAX_MESSAGE_LENGTH.toLocaleString()}-character limit.`,
      );
      return { status: "rejected", reason: "too_long", retainedText: text };
    }

    // (2.6) In-flight turn in this tab: refuse as locked. The other tab is
    // unaffected because in-flight state is tracked per tab.
    if (this.inFlight[tab] !== null) {
      return { status: "locked" };
    }

    // Route strictly to the submitting tab's agent — never the other agent
    // (Req 5.1, 5.2). TabId and AgentId are 1:1.
    const agent: AgentId = tab;

    // (6.4) Availability gate: if the agent is unavailable, retain the text and
    // keep submission enabled without appending a message or starting a turn.
    let available: boolean;
    try {
      available = await this.adapter.isAvailable(agent);
    } catch {
      // An availability probe that throws is treated as unavailable.
      available = false;
    }
    if (!available) {
      // Retain the composed text, keep submission enabled, and surface an
      // unavailability notice without touching conversation history (Req 6.4,
      // 6.5).
      this.emitNotice(
        tab,
        "unavailable",
        `The ${agent === "builder" ? "Builder" : "Helper"} agent is currently unavailable. Your message was kept so you can resend it.`,
      );
      return { status: "unavailable" };
    }

    // Accepted (Req 2.1, 2.2, 2.3): append exactly one user message and clear
    // the draft. Capture the id so it can be returned on success.
    const tabState = this.tabs[tab];
    const messageId = tabState.appendUserMessage(text);
    tabState.clearDraft();

    const request: StartTurnRequest = {
      agent,
      text,
      // Only the Builder turn may emit work-stream items (Req 4.7).
      allowWorkStream: tab === "builder",
    };

    // Invoke startTurn exactly once for this tab's agent (Req 2.2). An
    // immediate rejection is treated as unavailability (Req 6.4): the composed
    // text is retained for resubmission and submission stays enabled.
    try {
      const handle = await this.adapter.startTurn(request, (event) =>
        this.handleStreamEvent(tab, event),
      );
      // Record the in-flight turn so subsequent submits in this tab are refused
      // as locked (Req 2.6) until the terminal completed/failed event clears it
      // (Req 3.3). `pendingMessageId` lets the `started` event create the
      // Agent_Response bound to this exact User_Message (Req 3.1). The record is
      // set only for `tab`, leaving the other tab's lock untouched (Req 5.4).
      const record: InFlightRecord = {
        handle,
        pendingMessageId: messageId,
        responseId: null,
        composedText: text,
        timerId: null,
      };
      this.inFlight[tab] = record;
      // (6.1) Arm the start-timeout: if no `started` event arrives within
      // START_TIMEOUT_MS, treat the turn as a start failure.
      record.timerId = this.clock.setTimeout(
        () => this.handleStartTimeout(tab),
        START_TIMEOUT_MS,
      );
      return { status: "accepted", messageId };
    } catch {
      // Roll back the optimistic append/draft-clear so nothing is left dangling
      // and the user's text is preserved. An immediate startTurn rejection is
      // treated as unavailability (Req 6.4): retain text, keep submission
      // enabled, and surface a notice without mutating history (Req 6.5).
      tabState.setDraft(text);
      this.emitNotice(
        tab,
        "unavailable",
        `The ${agent === "builder" ? "Builder" : "Helper"} agent could not be reached. Your message was kept so you can resend it.`,
      );
      return { status: "unavailable" };
    }
  }

  /**
   * Clears any armed timer on `record` (start-timeout or stall watchdog) so no
   * timer fires after a turn ends or its timer is being re-armed. Idempotent.
   */
  private clearTimer(record: InFlightRecord): void {
    if (record.timerId !== null) {
      this.clock.clearTimeout(record.timerId);
      record.timerId = null;
    }
  }

  /**
   * Start-timeout handler (Req 6.1). Fires when a turn was accepted but no
   * `started` event arrived within {@link START_TIMEOUT_MS}. Because no
   * `started` event arrived, `responseId` is still `null`, so no dangling
   * Agent_Response entry exists; if one somehow exists it is marked failed
   * (never removed). The composed text is restored to the draft for
   * resubmission, the per-tab lock is released, and an error notice is emitted.
   * Prior conversation entries are untouched (Req 6.5).
   */
  private handleStartTimeout(tab: TabId): void {
    const record = this.inFlight[tab];
    if (record === null) {
      return;
    }
    // The turn never actually started; cancel it defensively at the adapter.
    record.handle.cancel();
    const tabState = this.tabs[tab];
    if (record.responseId !== null) {
      // Defensive: no `started` should have arrived, but never leave a
      // dangling in-progress entry — flip it to failed (append/flip only).
      tabState.failResponse(record.responseId);
    }
    // Retain the composed text for resubmission (Req 6.1).
    tabState.setDraft(record.composedText);
    this.clearTimer(record);
    this.inFlight[tab] = null;
    this.emitNotice(
      tab,
      "error",
      "The agent did not start responding in time. Your message was kept so you can resend it.",
    );
  }

  /**
   * Stall-watchdog handler (Req 3.7). Fires when a turn had started streaming
   * but no new event arrived within {@link STALL_TIMEOUT_MS}. Marks the response
   * failed (retaining all partial content already appended — never removed or
   * edited), releases the per-tab lock, and emits an error notice. Prior
   * conversation entries are untouched (Req 6.5).
   */
  private handleStall(tab: TabId): void {
    const record = this.inFlight[tab];
    if (record === null) {
      return;
    }
    record.handle.cancel();
    if (record.responseId !== null) {
      this.tabs[tab].failResponse(record.responseId);
    }
    this.clearTimer(record);
    this.inFlight[tab] = null;
    this.emitNotice(
      tab,
      "error",
      "The agent stopped responding. The partial reply was kept.",
    );
  }

  /**
   * Re-arm the stall watchdog for `record`, cancelling any previously armed
   * timer first so each received event resets the 30s window (Req 3.7).
   */
  private resetStallWatchdog(tab: TabId, record: InFlightRecord): void {
    this.clearTimer(record);
    record.timerId = this.clock.setTimeout(
      () => this.handleStall(tab),
      STALL_TIMEOUT_MS,
    );
  }

  /**
   * Render-failure preservation hook at the state boundary (Req 1.7). Called
   * when rendering a tab's Conversation_View fails. It produces an error
   * indication (an `error` notice) for that tab *without* mutating any
   * conversation entries — host-side state is preserved and can be re-hydrated.
   * Returns the preserved snapshot so a caller can re-render from known-good
   * state.
   */
  reportRenderFailure(tab: TabId, message?: string): TabStateSnapshot {
    this.emitNotice(
      tab,
      "error",
      message ?? "Failed to render the conversation. Your history is preserved.",
    );
    // Snapshot after emitting the notice: entries are untouched by emitNotice,
    // so this reflects the fully-preserved conversation state (Req 1.7, 6.5).
    return this.getTabSnapshot(tab);
  }

  /**
   * Applies one normalized {@link AgentStreamEvent} for `tab`'s in-flight turn
   * to that tab's {@link TabState} (task 6.1). `tab` is the *originating* tab
   * bound when the turn was submitted, so every event is applied to that tab
   * regardless of which tab is currently active — this method never calls
   * {@link selectTab} and never reads/writes {@link activeTab} (Req 3.5).
   *
   * Lifecycle:
   * - `started`: create the Agent_Response for the pending User_Message via
   *   {@link TabState.beginResponse} and remember its `responseId` so later
   *   chunk/work-item events target it (Req 3.1).
   * - `message_chunk`: append the chunk in receipt order (Req 3.2).
   * - `work_item`: append the work item (Builder only; Helper turns are started
   *   with `allowWorkStream: false` and never emit work items — {@link TabState}
   *   also rejects them for a Helper tab per Req 4.7).
   * - `work_item_result`: mark the referenced item failed/succeeded (see the
   *   deferred note below).
   * - `completed`: mark the response complete and clear the tab's in-flight
   *   lock so submission re-enables (Req 3.3, 2.6).
   * - `failed`: mark the response failed (retaining partial content) and clear
   *   the tab's in-flight lock so submission re-enables (Req 2.6, 6.2).
   *
   * Events that arrive without an in-flight record for `tab`, or before the
   * `started` event has established a `responseId`, are ignored defensively so
   * a late or out-of-order event can never mutate the wrong tab or throw.
   */
  private handleStreamEvent(tab: TabId, event: AgentStreamEvent): void {
    const record = this.inFlight[tab];
    // No active turn for this tab: ignore stray/late events defensively.
    if (record === null) {
      return;
    }

    const tabState = this.tabs[tab];

    switch (event.kind) {
      case "started": {
        // Create the Agent_Response bound to the User_Message captured at
        // submit time and remember its id for subsequent events (Req 3.1).
        // Guard against a duplicate `started` overwriting an existing response.
        if (record.responseId === null) {
          record.responseId = tabState.beginResponse(record.pendingMessageId);
        }
        // The turn has started: cancel the start-timeout and begin the stall
        // watchdog, which every subsequent event will reset (Req 6.1 → 3.7).
        this.resetStallWatchdog(tab, record);
        return;
      }

      case "message_chunk": {
        // Append in receipt order to the originating tab's response (Req 3.2).
        if (record.responseId !== null) {
          tabState.appendChunk(record.responseId, event.text);
        }
        // A new event arrived: reset the stall watchdog (Req 3.7).
        this.resetStallWatchdog(tab, record);
        return;
      }

      case "work_item": {
        // Builder-only; append in receipt order (Req 4.1). TabState throws for a
        // Helper tab, but Helper turns run with allowWorkStream=false and never
        // emit work items, so this branch is only reached for Builder (Req 4.7).
        if (record.responseId !== null) {
          tabState.appendWorkItem(record.responseId, event.item);
        }
        // A new event arrived: reset the stall watchdog (Req 3.7).
        this.resetStallWatchdog(tab, record);
        return;
      }

      case "work_item_result": {
        // A new event arrived: reset the stall watchdog (Req 3.7). The detailed
        // status marking remains deferred (see note below).
        this.resetStallWatchdog(tab, record);
        // Marking a specific work item's status (Req 4.6) requires mutating a
        // live work item on the response. TabState (which this task must not
        // modify) exposes no accessor to a live entry or a work-item mutator,
        // so detailed result marking is deferred rather than reaching into
        // private state. Partial content is unaffected: the item remains
        // present with its last-known status.
        //
        // TODO(follow-up): once TabState exposes a way to update a work item's
        // status (or a live-entry accessor), mark `event.itemId` as
        // failed/succeeded on `record.responseId` using the pure helper in
        // core/work-item.ts (markWorkItemFailed).
        return;
      }

      case "completed": {
        // Terminal success: mark complete and release the per-tab lock so this
        // tab can submit again (Req 3.3, 2.6). The other tab is untouched
        // (Req 5.4). Clear any armed watchdog so it never fires after the turn
        // ends.
        if (record.responseId !== null) {
          tabState.completeResponse(record.responseId);
        }
        this.clearTimer(record);
        this.inFlight[tab] = null;
        return;
      }

      case "failed": {
        // Terminal failure mid-turn (Req 3.7, 6.2): mark failed (TabState
        // retains all partial content already appended — never removed/edited),
        // clear the watchdog so it never fires after the turn ends, release the
        // per-tab lock so this tab can submit again (Req 2.6), and surface an
        // error notice. Prior conversation entries are untouched (Req 6.5).
        if (record.responseId !== null) {
          tabState.failResponse(record.responseId);
        }
        this.clearTimer(record);
        this.inFlight[tab] = null;
        this.emitNotice(
          tab,
          "error",
          event.error.message ||
            "The agent response failed. Any partial reply was kept.",
        );
        return;
      }

      default: {
        // Exhaustiveness guard: if a new event kind is added, TypeScript flags
        // this as an error so the lifecycle wiring is kept in sync.
        const _exhaustive: never = event;
        void _exhaustive;
        return;
      }
    }
  }

}
