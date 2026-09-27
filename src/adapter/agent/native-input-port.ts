/**
 * Native_Input_Port invocation boundary for native (in-editor) user inputs and
 * worker status (design §B.1).
 *
 * This module defines the transport-agnostic contract the
 * {@link AgentSurfaceController} uses to observe and answer the questions a
 * native Agent raises through the managed host's `NativeWorker`, and to observe
 * the worker's diagnostic status. The concrete implementation is
 * `ManagedAgentPort` (which wraps `host.worker`); the controller binds only to
 * this interface.
 *
 * Consistent with the {@link AgentRunPort} boundary, {@link submit} is
 * non-throwing and resolves to an {@link AgentResult}; the synchronous
 * accessors / subscriptions mirror the host `NativeWorker` surface directly.
 *
 * These are type / interface declarations only; the concrete implementation
 * lives in `managed-agent-port.ts`.
 */

import type {
  NativeAnswer,
  NativeQuestion,
  NativeWorkerStatusCode,
} from "../../../vendor/frontend-host";
import type { AgentResult } from "./agent-run-port";

/**
 * The host-side boundary over the managed `NativeWorker` (design §B.1).
 * Questions are host-memory only (re-listed on notify, lost on reload); the
 * controller NEVER auto-answers and submits exactly what the user chose.
 */
export interface NativeInputPort {
  /** Latest worker diagnostic code, or `undefined` before the worker reports. */
  getStatus(): NativeWorkerStatusCode | undefined;

  /** Pending native questions for the project (poll-free; re-read on notify). */
  listUserInputs(projectId: string): NativeQuestion[];

  /** Subscribe to worker status changes; returns an unsubscribe function. */
  subscribeStatus(
    listener: (code: NativeWorkerStatusCode) => void,
  ): () => void;

  /**
   * Subscribe to user-input change notifications; returns an unsubscribe
   * function. Notification only -- the listener must re-call
   * {@link listUserInputs}.
   */
  subscribeUserInputs(listener: () => void): () => void;

  /**
   * Submit exactly the user's selection. Resolves `ok` with `SUBMITTED`
   * (accepted), `ALREADY_SUBMITTED` (being consumed), or `ALREADY_HANDLED`
   * (already acknowledged); maps `NATIVE_*` rejections to an {@link AgentError}.
   * Never auto-answers; never throws.
   */
  submit(
    answer: NativeAnswer,
  ): Promise<
    AgentResult<"SUBMITTED" | "ALREADY_SUBMITTED" | "ALREADY_HANDLED">
  >;
}
