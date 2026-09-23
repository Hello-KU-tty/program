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
import {
  buildFlowSnapshot,
  DEFAULT_FLOW_SUPPORT,
  type FlowSnapshot,
  type FlowSupport,
} from "./flow-snapshot";
import type { CreateFlowPortsResult } from "../../adapter/flow/flow-port-factory";
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
import type { HistoryProjectView, RestoredProjectView } from "./history-types";

/** The two independently-locked surfaces of the flow. */
export type FlowSurface = "discovery" | "spec";

/**
 * The surface a notice is scoped to. The read-only History concern (guide
 * §6/§10-2) is independent of the discovery/spec single-flight surfaces, so it
 * gets its own `"history"` notice scope without joining {@link FlowSurface}.
 */
export type FlowNoticeSurface = FlowSurface | "history";

/** The kind of a notice surfaced to the webview. */
export type FlowNoticeKind = "error" | "validation" | "info";

/** An append-only, surface-scoped notice (error / validation / info). */
export interface FlowNotice {
  surface: FlowNoticeSurface;
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
  /** Read-only History list (guide §6/§10-2). Empty until loaded. */
  history: HistoryProjectView[];
  /** Whether the read-only History list is currently loading. */
  historyLoading: boolean;
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
  /**
   * The active port pair. NOT `readonly`: {@link FlowController.setPorts} /
   * {@link FlowController.applyPortResult} may replace it once, at startup,
   * after the async gated factory resolves (see the caveat on `setPorts`).
   */
  private ports: FlowPorts;
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

  // --- read-only History slice (guide §6/§10-2), independent of the state
  // machine above. Populated by loadHistory(); never starts a run or mutates.
  private history: HistoryProjectView[] = [];
  private historyLoading = false;

  /**
   * The current native-support verdict projected into every snapshot
   * (guide §10-1 label / fail-closed notice). Starts at the safe default
   * (mock, non-experimental) so a controller with no verdict yet is valid;
   * {@link FlowController.applyPortResult} / {@link FlowController.setFlowSupport}
   * updates it. SECURITY (guide §9): only the non-sensitive
   * `{ mode, experimental, reason? }` is held here — never a path or token.
   */
  private flowSupport: FlowSupport = DEFAULT_FLOW_SUPPORT;

  /** Monotonically increasing token so each op can guard its own settlement. */
  private tokenCounter = 0;

  constructor(ports: FlowPorts, options: FlowControllerOptions = {}) {
    this.ports = ports;
    this.clock = options.clock ?? new SystemClock();
    this.onChange = options.onChange;
    this.onNotice = options.onNotice;
    this.ids = options.ids ?? new DefaultIdSource();
  }

  // --- startup port/verdict swap (async gated factory, guide §10-1) ---

  /**
   * Replace the active port pair. This is a deliberately minimal setter for the
   * async-gated-factory startup swap: the extension host builds the controller
   * synchronously with the sync Mock ports (so first paint has zero delay), then
   * swaps to the real (or fail-closed Mock) ports once
   * {@link createFlowPortsAsync} resolves.
   *
   * CAVEAT: this simply replaces the internal reference and does NOT interrupt
   * any op in flight. It is only safe to call once at startup, before any user
   * intent has kicked off a port op. The provider calls it exactly once during
   * wiring, before the first user interaction, so a plain replace is sufficient.
   */
  setPorts(ports: FlowPorts): void {
    this.ports = ports;
  }

  /**
   * Update the held native-support verdict (guide §10-1). Included in every
   * subsequent {@link FlowController.snapshot}. SECURITY (guide §9): only the
   * non-sensitive `{ mode, experimental, reason? }` is retained — the caller
   * MUST NOT pass a connection path or token in `reason`.
   */
  setFlowSupport(support: FlowSupport): void {
    this.flowSupport = { ...support };
    this.notifyChange();
  }

  /**
   * Apply the result of the async gated factory in one step: swap to the chosen
   * ports and record the derived native-support verdict so it flows into every
   * snapshot. `experimental` comes from {@link isNativeFlowSupported}, passed in
   * by the provider (the factory result itself carries only `mode`/`reason`).
   *
   * SECURITY (guide §9): `result` carries only ports + a `mode`/`reason` string;
   * neither the connection file path nor a token is part of it, so nothing
   * sensitive is ever recorded or projected.
   */
  applyPortResult(result: CreateFlowPortsResult, experimental: boolean): void {
    this.ports = result.ports;
    this.flowSupport = {
      mode: result.mode,
      experimental,
      ...(result.reason !== undefined ? { reason: result.reason } : {}),
    };
    this.notifyChange();
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

  /** The current read-only History list (guide §6/§10-2). */
  getHistory(): HistoryProjectView[] {
    return [...this.history];
  }

  /** Whether the read-only History list is currently loading. */
  isHistoryLoading(): boolean {
    return this.historyLoading;
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
      history: [...this.history],
      historyLoading: this.historyLoading,
    };
  }

  /**
   * Build an immutable {@link FlowSnapshot} projection of the current
   * authoritative state for the webview (Req 13.2). Delegates to the pure
   * {@link buildFlowSnapshot} builder, deep-copying rounds and arrays so the
   * webview projection can never mutate host state.
   */
  snapshot(): FlowSnapshot {
    return buildFlowSnapshot(this.toState(), this.notices, this.flowSupport);
  }

  // --- notice / change plumbing ---

  private notifyChange(): void {
    this.onChange?.();
  }

  private emitNotice(
    surface: FlowNoticeSurface,
    kind: FlowNoticeKind,
    message: string,
  ): void {
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

  // --- read-only History (guide §6/§10-2) ---

  /**
   * Load the read-only History list from the {@link HistoryPort} (guide §6:
   * `listProjects()`). This is a SEPARATE, read-only concern from the
   * discovery/spec state machine: it NEVER starts a run, mutates discovery/spec
   * state, or auto-triggers discovery ("read-only, 모델 호출 0",
   * "run 자동 시작 없음").
   *
   * No-op when no {@link HistoryPort} is wired (`ports.history` absent). A
   * single-flight guard (`historyLoading`) prevents concurrent calls from
   * stacking. On success the safe {@link HistoryProjectView} list replaces the
   * held one; on error a `"history"`-scoped notice is emitted and the prior
   * list is retained. `historyLoading` is always cleared and a change is
   * notified so the webview re-hydrates.
   */
  /**
   * Read-only restore of a single history project's durable snapshot (guide
   * §6: `restoreProject(projectId)`). This ONLY reads a safe summary — it NEVER
   * starts a run, mutates discovery/spec state, or auto-triggers discovery
   * ("run 자동 시작 없음"). No state is changed here; on error a `"history"`
   * notice is emitted. Returns the safe {@link RestoredProjectView} on success
   * so a caller could show a read-only detail, or null when unsupported/failed.
   */
  async restoreHistoryProject(
    projectId: string,
  ): Promise<RestoredProjectView | null> {
    const historyPort = this.ports.history;
    if (historyPort === undefined) {
      return null; // History not supported by the active port pair.
    }
    const result = await historyPort.restoreProject(projectId, this.envelope(0));
    if (result.ok) {
      return result.value;
    }
    this.emitNotice(
      "history",
      "error",
      "이전 프로젝트를 불러오지 못했습니다. 다시 시도해 주세요.",
    );
    this.notifyChange();
    return null;
  }

  async loadHistory(): Promise<void> {
    const historyPort = this.ports.history;
    if (historyPort === undefined) {
      return; // History not supported by the active port pair.
    }
    if (this.historyLoading) {
      return; // Single-flight: a load is already in progress.
    }

    this.historyLoading = true;
    this.notifyChange();

    // Read-only op: History is independent of the discovery/spec surfaces and
    // their optimistic-revision envelopes, so a fresh envelope with expected
    // revision 0 is sufficient (the port ignores it for reads).
    const result = await historyPort.listProjects(50, this.envelope(0));

    this.historyLoading = false;
    if (result.ok) {
      this.history = [...result.value.projects];
    } else {
      this.emitNotice(
        "history",
        "error",
        "이전 프로젝트를 불러오지 못했습니다. 다시 시도해 주세요.",
      );
    }
    this.notifyChange();
  }
}
