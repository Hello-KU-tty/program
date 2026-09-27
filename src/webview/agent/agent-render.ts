/**
 * Framework-free DOM rendering for the Builder / Helper agent surfaces.
 *
 * This module is the agent-side analogue of {@link file://../flow/flow-render.ts}
 * (`DiscoveryStartView` / `DiscoveryWorkspace` / `SpecReview`): it builds and
 * updates the agent shell DOM with plain TypeScript + DOM APIs (no framework),
 * using the same class-hook convention (`agent-*`) and the same
 * build-once/update-in-place lifecycle — the constructor builds the skeleton
 * once against a root element, remembers its child elements, and each
 * subsequent {@link AgentSurfaceView.render} updates text, visibility, and
 * disabled state in place, rebuilding only the dynamic list regions. All copy
 * is Korean, mirroring the shipped flow surfaces.
 *
 * ## Trust boundary (Requirement 2.7)
 *
 * The webview is the untrusted side of the host boundary, and every agent-
 * produced string (transcript lines, tool `output`, helper text, notice
 * messages, decision/native questions, evidence excerpts) is Core-redacted but
 * still treated as untrusted display data: it is ALWAYS assigned via
 * `textContent`, NEVER `innerHTML`. There is no HTML string construction in this
 * module, so markup in agent output is shown literally and never interpreted.
 *
 * Tool rows show `relativePath` only (Requirement 2.9); the view model never
 * carries an absolute `workspaceDirectory`, so no absolute path can be rendered.
 *
 * ## Gestures
 *
 * User interactions are encoded 1:1 as {@link AgentAction} gestures through the
 * shared {@link AgentRenderCallbacks} object. This module does not know about
 * `postMessage`; the webview main wiring translates each callback into a posted
 * {@link AgentAction}. The read-style responses ({@link AgentSurfaceView.renderEvidence}
 * / {@link AgentSurfaceView.renderFinalUpgrade}) update dedicated regions when
 * the host posts `agent/evidence` / `agent/finalUpgrade`.
 *
 * See design.md §B.16 / Data Models.
 * Requirements: 2.7, 2.8, 2.9, 4.5, 7.1, 8.1, 9.1, 10.2, 10.3, 10.4, 11.1, 12.1.
 */

import type {
  AgentViewModel,
  BuilderTurnViewModel,
  DecisionViewModel,
  HelperConversationViewModel,
  HelperViewModel,
  NativeQuestionViewModel,
  NoticeViewModel,
  ToolRowViewModel,
} from "../../core/agent/agent-view-model";
import type {
  DecisionSelection,
  NativeAnswerInput,
} from "./agent-messages";
import type {
  EvidenceTraceView,
  FinalUpgradeCandidate,
} from "../../../vendor/frontend-client";

/**
 * Callbacks the agent render layer invokes when the learner interacts with a
 * surface. Each method maps 1:1 to an {@link AgentAction}; the webview main
 * wiring (task 8's cousin) translates them into `postMessage` calls. For THIS
 * task the render just calls these callbacks.
 */
export interface AgentRenderCallbacks {
  /** Start a Builder turn on the current task with `message` (`builder/start`, Req 1). */
  onBuilderStart(message: string): void;
  /** Cancel the active run (`builder/stop`, Req 6.1). */
  onBuilderStop(): void;
  /** Start a read-only Helper turn (`helper/start`, Req 4). */
  onHelperStart(
    message: string,
    origin: "FREE_TEXT" | "QUICK_ACTION",
    decisionId?: string,
  ): void;
  /** Resolve a Builder decision with the user's selection + verbatim rationale (`decision/resolve`, Req 5). */
  onResolveDecision(
    decisionId: string,
    selection: DecisionSelection,
    rationale: string | undefined,
    helperUsed: boolean,
  ): void;
  /** Explicit Builder resume; never auto-resumed on resolution (`builder/resumeAfterDecision`, Req 5.3). */
  onResumeAfterDecision(): void;
  /** Submit exactly the user's native-question answer (`native/answer`, Req 7). */
  onNativeAnswer(
    requestId: string,
    nativeJobId: string,
    answer: NativeAnswerInput,
  ): void;
  /** Open the generated workspace for a task (`workspace/open`, Req 8). */
  onOpenWorkspace(taskId: string): void;
  /** Launch the running result (`result/launch`, Req 9). */
  onLaunchResult(): void;
  /** Read the evidence trace (`evidence/read`, Req 10). */
  onReadEvidence(conceptId?: string): void;
  /** Retry a failed analysis job (`evidence/retry`, Req 10.5). */
  onRetryAnalysis(analysisJobId: string, expectedJobRevision: number): void;
  /** List eligible final-upgrade candidates (`finalUpgrade/list`, Req 11.1). */
  onListFinalUpgrade(): void;
  /** Prepare a final-upgrade task (`finalUpgrade/prepare`, Req 11.2). */
  onPrepareFinalUpgrade(input: {
    readonly sourceTaskId: string;
    readonly expectedSourceTaskRevision: number;
    readonly personalizationTraceId: string;
    readonly userGoal: string;
  }): void;
}

/** Korean labels for the Builder turn display phase. */
const BUILDER_PHASE_LABELS: Readonly<Record<BuilderTurnViewModel["phase"], string>> = {
  IDLE: "대기 중",
  STARTING: "시작하는 중…",
  RUNNING: "만드는 중…",
  CLASSIFYING: "결과를 확인하는 중…",
  TASK_COMPLETED: "이번 작업을 완료했어요",
  DECISION_REQUIRED: "함께 정할 결정이 있어요",
  TURN_ENDED: "이번 차례가 끝났어요",
  FAILED: "문제가 생겼어요",
  CANCELLED: "중단했어요",
  CLEANUP: "정리하는 중…",
  RECOVERING: "이전 작업을 복구하는 중…",
  START_ERROR: "시작하지 못했어요",
};

/** Korean labels for the Helper turn display phase. */
const HELPER_PHASE_LABELS: Readonly<Record<HelperViewModel["phase"], string>> = {
  IDLE: "대기 중",
  RUNNING: "도우미가 답하는 중…",
  RECORDED: "도우미 대화를 기록했어요",
  FAILED: "도우미에 문제가 생겼어요",
};

/** Korean labels for a tool row status. */
const TOOL_STATUS_LABELS: Readonly<Record<ToolRowViewModel["status"], string>> = {
  RUNNING: "진행 중",
  SUCCEEDED: "완료",
  FAILED: "실패",
  UNKNOWN: "알 수 없음",
};

/**
 * Renders and updates the whole agent surface (Builder + Helper + decisions +
 * native questions + worker status + notice), plus the read-style evidence and
 * final-upgrade regions.
 *
 * Build-once/update-in-place: the constructor builds the stable shell once
 * against `root` and remembers each region; {@link render} updates the Builder /
 * Helper / decisions / native-questions / worker / notice regions from an
 * {@link AgentViewModel}; {@link renderEvidence} and {@link renderFinalUpgrade}
 * update the two read-style regions from the host's `agent/evidence` /
 * `agent/finalUpgrade` responses.
 *
 * All agent-produced text is set via `textContent` only (Req 2.7); tool rows
 * render `relativePath` only (Req 2.9).
 */
export class AgentSurfaceView {
  private readonly doc: Document;
  private readonly callbacks: AgentRenderCallbacks;

  // --- Builder region ------------------------------------------------------
  private readonly builderPhase: HTMLElement;
  private readonly builderTaskTitle: HTMLElement;
  private readonly builderCompletion: HTMLElement;
  private readonly builderError: HTMLElement;
  private readonly builderPermissionDenied: HTMLElement;
  private readonly builderTranscript: HTMLElement;
  private readonly builderToolRows: HTMLElement;
  private readonly builderComposerInput: HTMLTextAreaElement;
  private readonly builderSendButton: HTMLButtonElement;
  private readonly builderStopButton: HTMLButtonElement;
  private readonly builderResumeButton: HTMLButtonElement;

  // --- Helper region -------------------------------------------------------
  private readonly helperPhase: HTMLElement;
  private readonly helperWindowOpening: HTMLElement;
  private readonly helperError: HTMLElement;
  private readonly helperTranscript: HTMLElement;
  private readonly helperConversations: HTMLElement;
  private readonly helperComposerInput: HTMLTextAreaElement;
  private readonly helperSendButton: HTMLButtonElement;

  // --- Decisions / native / worker / notice --------------------------------
  private readonly decisionsRegion: HTMLElement;
  private readonly nativeRegion: HTMLElement;
  private readonly workerStatus: HTMLElement;
  private readonly notice: HTMLElement;

  // --- Read-style regions --------------------------------------------------
  private readonly evidenceRegion: HTMLElement;
  private readonly finalUpgradeList: HTMLElement;
  private readonly finalUpgradeInputs: {
    readonly sourceTaskId: HTMLInputElement;
    readonly expectedSourceTaskRevision: HTMLInputElement;
    readonly personalizationTraceId: HTMLInputElement;
    readonly userGoal: HTMLTextAreaElement;
  };

  constructor(root: HTMLElement, callbacks: AgentRenderCallbacks) {
    this.doc = root.ownerDocument;
    this.callbacks = callbacks;

    const container = this.el("div", "agent-surface");

    // ---- Builder ----------------------------------------------------------
    const builder = this.el("section", "agent-builder");
    builder.setAttribute("aria-label", "빌더");

    const builderHeading = this.el("h1", "agent-builder-heading");
    builderHeading.textContent = "빌더";
    builder.appendChild(builderHeading);

    this.builderPhase = this.el("div", "agent-builder-phase");
    this.builderPhase.setAttribute("role", "status");
    this.builderPhase.setAttribute("aria-live", "polite");
    builder.appendChild(this.builderPhase);

    this.builderTaskTitle = this.el("div", "agent-builder-task");
    this.builderTaskTitle.hidden = true;
    builder.appendChild(this.builderTaskTitle);

    this.builderCompletion = this.el("div", "agent-builder-completion");
    this.builderCompletion.hidden = true;
    builder.appendChild(this.builderCompletion);

    this.builderError = this.el("div", "agent-builder-error");
    this.builderError.setAttribute("role", "alert");
    this.builderError.hidden = true;
    builder.appendChild(this.builderError);

    this.builderPermissionDenied = this.el("div", "agent-builder-permission");
    this.builderPermissionDenied.textContent = "권한이 거부되어 일부 작업을 수행하지 못했어요.";
    this.builderPermissionDenied.hidden = true;
    builder.appendChild(this.builderPermissionDenied);

    const transcriptLabel = this.el("h2", "agent-section-label");
    transcriptLabel.textContent = "진행 상황";
    builder.appendChild(transcriptLabel);

    this.builderTranscript = this.el("div", "agent-transcript");
    builder.appendChild(this.builderTranscript);

    const toolsLabel = this.el("h2", "agent-section-label");
    toolsLabel.textContent = "도구 실행";
    builder.appendChild(toolsLabel);

    this.builderToolRows = this.el("div", "agent-tool-rows");
    builder.appendChild(this.builderToolRows);

    // Builder composer (Req 1): free-text input + send.
    const builderComposer = this.el("div", "agent-composer");
    const builderComposerLabel = this.el("label", "agent-field-label");
    builderComposerLabel.textContent = "빌더에게 요청하기";
    builderComposer.appendChild(builderComposerLabel);

    this.builderComposerInput = this.el("textarea", "agent-composer-input") as HTMLTextAreaElement;
    this.builderComposerInput.setAttribute("aria-label", "빌더 요청");
    this.builderComposerInput.setAttribute(
      "placeholder",
      "예: 로그인 화면부터 만들어 주세요",
    );
    this.builderComposerInput.rows = 3;
    builderComposer.appendChild(this.builderComposerInput);

    const builderControls = this.el("div", "agent-composer-actions");
    this.builderSendButton = this.el("button", "agent-builder-send") as HTMLButtonElement;
    this.builderSendButton.type = "button";
    this.builderSendButton.textContent = "보내기";
    this.builderSendButton.addEventListener("click", () => this.attemptBuilderStart());
    builderControls.appendChild(this.builderSendButton);

    // Stop button — shown only while RUNNING (Req 6.1).
    this.builderStopButton = this.el("button", "agent-builder-stop") as HTMLButtonElement;
    this.builderStopButton.type = "button";
    this.builderStopButton.textContent = "중단";
    this.builderStopButton.hidden = true;
    this.builderStopButton.addEventListener("click", () => this.callbacks.onBuilderStop());
    builderControls.appendChild(this.builderStopButton);

    // Resume button — shown only while DECISION_REQUIRED (Req 5.3).
    this.builderResumeButton = this.el("button", "agent-builder-resume") as HTMLButtonElement;
    this.builderResumeButton.type = "button";
    this.builderResumeButton.textContent = "빌더 다시 시작";
    this.builderResumeButton.hidden = true;
    this.builderResumeButton.addEventListener("click", () =>
      this.callbacks.onResumeAfterDecision(),
    );
    builderControls.appendChild(this.builderResumeButton);

    builderComposer.appendChild(builderControls);
    builder.appendChild(builderComposer);
    container.appendChild(builder);

    // ---- Helper -----------------------------------------------------------
    const helper = this.el("section", "agent-helper");
    helper.setAttribute("aria-label", "도우미");

    const helperHeading = this.el("h1", "agent-helper-heading");
    helperHeading.textContent = "도우미";
    helper.appendChild(helperHeading);

    this.helperPhase = this.el("div", "agent-helper-phase");
    this.helperPhase.setAttribute("role", "status");
    this.helperPhase.setAttribute("aria-live", "polite");
    helper.appendChild(this.helperPhase);

    this.helperWindowOpening = this.el("div", "agent-helper-window");
    this.helperWindowOpening.textContent = "도우미 창을 여는 중이에요…";
    this.helperWindowOpening.hidden = true;
    helper.appendChild(this.helperWindowOpening);

    this.helperError = this.el("div", "agent-helper-error");
    this.helperError.setAttribute("role", "alert");
    this.helperError.hidden = true;
    helper.appendChild(this.helperError);

    const helperTranscriptLabel = this.el("h2", "agent-section-label");
    helperTranscriptLabel.textContent = "도우미 대화";
    helper.appendChild(helperTranscriptLabel);

    this.helperTranscript = this.el("div", "agent-transcript");
    helper.appendChild(this.helperTranscript);

    this.helperConversations = this.el("div", "agent-helper-conversations");
    helper.appendChild(this.helperConversations);

    const helperComposer = this.el("div", "agent-composer");
    const helperComposerLabel = this.el("label", "agent-field-label");
    helperComposerLabel.textContent = "도우미에게 물어보기";
    helperComposer.appendChild(helperComposerLabel);

    this.helperComposerInput = this.el("textarea", "agent-composer-input") as HTMLTextAreaElement;
    this.helperComposerInput.setAttribute("aria-label", "도우미 질문");
    this.helperComposerInput.setAttribute(
      "placeholder",
      "예: 이 개념이 왜 필요한지 설명해 주세요",
    );
    this.helperComposerInput.rows = 3;
    helperComposer.appendChild(this.helperComposerInput);

    const helperControls = this.el("div", "agent-composer-actions");
    this.helperSendButton = this.el("button", "agent-helper-send") as HTMLButtonElement;
    this.helperSendButton.type = "button";
    this.helperSendButton.textContent = "물어보기";
    this.helperSendButton.addEventListener("click", () => this.attemptHelperStart());
    helperControls.appendChild(this.helperSendButton);
    helperComposer.appendChild(helperControls);
    helper.appendChild(helperComposer);
    container.appendChild(helper);

    // ---- Decisions --------------------------------------------------------
    const decisions = this.el("section", "agent-decisions");
    decisions.setAttribute("aria-label", "함께 정할 결정");
    const decisionsLabel = this.el("h1", "agent-section-heading");
    decisionsLabel.textContent = "함께 정할 결정";
    decisions.appendChild(decisionsLabel);
    this.decisionsRegion = this.el("div", "agent-decisions-list");
    decisions.appendChild(this.decisionsRegion);
    container.appendChild(decisions);

    // ---- Native questions -------------------------------------------------
    const native = this.el("section", "agent-native-questions");
    native.setAttribute("aria-label", "확인이 필요한 질문");
    const nativeLabel = this.el("h1", "agent-section-heading");
    nativeLabel.textContent = "확인이 필요한 질문";
    native.appendChild(nativeLabel);
    this.nativeRegion = this.el("div", "agent-native-list");
    native.appendChild(this.nativeRegion);
    container.appendChild(native);

    // ---- Worker status (display-only, Req 12.1) ---------------------------
    this.workerStatus = this.el("div", "agent-worker-status");
    this.workerStatus.setAttribute("role", "status");
    this.workerStatus.setAttribute("aria-live", "polite");
    this.workerStatus.hidden = true;
    container.appendChild(this.workerStatus);

    // ---- Notice -----------------------------------------------------------
    this.notice = this.el("div", "agent-notice");
    this.notice.setAttribute("role", "status");
    this.notice.setAttribute("aria-live", "polite");
    this.notice.hidden = true;
    container.appendChild(this.notice);

    // ---- Evidence (read-style) --------------------------------------------
    const evidence = this.el("section", "agent-evidence");
    evidence.setAttribute("aria-label", "근거 기록");
    const evidenceHeader = this.el("div", "agent-evidence-header");
    const evidenceLabel = this.el("h1", "agent-section-heading");
    evidenceLabel.textContent = "근거 기록";
    evidenceHeader.appendChild(evidenceLabel);
    const evidenceRead = this.el("button", "agent-evidence-read") as HTMLButtonElement;
    evidenceRead.type = "button";
    evidenceRead.textContent = "근거 불러오기";
    evidenceRead.addEventListener("click", () => this.callbacks.onReadEvidence());
    evidenceHeader.appendChild(evidenceRead);
    evidence.appendChild(evidenceHeader);
    this.evidenceRegion = this.el("div", "agent-evidence-body");
    evidence.appendChild(this.evidenceRegion);
    container.appendChild(evidence);

    // ---- Final upgrade (read-style) ---------------------------------------
    const finalUpgrade = this.el("section", "agent-final-upgrade");
    finalUpgrade.setAttribute("aria-label", "마지막 업그레이드");
    const finalUpgradeHeader = this.el("div", "agent-final-upgrade-header");
    const finalUpgradeLabel = this.el("h1", "agent-section-heading");
    finalUpgradeLabel.textContent = "마지막 업그레이드";
    finalUpgradeHeader.appendChild(finalUpgradeLabel);
    const finalUpgradeRefresh = this.el(
      "button",
      "agent-final-upgrade-refresh",
    ) as HTMLButtonElement;
    finalUpgradeRefresh.type = "button";
    finalUpgradeRefresh.textContent = "후보 새로고침";
    finalUpgradeRefresh.addEventListener("click", () => this.callbacks.onListFinalUpgrade());
    finalUpgradeHeader.appendChild(finalUpgradeRefresh);
    finalUpgrade.appendChild(finalUpgradeHeader);

    this.finalUpgradeList = this.el("div", "agent-final-upgrade-list");
    finalUpgrade.appendChild(this.finalUpgradeList);

    // Prepare control (Req 11.2): the four required inputs + a prepare button.
    const prepare = this.el("div", "agent-final-upgrade-prepare");
    const sourceTaskId = this.buildTextInput(prepare, "원본 작업 ID", "source-task-id");
    const expectedRevision = this.buildTextInput(
      prepare,
      "원본 작업 리비전",
      "expected-source-task-revision",
    );
    expectedRevision.type = "number";
    const personalizationTraceId = this.buildTextInput(
      prepare,
      "개인화 기록 ID",
      "personalization-trace-id",
    );
    const userGoalField = this.el("div", "agent-field");
    const userGoalLabel = this.el("label", "agent-field-label");
    userGoalLabel.textContent = "목표";
    const userGoal = this.el("textarea", "agent-final-upgrade-goal") as HTMLTextAreaElement;
    userGoal.setAttribute("aria-label", "목표");
    userGoal.rows = 2;
    userGoalField.appendChild(userGoalLabel);
    userGoalField.appendChild(userGoal);
    prepare.appendChild(userGoalField);

    const prepareButton = this.el(
      "button",
      "agent-final-upgrade-prepare-button",
    ) as HTMLButtonElement;
    prepareButton.type = "button";
    prepareButton.textContent = "마지막 업그레이드 준비";
    prepareButton.addEventListener("click", () => this.attemptPrepareFinalUpgrade());
    prepare.appendChild(prepareButton);
    finalUpgrade.appendChild(prepare);
    container.appendChild(finalUpgrade);

    this.finalUpgradeInputs = {
      sourceTaskId,
      expectedSourceTaskRevision: expectedRevision,
      personalizationTraceId,
      userGoal,
    };

    root.appendChild(container);
  }

  // ==========================================================================
  // Public render entry points
  // ==========================================================================

  /**
   * Idempotent update-in-place from an {@link AgentViewModel}. Updates the
   * Builder, Helper, decisions, native-questions, worker-status, and notice
   * regions in place; rebuilds the dynamic list regions (transcript, tool rows,
   * decisions, native questions, helper conversations) from the model each call.
   */
  render(vm: AgentViewModel): void {
    this.renderBuilder(vm.builder);
    this.renderHelper(vm.helper);
    this.renderDecisions(vm.decisions);
    this.renderNativeQuestions(vm.nativeQuestions);
    this.renderWorker(vm.worker);
    this.renderNotice(vm.notice);
  }

  /**
   * Renders the evidence trace region honestly (Req 10.2 / 10.3 / 10.4):
   * - A concept whose `displayState === 'OBSERVED_ONLY'` is NEVER labelled as
   *   user understanding.
   * - A concept with `userUnderstandingCount === 0` gets no "learned" claim.
   * - An analysis with `displayState === 'ANALYZED'` and `acceptedCount === 0`
   *   shows its `noEvidenceReason`, not a success indication.
   * - An `ANALYSIS_FAILED` analysis gets a retry affordance calling
   *   {@link AgentRenderCallbacks.onRetryAnalysis} (Req 10.5).
   */
  renderEvidence(view: EvidenceTraceView): void {
    this.evidenceRegion.textContent = "";

    const summary = this.el("p", "agent-evidence-summary");
    // userUnderstandingTotal is a safe scalar; a total of 0 must not read as a
    // "learned" claim (Req 10.3).
    summary.textContent =
      view.userUnderstandingTotal > 0
        ? `사용자 이해 근거 ${view.userUnderstandingTotal}건이 기록되어 있어요.`
        : "아직 사용자 이해로 인정된 근거가 없어요.";
    this.evidenceRegion.appendChild(summary);

    if (view.emptyReason) {
      const empty = this.el("p", "agent-evidence-empty");
      empty.textContent = view.emptyReason;
      this.evidenceRegion.appendChild(empty);
    }

    // Concepts.
    const conceptsList = this.el("div", "agent-evidence-concepts");
    for (const concept of view.concepts) {
      conceptsList.appendChild(this.buildEvidenceConcept(concept));
    }
    this.evidenceRegion.appendChild(conceptsList);

    // Analysis jobs.
    const analysisList = this.el("div", "agent-evidence-analysis");
    for (const job of view.analysis) {
      analysisList.appendChild(this.buildEvidenceAnalysis(job));
    }
    this.evidenceRegion.appendChild(analysisList);
  }

  /**
   * Renders the eligible final-upgrade candidate list (Req 11.1). Each candidate
   * shows its id, creation time, and basis count via `textContent`.
   */
  renderFinalUpgrade(candidates: readonly FinalUpgradeCandidate[]): void {
    this.finalUpgradeList.textContent = "";

    if (candidates.length === 0) {
      const empty = this.el("p", "agent-final-upgrade-empty");
      empty.textContent = "지금은 업그레이드할 수 있는 후보가 없어요.";
      this.finalUpgradeList.appendChild(empty);
      return;
    }

    for (const candidate of candidates) {
      const row = this.el("div", "agent-final-upgrade-candidate");

      const id = this.el("div", "agent-final-upgrade-candidate-id");
      id.textContent = candidate.id;
      row.appendChild(id);

      const meta = this.el("div", "agent-final-upgrade-candidate-meta");
      meta.textContent = `근거 ${candidate.basisCount}건 · ${candidate.createdAt}`;
      row.appendChild(meta);

      this.finalUpgradeList.appendChild(row);
    }
  }

  // ==========================================================================
  // Builder rendering
  // ==========================================================================

  private renderBuilder(builder: BuilderTurnViewModel): void {
    this.builderPhase.textContent = BUILDER_PHASE_LABELS[builder.phase];

    // Task title.
    if (builder.taskTitle) {
      this.builderTaskTitle.hidden = false;
      this.builderTaskTitle.textContent = builder.taskTitle;
    } else {
      this.builderTaskTitle.hidden = true;
      this.builderTaskTitle.textContent = "";
    }

    // Completion indicator (only in TASK_COMPLETED).
    if (builder.phase === "TASK_COMPLETED") {
      this.builderCompletion.hidden = false;
      this.builderCompletion.textContent = builder.completionReportId
        ? `완료 보고서: ${builder.completionReportId}`
        : "이번 작업을 완료했어요.";
    } else {
      this.builderCompletion.hidden = true;
      this.builderCompletion.textContent = "";
    }

    // Error indicator (FAILED / START_ERROR carry an errorCode).
    if (
      (builder.phase === "FAILED" || builder.phase === "START_ERROR") &&
      builder.errorCode
    ) {
      this.builderError.hidden = false;
      this.builderError.textContent = builder.errorCode;
    } else {
      this.builderError.hidden = true;
      this.builderError.textContent = "";
    }

    // Permission-denied indicator.
    this.builderPermissionDenied.hidden = !builder.permissionDenied;

    // Transcript (Core-redacted agent text → textContent only, Req 2.7).
    this.builderTranscript.textContent = "";
    for (const line of builder.transcript) {
      const lineEl = this.el("p", "agent-transcript-line");
      lineEl.textContent = line.text;
      this.builderTranscript.appendChild(lineEl);
    }

    // Tool rows — one row per stable key (Req 2.2/2.8).
    this.builderToolRows.textContent = "";
    for (const toolRow of builder.toolRows) {
      this.builderToolRows.appendChild(this.buildToolRow(toolRow));
    }

    // Stop shown only while RUNNING (Req 6.1); resume only while DECISION_REQUIRED.
    this.builderStopButton.hidden = builder.phase !== "RUNNING";
    this.builderResumeButton.hidden = builder.phase !== "DECISION_REQUIRED";

    // Lock the composer/send while a turn is in flight.
    const inFlight =
      builder.phase === "STARTING" ||
      builder.phase === "RUNNING" ||
      builder.phase === "CLASSIFYING" ||
      builder.phase === "RECOVERING" ||
      builder.phase === "CLEANUP";
    this.builderComposerInput.disabled = inFlight;
    this.builderSendButton.disabled = inFlight;
  }

  /**
   * Builds one tool activity row for a {@link ToolRowViewModel}. Renders
   * `relativePath` only (Req 2.9) and sets the bounded, Core-redacted `output`
   * via `textContent` (Req 2.7). One row per `key` (Req 2.2/2.8).
   */
  private buildToolRow(toolRow: ToolRowViewModel): HTMLElement {
    const row = this.el("div", "agent-tool-row");
    row.dataset.key = toolRow.key;

    const head = this.el("div", "agent-tool-row-head");
    const tool = this.el("span", "agent-tool-row-tool");
    tool.textContent = toolRow.tool ?? "도구";
    head.appendChild(tool);

    const status = this.el("span", "agent-tool-row-status");
    status.textContent = TOOL_STATUS_LABELS[toolRow.status];
    status.dataset.status = toolRow.status;
    head.appendChild(status);
    row.appendChild(head);

    // relativePath ONLY — never an absolute path (Req 2.9).
    if (toolRow.relativePath) {
      const path = this.el("div", "agent-tool-row-path");
      path.textContent = toolRow.relativePath;
      row.appendChild(path);
    }

    if (toolRow.command) {
      const command = this.el("div", "agent-tool-row-command");
      command.textContent = toolRow.command;
      row.appendChild(command);
    }

    if (toolRow.coreAction) {
      const coreAction = this.el("div", "agent-tool-row-core-action");
      coreAction.textContent = toolRow.coreAction;
      row.appendChild(coreAction);
    }

    if (toolRow.exitCode !== null) {
      const exit = this.el("div", "agent-tool-row-exit");
      exit.textContent = `종료 코드: ${toolRow.exitCode}`;
      row.appendChild(exit);
    }

    if (toolRow.output) {
      const output = this.el("pre", "agent-tool-row-output");
      // Bounded, Core-redacted output rendered as text only (Req 2.7).
      output.textContent = toolRow.output;
      row.appendChild(output);
    }

    if (toolRow.truncated) {
      const truncated = this.el("div", "agent-tool-row-truncated");
      truncated.textContent = "…출력이 잘렸어요";
      row.appendChild(truncated);
    }

    return row;
  }

  private attemptBuilderStart(): void {
    if (this.builderSendButton.disabled) {
      return;
    }
    const message = this.builderComposerInput.value;
    if (message.trim().length === 0) {
      return;
    }
    this.callbacks.onBuilderStart(message);
    this.builderComposerInput.value = "";
  }

  // ==========================================================================
  // Helper rendering
  // ==========================================================================

  private renderHelper(helper: HelperViewModel): void {
    this.helperPhase.textContent = HELPER_PHASE_LABELS[helper.phase];
    this.helperWindowOpening.hidden = !helper.windowOpening;

    if (helper.phase === "FAILED" && helper.errorCode) {
      this.helperError.hidden = false;
      this.helperError.textContent = helper.errorCode;
    } else {
      this.helperError.hidden = true;
      this.helperError.textContent = "";
    }

    // Transcript (agent text → textContent only, Req 2.7 / 4.5).
    this.helperTranscript.textContent = "";
    for (const line of helper.transcript) {
      const lineEl = this.el("p", "agent-transcript-line");
      lineEl.textContent = line.text;
      this.helperTranscript.appendChild(lineEl);
    }

    // Recorded conversations read from the After_Snapshot (Req 4.5).
    this.helperConversations.textContent = "";
    for (const conversation of helper.conversations) {
      this.helperConversations.appendChild(this.buildHelperConversation(conversation));
    }

    const inFlight = helper.phase === "RUNNING";
    this.helperComposerInput.disabled = inFlight;
    this.helperSendButton.disabled = inFlight;
  }

  /** Builds one recorded Helper conversation block; all text via `textContent`. */
  private buildHelperConversation(conversation: HelperConversationViewModel): HTMLElement {
    const block = this.el("div", "agent-helper-conversation");
    block.dataset.conversationId = conversation.conversationId;

    const status = this.el("div", "agent-helper-conversation-status");
    status.textContent = conversation.status;
    block.appendChild(status);

    if (conversation.userExcerpts.length > 0) {
      const label = this.el("div", "agent-helper-conversation-label");
      label.textContent = "내가 물어본 내용";
      block.appendChild(label);
      for (const excerpt of conversation.userExcerpts) {
        const excerptEl = this.el("p", "agent-helper-conversation-user");
        excerptEl.textContent = excerpt;
        block.appendChild(excerptEl);
      }
    }

    if (conversation.responseSummaries.length > 0) {
      const label = this.el("div", "agent-helper-conversation-label");
      label.textContent = "도우미 답변 요약";
      block.appendChild(label);
      for (const summary of conversation.responseSummaries) {
        const summaryEl = this.el("p", "agent-helper-conversation-response");
        summaryEl.textContent = summary;
        block.appendChild(summaryEl);
      }
    }

    return block;
  }

  private attemptHelperStart(): void {
    if (this.helperSendButton.disabled) {
      return;
    }
    const message = this.helperComposerInput.value;
    if (message.trim().length === 0) {
      return;
    }
    this.callbacks.onHelperStart(message, "FREE_TEXT");
    this.helperComposerInput.value = "";
  }

  // ==========================================================================
  // Decisions rendering
  // ==========================================================================

  private renderDecisions(decisions: readonly DecisionViewModel[]): void {
    this.decisionsRegion.textContent = "";
    for (const decision of decisions) {
      this.decisionsRegion.appendChild(this.buildDecision(decision));
    }
  }

  /**
   * Builds one decision block: the question, options (with the recommended one
   * marked), a free-text rationale field, and controls that call
   * {@link AgentRenderCallbacks.onResolveDecision}. The rationale is forwarded
   * verbatim (never synthesized); an empty rationale is sent as `undefined`.
   */
  private buildDecision(decision: DecisionViewModel): HTMLElement {
    const block = this.el("div", "agent-decision");
    block.dataset.decisionId = decision.decisionId;

    const category = this.el("div", "agent-decision-category");
    category.textContent = decision.category;
    block.appendChild(category);

    const question = this.el("p", "agent-decision-question");
    question.textContent = decision.question;
    block.appendChild(question);

    if (decision.resolved) {
      const resolvedNote = this.el("div", "agent-decision-resolved");
      resolvedNote.textContent = decision.applied
        ? "이 결정을 반영했어요."
        : "이 결정을 정했어요. 반영을 기다리는 중이에요.";
      block.appendChild(resolvedNote);
    }

    // Rationale input (forwarded verbatim, Req 5.2).
    const rationaleField = this.el("div", "agent-field");
    const rationaleLabel = this.el("label", "agent-field-label");
    rationaleLabel.textContent = "이유 (선택)";
    const rationaleInput = this.el("textarea", "agent-decision-rationale") as HTMLTextAreaElement;
    rationaleInput.setAttribute("aria-label", "결정 이유");
    rationaleInput.rows = 2;
    rationaleField.appendChild(rationaleLabel);
    rationaleField.appendChild(rationaleInput);
    block.appendChild(rationaleField);

    // Options — one resolve control per option; recommended marked.
    const options = this.el("div", "agent-decision-options");
    for (const option of decision.options) {
      const optionEl = this.el("div", "agent-decision-option");
      if (option.id === decision.recommendedOptionId) {
        optionEl.dataset.recommended = "true";
      }

      const label = this.el("div", "agent-decision-option-label");
      label.textContent =
        option.id === decision.recommendedOptionId ? `${option.label} (추천)` : option.label;
      optionEl.appendChild(label);

      if (option.description) {
        const description = this.el("p", "agent-decision-option-description");
        description.textContent = option.description;
        optionEl.appendChild(description);
      }

      const choose = this.el("button", "agent-decision-choose") as HTMLButtonElement;
      choose.type = "button";
      choose.textContent = "이걸로 정하기";
      choose.addEventListener("click", () => {
        this.callbacks.onResolveDecision(
          decision.decisionId,
          { kind: "OPTION", optionId: option.id },
          this.rationaleOf(rationaleInput),
          false,
        );
      });
      optionEl.appendChild(choose);

      options.appendChild(optionEl);
    }
    block.appendChild(options);

    // Accept-recommendation control.
    const acceptRecommended = this.el(
      "button",
      "agent-decision-accept-recommended",
    ) as HTMLButtonElement;
    acceptRecommended.type = "button";
    acceptRecommended.textContent = "추천대로 하기";
    acceptRecommended.addEventListener("click", () => {
      this.callbacks.onResolveDecision(
        decision.decisionId,
        { kind: "RECOMMENDATION" },
        this.rationaleOf(rationaleInput),
        false,
      );
    });
    block.appendChild(acceptRecommended);

    // Custom-proposal control.
    const customField = this.el("div", "agent-field");
    const customLabel = this.el("label", "agent-field-label");
    customLabel.textContent = "직접 제안";
    const customInput = this.el("textarea", "agent-decision-custom") as HTMLTextAreaElement;
    customInput.setAttribute("aria-label", "직접 제안");
    customInput.rows = 2;
    customField.appendChild(customLabel);
    customField.appendChild(customInput);
    block.appendChild(customField);

    const customSubmit = this.el("button", "agent-decision-custom-submit") as HTMLButtonElement;
    customSubmit.type = "button";
    customSubmit.textContent = "직접 제안으로 정하기";
    customSubmit.addEventListener("click", () => {
      const proposal = customInput.value;
      if (proposal.trim().length === 0) {
        return;
      }
      this.callbacks.onResolveDecision(
        decision.decisionId,
        { kind: "CUSTOM", customProposal: proposal },
        this.rationaleOf(rationaleInput),
        false,
      );
    });
    block.appendChild(customSubmit);

    // Ask-helper affordance for this decision (Req 4).
    const askHelper = this.el("button", "agent-decision-ask-helper") as HTMLButtonElement;
    askHelper.type = "button";
    askHelper.textContent = "도우미에게 물어보기";
    askHelper.addEventListener("click", () => {
      this.callbacks.onHelperStart(decision.question, "QUICK_ACTION", decision.decisionId);
    });
    block.appendChild(askHelper);

    return block;
  }

  /** Returns the trimmed rationale, or `undefined` when blank (never synthesized). */
  private rationaleOf(input: HTMLTextAreaElement): string | undefined {
    const value = input.value;
    return value.trim().length > 0 ? value : undefined;
  }

  // ==========================================================================
  // Native questions rendering
  // ==========================================================================

  private renderNativeQuestions(questions: readonly NativeQuestionViewModel[]): void {
    this.nativeRegion.textContent = "";
    for (const question of questions) {
      this.nativeRegion.appendChild(this.buildNativeQuestion(question));
    }
  }

  /**
   * Builds one native-question block. Answering submits EXACTLY the user's
   * selection (Req 7.5) — an option index (with any sub-option indices), a
   * free-text answer, or a dismissal — never a synthesized answer.
   */
  private buildNativeQuestion(question: NativeQuestionViewModel): HTMLElement {
    const block = this.el("div", "agent-native-question");
    block.dataset.requestId = question.requestId;

    const role = this.el("div", "agent-native-question-role");
    role.textContent = question.role;
    block.appendChild(role);

    const prompt = this.el("p", "agent-native-question-prompt");
    prompt.textContent = question.question;
    block.appendChild(prompt);

    // Option answers — each option carries its own sub-option toggles.
    const options = this.el("div", "agent-native-question-options");
    question.options.forEach((option, optionIndex) => {
      const optionEl = this.el("div", "agent-native-question-option");

      const label = this.el("div", "agent-native-question-option-label");
      label.textContent = option.recommended ? `${option.title} (추천)` : option.title;
      optionEl.appendChild(label);

      if (option.description) {
        const description = this.el("p", "agent-native-question-option-description");
        description.textContent = option.description;
        optionEl.appendChild(description);
      }

      // Sub-option checkboxes (indices are what get submitted, verbatim).
      const subInputs: HTMLInputElement[] = [];
      if (option.subOptions.length > 0) {
        if (option.subOptionsLabel) {
          const subLabel = this.el("div", "agent-native-question-suboptions-label");
          subLabel.textContent = option.subOptionsLabel;
          optionEl.appendChild(subLabel);
        }
        option.subOptions.forEach((subOption, subIndex) => {
          const subWrap = this.el("label", "agent-native-question-suboption");
          const checkbox = this.doc.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.subIndex = String(subIndex);
          const subText = this.el("span", "agent-native-question-suboption-text");
          subText.textContent = subOption.description
            ? `${subOption.title} — ${subOption.description}`
            : subOption.title;
          subWrap.appendChild(checkbox);
          subWrap.appendChild(subText);
          optionEl.appendChild(subWrap);
          subInputs.push(checkbox);
        });
      }

      const choose = this.el("button", "agent-native-question-choose") as HTMLButtonElement;
      choose.type = "button";
      choose.textContent = "이 답으로 보내기";
      choose.addEventListener("click", () => {
        const subOptionIndices = subInputs
          .map((checkbox, index) => (checkbox.checked ? index : -1))
          .filter((index) => index >= 0);
        this.callbacks.onNativeAnswer(question.requestId, question.nativeJobId, {
          action: "answered",
          optionIndex,
          subOptionIndices,
        });
      });
      optionEl.appendChild(choose);

      options.appendChild(optionEl);
    });
    block.appendChild(options);

    // Free-text answer.
    const freeTextField = this.el("div", "agent-field");
    const freeTextLabel = this.el("label", "agent-field-label");
    freeTextLabel.textContent = "직접 답하기";
    const freeTextInput = this.el("textarea", "agent-native-question-freetext") as HTMLTextAreaElement;
    freeTextInput.setAttribute("aria-label", "직접 답하기");
    freeTextInput.rows = 2;
    freeTextField.appendChild(freeTextLabel);
    freeTextField.appendChild(freeTextInput);
    block.appendChild(freeTextField);

    const freeTextSubmit = this.el(
      "button",
      "agent-native-question-freetext-submit",
    ) as HTMLButtonElement;
    freeTextSubmit.type = "button";
    freeTextSubmit.textContent = "답 보내기";
    freeTextSubmit.addEventListener("click", () => {
      const answer = freeTextInput.value;
      if (answer.trim().length === 0) {
        return;
      }
      // Submit exactly what the user typed (Req 7.5).
      this.callbacks.onNativeAnswer(question.requestId, question.nativeJobId, {
        action: "answered",
        answer,
      });
    });
    block.appendChild(freeTextSubmit);

    // Dismiss.
    const dismiss = this.el("button", "agent-native-question-dismiss") as HTMLButtonElement;
    dismiss.type = "button";
    dismiss.textContent = "닫기";
    dismiss.addEventListener("click", () => {
      this.callbacks.onNativeAnswer(question.requestId, question.nativeJobId, {
        action: "dismissed",
      });
    });
    block.appendChild(dismiss);

    return block;
  }

  // ==========================================================================
  // Worker status / notice rendering
  // ==========================================================================

  /** Renders the native-worker status (display-only, Req 12.1). */
  private renderWorker(worker: AgentViewModel["worker"]): void {
    if (!worker) {
      this.workerStatus.hidden = true;
      this.workerStatus.textContent = "";
      return;
    }
    this.workerStatus.hidden = false;
    // Display-only: stage + role + raw code (no product branching, Req 12.1).
    const role = worker.role ? ` · ${worker.role}` : "";
    this.workerStatus.textContent = `작업 상태: ${worker.stage}${role} (${worker.code})`;
  }

  /** Renders the surface notice (code + message via `textContent`, Req 2.7). */
  private renderNotice(notice: NoticeViewModel | null): void {
    if (!notice) {
      this.notice.hidden = true;
      this.notice.textContent = "";
      return;
    }
    this.notice.hidden = false;
    this.notice.dataset.kind = notice.kind;
    this.notice.dataset.code = notice.code;
    this.notice.textContent = notice.message;
  }

  // ==========================================================================
  // Evidence helpers
  // ==========================================================================

  /**
   * Builds one evidence concept block honestly. `OBSERVED_ONLY` and
   * `userUnderstandingCount === 0` never present understanding / a "learned"
   * claim (Req 10.2 / 10.3).
   */
  private buildEvidenceConcept(
    concept: EvidenceTraceView["concepts"][number],
  ): HTMLElement {
    const block = this.el("div", "agent-evidence-concept");
    block.dataset.displayState = concept.displayState;

    const name = this.el("div", "agent-evidence-concept-name");
    name.textContent = concept.name;
    block.appendChild(name);

    const state = this.el("div", "agent-evidence-concept-state");
    // Honest labelling: only accepted user-understanding evidence supports an
    // understanding claim. OBSERVED_ONLY / zero understanding never do.
    if (
      concept.displayState === "OBSERVED_ONLY" ||
      concept.userUnderstandingCount === 0
    ) {
      state.textContent = "관찰만 되었어요 (이해했다고 표시하지 않음)";
    } else {
      state.textContent = `사용자 이해 근거 ${concept.userUnderstandingCount}건`;
    }
    block.appendChild(state);

    if (concept.openIssueCount > 0) {
      const issues = this.el("div", "agent-evidence-concept-issues");
      issues.textContent = `확인이 필요한 항목 ${concept.openIssueCount}건`;
      block.appendChild(issues);
    }

    // Accepted evidence excerpts (agent/Core text → textContent only).
    for (const accepted of concept.accepted) {
      if (accepted.excerpt) {
        const excerpt = this.el("p", "agent-evidence-accepted-excerpt");
        excerpt.textContent = accepted.excerpt;
        block.appendChild(excerpt);
      }
    }

    return block;
  }

  /**
   * Builds one evidence analysis-job block honestly. An `ANALYZED` job with
   * `acceptedCount === 0` shows its `noEvidenceReason` rather than success
   * (Req 10.4); an `ANALYSIS_FAILED` job gets a retry affordance (Req 10.5).
   */
  private buildEvidenceAnalysis(
    job: EvidenceTraceView["analysis"][number],
  ): HTMLElement {
    const block = this.el("div", "agent-evidence-analysis-job");
    block.dataset.displayState = job.displayState;
    block.dataset.jobId = job.jobId;

    const status = this.el("div", "agent-evidence-analysis-status");

    if (job.displayState === "ANALYZED" && job.acceptedCount === 0) {
      // No success indication — surface why nothing was accepted (Req 10.4).
      status.textContent = job.noEvidenceReason
        ? `인정된 근거 없음: ${job.noEvidenceReason}`
        : "인정된 근거가 없어요.";
      block.appendChild(status);
    } else if (job.displayState === "ANALYZED") {
      status.textContent =
        job.acceptedCount !== null
          ? `근거 ${job.acceptedCount}건이 인정되었어요.`
          : "분석을 마쳤어요.";
      block.appendChild(status);
    } else if (job.displayState === "ANALYSIS_FAILED") {
      status.textContent = job.failureCode
        ? `분석 실패: ${job.failureCode}`
        : "분석에 실패했어요.";
      block.appendChild(status);

      // Retry affordance (Req 10.5). The controller re-reads the current job
      // revision; the view sends the last-known job id and revision 0 as the
      // expected baseline — the host re-checks against the durable snapshot.
      const retry = this.el("button", "agent-evidence-retry") as HTMLButtonElement;
      retry.type = "button";
      retry.textContent = "분석 다시 시도";
      retry.dataset.jobId = job.jobId;
      retry.addEventListener("click", () => {
        this.callbacks.onRetryAnalysis(job.jobId, 0);
      });
      block.appendChild(retry);
    } else {
      // WAITING / ANALYZING.
      status.textContent = job.displayState === "WAITING" ? "분석 대기 중…" : "분석 중…";
      block.appendChild(status);
    }

    return block;
  }

  // ==========================================================================
  // Final-upgrade helper
  // ==========================================================================

  private attemptPrepareFinalUpgrade(): void {
    const sourceTaskId = this.finalUpgradeInputs.sourceTaskId.value.trim();
    const revisionRaw = this.finalUpgradeInputs.expectedSourceTaskRevision.value.trim();
    const personalizationTraceId = this.finalUpgradeInputs.personalizationTraceId.value.trim();
    const userGoal = this.finalUpgradeInputs.userGoal.value;

    const expectedSourceTaskRevision = Number.parseInt(revisionRaw, 10);
    if (
      sourceTaskId.length === 0 ||
      personalizationTraceId.length === 0 ||
      userGoal.trim().length === 0 ||
      !Number.isFinite(expectedSourceTaskRevision)
    ) {
      return;
    }

    this.callbacks.onPrepareFinalUpgrade({
      sourceTaskId,
      expectedSourceTaskRevision,
      personalizationTraceId,
      userGoal,
    });
  }

  // ==========================================================================
  // Shared helpers
  // ==========================================================================

  /** Builds a labeled single-line text input, appends it, and returns it. */
  private buildTextInput(
    container: HTMLElement,
    labelText: string,
    className: string,
  ): HTMLInputElement {
    const field = this.el("div", "agent-field");
    const label = this.el("label", "agent-field-label");
    label.textContent = labelText;
    const input = this.doc.createElement("input");
    input.type = "text";
    input.className = `agent-input ${className}`;
    input.setAttribute("aria-label", labelText);
    field.appendChild(label);
    field.appendChild(input);
    container.appendChild(field);
    return input;
  }

  /** Creates an element with a class name, mirroring `flow-render.ts`'s `el`. */
  private el(tag: string, className: string): HTMLElement {
    const element = this.doc.createElement(tag);
    element.className = className;
    return element;
  }
}

/**
 * Alias for {@link AgentSurfaceView}. The task allows either name; the wiring
 * layer may import whichever reads best.
 */
export { AgentSurfaceView as AgentRender };
