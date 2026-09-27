/**
 * Deterministic, controllable {@link CoreClient} test double (design "Testing
 * Strategy" > Fakes).
 *
 * {@link FakeCoreClient} is a hand-written, contract-shaped fake that drives the
 * live `AgentSurfaceController` / `ManagedAgentPort` through the REAL SDK
 * helpers with no live backend, no process, and no network. It mirrors the
 * hand-written-fake style of `test/local-core-port.test.ts`: every method
 * returns a minimal, valid contract-shaped value cast at the boundary, and each
 * method is individually overridable so a test can script `ok`-shaped values or
 * `LocalClientError`-like throws to exercise error mapping.
 *
 * ## Controllable `watchRun`
 *
 * The centerpiece is a fully controllable {@link FakeCoreClient.watchRun}. A
 * test drives a live turn deterministically:
 *
 *  1. call the port's `watch(...)` (which calls `watchRun`), keeping the
 *     returned promise;
 *  2. {@link FakeCoreClient.emit} one or more `LocalRunEvent`s -> forwarded to
 *     the current `onEvent` callback (Builder transcript / tool rows);
 *  3. {@link FakeCoreClient.settle} a chosen terminal `LocalRun` -> resolves the
 *     pending `watchRun` promise; or {@link FakeCoreClient.failWatch} to reject.
 *
 * The `after` option passed to each `watchRun` is recorded in
 * {@link FakeCoreClient.watchAfters} (and {@link FakeCoreClient.lastWatchAfter})
 * so recovery tests can assert replay-from-0 (design Correctness Property 6).
 * Whether the watch's `AbortSignal` fired is recorded in
 * {@link FakeCoreClient.lastWatchAborted}.
 *
 * ## Determinism guarantees
 *
 * - No randomness, no timers, no wall-clock reads: events flow only when the
 *   test calls {@link FakeCoreClient.emit} / {@link FakeCoreClient.settle} /
 *   {@link FakeCoreClient.failWatch}.
 * - `watchRun` returns a promise that settles ONLY when the test settles it, so
 *   an in-flight run models a live SSE stream precisely.
 */

import type {
  CoreClient,
  HostStatus,
} from "../../vendor/frontend-host";
import type {
  LocalRun,
  LocalRunEvent,
  LocalRunInput,
  LocalUiResponse,
  ProjectSessionSnapshot,
  UiRequest,
} from "../../vendor/frontend-client";
import { LocalClientError } from "../../vendor/frontend-client";

/** ISO timestamp used for all contract-shaped fixtures. */
const ISO = "2026-01-02T03:04:05.000Z";

/**
 * A scripted throw: either the real {@link LocalClientError} or a duck-typed
 * `LocalClientError`-like object (matches the adapter's structural branch).
 */
export interface ClientErrorLike {
  readonly code: string;
  readonly status?: number;
  readonly message?: string;
  readonly name?: string;
}

/**
 * A scripted result for an overridable method: a value to resolve, or a
 * {@link ClientErrorLike} / {@link LocalClientError} to throw.
 */
export type ScriptedResult<T> =
  | { readonly resolve: T }
  | { readonly throw: ClientErrorLike | LocalClientError };

/** Construct a `LocalClientError`-like plain object (as thrown by the SDK). */
export function clientError(
  code: string,
  status?: number,
  message = "boom",
): ClientErrorLike {
  return { code, status, message, name: "LocalClientError" };
}

/** Construction options for {@link FakeCoreClient}. */
export interface FakeCoreClientOptions {
  /** Override `startRun` (default: an ACCEPTED BUILDER {@link LocalRun}). */
  readonly startRunResult?: ScriptedResult<LocalRun>;
  /** Override `cancelRun` (default: a CANCELLED terminal {@link LocalRun}). */
  readonly cancelRunResult?: ScriptedResult<LocalRun>;
  /** Override `listRuns` (default: `[]`). */
  readonly listRunsResult?: ScriptedResult<LocalRun[]>;
  /** Override `restoreProject` (default: a snapshot with a current task). */
  readonly restoreProjectResult?: ScriptedResult<ProjectSessionSnapshot>;
  /** Override `getRun` (default: an ACCEPTED BUILDER {@link LocalRun}). */
  readonly getRunResult?: ScriptedResult<LocalRun>;
  /**
   * Override `execute`, either uniformly for every request or per request
   * kind. A per-kind entry takes precedence over the uniform one.
   */
  readonly executeResult?: ScriptedResult<unknown>;
  readonly executeResultByKind?: Partial<
    Record<UiRequest["kind"], ScriptedResult<unknown>>
  >;
}

/**
 * Build a minimal, valid contract-shaped {@link LocalRun}. Only the fields the
 * classifier / port read are meaningful; the rest are shape-valid defaults.
 * Override any field via `overrides`.
 */
export function fakeLocalRun(overrides: Partial<LocalRun> = {}): LocalRun {
  return {
    protocolVersion: 1,
    backendInstanceId: "backend_1",
    id: "run_1",
    projectId: "project_1",
    kind: "BUILDER",
    phase: "RUNNING",
    status: "ACCEPTED",
    outcome: "PENDING",
    createdAt: ISO,
    updatedAt: ISO,
    errorCode: null,
    lastSequence: 0,
    retainedFromSequence: 0,
    ...overrides,
  } as LocalRun;
}

/**
 * Build a minimal, valid contract-shaped {@link ProjectSessionSnapshot} with a
 * `currentTask` present (so `prepareBuilder` succeeds by default). Override any
 * top-level field via `overrides`; pass `currentTask: null` to exercise the
 * "no current task" path.
 */
export function fakeSnapshot(
  overrides: Partial<Record<string, unknown>> = {},
): ProjectSessionSnapshot {
  const currentTask =
    "currentTask" in overrides
      ? overrides.currentTask
      : {
          schemaVersion: 1,
          id: "task_1",
          projectId: "project_1",
          learningSpecId: "learning_spec_1",
          learningSpecRevision: 1,
          correlationId: "corr_task",
          revision: 1,
          title: "습관 트래커 만들기",
          productGoal: "습관 형성을 돕는다",
          requirements: ["체크 UI"],
          acceptanceCriteria: [{ key: "AC1", description: "체크 동작" }],
          expectedConcepts: ["상태 관리"],
          excludedWork: ["로그인"],
          prerequisiteTaskIds: [],
          expectedDecisionCategories: ["PRODUCT_BEHAVIOR"],
          sequence: 1,
          status: "ACTIVE",
          createdAt: ISO,
          updatedAt: ISO,
          source: { kind: "CORE" },
          redactionStatus: "NOT_REQUIRED",
        };
  return {
    schemaVersion: 1,
    correlationId: "corr_snap",
    project: {
      schemaVersion: 1,
      id: "project_1",
      correlationId: "corr_p",
      revision: 1,
      title: "습관 트래커",
      learningGoal: "TypeScript로 작은 앱 만들기",
      status: "BUILDING",
      createdAt: ISO,
      updatedAt: ISO,
      source: { kind: "USER" },
      redactionStatus: "NOT_REQUIRED",
    },
    suggestedSurface: "BUILD",
    discoverySession: null,
    discoveryContext: null,
    selectedCandidate: null,
    learningSpec: null,
    activeTask: null,
    currentTask,
    liveContext: null,
    pendingDecisions: [],
    decisions: [],
    completionReport: null,
    helperConversations: [],
    ...overrides,
  } as unknown as ProjectSessionSnapshot;
}

/** A pending controllable watch: its resolve / reject fns and the abort signal. */
interface PendingWatch {
  readonly runId: string;
  readonly onEvent: (event: LocalRunEvent) => void;
  readonly onRun?: (run: LocalRun) => void;
  readonly signal?: AbortSignal;
  resolve(run: LocalRun): void;
  reject(err: unknown): void;
}

/**
 * Apply a {@link ScriptedResult}: resolve its value or throw its error. Throws
 * a real {@link LocalClientError} when given one, else the plain object as-is
 * (the adapter's structural branch reads `code` / `status` / `message`).
 */
async function apply<T>(scripted: ScriptedResult<T>): Promise<T> {
  if ("throw" in scripted) {
    throw scripted.throw;
  }
  return scripted.resolve;
}

/**
 * Hand-written, controllable {@link CoreClient}. Implements the structural
 * host-only client surface (`health` / `execute` / `startDiscovery` /
 * `startRun` / `cancelRun` / `getRun` / `listRuns` / `watchRun` /
 * `listProjects` / `restoreProject`).
 */
export class FakeCoreClient implements CoreClient {
  // --- Overridable per-method behavior (set at construction or via setters) ---
  /** Scripted `startRun` result. Default: an ACCEPTED BUILDER run. */
  startRunResult: ScriptedResult<LocalRun>;
  /** Scripted `cancelRun` result. Default: a CANCELLED terminal run. */
  cancelRunResult: ScriptedResult<LocalRun>;
  /** Scripted `listRuns` result. Default: `[]`. */
  listRunsResult: ScriptedResult<LocalRun[]>;
  /** Scripted `restoreProject` result. Default: a snapshot with a current task. */
  restoreProjectResult: ScriptedResult<ProjectSessionSnapshot>;
  /** Scripted `getRun` result. Default: an ACCEPTED BUILDER run. */
  getRunResult: ScriptedResult<LocalRun>;
  /** Uniform scripted `execute` result (fallback across all kinds). */
  executeResult?: ScriptedResult<unknown>;
  /** Per-kind scripted `execute` results (take precedence over the uniform one). */
  readonly executeResultByKind: Partial<
    Record<UiRequest["kind"], ScriptedResult<unknown>>
  >;

  // --- watchRun recorders (assertions) ---
  /** Every `after` passed to `watchRun`, in call order (recovery replay checks). */
  readonly watchAfters: (number | undefined)[] = [];
  /** The last `after` passed to `watchRun`, or `undefined`. */
  lastWatchAfter: number | undefined;
  /** Whether the last watch's `AbortSignal` was aborted when it settled. */
  lastWatchAborted = false;
  /** Every request kind passed to `execute`, in call order. */
  readonly executeKinds: UiRequest["kind"][] = [];
  /** Every request passed to `startRun`, in call order. */
  readonly startRunInputs: LocalRunInput[] = [];

  private pending: PendingWatch | null = null;

  constructor(options: FakeCoreClientOptions = {}) {
    this.startRunResult =
      options.startRunResult ?? { resolve: fakeLocalRun() };
    this.cancelRunResult =
      options.cancelRunResult ??
      {
        resolve: fakeLocalRun({
          status: "CANCELLED",
          errorCode: "CANCELLED",
          outcome: "NONE",
        }),
      };
    this.listRunsResult = options.listRunsResult ?? { resolve: [] };
    this.restoreProjectResult =
      options.restoreProjectResult ?? { resolve: fakeSnapshot() };
    this.getRunResult = options.getRunResult ?? { resolve: fakeLocalRun() };
    this.executeResult = options.executeResult;
    this.executeResultByKind = options.executeResultByKind ?? {};
  }

  // --- controllable watch API ---

  /** Whether a `watchRun` is currently in flight (awaiting settle / fail). */
  get isWatching(): boolean {
    return this.pending !== null;
  }

  /**
   * Pump one projected {@link LocalRunEvent} into the current watch's `onEvent`
   * (and `onRun` when the event carries a run STATE). No-op if no watch is
   * pending.
   */
  emit(event: LocalRunEvent): void {
    const w = this.pending;
    if (!w) {
      return;
    }
    w.onEvent(event);
    if (event.kind === "STATE" && event.run && w.onRun) {
      w.onRun(event.run);
    }
  }

  /** Resolve the pending `watchRun` with a chosen terminal {@link LocalRun}. */
  settle(terminalRun: LocalRun): void {
    const w = this.pending;
    if (!w) {
      return;
    }
    this.pending = null;
    this.lastWatchAborted = w.signal?.aborted ?? false;
    w.resolve(terminalRun);
  }

  /** Reject the pending `watchRun` (e.g. an abort / transport failure). */
  failWatch(err: unknown): void {
    const w = this.pending;
    if (!w) {
      return;
    }
    this.pending = null;
    this.lastWatchAborted = w.signal?.aborted ?? false;
    w.reject(err);
  }

  // --- CoreClient methods ---

  async health(): Promise<{
    protocolVersion: number;
    backendInstanceId: string;
    agent?: string;
  }> {
    return { protocolVersion: 1, backendInstanceId: "backend_1" };
  }

  async execute<K extends UiRequest["kind"]>(
    request: Extract<UiRequest, { kind: K }>,
  ): Promise<LocalUiResponse<K>> {
    this.executeKinds.push(request.kind);
    const scripted = this.executeResultByKind[request.kind] ?? this.executeResult;
    if (!scripted) {
      // No script: resolve a minimal accepted-shaped response.
      return {
        schemaVersion: 1,
        correlationId: "corr_exec",
        accepted: true,
        resourceRevision: 1,
      } as unknown as LocalUiResponse<K>;
    }
    return (await apply(scripted)) as LocalUiResponse<K>;
  }

  // `startDiscovery` is part of the structural CoreClient but unused by the
  // agent surfaces; a minimal shape-valid default keeps the interface satisfied.
  async startDiscovery(): ReturnType<CoreClient["startDiscovery"]> {
    return {
      projectId: "project_1",
      run: fakeLocalRun({ kind: "DISCOVERY" }),
    } as unknown as Awaited<ReturnType<CoreClient["startDiscovery"]>>;
  }

  async startRun(request: LocalRunInput): Promise<LocalRun> {
    this.startRunInputs.push(request);
    return apply(this.startRunResult);
  }

  async getRun(_id: string): Promise<LocalRun> {
    return apply(this.getRunResult);
  }

  async listRuns(_projectId: string): Promise<LocalRun[]> {
    return apply(this.listRunsResult);
  }

  async cancelRun(_id: string): Promise<LocalRun> {
    return apply(this.cancelRunResult);
  }

  watchRun(
    id: string,
    onEvent: (event: LocalRunEvent) => void,
    options?: {
      signal?: AbortSignal;
      after?: number;
      onRun?: (run: LocalRun) => void;
    },
  ): Promise<LocalRun> {
    this.watchAfters.push(options?.after);
    this.lastWatchAfter = options?.after;
    this.lastWatchAborted = false;
    return new Promise<LocalRun>((resolve, reject) => {
      this.pending = {
        runId: id,
        onEvent,
        onRun: options?.onRun,
        signal: options?.signal,
        resolve,
        reject,
      };
    });
  }

  async listProjects(): ReturnType<CoreClient["listProjects"]> {
    return { projects: [] } as unknown as Awaited<
      ReturnType<CoreClient["listProjects"]>
    >;
  }

  async restoreProject(_projectId: string): Promise<ProjectSessionSnapshot> {
    return apply(this.restoreProjectResult);
  }
}

/** Re-export for tests that also need to assert a `HostStatus` shape. */
export type { HostStatus };
