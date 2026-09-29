/**
 * Agent_Run_Port invocation boundary for the live Builder / Helper agent
 * surfaces (design §B.1).
 *
 * This module defines the transport-agnostic contract the
 * {@link AgentSurfaceController} uses to drive live Builder / Helper runs and
 * the remaining §4 UI commands (decision resolution, run cancellation,
 * generated-workspace open, launch result, evidence trace, final upgrade). The
 * concrete implementation (`ManagedAgentPort`, which wraps the managed host's
 * `client` / `worker`) is chosen behind this interface, so the controller and
 * webview never bind to a specific transport.
 *
 * Mirroring the shipped `DiscoveryPort` / `SpecPort` PortResult pattern
 * (see `../flow/discovery-port.ts`), every operation is async and resolves to
 * an {@link AgentResult} that is either `ok(value)` or `err(AgentError)` --
 * ports NEVER throw. The SDK / host types are imported from the vendored
 * frontend-client barrel; the exact codes come from design §B.1.
 *
 * These are type / interface declarations only; the concrete implementation
 * lives in `managed-agent-port.ts`.
 */

import type {
  LocalRun,
  LocalUiResponse,
  ProjectSessionSnapshot,
  RunEventView,
  UiRequest,
} from "../../../vendor/frontend-client";
import type { RuntimeErrorCode } from "../../core/runtime-errors";

/**
 * Normalized, transport-agnostic agent-port failure code (design §B.1). Raw
 * Core / worker codes are mapped onto this closed union by `toAgentError`
 * (task 2.2); `timeout` / `unavailable` / `invalid` / `unknown` are the
 * fallbacks.
 */
export type AgentErrorCode =
  | RuntimeErrorCode
  | "run_busy"
  | "stale_task_revision"
  | "task_already_completed"
  | "task_binding_mismatch"
  | "runtime_capacity"
  | "idempotency_conflict"
  | "decision_binding_mismatch"
  | "helper_empty_response"
  | "native_role_catalog_unverified"
  | "decision_already_resolved"
  | "live_context_stale"
  | "decision_input_invalid"
  | "native_user_input_stale"
  | "native_response_invalid"
  | "native_not_ready"
  | "result_unavailable"
  | "final_upgrade_rejected"
  | "timeout"
  | "unavailable"
  | "invalid"
  | "unknown";

/**
 * A normalized port failure. `code` is the stable {@link AgentErrorCode};
 * `raw` is the original Core / worker code string (display / diagnostics only);
 * `message` is a human-readable description. The raw transport error object is
 * never surfaced past this boundary.
 */
export interface AgentError {
  readonly code: AgentErrorCode;
  readonly raw: string;
  readonly message: string;
}

/** A port operation resolves to `ok(value)` or `err(AgentError)`; never throws. */
export type AgentResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AgentError };

/**
 * Callbacks the controller supplies to a live {@link AgentRunPort.watch}.
 * `onEvent` receives events already projected by `projectRunEvent`; `onRun`
 * receives run STATE snapshots; `signal` is the panel-dispose abort (which is
 * NOT a cancel); `after` is the replay start sequence (`0` on recovery).
 */
export interface WatchHandlers {
  /** Live turn events, already projected to the safe {@link RunEventView}. */
  readonly onEvent: (view: RunEventView) => void;
  /** Run STATE snapshots (phase / errorCode) for the run itself. */
  readonly onRun: (run: LocalRun) => void;
  /** Panel-dispose abort signal. Aborting closes the SSE stream, not the run. */
  readonly signal: AbortSignal;
  /** Replay start sequence; `0` replays the full turn on recovery. */
  readonly after?: number;
}

/**
 * The host-side, non-throwing boundary over the managed `CoreClient` for live
 * Builder / Helper runs and the §4 UI commands (design §B.1). Mirrors the
 * `DiscoveryPort` PortResult shape: every method resolves to
 * {@link AgentResult}.
 */
export interface AgentRunPort {
  /**
   * `restoreProject` -> require `currentTask` -> return the durable task
   * binding used to start a Builder run (design §3.1). Resolves `err('invalid')`
   * when there is no current task.
   */
  prepareBuilder(
    projectId: string,
    followUpMessage?: string,
  ): Promise<
    AgentResult<{
      taskId: string;
      expectedTaskRevision: number;
      taskTitle: string;
    }>
  >;

  /** Start a Builder run for the bound task; maps start-time Core rejections. */
  startBuilder(input: {
    projectId: string;
    taskId: string;
    expectedTaskRevision: number;
    message: string;
  }): Promise<AgentResult<LocalRun>>;

  /**
   * Start a read-only Helper run. Never resumes Builder or resolves a Decision;
   * `decisionId` binds the turn to a specific Decision when present.
   */
  startHelper(input: {
    projectId: string;
    taskId: string;
    decisionId?: string;
    message: string;
    origin: "FREE_TEXT" | "QUICK_ACTION";
  }): Promise<AgentResult<LocalRun>>;

  /**
   * Open the SSE stream and resolve with the terminal {@link LocalRun}. Never
   * throws: a panel-dispose abort resolves through `err` so the controller can
   * distinguish an abort from a real failure (abort != cancel).
   */
  watch(
    runId: string,
    handlers: WatchHandlers,
  ): Promise<AgentResult<LocalRun>>;

  /** Explicit user "stop": cancel the run (`cancelRun`); returns the terminal run. */
  cancel(runId: string): Promise<AgentResult<LocalRun>>;

  /**
   * The active BUILDER run for the project, if any (`listRuns` + `isRunActive`
   * + `kind === 'BUILDER'`); resolves `ok(null)` when none is active. Used by
   * window-switch reload recovery (design §3.1).
   */
  listActiveBuilderRun(
    projectId: string,
  ): Promise<AgentResult<LocalRun | null>>;

  /**
   * Read-after-terminal durable snapshot used for turn classification and
   * Helper / Decision read-back.
   */
  snapshot(
    projectId: string,
  ): Promise<AgentResult<ProjectSessionSnapshot>>;

  /**
   * `execute()` passthrough for the `UI_*` commands (decision, workspace,
   * launch, evidence, final upgrade). Typed 1:1 with the SDK client's
   * `execute<K>` so a request of kind `K` resolves to `LocalUiResponse<K>`.
   */
  execute<K extends UiRequest["kind"]>(
    request: Extract<UiRequest, { kind: K }>,
  ): Promise<AgentResult<LocalUiResponse<K>>>;
}
