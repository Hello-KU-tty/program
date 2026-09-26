/**
 * LocalCoreDiscoveryPort — the REAL {@link DiscoveryPort} + {@link SpecPort}
 * implementation backed by the vendored `@vibe-helper/frontend-client`
 * (`LocalCoreClient`).
 *
 * This adapter is the "(a)" path from the FRONTEND_IDE_IMPLEMENTATION_GUIDE:
 * it swaps the port implementation behind the existing boundary so the
 * FlowController and webview never bind to a transport. The MockDiscoveryPort
 * stays as the dev/test double and fail-closed fallback; this class is only
 * constructed when a live local Core backend is available (see
 * `createFlowPortsAsync` in flow-port-factory.ts).
 *
 * HOST-ONLY (guide \u00a73, \u00a79). The `LocalCoreClient` wraps an authenticated
 * 127.0.0.1 HTTP/SSE connection. The connection descriptor
 * (`connection.json` path, `LocalConnection`, bearer token) lives ONLY in the
 * extension host and MUST NEVER cross into the webview. Nothing in this adapter
 * serializes the client, the connection, or any token: the port methods return
 * only the program-local flow-types (DiscoverySession, PreviewRound, ...),
 * which carry no credentials or absolute paths. The host projects those into a
 * safe view model separately.
 *
 * SDK-OWNED projectId (guide \u00a75). `client.startDiscovery` creates the Project
 * and returns its `projectId`; the caller's `req.projectId` is NOT honored as
 * authoritative. Discovery flows key off the durable snapshot read back via
 * `restoreProject`, which is the canonical durable truth (runs are transient).
 *
 * NON-THROWING (Req 1.1/1.2 + guide \u00a76). Every method wraps all SDK calls in
 * try/catch and returns a {@link PortResult} that is either `ok(value)` or
 * `err(PortError)`; it never throws. {@link LocalClientError} codes are mapped
 * to the normalized {@link PortError} code set by {@link toPortError}.
 *
 * The Windows handoff uses the managed host and durable run completion.
 */

import {
  entityId,
  uiMetadata,
  LocalClientError,
} from "../../../vendor/frontend-client";
import type { LocalCoreClient } from "../../../vendor/frontend-client";
import type {
  CandidateRevisionReference,
  CandidateRound,
  CandidateScopeSuggestion,
  DiscoveryFeedback,
  DiscoveryInput,
  DiscoverySession,
  ExpectedDecision,
  GenerationTag,
  LearningScopeCategory,
  LearningSpecRevision,
  LearningSpecStatus,
  PreparedBuilderTask,
  PreviewRound,
  ProjectCandidateRevision,
  SpecScopeEntry,
} from "../../core/flow/flow-types";
import type {
  HistoryProjectView,
  HistorySuggestedSurface,
  ProjectHistoryView,
  RestoredProjectView,
} from "../../core/flow/history-types";
import type {
  DiscoveryPort,
  HistoryPort,
  PortError,
  PortResult,
  RequestEnvelope,
  SpecPort,
} from "./discovery-port";

// --- Structural types derived from the SDK client (no external import needed) ---
//
// Deriving these from the client's own return types guarantees the mappers stay
// in lockstep with the vendored contract shapes: if the SDK changes, these
// aliases change and typecheck flags any drift.

/** The durable `ProjectSessionSnapshot` as returned by `restoreProject`. */
type Snapshot = Awaited<ReturnType<LocalCoreClient["restoreProject"]>>;
/** The contract discovery session (non-null form) on the snapshot. */
type ContractSession = NonNullable<Snapshot["discoverySession"]>;
/** The contract preview round on the snapshot's discoveryContext. */
type ContractDiscoveryContext = NonNullable<Snapshot["discoveryContext"]>;
type ContractPreviewRound = NonNullable<ContractDiscoveryContext["previewRound"]>;
/** The contract enriched candidate revision. */
type ContractCandidate = NonNullable<Snapshot["selectedCandidate"]>;
/** The contract candidate round on the discoveryContext. */
type ContractRound = ContractDiscoveryContext["rounds"][number];
/** The contract learning spec (non-null form). */
type ContractSpec = NonNullable<Snapshot["learningSpec"]>;
/** The `listProjects` response as returned by the SDK client. */
type ContractProjectHistory = Awaited<ReturnType<LocalCoreClient["listProjects"]>>;
/** A single history row (`ProjectHistoryItem`) on the history response. */
type ContractProjectHistoryItem = ContractProjectHistory["projects"][number];
/** The `UI_PREPARE_BUILDER_TASK` prepared descriptor. */
type ContractPreparedTask = Awaited<
  ReturnType<LocalCoreClient["execute"]>
> extends infer _R
  ? Extract<Awaited<ReturnType<LocalCoreClient["execute"]>>, { status: "READY"; workspacePath: string }>
  : never;

/**
 * Wrap a connected {@link LocalCoreClient} as a program port pair.
 *
 * @param client A LocalCoreClient already connected via `connectLocalCore`
 *   (host-only). The adapter never inspects the underlying connection.
 */
type CoreClient = Pick<LocalCoreClient, "health" | "execute" | "startDiscovery" | "startRun" | "cancelRun" | "getRun" | "listRuns" | "watchRun" | "listProjects" | "restoreProject">;
export class LocalCoreDiscoveryPort implements DiscoveryPort, SpecPort, HistoryPort {
  private readonly projects = new Map<string, string>();
  private readonly previews = new Map<string, string>();
  constructor(private readonly client: CoreClient) {}

  private remember(snapshot: Snapshot): Snapshot {
    if (snapshot.discoverySession) this.projects.set(snapshot.discoverySession.id, snapshot.project.id);
    return snapshot;
  }
  private async snapshot(projectId: string): Promise<Snapshot> {
    return this.remember(await this.client.restoreProject(projectId));
  }
  private async forSession(id: string): Promise<Snapshot> {
    const projectId = this.projects.get(id);
    if (!projectId) throw new Error("SESSION_RESTORE_REQUIRED");
    const snapshot = await this.snapshot(projectId);
    if (snapshot.discoverySession?.id !== id) throw new Error("STALE_DISCOVERY_SESSION");
    return snapshot;
  }
  private async wait(id: string): Promise<void> {
    const run = await this.client.watchRun(id, () => {}, { signal: AbortSignal.timeout(10 * 60_000) });
    if (run.status !== "SUCCEEDED" || run.outcome !== "DURABLE_RESULT") {
      throw new Error(run.errorCode ?? (run.status === "SUCCEEDED" ? "DURABLE_RESULT_REQUIRED" : run.status));
    }
  }
  private async run(snapshot: Snapshot, phase: "ENRICH_SELECTED" | "ENRICH_ALL" | "ROUND" | "MERGE" | "SPEC",
    key: string, candidateIds: string[] = [], message?: string, expectedSpecRevision?: number): Promise<Snapshot> {
    const session = snapshot.discoverySession;
    if (!session) throw new Error("DISCOVERY_SESSION_REQUIRED");
    const active = (await this.client.listRuns(snapshot.project.id)).some(r => r.kind === "DISCOVERY" && ["ACCEPTED", "RUNNING"].includes(r.status));
    if (active) throw new Error("DISCOVERY_RUN_ACTIVE_STOP_OR_WAIT");
    const accepted = await this.client.startRun({ kind: "DISCOVERY", projectId: snapshot.project.id,
      discoverySessionId: session.id, expectedSessionRevision: session.revision,
      idempotencyKey: key, phase, candidateIds, enrichAfterPreview: false,
      ...(message ? { message, expectedSpecRevision } : {}) });
    await this.wait(accepted.id);
    return this.snapshot(snapshot.project.id);
  }
  async startDiscovery(req: { projectId: string; input: DiscoveryInput }, _env: RequestEnvelope): Promise<PortResult<DiscoverySession>> {
    try {
      const { projectId, run } = await this.client.startDiscovery(req.input, { enrichAfterPreview: false });
      const snapshot = await this.snapshot(projectId);
      if (!snapshot.discoverySession) throw new Error("DISCOVERY_SESSION_REQUIRED");
      this.previews.set(snapshot.discoverySession.id, run.id);
      return ok(contractToProgramSession(snapshot.discoverySession));
    } catch (e) { return err(...classify(e, "startDiscovery failed")); }
  }
  async generatePreviewRound(req: { discoverySessionId: string }, _env: RequestEnvelope): Promise<PortResult<PreviewRound>> {
    try {
      const runId = this.previews.get(req.discoverySessionId);
      if (runId) await this.wait(runId);
      const snapshot = await this.forSession(req.discoverySessionId);
      if (!snapshot.discoveryContext?.previewRound) throw new Error("PREVIEW_NOT_DURABLE");
      return ok(contractToProgramPreviewRound(snapshot.discoveryContext.previewRound));
    } catch (e) { return err(...classify(e, "generatePreviewRound failed")); }
  }
  async enrichCandidate(req: { discoverySessionId: string; target: CandidateRevisionReference }, env: RequestEnvelope): Promise<PortResult<ProjectCandidateRevision>> {
    try {
      let snapshot = await this.forSession(req.discoverySessionId);
      let candidate = findEnrichedCandidate(snapshot, req.target);
      if (!candidate) {
        snapshot = await this.run(snapshot, "ENRICH_SELECTED", env.idempotencyKey, [req.target.candidateId]);
        candidate = findEnrichedCandidate(snapshot, req.target);
      }
      if (!candidate) throw new Error("CANDIDATE_REVISION_NOT_FOUND");
      return ok(contractToProgramCandidate(candidate));
    } catch (e) { return err(...classify(e, "enrichCandidate failed")); }
  }
  async submitFeedback(req: { discoverySessionId: string; feedback: DiscoveryFeedback }, env: RequestEnvelope): Promise<PortResult<CandidateRound>> {
    try {
      let snapshot = await this.forSession(req.discoverySessionId);
      if (!snapshot.discoveryContext) throw new Error("DISCOVERY_CONTEXT_REQUIRED");
      if (!snapshot.discoveryContext.rounds.length) {
        if (req.feedback.intent === "MORE") snapshot = await this.run(snapshot, "ENRICH_ALL", entityId("idem"));
        const missing = req.feedback.targets.filter(t => !findEnrichedCandidate(snapshot, t));
        if (missing.length) snapshot = await this.run(snapshot, "ENRICH_SELECTED", entityId("idem"), missing.map(t => t.candidateId));
      }
      const session = snapshot.discoverySession!;
      const roundId = currentRoundId(snapshot, session.id);
      await this.client.execute({ ...uiMetadata(session.correlationId), kind: "UI_RECORD_DISCOVERY_FEEDBACK",
        idempotencyKey: env.idempotencyKey, expectedSessionRevision: session.revision,
        feedback: programToContractFeedback(req.feedback, session.id, roundId, session.correlationId) });
      snapshot = await this.snapshot(snapshot.project.id);
      // SELECT is persisted here. The controller's next generateSpecDraft call owns the one SPEC run.
      if (req.feedback.intent !== "SELECT") snapshot = await this.run(snapshot,
        req.feedback.intent === "MERGE" ? "MERGE" : "ROUND", entityId("idem"));
      const round = latestRound(snapshot);
      if (round) return ok(contractToProgramRound(round));
      const preview = snapshot.discoveryContext?.previewRound;
      if (!preview || req.feedback.intent !== "SELECT") throw new Error("ROUND_NOT_DURABLE");
      // The existing port requires a round-shaped acknowledgement for SELECT;
      // its controller ignores it. This projection uses only persisted preview/enrichments.
      return ok({ roundIndex: 1, candidates: snapshot.discoveryContext!.candidateEnrichments.map(e => ({ candidateId: e.candidate.id, revision: e.candidate.revision })),
        generationRationale: preview.generationRationale, appliedFeedbackIds: [] });
    } catch (e) { return err(...classify(e, "submitFeedback failed")); }
  }
  async generateSpecDraft(req: { projectId: string; selectedCandidate: CandidateRevisionReference }, env: RequestEnvelope): Promise<PortResult<LearningSpecRevision>> {
    try {
      let snapshot = await this.snapshot(req.projectId);
      if (!snapshot.selectedCandidate || snapshot.selectedCandidate.id !== req.selectedCandidate.candidateId || snapshot.selectedCandidate.revision !== req.selectedCandidate.revision)
        throw new Error("SELECTED_CANDIDATE_REVISION_MISMATCH");
      if (!snapshot.learningSpec) snapshot = await this.run(snapshot, "SPEC", env.idempotencyKey);
      if (!snapshot.learningSpec) throw new Error("SPEC_NOT_DURABLE");
      return ok(contractToProgramSpec(snapshot.learningSpec));
    } catch (e) { return err(...classify(e, "generateSpecDraft failed")); }
  }
  async refineSpec(req: { projectId: string; learningSpecId: string; message: string }, env: RequestEnvelope): Promise<PortResult<LearningSpecRevision>> {
    try {
      let snapshot = await this.snapshot(req.projectId);
      if (snapshot.learningSpec?.id !== req.learningSpecId || snapshot.learningSpec.revision !== env.expectedRevision)
        throw new Error("STALE_SPEC_REVISION");
      snapshot = await this.run(snapshot, "SPEC", env.idempotencyKey, [], req.message, env.expectedRevision);
      if (!snapshot.learningSpec || snapshot.learningSpec.revision <= env.expectedRevision) throw new Error("SPEC_REVISION_NOT_ADVANCED");
      return ok(contractToProgramSpec(snapshot.learningSpec));
    } catch (e) { return err(...classify(e, "refineSpec failed")); }
  }
  async confirmSpec(req: { projectId: string; learningSpecId: string }, env: RequestEnvelope): Promise<PortResult<LearningSpecRevision>> {
    try {
      const before = await this.snapshot(req.projectId);
      await this.client.execute({ ...uiMetadata(before.discoverySession?.correlationId ?? before.project.correlationId), kind: "UI_CONFIRM_LEARNING_SPEC", ...req,
        idempotencyKey: env.idempotencyKey, expectedSpecRevision: env.expectedRevision });
      const snapshot = await this.snapshot(req.projectId);
      if (!snapshot.learningSpec) throw new Error("SPEC_NOT_DURABLE");
      return ok(contractToProgramSpec(snapshot.learningSpec));
    } catch (e) { return err(...classify(e, "confirmSpec failed")); }
  }
  async prepareBuilderTask(req: { projectId: string; learningSpecId: string }, env: RequestEnvelope): Promise<PortResult<PreparedBuilderTask>> {
    try {
      const before = await this.snapshot(req.projectId);
      const response = await this.client.execute({ ...uiMetadata(before.discoverySession?.correlationId ?? before.project.correlationId), kind: "UI_PREPARE_BUILDER_TASK", ...req,
        idempotencyKey: env.idempotencyKey, expectedSpecRevision: env.expectedRevision });
      return ok(contractToProgramPreparedTask(response));
    } catch (e) { return err(...classify(e, "prepareBuilderTask failed")); }
  }
  async listProjects(limit: number, _env: RequestEnvelope): Promise<PortResult<ProjectHistoryView>> {
    try { return ok(contractToProgramHistory(await this.client.listProjects(limit))); }
    catch (e) { return err(...classify(e, "listProjects failed")); }
  }
  async restoreProject(projectId: string, _env: RequestEnvelope): Promise<PortResult<RestoredProjectView>> {
    try { return ok(contractToProgramRestoredProject(await this.snapshot(projectId))); }
    catch (e) { return err(...classify(e, "restoreProject failed")); }
  }
}

// --- ok/err constructors ---

function ok<T>(value: T): PortResult<T> {
  return { ok: true, value };
}

function err(code: PortError["code"], message: string): PortResult<never> {
  return { ok: false, error: { code, message } };
}

// --- error mapping ---

/**
 * Translate an unknown thrown value into a normalized {@link PortError}
 * `(code, message)` tuple. {@link LocalClientError} codes are mapped per guide:
 *   - revision / STALE_* / 409             -> "revision_conflict"
 *   - CANCELLED / *CONNECTION* / *RESTART* -> "unavailable"
 *   - *TIMEOUT* / timeouts                 -> "timeout"
 *   - INVALID_* / validation               -> "invalid"
 *   - everything else                      -> "unknown"
 */
function classify(e: unknown, fallbackMessage: string): [PortError["code"], string] {
  const pe = toPortError(e, fallbackMessage);
  return [pe.code, pe.message];
}

/** Map an unknown error to a {@link PortError}. Exported for unit tests. */
export function toPortError(e: unknown, fallbackMessage: string): PortError {
  if (e instanceof LocalClientError) {
    return { code: mapClientCode(e.code, e.status), message: `${e.code}: ${e.message}` };
  }
  // Duck-typed LocalClientError-like (e.g. cross-realm or fake in tests).
  if (isClientErrorLike(e)) {
    const message =
      typeof e.message === "string" && e.message.length > 0
        ? `${e.code}: ${e.message}`
        : String(e.code);
    return { code: mapClientCode(e.code, e.status), message };
  }
  if (e instanceof Error) {
    // Timeouts surfaced as AbortError / DOMException.
    if (/timeout|timed out|abort/i.test(e.message) || e.name === "AbortError") {
      return { code: "timeout", message: e.message };
    }
    return { code: mapClientCode(e.message), message: /^[A-Z][A-Z0-9_]{0,99}$/.test(e.message) ? e.message : fallbackMessage };
  }
  return { code: "unknown", message: fallbackMessage };
}

interface ClientErrorLike {
  code: string;
  status?: number;
  message?: string;
}

function isClientErrorLike(e: unknown): e is ClientErrorLike {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  );
}

/** Map a string SDK error code (+ optional HTTP status) to a PortError code. */
function mapClientCode(code: string, status?: number): PortError["code"] {
  const c = code.toUpperCase();
  if (status === 409 || c.includes("STALE") || c.includes("REVISION") || c.includes("CONFLICT")) {
    return "revision_conflict";
  }
  if (c.includes("TIMEOUT") || c.includes("TIMED_OUT") || c.includes("DEADLINE")) {
    return "timeout";
  }
  if (
    c.includes("REQUIRED") ||
    c.includes("NOT_DURABLE") ||
    c.includes("ACTIVE_STOP") ||
    c.includes("CANCEL") ||
    c.includes("CONNECTION") ||
    c.includes("UNAVAILABLE") ||
    c.includes("BACKEND_RESTARTED") ||
    c.includes("RESTART") ||
    c.includes("ROTATED") ||
    status === 503 ||
    status === 502
  ) {
    return "unavailable";
  }
  if (c.includes("INVALID") || c.includes("VALIDATION") || c.includes("SCHEMA") || status === 400) {
    return "invalid";
  }
  return "unknown";
}

// --- contract -> program mappers (pure, total) ---

/** Map the SDK discovery session -> program {@link DiscoverySession}. */
export function contractToProgramSession(s: ContractSession): DiscoverySession {
  return {
    id: s.id,
    projectId: s.projectId,
    revision: s.revision,
    input: mapInput(s.input),
    status: s.status,
    schemaVersion: s.schemaVersion,
    createdAt: toEpoch(s.openedAt),
    updatedAt: toEpoch(s.updatedAt),
  };
}

function mapInput(input: ContractSession["input"]): DiscoveryInput {
  return {
    learningGoal: input.learningGoal,
    personalNeed: input.personalNeed,
    recentFriction: input.recentFriction,
    interestAreas: input.interestAreas ? [...input.interestAreas] : undefined,
    currentLevel: input.currentLevel,
    freeContext: input.freeContext,
  };
}

/** Map the SDK preview round -> program {@link PreviewRound} (10 previews, positions 1..10). */
export function contractToProgramPreviewRound(
  r: ContractPreviewRound,
): PreviewRound {
  return {
    discoverySessionId: r.discoverySessionId,
    previews: r.previews.map((p) => ({
      candidateId: p.candidateId,
      position: p.position,
      title: p.title,
      summary: p.summary,
      coreInteraction: p.coreInteraction,
      // The preview contract has no dedicated `appeal`/`technologyNecessity`
      // gap vs program: both are present on the preview shape.
      appeal: p.appeal,
      technologyNecessity: p.technologyNecessity,
      generationTags: [...p.generationTags] as GenerationTag[],
    })),
    generationRationale: r.generationRationale,
  };
}

/** Map an SDK enriched candidate -> program {@link ProjectCandidateRevision}. */
export function contractToProgramCandidate(
  c: ContractCandidate,
): ProjectCandidateRevision {
  return {
    candidateId: c.id,
    revision: c.revision,
    parentRevisions: c.parentRevisions.map(mapRef),
    title: c.title,
    summary: c.summary,
    targetUsers: [...c.targetUsers],
    coreInteraction: c.coreInteraction,
    usageMoment: c.usageMoment,
    appeal: c.appeal,
    personalNeedRelationship: c.personalNeedRelationship,
    technologyNecessity: c.technologyNecessity,
    coreConcepts: [...c.coreConcepts],
    mvpFeatures: [...c.mvpFeatures],
    suggestedScope: mapScopeSuggestion(c.suggestedScope),
    risks: c.risks ? [...c.risks] : undefined,
    generationTags: [...c.generationTags] as GenerationTag[],
    schemaVersion: c.schemaVersion,
    createdAt: toEpoch(c.createdAt),
  };
}

function mapScopeSuggestion(
  s: ContractCandidate["suggestedScope"],
): CandidateScopeSuggestion {
  return {
    learnerFocus: [...s.learnerFocus],
    agentSupport: [...s.agentSupport],
    excluded: [...s.excluded],
  };
}

/** Map an SDK candidate round -> program {@link CandidateRound}. */
export function contractToProgramRound(r: ContractRound): CandidateRound {
  return {
    roundIndex: r.roundIndex,
    candidates: r.candidates.map(mapRef),
    generationRationale: r.generationRationale,
    appliedFeedbackIds: [...r.appliedFeedbackIds],
  };
}

/** Map an SDK learning spec -> program {@link LearningSpecRevision}. */
export function contractToProgramSpec(s: ContractSpec): LearningSpecRevision {
  return {
    id: s.id,
    revision: s.revision,
    parentRevision: s.parentRevision,
    status: s.status as LearningSpecStatus,
    selectedCandidate: mapRef(s.selectedCandidate),
    productPurpose: s.productPurpose,
    targetUsers: [...s.targetUsers],
    primaryUsageMoment: s.primaryUsageMoment,
    successMoment: s.successMoment,
    mvpFeatures: [...s.mvpFeatures],
    scope: s.scope.map(
      (e): SpecScopeEntry => ({
        category: e.category as LearningScopeCategory,
        title: e.title,
        rationale: e.rationale,
        conceptNames: [...e.conceptNames],
      }),
    ),
    expectedDecisions: s.expectedDecisions.map(
      (d): ExpectedDecision => ({
        category: d.category,
        description: d.description,
        whyUserInputMatters: d.whyUserInputMatters,
      }),
    ),
    runtimeConstraint: "TYPESCRIPT",
    deploymentConstraints: [...s.deploymentConstraints],
    schemaVersion: s.schemaVersion,
    createdAt: toEpoch(s.createdAt),
  };
}

/** Map the `UI_PREPARE_BUILDER_TASK` descriptor -> program {@link PreparedBuilderTask}. */
export function contractToProgramPreparedTask(
  d: ContractPreparedTask,
): PreparedBuilderTask {
  return {
    projectId: d.projectId,
    workspacePath: d.workspacePath,
    status: "READY",
    schemaVersion: d.schemaVersion,
    // The prepared descriptor has no top-level createdAt; the task carries one.
    createdAt: undefined,
  };
}

// --- contract -> program History mappers (SAFE projection; guide §9) ---

/**
 * Map the SDK `ProjectHistory` -> program {@link ProjectHistoryView}.
 *
 * SECURITY (guide §9): projects ONLY the safe scalar fields of each
 * `ProjectHistoryItem`. It deliberately drops `project.generatedWorkspacePath`
 * (an absolute path), the `activeTask` body, `source`, `redactionStatus`, and
 * every other non-safe field. Nothing here can carry a connection, token, or
 * absolute path.
 */
export function contractToProgramHistory(
  history: ContractProjectHistory,
): ProjectHistoryView {
  return {
    projects: history.projects.map(contractToProgramHistoryItem),
  };
}

/** Map one contract `ProjectHistoryItem` -> a SAFE {@link HistoryProjectView}. */
function contractToProgramHistoryItem(
  item: ContractProjectHistoryItem,
): HistoryProjectView {
  return {
    projectId: item.project.id,
    title: item.project.title,
    learningGoal: item.project.learningGoal,
    status: item.project.status,
    suggestedSurface: item.suggestedSurface as HistorySuggestedSurface,
    pendingDecisionCount: item.pendingDecisionCount,
    helperConversationCount: item.helperConversationCount,
    updatedAt: toEpoch(item.project.updatedAt),
  };
}

/**
 * Map a restored `ProjectSessionSnapshot` -> a SAFE {@link RestoredProjectView}.
 *
 * SECURITY (guide §9): projects ONLY safe summary scalars — the project's
 * title/status/goal, the resume surface, whether a spec exists, and the current
 * task title if any. It NEVER reads `project.generatedWorkspacePath`, the
 * connection, a token, or any raw transcript/decision payload.
 */
export function contractToProgramRestoredProject(
  snapshot: Snapshot,
): RestoredProjectView {
  const view: RestoredProjectView = {
    projectId: snapshot.project.id,
    title: snapshot.project.title,
    learningGoal: snapshot.project.learningGoal,
    status: snapshot.project.status,
    suggestedSurface: snapshot.suggestedSurface as HistorySuggestedSurface,
    hasSpec: snapshot.learningSpec != null,
  };
  const currentTaskTitle = snapshot.currentTask?.title;
  if (currentTaskTitle) {
    view.currentTaskTitle = currentTaskTitle;
  }
  return view;
}

// --- program -> contract mappers ---

/**
 * Map a program {@link DiscoveryFeedback} into the contract
 * `discoveryFeedbackSchema` shape. The program type lacks the contract's
 * `roundId`, `createdAt`, `source`, and `redactionStatus`; those are supplied
 * from the current snapshot round, the current time, and fixed USER/redaction
 * defaults respectively. `correlationId` is carried so the mutation matches its
 * durable entity (guide \u00a75).
 */
export function programToContractFeedback(
  feedback: DiscoveryFeedback,
  discoverySessionId: string,
  roundId: string,
  correlationId: string,
) {
  return {
    schemaVersion: 1 as const,
    id: feedback.id,
    discoverySessionId,
    roundId,
    correlationId,
    intent: feedback.intent,
    targets: feedback.targets.map(mapRef),
    message: feedback.message,
    createdAt: new Date().toISOString(),
    source: { kind: "USER" as const },
    redactionStatus: "NOT_REQUIRED" as const,
  };
}

// --- small helpers ---

function mapRef(r: { candidateId: string; revision: number }): CandidateRevisionReference {
  return { candidateId: r.candidateId, revision: r.revision };
}

/** Best-effort ISO -> epoch ms; `undefined` when the input is absent/unparseable. */
function toEpoch(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : t;
}

/** Find the enriched candidate matching a target reference in a snapshot. */
function findEnrichedCandidate(
  snapshot: Snapshot,
  target: CandidateRevisionReference,
): ContractCandidate | undefined {
  const enrichments = snapshot.discoveryContext?.candidateEnrichments ?? [];
  const match = enrichments.find(
    (en) =>
      en.candidate.id === target.candidateId &&
      en.candidate.revision === target.revision,
  );
  if (match) return match.candidate;
  // Fallback: a freshly-enriched candidate may surface as selectedCandidate.
  const selected = snapshot.selectedCandidate;
  if (selected && selected.id === target.candidateId && selected.revision === target.revision) return selected;
  // Or in the discoveryContext candidate list.
  return snapshot.discoveryContext?.candidates.find(
    (c) => c.id === target.candidateId && c.revision === target.revision,
  );
}

/** The id of the latest (highest roundIndex) round tied to a session. */
function currentRoundId(snapshot: Snapshot, discoverySessionId: string): string {
  const rounds = (snapshot.discoveryContext?.rounds ?? []).filter(
    (r) => r.discoverySessionId === discoverySessionId,
  );
  if (rounds.length === 0) {
    const id = snapshot.discoveryContext?.previewRound?.finalRoundId;
    if (!id) throw new Error("ROUND_NOT_DURABLE");
    return id;
  }
  const latest = rounds.reduce((a, b) => (b.roundIndex > a.roundIndex ? b : a));
  return latest.id;
}

/** The latest (highest roundIndex) round in a snapshot, if any. */
function latestRound(snapshot: Snapshot): ContractRound | undefined {
  const rounds = snapshot.discoveryContext?.rounds ?? [];
  if (rounds.length === 0) return undefined;
  return rounds.reduce((a, b) => (b.roundIndex > a.roundIndex ? b : a));
}

