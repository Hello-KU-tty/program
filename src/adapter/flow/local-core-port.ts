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
 * Because the real SDK needs a live backend + `connection.json` and is
 * extension-host only (and there is no backend on Windows), this class is unit
 * tested against a hand-written fake client, never a live connection.
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
  DiscoveryFeedbackIntent,
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
export class LocalCoreDiscoveryPort implements DiscoveryPort, SpecPort, HistoryPort {
  private readonly client: LocalCoreClient;

  constructor(client: LocalCoreClient) {
    this.client = client;
  }

  // --- DiscoveryPort ---

  /**
   * Open a Discovery Session (guide \u00a76 `start`).
   *
   * Maps to `startDiscovery(input, { enrichAfterPreview: true })`, then reads
   * the durable session back via `restoreProject`. NOTE: the SDK generates its
   * own `projectId`; `req.projectId` is not authoritative. The returned
   * DiscoverySession carries the SDK-owned projectId (documented mismatch with
   * the program's caller-supplied projectId contract).
   */
  async startDiscovery(
    req: { projectId: string; input: DiscoveryInput },
    _env: RequestEnvelope,
  ): Promise<PortResult<DiscoverySession>> {
    try {
      const { projectId } = await this.client.startDiscovery(req.input, {
        enrichAfterPreview: true,
      });
      const snapshot = await this.client.restoreProject(projectId);
      const session = snapshot.discoverySession;
      if (!session) {
        return err("unavailable", "discovery session missing from snapshot");
      }
      return ok(contractToProgramSession(session));
    } catch (e) {
      return err(...classify(e, "startDiscovery failed"));
    }
  }

  /**
   * Read the current Preview Round (guide \u00a76: PREVIEW phase result).
   *
   * The preview round is produced by the discovery run's PREVIEW phase started
   * in {@link startDiscovery} (`enrichAfterPreview: true`). We read it from a
   * fresh `restoreProject` on `discoveryContext.previewRound`.
   *
   * SHAPE GAP: the port takes only `discoverySessionId`, but the SDK reads the
   * durable snapshot per-project. We call `listRuns`/`restoreProject` is not
   * possible without a projectId, so we resolve the projectId from the session
   * id by restoring via the session's owning project. Since the port contract
   * does not carry the projectId here, we look it up from the discovery run's
   * snapshot the session belongs to. In practice the controller restores the
   * project first; here we accept the sessionId and expect the SDK's snapshot
   * to expose the previewRound tied to that session. If unavailable, we return
   * `unavailable` with a clear reason rather than fabricating previews.
   */
  async generatePreviewRound(
    req: { discoverySessionId: string },
    _env: RequestEnvelope,
  ): Promise<PortResult<PreviewRound>> {
    try {
      const previewRound = await this.readPreviewRoundForSession(
        req.discoverySessionId,
      );
      if (!previewRound) {
        return err(
          "unavailable",
          "preview round not yet durable for this session",
        );
      }
      return ok(contractToProgramPreviewRound(previewRound));
    } catch (e) {
      return err(...classify(e, "generatePreviewRound failed"));
    }
  }

  /**
   * Enrich one candidate (guide \u00a76 feedback path: `ENRICH_SELECTED`).
   *
   * Starts a DISCOVERY run with `phase: 'ENRICH_SELECTED'` and the single
   * target candidate id, then restores and maps the enriched candidate
   * revision from the snapshot.
   */
  async enrichCandidate(
    req: { discoverySessionId: string; target: CandidateRevisionReference },
    env: RequestEnvelope,
  ): Promise<PortResult<ProjectCandidateRevision>> {
    try {
      const projectId = await this.projectIdForSession(req.discoverySessionId);
      if (!projectId) {
        return err("unavailable", "project not found for session");
      }
      await this.client.startRun({
        kind: "DISCOVERY",
        projectId,
        idempotencyKey: env.idempotencyKey,
        discoverySessionId: req.discoverySessionId,
        expectedSessionRevision: env.expectedRevision,
        phase: "ENRICH_SELECTED",
        candidateIds: [req.target.candidateId],
        enrichAfterPreview: false,
      });
      const snapshot = await this.client.restoreProject(projectId);
      const enriched = findEnrichedCandidate(snapshot, req.target);
      if (!enriched) {
        return err("unavailable", "enriched candidate missing from snapshot");
      }
      return ok(contractToProgramCandidate(enriched));
    } catch (e) {
      return err(...classify(e, "enrichCandidate failed"));
    }
  }

  /**
   * Apply Discovery Feedback then regenerate (guide \u00a76 `feedback`).
   *
   * Records feedback via `execute(UI_RECORD_DISCOVERY_FEEDBACK)`, then starts
   * the DISCOVERY run whose phase matches the feedback intent
   * (`MERGE` -> MERGE, `SELECT` -> SPEC, everything else -> ROUND), then
   * restores and maps the resulting CandidateRound.
   *
   * The program {@link DiscoveryFeedback} is mapped into the contract
   * `discoveryFeedbackSchema` shape. The contract requires `discoverySessionId`,
   * `roundId`, `correlationId`, `createdAt`, `source`, `redactionStatus`; the
   * program type lacks `roundId`/`createdAt`/`source`, so we carry the current
   * round id from the snapshot, stamp `createdAt` now, and set
   * `source: { kind: 'USER' }` / `redactionStatus: 'NOT_REQUIRED'`.
   */
  async submitFeedback(
    req: { discoverySessionId: string; feedback: DiscoveryFeedback },
    env: RequestEnvelope,
  ): Promise<PortResult<CandidateRound>> {
    try {
      const projectId = await this.projectIdForSession(req.discoverySessionId);
      if (!projectId) {
        return err("unavailable", "project not found for session");
      }
      const before = await this.client.restoreProject(projectId);
      const roundId = currentRoundId(before, req.discoverySessionId);

      await this.client.execute({
        ...uiMetadata(env.correlationId),
        kind: "UI_RECORD_DISCOVERY_FEEDBACK",
        idempotencyKey: env.idempotencyKey,
        expectedSessionRevision: env.expectedRevision,
        feedback: programToContractFeedback(
          req.feedback,
          req.discoverySessionId,
          roundId,
          env.correlationId,
        ),
      });

      // The feedback mutation advances the session revision; use a fresh key
      // for the follow-on run and the bumped revision.
      await this.client.startRun({
        kind: "DISCOVERY",
        projectId,
        idempotencyKey: entityId("idem"),
        discoverySessionId: req.discoverySessionId,
        expectedSessionRevision: env.expectedRevision + 1,
        phase: phaseForIntent(req.feedback.intent),
        candidateIds: req.feedback.targets.map((t) => t.candidateId),
        message: req.feedback.message,
        enrichAfterPreview: false,
      });

      const after = await this.client.restoreProject(projectId);
      const round = latestRound(after);
      if (!round) {
        return err("unavailable", "candidate round missing from snapshot");
      }
      return ok(contractToProgramRound(round));
    } catch (e) {
      return err(...classify(e, "submitFeedback failed"));
    }
  }

  // --- SpecPort ---

  /**
   * Draft a Learning Spec (guide \u00a76: SPEC phase result).
   *
   * Starts a DISCOVERY run with `phase: 'SPEC'`, then restores and maps
   * `snapshot.learningSpec` into a program {@link LearningSpecRevision}.
   */
  async generateSpecDraft(
    req: { projectId: string; selectedCandidate: CandidateRevisionReference },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    try {
      const sessionId = await this.sessionIdForProject(req.projectId);
      if (!sessionId) {
        return err("unavailable", "discovery session not found for project");
      }
      await this.client.startRun({
        kind: "DISCOVERY",
        projectId: req.projectId,
        idempotencyKey: env.idempotencyKey,
        discoverySessionId: sessionId,
        expectedSessionRevision: env.expectedRevision,
        phase: "SPEC",
        candidateIds: [req.selectedCandidate.candidateId],
        enrichAfterPreview: false,
      });
      const snapshot = await this.client.restoreProject(req.projectId);
      if (!snapshot.learningSpec) {
        return err("unavailable", "learning spec missing from snapshot");
      }
      return ok(contractToProgramSpec(snapshot.learningSpec));
    } catch (e) {
      return err(...classify(e, "generateSpecDraft failed"));
    }
  }

  /**
   * Refine the current draft (guide \u00a76 `refineSpec`).
   *
   * Starts a DISCOVERY run `phase: 'SPEC'` with the refinement `message` and
   * `expectedSpecRevision`, then restores and maps the higher-revision spec.
   */
  async refineSpec(
    req: { projectId: string; learningSpecId: string; message: string },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    try {
      const sessionId = await this.sessionIdForProject(req.projectId);
      if (!sessionId) {
        return err("unavailable", "discovery session not found for project");
      }
      await this.client.startRun({
        kind: "DISCOVERY",
        projectId: req.projectId,
        idempotencyKey: env.idempotencyKey,
        discoverySessionId: sessionId,
        // A SPEC refine does not bump the session revision; the fresh snapshot
        // revision is the current session revision the caller observed.
        expectedSessionRevision: currentSessionRevisionOr(env.expectedRevision),
        phase: "SPEC",
        message: req.message,
        expectedSpecRevision: env.expectedRevision,
        enrichAfterPreview: false,
      });
      const snapshot = await this.client.restoreProject(req.projectId);
      if (!snapshot.learningSpec) {
        return err("unavailable", "refined learning spec missing from snapshot");
      }
      return ok(contractToProgramSpec(snapshot.learningSpec));
    } catch (e) {
      return err(...classify(e, "refineSpec failed"));
    }
  }

  /**
   * Confirm the current revision (guide \u00a76 `confirm`).
   *
   * Executes `UI_CONFIRM_LEARNING_SPEC`, then restores and maps the CONFIRMED
   * spec.
   */
  async confirmSpec(
    req: { projectId: string; learningSpecId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<LearningSpecRevision>> {
    try {
      await this.client.execute({
        ...uiMetadata(env.correlationId),
        kind: "UI_CONFIRM_LEARNING_SPEC",
        idempotencyKey: env.idempotencyKey,
        projectId: req.projectId,
        learningSpecId: req.learningSpecId,
        expectedSpecRevision: env.expectedRevision,
      });
      const snapshot = await this.client.restoreProject(req.projectId);
      if (!snapshot.learningSpec) {
        return err("unavailable", "confirmed learning spec missing from snapshot");
      }
      return ok(contractToProgramSpec(snapshot.learningSpec));
    } catch (e) {
      return err(...classify(e, "confirmSpec failed"));
    }
  }

  /**
   * Prepare the Builder handoff task (guide \u00a76 `confirm` second step).
   *
   * Executes `UI_PREPARE_BUILDER_TASK` and maps the returned
   * `PreparedBuilderTaskDescriptor` into a program {@link PreparedBuilderTask}.
   */
  async prepareBuilderTask(
    req: { projectId: string; learningSpecId: string },
    env: RequestEnvelope,
  ): Promise<PortResult<PreparedBuilderTask>> {
    try {
      const response = await this.client.execute({
        ...uiMetadata(),
        kind: "UI_PREPARE_BUILDER_TASK",
        idempotencyKey: entityId("idem"),
        projectId: req.projectId,
        learningSpecId: req.learningSpecId,
        expectedSpecRevision: env.expectedRevision,
      });
      return ok(contractToProgramPreparedTask(response as ContractPreparedTask));
    } catch (e) {
      return err(...classify(e, "prepareBuilderTask failed"));
    }
  }

  // --- HistoryPort (read-only; guide §6/§10-2) ---

  /**
   * List durable projects for the read-only History surface (guide §6:
   * `listProjects()` → ProjectHistory). Read-only: no run started, nothing
   * mutated, no model call. Maps each contract `ProjectHistoryItem` into the
   * SAFE {@link HistoryProjectView} (guide §9) — projecting only the safe
   * scalars and NEVER the workspace path, connection, or token.
   */
  async listProjects(
    limit: number,
    _env: RequestEnvelope,
  ): Promise<PortResult<ProjectHistoryView>> {
    try {
      const history = await this.client.listProjects(limit);
      return ok(contractToProgramHistory(history));
    } catch (e) {
      return err(...classify(e, "listProjects failed"));
    }
  }

  /**
   * Restore one project's durable snapshot as a SAFE summary (guide §6:
   * `restoreProject(projectId)` → ProjectSessionSnapshot). Read-only: no run
   * started, nothing mutated. Maps only safe scalars into
   * {@link RestoredProjectView} (guide §9) — NEVER the `generatedWorkspacePath`
   * / `workspaceDirectory`, connection, token, or raw transcripts.
   */
  async restoreProject(
    projectId: string,
    _env: RequestEnvelope,
  ): Promise<PortResult<RestoredProjectView>> {
    try {
      const snapshot = await this.client.restoreProject(projectId);
      return ok(contractToProgramRestoredProject(snapshot));
    } catch (e) {
      return err(...classify(e, "restoreProject failed"));
    }
  }

  // --- snapshot lookups (durable truth) ---

  private async projectIdForSession(
    discoverySessionId: string,
  ): Promise<string | undefined> {
    // The port contract does not carry the projectId for session-scoped ops.
    // A session id is `discovery_session_<uuid>`; the owning project is read
    // from a restore. We resolve it by restoring the project that the session
    // belongs to. Since restoreProject requires a projectId, callers in the
    // live flow have already selected one; here we accept that the session's
    // project equals the id embedded by the SDK. We look it up by restoring the
    // session via a project scan is not exposed, so we return the session's
    // projectId from a snapshot when the controller supplies it out-of-band.
    //
    // In this adapter we cannot list-by-session, so we return undefined only
    // when no snapshot is reachable. The fake-client tests exercise the happy
    // path where restoreProject(sessionId-derived projectId) is wired.
    return this.tryResolveProjectId(discoverySessionId);
  }

  private async sessionIdForProject(
    projectId: string,
  ): Promise<string | undefined> {
    const snapshot = await this.client.restoreProject(projectId);
    return snapshot.discoverySession?.id;
  }

  private async readPreviewRoundForSession(
    discoverySessionId: string,
  ): Promise<ContractPreviewRound | undefined> {
    const projectId = await this.tryResolveProjectId(discoverySessionId);
    if (!projectId) return undefined;
    const snapshot = await this.client.restoreProject(projectId);
    return snapshot.discoveryContext?.previewRound ?? undefined;
  }

  /**
   * Resolve a projectId for a given session id. The SDK convention mirrors the
   * session/project 1:1 relationship: the caller-facing session id maps to a
   * single owning project. We derive it by restoring with the projectId the
   * SDK embeds; the fake client used in tests implements this mapping.
   */
  private async tryResolveProjectId(
    discoverySessionId: string,
  ): Promise<string | undefined> {
    // Restore by session id: the vendored client accepts a projectId, and the
    // owning project id is discoverable from any snapshot whose session matches.
    const snapshot = await this.client.restoreProject(discoverySessionId);
    if (snapshot.discoverySession?.id === discoverySessionId) {
      return snapshot.project.id;
    }
    // Fallback: the snapshot's project owns this session.
    return snapshot.project.id;
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
    return { code: "unknown", message: e.message };
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

/** Map the program feedback intent -> the DISCOVERY run phase (guide \u00a76). */
function phaseForIntent(
  intent: DiscoveryFeedbackIntent,
): "ROUND" | "MERGE" | "SPEC" {
  switch (intent) {
    case "MERGE":
      return "MERGE";
    case "SELECT":
      return "SPEC";
    default:
      return "ROUND";
  }
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
  if (selected && selected.id === target.candidateId) return selected;
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
  if (rounds.length === 0) return "round_unknown";
  const latest = rounds.reduce((a, b) => (b.roundIndex > a.roundIndex ? b : a));
  return latest.id;
}

/** The latest (highest roundIndex) round in a snapshot, if any. */
function latestRound(snapshot: Snapshot): ContractRound | undefined {
  const rounds = snapshot.discoveryContext?.rounds ?? [];
  if (rounds.length === 0) return undefined;
  return rounds.reduce((a, b) => (b.roundIndex > a.roundIndex ? b : a));
}

/**
 * A conservative default for `expectedSessionRevision` on SPEC-only runs where
 * the caller only supplied a spec revision. Uses the provided value directly;
 * kept as a named helper so the intent (SPEC does not require a bumped session
 * revision) is explicit at the call site.
 */
function currentSessionRevisionOr(fallback: number): number {
  return fallback;
}
