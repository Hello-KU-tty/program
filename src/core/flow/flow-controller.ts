/**
 * FlowController — host-owned authoritative state + orchestration for the
 * Discovery -> Spec flow.
 *
 * This is the analogue of the existing `PanelController`: a pure,
 * injected-dependency core that owns ALL Discovery/Spec state (Project +
 * DiscoverySession + accumulated CandidateRounds + Basket + current
 * LearningSpecRevision + per-surface in-flight/lock state + notices). It never
 * imports VS Code or a concrete port; it depends only on the
 * {@link FlowPorts} boundary, an injectable {@link Clock}, and an
 * {@link IdSource}, so it is fully deterministic under test.
 *
 * Behavior mirrors the design.md "FlowController" section:
 *   - single-flight lock per surface (Req 14.5 / 11.6)
 *   - 30s timeout per port op via the injected Clock (Req 4.9 / 11.8 / 14.4)
 *   - feedback validation before any port call (Req 3)
 *   - round accumulation + basket preservation (Req 5.4 / 6.4)
 *   - optimistic-revision handling for confirm (Req 11.9)
 *   - onChange for async, non-intent-driven mutations (Req 13.4)
 *
 * See design.md "Components and Interfaces > FlowController" and
 * "Error Handling". Requirements: 1.6, 3.*, 4.*, 5.4, 6.*, 7.9, 7.10, 8.*,
 * 10.*, 11.*, 13.1, 14.*.
 */

import { type Clock, SystemClock, type TimerId } from "../../core/clock";
import type {
  FlowPorts,
  PortError,
  PortResult,
  RequestEnvelope,
} from "../../adapter/flow/discovery-port";
import { validateFeedback } from "./feedback-validation";
import { buildFlowSnapshot, type FlowSnapshot } from "./flow-snapshot";
import {
  type CandidateRevisionReference,
  type CandidateRound,
  type DiscoveryFeedback,
  type DiscoveryFeedbackInput,
  type DiscoveryInput,
  type DiscoverySession,
  type LearningSpecRevision,
  type PreparedBuilderTask,
  type PreviewRound,
  type Project,
  type ProjectCandidateRevision,
  type ProjectStatus,
  refKey,
} from "./flow-types";

/** The two independently-locked surfaces of the flow. */
export type FlowSurface = "discovery" | "spec";

/** The kind of a notice surfaced to the webview. */
export type FlowNoticeKind = "error" | "validation" | "info";

/** An append-only, surface-scoped notice (error / validation / info). */
export interface FlowNotice {
  surface: FlowSurface;
  kind: FlowNoticeKind;
  message: string;
}

/**
 * Deterministic id source for `correlationId` / `idempotencyKey` / entity ids.
 * Injected so tests get repeatable, inspectable ids; production wires the
 * counter-based {@link DefaultIdSource}.
 */
export interface IdSource {
  /** A fresh correlation id for a request/response pair. */
  correlationId(): string;
  /** A fresh idempotency key so a retried call is deduped. */
  idempotencyKey(): string;
  /** A fresh entity id with the given prefix (e.g. `project`, `feedback`). */
  id(prefix: string): string;
}

/**
 * Counter-based, deterministic-friendly {@link IdSource}. Each call increments
 * a shared monotonic counter and formats it as `${prefix}_${n}`, so ids are
 * stable and inspectable in tests while remaining unique within a controller.
 */
export class DefaultIdSource implements IdSource {
  private counter = 0;

  correlationId(): string {
    return `corr_${++this.counter}`;
  }

  idempotencyKey(): string {
    return `idem_${++this.counter}`;
  }

  id(prefix: string): string {
    return `${prefix}_${++this.counter}`;
  }
}

/** Construction/wiring options for {@link FlowController}. */
export interface FlowControllerOptions {
  /** Defaults to a real {@link SystemClock}; inject a fake clock in tests. */
  clock?: Clock;
  /** Called for each emitted {@link FlowNotice} (in addition to `notices`). */
  onNotice?: (n: FlowNotice) => void;
  /** Called after any state mutation so the host can re-hydrate the webview. */
  onChange?: () => void;
  /** Deterministic id source; defaults to {@link DefaultIdSource}. */
  ids?: IdSource;
}

/** A single in-flight port operation on a surface (single-flight lock). */
export interface InFlightOp {
  /** The op kind, e.g. `startDiscovery`, `submitFeedback`, `confirmSpec`. */
  kind: string;
  /** The armed timeout timer, cleared on settle. */
  timerId: TimerId | null;
  /** Monotonic token guarding against a late resolution after a timeout. */
  token: number;
}

/** A read-only view of the controller's raw authoritative state (Req 13.1). */
export interface FlowControllerState {
  project: Project | null;
  lastSuccessfulStatus: ProjectStatus;
  session: DiscoverySession | null;
  input: DiscoveryInput | null;
  previewRound: PreviewRound | null;
  rounds: CandidateRound[];
  enrichedCandidates: ProjectCandidateRevision[];
  basket: string[];
  selectedCandidate: CandidateRevisionReference | null;
  spec: LearningSpecRevision | null;
  preparedTask: PreparedBuilderTask | null;
  discoveryInProgress: boolean;
  specInProgress: boolean;
}

/** The 30-second per-op timeout budget (Req 4.9 / 11.8 / 14.4). */
const TIMEOUT_MS = 30_000;

/** The Korean copy shown when a port op exceeds its timeout budget. */
const TIMEOUT_MESSAGE = "시간이 초과되었습니다. 다시 시도해 주세요.";

/**
 * Host-side authoritative core for the Discovery -> Spec flow. Owns all state
 * and orchestrates the {@link FlowPorts} behind a single-flight, timeout-guarded
 * runner.
 */
export class FlowController {
  private readonly ports: FlowPorts;
  private readonly clock: Clock;
  private readonly onChange?: () => void;
  private readonly onNotice?: (n: FlowNotice) => void;
  private readonly ids: IdSource;

  // --- authoritative state (single source of truth, Req 13.1) ---
  private project: Project | null = null;
  private lastSuccessfulStatus: ProjectStatus = "DISCOVERY";
  private session: DiscoverySession | null = null;
  private input: DiscoveryInput | null = null;
  private previewRound: PreviewRound | null = null;
  private rounds: CandidateRound[] = [];
  private readonly candidatesByRef = new Map<string, ProjectCandidateRevision>();
  private readonly basket = new Set<string>();
  private selectedCandidate: CandidateRevisionReference | null = null;
  private spec: LearningSpecRevision | null = null;
  private preparedTask: PreparedBuilderTask | null = null;
  private readonly inFlight: Record<FlowSurface, InFlightOp | null> = {
    discovery: null,
    spec: null,
  };
  private readonly _notices: FlowNotice[] = [];

  /** Monotonically increasing token so each op can guard its own settlement. */
  private tokenCounter = 0;

  constructor(ports: FlowPorts, options: FlowControllerOptions = {}) {
    this.ports = ports;
    this.clock = options.clock ?? new SystemClock();
    this.onChange = options.onChange;
    this.onNotice = options.onNotice;
    this.ids = options.ids ?? new DefaultIdSource();
  }

  // --- read accessors (consumed by the snapshot builder, task 8) ---

  /** Append-only notice log (Req 3.9, 14.3). */
  get notices(): readonly FlowNotice[] {
    return this._notices;
  }

  getProject(): Project | null {
    return this.project;
  }

  getSession(): DiscoverySession | null {
    return this.session;
  }

  getInput(): DiscoveryInput | null {
    return this.input;
  }

  getPreviewRound(): PreviewRound | null {
    return this.previewRound;
  }

  /** A shallow copy of the accumulated rounds (ascending `roundIndex`). */
  getRounds(): CandidateRound[] {
    return [...this.rounds];
  }

  /** The enriched candidate for a reference, if one has been fetched. */
  getCandidate(ref: CandidateRevisionReference): ProjectCandidateRevision | undefined {
    return this.candidatesByRef.get(refKey(ref));
  }

  /** All enriched candidates fetched so far (from the `candidatesByRef` store). */
  getEnrichedCandidates(): ProjectCandidateRevision[] {
    return [...this.candidatesByRef.values()];
  }

  /** Basket membership as canonical `refKey` strings. */
  getBasketKeys(): string[] {
    return [...this.basket];
  }

  getSelectedCandidate(): CandidateRevisionReference | null {
    return this.selectedCandidate;
  }

  getSpec(): LearningSpecRevision | null {
    return this.spec;
  }

  getPreparedTask(): PreparedBuilderTask | null {
    return this.preparedTask;
  }

  /** Whether a discovery-surface op is currently in flight. */
  isInProgress(surface: FlowSurface): boolean {
    return this.inFlight[surface] !== null;
  }

  /** Raw authoritative state for the snapshot builder (Req 13.1). */
  toState(): FlowControllerState {
    return {
      project: this.project,
      lastSuccessfulStatus: this.lastSuccessfulStatus,
      session: this.session,
      input: this.input,
      previewRound: this.previewRound,
      rounds: [...this.rounds],
      enrichedCandidates: [...this.candidatesByRef.values()],
      basket: [...this.basket],
      selectedCandidate: this.selectedCandidate,
      spec: this.spec,
      preparedTask: this.preparedTask,
      discoveryInProgress: this.inFlight.discovery !== null,
      specInProgress: this.inFlight.spec !== null,
    };
  }

  /**
   * Build an immutable {@link FlowSnapshot} projection of the current
   * authoritative state for the webview (Req 13.2). Delegates to the pure
   * {@link buildFlowSnapshot} builder, deep-copying rounds and arrays so the
   * webview projection can never mutate host state.
   */
  snapshot(): FlowSnapshot {
    return buildFlowSnapshot(this.toState(), this.notices);
  }

  // --- notice / change plumbing ---

  private notifyChange(): void {
    this.onChange?.();
  }

  private emitNotice(surface: FlowSurface, kind: FlowNoticeKind, message: string): void {
    const notice: FlowNotice = { surface, kind, message };
    this._notices.push(notice);
    this.onNotice?.(notice);
  }

  /** Build a fresh {@link RequestEnvelope} for a single port call (Req 1.6). */
  private envelope(expectedRevision: number): RequestEnvelope {
    return {
      correlationId: this.ids.correlationId(),
      idempotencyKey: this.ids.idempotencyKey(),
      expectedRevision,
    };
  }

  // --- shared single-flight, timeout-guarded runner ---

  /**
   * Run a single port operation on `surface` under the single-flight lock with
   * a 30s timeout. Returns `true` if the op was started, `false` if the surface
   * was already busy (single-flight rejection, Req 14.5 / 11.6).
   *
   * A per-op `token` guards settlement: if the timeout fires first it clears
   * the lock and runs the failure path; a later real resolution whose token no
   * longer matches is ignored (no double notice, no resurrecting a failed op).
   */
  private async runOp<T>(
    surface: FlowSurface,
    kind: string,
    call: (env: RequestEnvelope) => Promise<PortResult<T>>,
    expectedRevision: number,
    onOk: (value: T) => void | Promise<void>,
    onErr: (error: PortError) => void,
  ): Promise<boolean> {
    // Single-flight: refuse a same-surface op while one is already active.
    if (this.inFlight[surface] !== null) {
      return false;
    }

    const token = ++this.tokenCounter;

    // Arm the timeout. If it fires before resolution, treat as failure and
    // guard so the later real resolution is ignored.
    const timerId = this.clock.setTimeout(() => {
      const current = this.inFlight[surface];
      if (current === null || current.token !== token) {
        return; // already settled
      }
      this.inFlight[surface] = null;
      this.emitNotice(surface, "error", TIMEOUT_MESSAGE);
      onErr({ code: "timeout", message: TIMEOUT_MESSAGE });
      this.notifyChange();
    }, TIMEOUT_MS);

    this.inFlight[surface] = { kind, timerId, token };
    this.notifyChange();

    const result = await call(this.envelope(expectedRevision));

    // If a timeout already fired for this op, our token no longer matches;
    // ignore the late resolution entirely.
    const current = this.inFlight[surface];
    if (current === null || current.token !== token) {
      return true;
    }

    // Settle: clear timer + lock, then branch.
    if (current.timerId !== null) {
      this.clock.clearTimeout(current.timerId);
    }
    this.inFlight[surface] = null;

    if (result.ok) {
      await onOk(result.value);
    } else {
      onErr(result.error);
    }
    this.notifyChange();
    return true;
  }

  // --- Discovery Start (Req 4) ---

  /**
   * Begin discovery from a {@link DiscoveryInput}: create a Project, open a
   * session, and generate the first preview round. Single-flight on the
   * discovery surface (Req 4.4, 4.5, 14.5); failures retain the input and
   * re-enable the surface (Req 4.7, 4.8, 4.9).
   */
  async startDiscovery(input: DiscoveryInput): Promise<void> {
    if (this.inFlight.discovery !== null) {
      return;
    }

    const project: Project = {
      id: this.ids.id("project"),
      title: input.learningGoal.trim().slice(0, 40) || "새 프로젝트",
      learningGoal: input.learningGoal,
      status: "DISCOVERY",
    };
    this.project = project;
    this.lastSuccessfulStatus = "DISCOVERY";
    this.input = input;
    this.notifyChange();

    await this.runOp(
      "discovery",
      "startDiscovery",
      (env) => this.ports.discovery.startDiscovery({ projectId: project.id, input }, env),
      0,
      async (session) => {
        this.session = session;
        // The discovery surface is free again here (runOp cleared the lock
        // before invoking onOk), so chaining the preview op does not violate
        // single-flight. See design.md note on legitimate chaining.
        await this.generateFirstPreview();
      },
      (_error) => {
        // Retain input for resubmission; status stays DISCOVERY (Req 4.7).
        this.emitNotice("discovery", "error", "디스커버리를 시작하지 못했습니다. 다시 시도해 주세요.");
      },
    );
  }

  /** Request the first preview round for the current session (Req 4.5, 4.8). */
  private async generateFirstPreview(): Promise<void> {
    const session = this.session;
    if (session === null) {
      return;
    }
    await this.runOp(
      "discovery",
      "generatePreviewRound",
      (env) =>
        this.ports.discovery.generatePreviewRound({ discoverySessionId: session.id }, env),
      session.revision,
      (round) => {
        this.previewRound = round;
      },
      (_error) => {
        // Retain input for resubmission (Req 4.8).
        this.emitNotice("discovery", "error", "후보를 생성하지 못했습니다. 다시 시도해 주세요.");
      },
    );
  }

  // --- Refinement / feedback (Req 3, 6, 7, 8) ---

  /** Toggle a candidate reference in the basket (Req 6.1, 6.2). */
  toggleBasket(ref: CandidateRevisionReference): void {
    const key = refKey(ref);
    if (this.basket.has(key)) {
      this.basket.delete(key);
    } else {
      this.basket.add(key);
    }
    this.notifyChange();
  }

  /**
   * Validate and submit Discovery_Feedback (Req 3, 6.4, 7.9, 7.10, 8.*).
   *
   * Validation runs first: on rejection a notice is emitted and NO port call
   * is made, leaving session/basket/rounds untouched (Req 3.9). A SELECT
   * transitions the project to SPEC_REVIEW and drafts a spec; other accepted
   * intents append the resulting round while preserving the basket.
   */
  async submitFeedback(feedbackInput: DiscoveryFeedbackInput): Promise<{ accepted: boolean }> {
    const validation = validateFeedback(feedbackInput);
    if (!validation.ok) {
      // Req 3.9: notice only; do NOT touch session/basket/rounds or call a port.
      this.emitNotice("discovery", "validation", validation.reason);
      this.notifyChange();
      return { accepted: false };
    }

    // Single-flight on the discovery surface (Req 14.5).
    if (this.inFlight.discovery !== null) {
      return { accepted: false };
    }

    const session = this.session;
    if (session === null) {
      return { accepted: false };
    }

    const feedback: DiscoveryFeedback = {
      id: this.ids.id("feedback"),
      ...feedbackInput,
    };

    if (feedback.intent === "SELECT") {
      const selected = feedback.targets[0];
      const priorStatus = this.project?.status ?? "DISCOVERY";
      this.selectedCandidate = selected;
      if (this.project !== null) {
        this.project.status = "SPEC_REVIEW";
      }
      this.lastSuccessfulStatus = "SPEC_REVIEW";
      this.notifyChange();

      await this.runOp(
        "discovery",
        "submitFeedback",
        (env) =>
          this.ports.discovery.submitFeedback({ discoverySessionId: session.id, feedback }, env),
        session.revision,
        async () => {
          await this.generateSpecDraft(selected);
        },
        (_error) => {
          // Restore prior status; keep selection recorded for retry.
          if (this.project !== null) {
            this.project.status = priorStatus;
          }
          this.lastSuccessfulStatus = priorStatus;
          this.emitNotice("discovery", "error", "선택을 처리하지 못했습니다. 다시 시도해 주세요.");
        },
      );
      return { accepted: true };
    }

    // Non-SELECT accepted feedback -> request the resulting round.
    await this.runOp(
      "discovery",
      "submitFeedback",
      (env) =>
        this.ports.discovery.submitFeedback({ discoverySessionId: session.id, feedback }, env),
      session.revision,
      (round: CandidateRound) => {
        // Accumulate and keep ascending by roundIndex (Req 5.4). The basket is
        // preserved for still-present refs — we simply do not clear it (Req 6.4).
        this.rounds.push(round);
        this.rounds.sort((a, b) => a.roundIndex - b.roundIndex);
      },
      (_error) => {
        // Abort the round request; retain basket + input (Req 7.10).
        this.emitNotice("discovery", "error", "요청을 처리하지 못했습니다. 다시 시도해 주세요.");
      },
    );
    return { accepted: true };
  }

  /** Draft a Learning Spec for the selected candidate (Req 8.4). */
  private async generateSpecDraft(selected: CandidateRevisionReference): Promise<void> {
    const project = this.project;
    if (project === null) {
      return;
    }
    await this.runOp(
      "spec",
      "generateSpecDraft",
      (env) =>
        this.ports.spec.generateSpecDraft(
          { projectId: project.id, selectedCandidate: selected },
          env,
        ),
      0,
      (spec) => {
        this.spec = spec;
      },
      (_error) => {
        this.emitNotice("spec", "error", "스펙 초안을 생성하지 못했습니다. 다시 시도해 주세요.");
      },
    );
  }

  // --- Spec review (Req 10, 11) ---

  /**
   * Refine the current spec draft into a new DRAFT revision (Req 10.2, 10.3).
   * On failure the prior revision is retained and controls re-enabled (Req 10.5).
   */
  async refineSpec(message: string): Promise<void> {
    const spec = this.spec;
    const project = this.project;
    if (spec === null || project === null) {
      return;
    }
    await this.runOp(
      "spec",
      "refineSpec",
      (env) =>
        this.ports.spec.refineSpec(
          { projectId: project.id, learningSpecId: spec.id, message },
          env,
        ),
      spec.revision,
      (rev) => {
        this.spec = rev;
      },
      (_error) => {
        // Retain the prior revision (Req 10.5).
        this.emitNotice("spec", "error", "스펙을 다듬지 못했습니다. 다시 시도해 주세요.");
      },
    );
  }

  /**
   * Confirm the current spec -> CONFIRMED, advance the project to BUILDING, and
   * prepare the Builder handoff task (Req 11.2, 11.3, 11.4). Failures restore
   * the prior status (Req 11.7); a `revision_conflict` surfaces a "spec changed"
   * notice and leaves the status untouched (Req 11.9).
   */
  async confirmSpec(): Promise<void> {
    const spec = this.spec;
    const project = this.project;
    if (spec === null || project === null) {
      return;
    }
    const priorStatus = project.status;
    this.lastSuccessfulStatus = priorStatus;

    await this.runOp(
      "spec",
      "confirmSpec",
      (env) =>
        this.ports.spec.confirmSpec({ projectId: project.id, learningSpecId: spec.id }, env),
      spec.revision,
      async (rev) => {
        this.spec = rev; // CONFIRMED
        if (this.project !== null) {
          this.project.status = "BUILDING";
        }
        this.lastSuccessfulStatus = "BUILDING";
        await this.prepareBuilderTask();
      },
      (error) => {
        if (error.code === "revision_conflict") {
          // Leave status unchanged (Req 11.9).
          this.emitNotice("spec", "error", "스펙이 변경되었습니다. 다시 확인해 주세요.");
          return;
        }
        // Restore prior status (Req 11.7).
        if (this.project !== null) {
          this.project.status = priorStatus;
        }
        this.lastSuccessfulStatus = priorStatus;
        this.emitNotice("spec", "error", "스펙을 확정하지 못했습니다. 다시 시도해 주세요.");
      },
    );
  }

  /** Prepare the Builder handoff task once BUILDING (Req 11.4, 11.7). */
  private async prepareBuilderTask(): Promise<void> {
    const spec = this.spec;
    const project = this.project;
    if (spec === null || project === null) {
      return;
    }
    await this.runOp(
      "spec",
      "prepareBuilderTask",
      (env) =>
        this.ports.spec.prepareBuilderTask(
          { projectId: project.id, learningSpecId: spec.id },
          env,
        ),
      spec.revision,
      (task) => {
        this.preparedTask = task;
      },
      (_error) => {
        // Restore to the prior successful status (Req 11.7). At this point the
        // last successful status before confirm was recorded; fall back to
        // SPEC_REVIEW so the confirm control is retryable.
        if (this.project !== null) {
          this.project.status = "SPEC_REVIEW";
        }
        this.lastSuccessfulStatus = "SPEC_REVIEW";
        this.emitNotice("spec", "error", "빌더 작업을 준비하지 못했습니다. 다시 시도해 주세요.");
      },
    );
  }
}
