/**
 * ManagedAgentPort — the REAL, live {@link AgentRunPort} + {@link NativeInputPort}
 * implementation backed by the managed host's `CoreClient` / `NativeWorker`
 * (design §B.2).
 *
 * HOST-ONLY (design §9). This adapter is the ONLY module in the agent surface
 * that touches `host.client` / `host.worker` and the only one that imports the
 * SDK helpers `entityId` / `uiMetadata` / `isRunActive` / `projectRunEvent`,
 * exactly as `LocalCoreDiscoveryPort` is the only module touching the client for
 * the Discovery/Spec/History flow. The `CoreClient` wraps an authenticated
 * 127.0.0.1 HTTP/SSE connection; nothing here serializes the client, the
 * connection, or any token — the port methods return only vendored SDK
 * view/run/snapshot values, which the host projects into a safe view model
 * separately.
 *
 * NON-THROWING (Requirements 11.1, 11.2; design §B.2). Every method wraps all
 * client / worker calls in `try { ...await... return ok(value) } catch (e) {
 * return err(toAgentError(e, '<op> failed')) }` and NEVER throws. Raw Core /
 * worker codes are normalized to the closed {@link AgentErrorCode} set by
 * {@link toAgentError}. A panel-dispose `AbortError` surfaced by `watch` is
 * mapped through `toAgentError` like any other failure; the controller (not this
 * port) distinguishes an abort from a cancel via its own `signal.aborted` check.
 *
 * SDK projection at the boundary. `watch` projects each raw `LocalRunEvent`
 * into a safe {@link RunEventView} via `projectRunEvent` before handing it to
 * the controller's `onEvent`, and forwards run STATE snapshots via `onRun`.
 * `startBuilder` / `startHelper` mint a fresh `entityId('idem')` idempotency key
 * per start; `listActiveBuilderRun` filters `listRuns` by `kind === 'BUILDER'`
 * + `isRunActive`.
 *
 * The `startRun` request shapes match the vendored `LocalRunInput` discriminated
 * union exactly (BUILDER: `projectId` / `idempotencyKey` / `kind` / `taskId` /
 * `expectedTaskRevision` / `message`; HELPER: adds optional `decisionId` +
 * `origin`). The union schema is `$strict`, so no extra fields are permitted.
 */

import {
  entityId,
  isRunActive,
  projectRunEvent,
} from "../../../vendor/frontend-client";
import type {
  LocalRun,
  LocalUiResponse,
  ProjectSessionSnapshot,
  UiRequest,
} from "../../../vendor/frontend-client";
import type {
  CoreClient,
  NativeAnswer,
  NativeQuestion,
  NativeWorker,
  NativeWorkerStatusCode,
} from "../../../vendor/frontend-host";
import { toAgentError } from "./agent-error";
import { builderTaskLabel } from "../../core/agent/agent-view-model";
import type {
  AgentError,
  AgentResult,
  AgentRunPort,
  WatchHandlers,
} from "./agent-run-port";
import type { NativeInputPort } from "./native-input-port";

/** Wrap a resolved value as a successful {@link AgentResult}. */
function ok<T>(value: T): AgentResult<T> {
  return { ok: true, value };
}

/** Wrap a normalized {@link AgentError} as a failed {@link AgentResult}. */
function err(error: AgentError): AgentResult<never> {
  return { ok: false, error };
}

/**
 * Live agent port over the managed host's `CoreClient` / `NativeWorker`.
 *
 * Constructed only when a managed `FrontendHost` is present (product mode); the
 * controller binds to the {@link AgentRunPort} / {@link NativeInputPort}
 * interfaces, never to this class directly. Every method is non-throwing.
 */
export class ManagedAgentPort implements AgentRunPort, NativeInputPort {
  constructor(
    private readonly client: CoreClient,
    private readonly worker: NativeWorker,
  ) {}

  // --- AgentRunPort ---

  async prepareBuilder(
    projectId: string,
    followUpMessage?: string,
  ): Promise<
    AgentResult<{
      taskId: string;
      expectedTaskRevision: number;
      taskTitle: string;
    }>
  > {
    try {
      const snapshot = await this.client.restoreProject(projectId);
      let task = snapshot.currentTask;
      if (!task) {
        // No current Task — a Builder run cannot be started (design §3.1).
        return err(toAgentError("CURRENT_TASK_REQUIRED", "prepareBuilder failed"));
      }
      if (task.status === "COMPLETED" && followUpMessage?.trim()) {
        const prepared = await this.client.execute({
          schemaVersion: 1, actor: { kind: "UI" }, kind: "UI_PREPARE_FOLLOW_UP_TASK",
          correlationId: snapshot.project.correlationId, idempotencyKey: entityId("idem"),
          projectId, sourceTaskId: task.id, expectedSourceTaskRevision: task.revision,
          userGoal: followUpMessage.trim(),
        });
        task = prepared.task;
      }
      return ok({
        taskId: task.id,
        expectedTaskRevision: task.revision,
        taskTitle: task.id === snapshot.currentTask?.id ? builderTaskLabel(snapshot) ?? task.title : task.title,
      });
    } catch (e) {
      return err(toAgentError(e, "prepareBuilder failed"));
    }
  }

  async startBuilder(input: {
    projectId: string;
    taskId: string;
    expectedTaskRevision: number;
    message: string;
  }): Promise<AgentResult<LocalRun>> {
    try {
      const run = await this.client.startRun({
        kind: "BUILDER",
        projectId: input.projectId,
        taskId: input.taskId,
        expectedTaskRevision: input.expectedTaskRevision,
        idempotencyKey: entityId("idem"),
        message: input.message,
      });
      return ok(run);
    } catch (e) {
      // Maps RUN_BUSY / STALE_TASK_REVISION / TASK_ALREADY_COMPLETED / ...
      return err(toAgentError(e, "startBuilder failed"));
    }
  }

  async startHelper(input: {
    projectId: string;
    taskId: string;
    decisionId?: string;
    message: string;
    origin: "FREE_TEXT" | "QUICK_ACTION";
  }): Promise<AgentResult<LocalRun>> {
    try {
      const run = await this.client.startRun({
        kind: "HELPER",
        projectId: input.projectId,
        taskId: input.taskId,
        ...(input.decisionId ? { decisionId: input.decisionId } : {}),
        idempotencyKey: entityId("idem"),
        message: input.message,
        origin: input.origin,
      });
      return ok(run);
    } catch (e) {
      // Maps DECISION_BINDING_MISMATCH / HELPER_EMPTY_RESPONSE / ...
      return err(toAgentError(e, "startHelper failed"));
    }
  }

  async watch(
    runId: string,
    handlers: WatchHandlers,
  ): Promise<AgentResult<LocalRun>> {
    try {
      const run = await this.client.watchRun(
        runId,
        (event) => handlers.onEvent(projectRunEvent(event)),
        {
          signal: handlers.signal,
          after: handlers.after,
          onRun: handlers.onRun,
        },
      );
      return ok(run);
    } catch (e) {
      // An AbortError is NOT a cancel — it is normalized like any other failure;
      // the controller distinguishes abort via its own `signal.aborted` check.
      return err(toAgentError(e, "watch failed"));
    }
  }

  async cancel(runId: string): Promise<AgentResult<LocalRun>> {
    try {
      const run = await this.client.cancelRun(runId);
      return ok(run);
    } catch (e) {
      return err(toAgentError(e, "cancel failed"));
    }
  }

  async listActiveBuilderRun(
    projectId: string,
  ): Promise<AgentResult<LocalRun | null>> {
    try {
      const runs = await this.client.listRuns(projectId);
      const active =
        runs.find((r) => r.kind === "BUILDER" && isRunActive(r)) ?? null;
      return ok(active);
    } catch (e) {
      return err(toAgentError(e, "listActiveBuilderRun failed"));
    }
  }

  async snapshot(
    projectId: string,
  ): Promise<AgentResult<ProjectSessionSnapshot>> {
    try {
      const snapshot = await this.client.restoreProject(projectId);
      return ok(snapshot);
    } catch (e) {
      return err(toAgentError(e, "snapshot failed"));
    }
  }

  async execute<K extends UiRequest["kind"]>(
    request: Extract<UiRequest, { kind: K }>,
  ): Promise<AgentResult<LocalUiResponse<K>>> {
    try {
      const response = await this.client.execute(request);
      return ok(response);
    } catch (e) {
      return err(toAgentError(e, "execute failed"));
    }
  }

  // --- NativeInputPort ---

  getStatus(): NativeWorkerStatusCode | undefined {
    return this.worker.getStatus();
  }

  listUserInputs(projectId: string): NativeQuestion[] {
    return this.worker.listUserInputs(projectId);
  }

  subscribeStatus(
    listener: (code: NativeWorkerStatusCode) => void,
  ): () => void {
    return this.worker.subscribeStatus(listener);
  }

  subscribeUserInputs(listener: () => void): () => void {
    return this.worker.subscribeUserInputs(listener);
  }

  async submit(
    answer: NativeAnswer,
  ): Promise<
    AgentResult<"SUBMITTED" | "ALREADY_SUBMITTED" | "ALREADY_HANDLED">
  > {
    try {
      return ok(await this.worker.submitUserInput(answer));
    } catch (e) {
      // Maps NATIVE_USER_INPUT_STALE / NATIVE_USER_INPUT_RESPONSE_INVALID /
      // NATIVE_NOT_READY.
      return err(toAgentError(e, "submit failed"));
    }
  }
}
