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
  HostChatViewModel,
  DecisionViewModel,
  HelperConversationViewModel,
  HelperViewModel,
  NativeQuestionViewModel,
  NextMoveViewModel,
  NoticeViewModel,
  TaskEvidenceViewModel,
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
import { errorGuidance, workerStatusGuidance, isPermissionDenial } from "../../core/runtime-errors";
import { renderChatMessage } from "./chat-message";

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
  /** Kiro-native host: connect the Project to Kiro chat (`builder/openInKiro`). */
  onOpenInKiro(): void;
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
  /** Kiro-native: generate Next Move suggestions again after a failure (`nextMove/retry`). */
  onRetryNextMove(): void;
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
/** Learner-facing names for Core decision categories; unknown values pass through. */
const DECISION_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  PRODUCT_BEHAVIOR: "제품 동작",
  DATA_MODEL: "데이터 구조",
  API_CONTRACT: "API 설계",
  AUTHENTICATION: "로그인·인증",
  AUTHORIZATION: "권한",
  SECURITY_PRIVACY: "보안·개인정보",
  RETENTION_DELETION: "보관·삭제",
  COST_DEPLOYMENT: "비용·배포",
  ARCHITECTURE: "구조 설계",
  LEARNING_CONCEPT: "학습 개념",
};

/** Plain-language worker stages; the raw code stays in the tooltip for support. */
const WORKER_STAGE_LABELS: Readonly<Record<string, string>> = {
  STARTING: "에이전트 연결을 준비하고 있어요",
  CONNECTED: "에이전트와 연결됐어요",
  HELPER_WINDOW_OPENING: "도우미 창을 여는 중이에요",
  WORKSPACE_SWITCHING: "작업 폴더로 이동하는 중이에요",
  WORKSPACE_SWITCH_FAILED: "작업 폴더로 이동하지 못했어요",
  JOB_CLAIMED: "요청을 받았어요",
  AGENT_OPENING: "에이전트를 여는 중이에요",
  AGENT_QUEUED: "순서를 기다리는 중이에요",
  AGENT_RUNNING: "에이전트가 작업 중이에요",
  AGENT_ENDED: "에이전트 작업이 끝났어요",
  AGENT_FAILED: "에이전트 작업이 실패했어요",
  USER_INPUT: "확인이 필요한 질문이 있어요",
  PERMISSION: "도구 사용 권한을 확인하고 있어요",
};
const WORKER_ROLE_LABELS: Readonly<Record<string, string>> = {
  DISCOVERY: "탐색", BUILDER: "빌더", HELPER: "도우미", EVIDENCE_ANALYST: "분석",
};

/** The agent surface tabs. */
export type AgentTab = "builder" | "helper" | "record";

/** Short local date/time for display; the raw value is kept when unparsable. */
/** How a learner's accepted Evidence reads in the Kiro-native Builder tab (K17). */
const TASK_EVIDENCE_STATE_LABELS: Readonly<Record<TaskEvidenceViewModel["state"], string>> = {
  EXPLAINED: "설명할 수 있어요",
  DEMONSTRATED: "직접 적용했어요",
  TRANSFERRED: "다른 곳에도 써 봤어요",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Rows kept visible while the tool list is collapsed (most recent last). */
const COLLAPSED_TOOL_ROWS = 3;

/** Learner-facing names for the projected tool kinds; unknown kinds pass through. */
const TOOL_LABELS: Readonly<Record<string, string>> = {
  read: "파일 읽기",
  write: "파일 쓰기",
  search: "검색",
  shell: "명령 실행",
  core: "Core 작업",
  think: "생각 정리",
  fetch: "웹 조회",
  user_input: "사용자 확인",
  unknown: "기타 도구",
};

/** Learner-facing names for Builder Core actions; unknown actions pass through. */
const CORE_ACTION_LABELS: Readonly<Record<string, string>> = {
  BUILDER_GET_TASK: "작업 조회",
  BUILDER_START_TASK: "작업 시작",
  BUILDER_UPDATE_LIVE_CONTEXT: "진행 맥락 갱신",
  BUILDER_REQUEST_DECISION: "결정 요청",
  BUILDER_GET_DECISION_RESULT: "결정 결과 확인",
  BUILDER_APPLY_DECISION: "결정 반영",
  BUILDER_COMPLETE_TASK: "작업 완료 보고",
};

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
  private readyToStart = false;
  private readonly doc: Document;
  private readonly callbacks: AgentRenderCallbacks;

  // --- Builder region ------------------------------------------------------
  private readonly builderPhase: HTMLElement;
  private readonly builderTaskTitle: HTMLElement;
  private readonly builderCompletion: HTMLElement;
  private readonly builderNextHint: HTMLElement;
  private readonly builderError: HTMLElement;
  private readonly builderPermissionDenied: HTMLElement;
  private readonly builderTranscript: HTMLElement;
  private readonly builderToolRows: HTMLElement;
  private readonly builderToolsHeader: HTMLElement;
  private readonly builderToolsSummary: HTMLElement;
  private readonly builderToolsToggle: HTMLButtonElement;
  private toolsExpanded = false;
  private lastToolRows: readonly ToolRowViewModel[] = [];
  private readonly builderTranscriptLabel: HTMLElement;
  private readonly builderComposerLabel: HTMLElement;
  private readonly builderComposerInput: HTMLTextAreaElement;
  private readonly kiroOpenButton: HTMLButtonElement;
  private readonly builderSendButton: HTMLButtonElement;
  private readonly builderStopButton: HTMLButtonElement;
  private readonly builderResumeButton: HTMLButtonElement;
  private readonly workspaceOpenButton: HTMLButtonElement;
  private readonly resultLaunchButton: HTMLButtonElement;
  private renderedTaskId: string | null = null;
  private upgradeTaskKey: string | undefined;

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
  private readonly decisionsLabel: HTMLElement;
  /** Kiro-native: this Task's accepted learner Evidence (K17). */
  private readonly taskEvidenceSection: HTMLElement;
  private readonly taskEvidenceList: HTMLElement;
  private readonly taskEvidenceEmpty: HTMLElement;
  private taskEvidenceRenderKey: string | undefined;
  private readonly nativeRegion: HTMLElement;
  private decisionsRenderKey: string | undefined;
  private nativeRenderKey: string | undefined;
  private readonly workerStatus: HTMLElement;
  private readonly notice: HTMLElement;

  // --- Read-style regions --------------------------------------------------
  private readonly evidenceRegion: HTMLElement;
  private readonly finalUpgradeList: HTMLElement;
  /** Shown only after the current Task completes, as an optional suggestion. */
  private readonly finalUpgradeSection: HTMLElement;
  /** Task id whose upgrade candidates were already requested once. */
  private finalUpgradeListedFor: string | null = null;
  /** Kiro-native Next Move card (replaces the final upgrade there). */
  private readonly nextMoveSection: HTMLElement;
  private readonly nextMoveStatus: HTMLElement;
  private readonly nextMoveList: HTMLElement;
  private readonly nextMoveNote: HTMLElement;
  private readonly nextMoveRetryButton: HTMLButtonElement;
  private nextMoveRenderKey: string | undefined;

  // --- Tabs: one surface visible at a time keeps the panel short ------------
  private readonly surface: HTMLElement;
  private readonly tabButtons: Record<AgentTab, HTMLButtonElement>;
  private readonly tabBadges = {} as Record<AgentTab, HTMLElement>;
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
    this.surface = container;

    // ---- Tabs -------------------------------------------------------------
    // Only the chosen surface is shown (CSS keys off data-tab). Decisions and
    // native questions stay above Builder and Helper so they are never buried.
    const tabs = this.el("div", "agent-tabs");
    tabs.setAttribute("role", "tablist");
    const makeTab = (tab: AgentTab, label: string): HTMLButtonElement => {
      const button = this.el("button", "agent-tab") as HTMLButtonElement;
      button.type = "button";
      button.dataset.tab = tab;
      button.setAttribute("role", "tab");
      const text = this.el("span", "agent-tab-label");
      text.textContent = label;
      const badge = this.el("span", "agent-tab-badge");
      badge.hidden = true;
      this.tabBadges[tab] = badge;
      button.appendChild(text);
      button.appendChild(badge);
      button.addEventListener("click", () => this.selectTab(tab));
      tabs.appendChild(button);
      return button;
    };
    this.tabButtons = {
      builder: makeTab("builder", "빌더"),
      helper: makeTab("helper", "도우미"),
      record: makeTab("record", "학습 기록"),
    };
    container.appendChild(tabs);

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

    // Next-step hint when a turn ends without completing the Task: the Builder
    // waits for the learner's next instruction; nothing resumes on its own.
    this.builderNextHint = this.el("div", "agent-builder-next");
    this.builderNextHint.hidden = true;
    builder.appendChild(this.builderNextHint);

    this.builderError = this.el("div", "agent-builder-error");
    this.builderError.setAttribute("role", "alert");
    this.builderError.hidden = true;
    builder.appendChild(this.builderError);

    this.builderPermissionDenied = this.el("div", "agent-builder-permission");
    this.builderPermissionDenied.textContent = "이번 실행에서 일부 도구 요청이 제한됐어요. 아래 도구 실행 기록에서 이유를 확인할 수 있어요. 다른 요청은 계속 보낼 수 있어요.";
    this.builderPermissionDenied.hidden = true;
    builder.appendChild(this.builderPermissionDenied);

    const transcriptLabel = this.el("h2", "agent-section-label");
    transcriptLabel.textContent = "진행 상황";
    builder.appendChild(transcriptLabel);
    this.builderTranscriptLabel = transcriptLabel;

    this.builderTranscript = this.el("div", "agent-transcript");
    this.labelScrollable(this.builderTranscript, "빌더 진행 내용");
    builder.appendChild(this.builderTranscript);

    // Tool activity: collapsed to the most recent rows by default so a long
    // run does not push the composer off screen. Older rows stay one click away.
    const toolsHeader = this.el("div", "agent-tools-header");
    const toolsLabel = this.el("h2", "agent-section-label");
    toolsLabel.textContent = "도구 실행";
    toolsHeader.appendChild(toolsLabel);
    this.builderToolsSummary = this.el("span", "agent-tools-summary");
    toolsHeader.appendChild(this.builderToolsSummary);
    this.builderToolsToggle = this.el("button", "agent-tools-toggle") as HTMLButtonElement;
    this.builderToolsToggle.type = "button";
    this.builderToolsToggle.hidden = true;
    this.builderToolsToggle.setAttribute("aria-expanded", "false");
    this.builderToolsToggle.addEventListener("click", () => {
      this.toolsExpanded = !this.toolsExpanded;
      this.renderToolRows(this.lastToolRows);
    });
    toolsHeader.appendChild(this.builderToolsToggle);
    toolsHeader.hidden = true;
    builder.appendChild(toolsHeader);
    this.builderToolsHeader = toolsHeader;

    this.builderToolRows = this.el("div", "agent-tool-rows");
    this.labelScrollable(this.builderToolRows, "도구 실행 기록");
    builder.appendChild(this.builderToolRows);

    // Builder composer (Req 1): free-text input + send.
    const builderComposer = this.el("div", "agent-composer");
    const builderComposerLabel = this.el("label", "agent-field-label");
    builderComposerLabel.textContent = "빌더에게 요청하기";
    builderComposer.appendChild(builderComposerLabel);
    this.builderComposerLabel = builderComposerLabel;

    this.builderComposerInput = this.el("textarea", "agent-composer-input") as HTMLTextAreaElement;
    this.builderComposerInput.setAttribute("aria-label", "빌더 요청");
    this.builderComposerInput.setAttribute(
      "placeholder",
      "예: 로그인 화면부터 만들어 주세요",
    );
    this.builderComposerInput.rows = 3;
    builderComposer.appendChild(this.builderComposerInput);

    const builderControls = this.el("div", "agent-composer-actions");
    // Kiro-native host: the Builder runs in Kiro chat; this connects the Project.
    this.kiroOpenButton = this.el("button", "agent-kiro-open") as HTMLButtonElement;
    this.kiroOpenButton.type = "button";
    this.kiroOpenButton.textContent = "Kiro 채팅에서 열기";
    this.kiroOpenButton.hidden = true;
    this.kiroOpenButton.addEventListener("click", () => {
      if (!this.kiroOpenButton.hidden && !this.kiroOpenButton.disabled) this.callbacks.onOpenInKiro();
    });
    builderControls.appendChild(this.kiroOpenButton);
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
    this.builderResumeButton.textContent = "선택한 내용으로 계속하기";
    this.builderResumeButton.hidden = true;
    this.builderResumeButton.addEventListener("click", () =>
      this.callbacks.onResumeAfterDecision(),
    );
    builderControls.appendChild(this.builderResumeButton);

    this.workspaceOpenButton = this.el("button", "agent-workspace-open") as HTMLButtonElement;
    this.workspaceOpenButton.type = "button";
    this.workspaceOpenButton.textContent = "작업 폴더 열기";
    this.workspaceOpenButton.hidden = true;
    this.workspaceOpenButton.addEventListener("click", () => {
      if (this.renderedTaskId && !this.workspaceOpenButton.disabled)
        this.callbacks.onOpenWorkspace(this.renderedTaskId);
    });
    builderControls.appendChild(this.workspaceOpenButton);
    this.resultLaunchButton = this.el("button", "agent-result-launch") as HTMLButtonElement;
    this.resultLaunchButton.type = "button";
    this.resultLaunchButton.textContent = "결과 실행";
    this.resultLaunchButton.hidden = true;
    this.resultLaunchButton.addEventListener("click", () => {
      if (!this.resultLaunchButton.hidden && !this.resultLaunchButton.disabled)
        this.callbacks.onLaunchResult();
    });
    builderControls.appendChild(this.resultLaunchButton);

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
    this.helperWindowOpening.textContent = "도우미 연결을 준비하고 있어요. 별도 Kiro 창이 열려도 질문과 답변은 여기에서 이어져요.";
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
    this.labelScrollable(this.helperTranscript, "도우미 응답 내용");
    helper.appendChild(this.helperTranscript);

    this.helperConversations = this.el("div", "agent-helper-conversations");
    this.labelScrollable(this.helperConversations, "저장된 도우미 대화");
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
    this.decisionsLabel = decisionsLabel;
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
    // Offered only after the Task completes (renderBuilder toggles it): an
    // optional next step, not a form to fill in from the start.
    const finalUpgrade = this.el("section", "agent-final-upgrade");
    finalUpgrade.setAttribute("aria-label", "선택적인 개선 제안");
    finalUpgrade.hidden = true;
    this.finalUpgradeSection = finalUpgrade;
    const finalUpgradeHeader = this.el("div", "agent-final-upgrade-header");
    const finalUpgradeLabel = this.el("h1", "agent-section-heading");
    finalUpgradeLabel.textContent = "한 단계 더 발전시켜 볼까요?";
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

    const finalUpgradeIntro = this.el("p", "agent-final-upgrade-intro");
    finalUpgradeIntro.textContent =
      "이번 작업을 마쳤어요. 아래 제안을 선택하거나 빌더에게 원하는 후속 작업을 바로 요청할 수 있어요. 원하지 않으면 건너뛰어도 괜찮아요.";
    finalUpgrade.appendChild(finalUpgradeIntro);

    this.finalUpgradeList = this.el("div", "agent-final-upgrade-list");
    finalUpgrade.appendChild(this.finalUpgradeList);

    // Prepare control (Req 11.2). The three durable references are filled
    // automatically (task/revision) or by choosing a candidate below, so they
    // stay in a hidden group; the learner only writes the goal.
    const prepare = this.el("div", "agent-final-upgrade-prepare");
    const references = this.el("div", "agent-final-upgrade-references");
    references.hidden = true;
    prepare.appendChild(references);
    const sourceTaskId = this.buildTextInput(references, "원본 작업 ID", "source-task-id");
    const expectedRevision = this.buildTextInput(
      references,
      "원본 작업 리비전",
      "expected-source-task-revision",
    );
    expectedRevision.type = "number";
    const personalizationTraceId = this.buildTextInput(
      references,
      "개인화 기록 ID",
      "personalization-trace-id",
    );
    const userGoalField = this.el("div", "agent-field");
    const userGoalLabel = this.el("label", "agent-field-label");
    userGoalLabel.textContent = "어떤 점을 더 발전시키고 싶나요?";
    const userGoal = this.el("textarea", "agent-final-upgrade-goal") as HTMLTextAreaElement;
    userGoal.setAttribute("aria-label", "개선 목표");
    userGoal.setAttribute("placeholder", "예: 예약이 겹치면 다른 시간을 추천해 주면 좋겠어요");
    userGoal.rows = 2;
    userGoalField.appendChild(userGoalLabel);
    userGoalField.appendChild(userGoal);
    prepare.appendChild(userGoalField);

    const prepareButton = this.el(
      "button",
      "agent-final-upgrade-prepare-button",
    ) as HTMLButtonElement;
    prepareButton.type = "button";
    prepareButton.textContent = "개선 작업 준비하기";
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

    // ---- Next Move (Kiro-native) ------------------------------------------
    // Ways to grow the project after a finished Task. A suggestion only: there
    // is no start button; the learner says a number or an idea in Kiro chat.
    const nextMove = this.el("section", "agent-next-move");
    nextMove.setAttribute("aria-label", "다음 한 걸음");
    nextMove.hidden = true;
    this.nextMoveSection = nextMove;
    const nextMoveLabel = this.el("h1", "agent-section-heading");
    nextMoveLabel.textContent = "다음 한 걸음";
    nextMove.appendChild(nextMoveLabel);
    this.nextMoveStatus = this.el("p", "agent-next-move-status");
    this.nextMoveStatus.setAttribute("role", "status");
    this.nextMoveStatus.setAttribute("aria-live", "polite");
    nextMove.appendChild(this.nextMoveStatus);
    this.nextMoveList = this.el("ol", "agent-next-move-list");
    this.nextMoveList.setAttribute("aria-label", "다음 한 걸음 후보");
    nextMove.appendChild(this.nextMoveList);
    this.nextMoveNote = this.el("p", "agent-next-move-note");
    this.nextMoveNote.textContent = "마음에 드는 게 있으면 Kiro 채팅에 번호나 원하는 방향을 말해 주세요. 지금 안 해도 돼요.";
    nextMove.appendChild(this.nextMoveNote);
    this.nextMoveRetryButton = this.el("button", "agent-next-move-retry") as HTMLButtonElement;
    this.nextMoveRetryButton.type = "button";
    this.nextMoveRetryButton.textContent = "다시 만들기";
    this.nextMoveRetryButton.hidden = true;
    this.nextMoveRetryButton.addEventListener("click", () => {
      if (!this.nextMoveRetryButton.hidden && !this.nextMoveRetryButton.disabled) this.callbacks.onRetryNextMove();
    });
    nextMove.appendChild(this.nextMoveRetryButton);
    container.appendChild(nextMove);

    // ---- This Task's learning records (Kiro-native, K17) -------------------
    // What chat does not show: which of the learner's own words Core accepted
    // as understanding in this Task. Agent output never appears here.
    const taskEvidence = this.el("section", "agent-task-evidence");
    taskEvidence.setAttribute("aria-label", "이번 작업의 학습 기록");
    taskEvidence.hidden = true;
    const taskEvidenceLabel = this.el("h1", "agent-section-heading");
    taskEvidenceLabel.textContent = "이번 작업의 학습 기록";
    taskEvidence.appendChild(taskEvidenceLabel);
    this.taskEvidenceList = this.el("ul", "agent-task-evidence-list");
    taskEvidence.appendChild(this.taskEvidenceList);
    this.taskEvidenceEmpty = this.el("p", "agent-task-evidence-empty");
    this.taskEvidenceEmpty.textContent = "아직 없어요. Kiro 채팅에서 고른 이유나 직접 한 설명이 인정되면 여기에 보여요.";
    taskEvidence.appendChild(this.taskEvidenceEmpty);
    container.appendChild(taskEvidence);
    this.taskEvidenceSection = taskEvidence;

    this.selectTab("builder");
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
    // Kiro-native: building and choosing happen in Kiro chat; this tab shows
    // the state, this Task's learning records, Next Move and a compact list of
    // choices (K17). Section order follows data-host in the panel CSS.
    this.surface.dataset.host = vm.hostChat ? "kiro" : "panel";
    const waiting = vm.hostChat
      ? vm.decisions.find(d => d.taskId === vm.builder.taskId && !d.resolved && !d.replaced)
      : undefined;
    this.renderBuilder(vm.builder, vm.hostChat, waiting?.question);
    this.renderNextMove(vm.hostChat ? vm.nextMove : undefined);
    this.renderTaskEvidence(vm.hostChat ? vm.taskEvidence ?? [] : undefined);
    this.renderHelper(vm.helper);
    this.renderDecisions(vm.decisions, vm.hostChat ? vm.builder.taskId : undefined);
    this.renderNativeQuestions(vm.nativeQuestions);
    this.renderWorker(vm.worker);
    this.renderNotice(vm.notice);
    this.renderTabBadges(vm);
  }

  /** Show one surface. Pending decisions/questions stay visible on Builder and Helper. */
  selectTab(tab: AgentTab): void {
    this.surface.dataset.tab = tab;
    for (const [name, button] of Object.entries(this.tabButtons)) {
      const active = name === tab;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
  }

  /** Small counts so work waiting on another tab is noticed without scrolling. */
  private renderTabBadges(vm: AgentViewModel): void {
    const waiting = vm.decisions.filter((d) => !d.resolved).length + vm.nativeQuestions.length;
    const badge = (tab: AgentTab, text: string) => {
      const el = this.tabBadges[tab];
      el.hidden = text === "";
      el.textContent = text;
    };
    badge("builder", waiting > 0 ? String(waiting) : "");
    badge("helper", vm.helper.phase === "RUNNING" ? "…" : "");
  }

  /** Clear only project-bound local state when History changes project. */
  resetProject(): void {
    this.toolsExpanded = false;
    this.lastToolRows = [];
    this.upgradeTaskKey = undefined;
    this.finalUpgradeListedFor = null;
    this.finalUpgradeSection.hidden = true;
    this.nextMoveRenderKey = undefined;
    this.nextMoveList.textContent = "";
    this.nextMoveSection.hidden = true;
    this.taskEvidenceRenderKey = undefined;
    this.taskEvidenceList.textContent = "";
    this.taskEvidenceSection.hidden = true;
    this.renderedTaskId = null;
    this.workspaceOpenButton.hidden = true;
    this.resultLaunchButton.hidden = true;
    this.decisionsRenderKey = undefined;
    this.nativeRenderKey = undefined;
    this.decisionsRegion.textContent = "";
    this.nativeRegion.textContent = "";
    this.evidenceRegion.textContent = "";
    this.finalUpgradeList.textContent = "";
    this.builderComposerInput.value = "";
    this.helperComposerInput.value = "";
    for (const input of Object.values(this.finalUpgradeInputs)) input.value = "";
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

    // A single returned candidate is unambiguous. Filling is not submitting;
    // an existing user choice and the user's goal are never overwritten.
    if (candidates.length === 1 && !this.finalUpgradeInputs.personalizationTraceId.value)
      this.finalUpgradeInputs.personalizationTraceId.value = candidates[0].id;

    const traceInput = this.finalUpgradeInputs.personalizationTraceId;
    const rows: HTMLElement[] = [];
    const markSelected = () => {
      for (const [index, row] of rows.entries())
        row.setAttribute("aria-pressed", String(candidates[index].id === traceInput.value));
    };
    for (const [index, candidate] of candidates.entries()) {
      // A button so the learner picks a basis instead of typing its id.
      const row = this.el("button", "agent-final-upgrade-candidate") as HTMLButtonElement;
      row.type = "button";
      row.title = candidate.id;

      const id = this.el("div", "agent-final-upgrade-candidate-id");
      id.textContent = `개선 제안 ${index + 1}`;
      row.appendChild(id);

      const meta = this.el("div", "agent-final-upgrade-candidate-meta");
      meta.textContent = `반영할 근거 ${candidate.basisCount}건 · ${formatDate(candidate.createdAt)}`;
      row.appendChild(meta);

      row.addEventListener("click", () => {
        traceInput.value = candidate.id;
        markSelected();
      });
      rows.push(row);
      this.finalUpgradeList.appendChild(row);
    }
    markSelected();
  }

  // ==========================================================================
  // Builder rendering
  // ==========================================================================

  private renderBuilder(builder: BuilderTurnViewModel, hostChat?: HostChatViewModel, waitingQuestion?: string): void {
    this.readyToStart = !!builder.readyToStart && !!builder.taskId;
    this.renderedTaskId = builder.taskId;
    // Final upgrade is a suggestion after completion, never shown up front.
    // Kiro-native hosts offer Next Move instead (renderNextMove).
    const upgradeOffered = !hostChat && builder.phase === "TASK_COMPLETED" && builder.taskId !== null;
    this.finalUpgradeSection.hidden = !upgradeOffered;
    if (upgradeOffered && this.finalUpgradeListedFor !== builder.taskId) {
      this.finalUpgradeListedFor = builder.taskId;
      this.callbacks.onListFinalUpgrade(); // read-only candidate listing
    }
    const upgradeTaskKey = JSON.stringify([builder.taskId, builder.taskRevision]);
    if (upgradeTaskKey !== this.upgradeTaskKey) {
      this.upgradeTaskKey = upgradeTaskKey;
      this.finalUpgradeInputs.sourceTaskId.value = builder.taskId ?? "";
      this.finalUpgradeInputs.expectedSourceTaskRevision.value = builder.taskRevision == null ? "" : String(builder.taskRevision);
      this.finalUpgradeInputs.personalizationTraceId.value = "";
      this.finalUpgradeList.textContent = "";
    }
    this.builderPhase.textContent = this.readyToStart && builder.phase === "IDLE"
      ? "시작 대기" : BUILDER_PHASE_LABELS[builder.phase];

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
      this.builderCompletion.textContent = builder.completionReportId && !hostChat
        ? `완료 보고서: ${builder.completionReportId}`
        : "이번 작업을 완료했어요.";
    } else {
      this.builderCompletion.hidden = true;
      this.builderCompletion.textContent = "";
    }

    this.builderNextHint.dataset.waiting = String(!!hostChat && !!waitingQuestion && !this.readyToStart);
    if (hostChat && builder.taskId) {
      this.builderNextHint.hidden = false;
      this.builderNextHint.textContent = this.readyToStart
        ? "계획과 작업이 준비됐어요. ‘Kiro 채팅에서 열기’를 누르면 이 Project를 Kiro 채팅에 연결해요. 만들기와 결정은 Kiro 채팅에서 하고, 쌓인 기록은 ‘학습 기록’에서 볼 수 있어요."
        : waitingQuestion
          ? `Kiro 채팅이 답을 기다려요: ${waitingQuestion}`
          : builder.phase === "TASK_COMPLETED"
            ? "이번 작업을 마쳤어요. 아래 ‘다음 한 걸음’을 보거나, 하고 싶은 것을 Kiro 채팅에 말해 주세요."
            : "만들기는 Kiro 채팅에서 진행돼요. 채팅 창을 닫았거나 다른 폴더를 열었다면 ‘Kiro 채팅에서 열기’를 다시 눌러 주세요.";
    } else if (this.readyToStart && builder.phase === "IDLE") {
      this.builderNextHint.hidden = false;
      this.builderNextHint.textContent = "계획과 작업이 준비됐어요. ‘빌더 시작’을 누르면 확정한 계획으로 만들기를 시작해요. 추가 요청은 선택 입력이에요.";
    } else if (builder.phase === "TASK_COMPLETED") {
      this.builderNextHint.hidden = false;
      this.builderNextHint.textContent = "완료한 내용에 이어 실행, 설명, 수정 요청을 계속 보내 주세요. 도우미에게도 언제든 질문할 수 있어요.";
    } else if (builder.phase === "TURN_ENDED") {
      this.builderNextHint.hidden = false;
      this.builderNextHint.textContent =
        "작업은 아직 끝나지 않았어요. 빌더가 다음 지시를 기다리고 있어요. 아래 '빌더에게 요청하기'에 이어서 할 일을 적어 보내 주세요." +
        (builder.permissionDenied ? " 막힌 명령이 있었다면 '막힌 작업을 허용된 방법으로 이어서 해 줘'처럼 요청할 수 있어요." : "");
    } else {
      this.builderNextHint.hidden = true;
      this.builderNextHint.textContent = "";
    }

    // Error indicator (FAILED / START_ERROR carry an errorCode).
    if (
      (builder.phase === "FAILED" || builder.phase === "START_ERROR") &&
      builder.errorCode
    ) {
      this.builderError.hidden = false;
      this.builderError.textContent = this.errorText(builder.errorCode);
    } else {
      this.builderError.hidden = true;
      this.builderError.textContent = "";
    }

    // Permission-denied indicator.
    this.builderPermissionDenied.hidden = !builder.permissionDenied || builder.phase === "TASK_COMPLETED";

    this.renderTranscript(this.builderTranscript, builder.transcript, "빌더");

    // Tool rows — one row per stable key (Req 2.2/2.8), collapsed by default.
    this.renderToolRows(builder.toolRows);

    // Stop shown only while RUNNING (Req 6.1); resume only while DECISION_REQUIRED.
    this.builderStopButton.hidden = !!hostChat || builder.phase !== "RUNNING";
    this.builderResumeButton.hidden = !!hostChat || builder.phase !== "DECISION_REQUIRED";

    // Lock the composer/send while a turn is in flight.
    const inFlight =
      builder.phase === "STARTING" ||
      builder.phase === "RUNNING" ||
      builder.phase === "CLASSIFYING" ||
      builder.phase === "RECOVERING" ||
      builder.phase === "CLEANUP";
    const completed = builder.phase === "TASK_COMPLETED";
    this.builderComposerInput.disabled = inFlight;
    this.builderSendButton.disabled = inFlight;
    this.builderSendButton.textContent = this.readyToStart ? "빌더 시작" : "보내기";
    // Kiro-native: requests and runs live in Kiro chat, so only the connect
    // button remains; the transcript shows only if a run ever streamed here.
    this.kiroOpenButton.hidden = !hostChat || !builder.taskId;
    this.kiroOpenButton.disabled = !!hostChat?.opening;
    this.builderComposerLabel.hidden = this.builderComposerInput.hidden =
      this.builderSendButton.hidden = !!hostChat;
    this.builderTranscriptLabel.hidden = this.builderTranscript.hidden =
      !!hostChat && builder.transcript.length === 0;
    this.workspaceOpenButton.hidden = !!hostChat || !builder.taskId;
    this.workspaceOpenButton.disabled = inFlight || !builder.taskId;
    this.resultLaunchButton.hidden = !completed || !builder.taskId;
    this.resultLaunchButton.disabled = inFlight || !builder.taskId;
  }

  /**
   * Kiro-native Next Move card: a generating line, three suggestions with the
   * "say it in Kiro chat" note, or a failure with the card's only button.
   * Hidden while the latest Task is not finished (`NONE`).
   */
  private renderNextMove(nextMove: NextMoveViewModel | undefined): void {
    const status = nextMove?.status ?? "NONE";
    this.nextMoveSection.hidden = status === "NONE";
    this.nextMoveSection.dataset.status = status;
    this.nextMoveStatus.hidden = status === "READY" || status === "NONE";
    this.nextMoveStatus.textContent = status === "GENERATING"
      ? "이번 작업을 바탕으로 다음에 해 볼 만한 것을 고르고 있어요…"
      : status === "FAILED"
        ? "다음 한 걸음을 만들지 못했어요. 다시 만들거나, 하고 싶은 것을 Kiro 채팅에 바로 말해도 돼요."
        : "";
    this.nextMoveNote.hidden = status !== "READY";
    this.nextMoveRetryButton.hidden = status !== "FAILED";
    this.nextMoveRetryButton.disabled = !!nextMove?.retrying;
    const moves = status === "READY" && nextMove ? nextMove.moves : [];
    const key = JSON.stringify(moves);
    if (key === this.nextMoveRenderKey) return;
    this.nextMoveRenderKey = key;
    this.nextMoveList.textContent = "";
    for (const move of moves) {
      const item = this.el("li", "agent-next-move-item");
      const head = this.el("div", "agent-next-move-head");
      const number = this.el("span", "agent-next-move-number");
      number.textContent = String(move.number);
      head.appendChild(number);
      const title = this.el("span", "agent-next-move-title");
      title.textContent = move.title;
      head.appendChild(title);
      const size = this.el("span", "agent-next-move-size");
      size.textContent = move.size === "SMALL" ? "작음" : "보통";
      size.setAttribute("title", move.size === "SMALL" ? "작업 크기: 작음" : "작업 크기: 보통");
      head.appendChild(size);
      item.appendChild(head);
      const summary = this.el("p", "agent-next-move-summary");
      summary.textContent = move.summary;
      item.appendChild(summary);
      const benefit = this.el("p", "agent-next-move-benefit");
      benefit.textContent = `좋아지는 점: ${move.benefit}`;
      item.appendChild(benefit);
      this.nextMoveList.appendChild(item);
    }
  }

  /**
   * Renders the tool list. Collapsed, only the last {@link COLLAPSED_TOOL_ROWS}
   * rows are in the DOM; expanded, every row is shown inside a bounded scroll
   * region. The header summarizes the total and failed counts either way.
   */
  private renderToolRows(rows: readonly ToolRowViewModel[]): void {
    this.lastToolRows = rows;
    const denied = rows.filter(row => isPermissionDenial(row.errorCode)).length;
    const failed = rows.filter((row) =>
      row.status === "FAILED" && row.errorCode !== "NATIVE_FILE_NOT_FOUND" && !isPermissionDenial(row.errorCode)).length;
    const collapsible = rows.length > COLLAPSED_TOOL_ROWS;
    const expanded = collapsible && this.toolsExpanded;

    this.builderToolsHeader.hidden = rows.length === 0;
    this.builderToolsSummary.textContent =
      rows.length === 0 ? "" : `${rows.length}개${failed > 0 ? ` · 실패 ${failed}` : ""}${denied > 0 ? ` · 제한 ${denied}` : ""}`;
    this.builderToolsToggle.hidden = !collapsible;
    this.builderToolsToggle.setAttribute("aria-expanded", String(expanded));
    this.builderToolsToggle.textContent = expanded
      ? "최근 기록만 보기"
      : `이전 ${rows.length - COLLAPSED_TOOL_ROWS}개 더 보기`;
    this.builderToolRows.dataset.expanded = String(expanded);

    const visible = expanded ? rows : rows.slice(-COLLAPSED_TOOL_ROWS);
    this.keepScroll(this.builderToolRows, () => {
      this.builderToolRows.textContent = "";
      for (const toolRow of visible) {
        this.builderToolRows.appendChild(this.buildToolRow(toolRow));
      }
    });
  }

  /**
   * Rebuilds a scroll region without losing the reader's place: a region
   * scrolled to (near) the bottom follows new entries, otherwise the previous
   * offset is restored. Streams re-render on every event, so this matters.
   */
  private keepScroll(region: HTMLElement, rebuild: () => void): void {
    const measurable = typeof region.scrollTop === "number" && typeof region.scrollHeight === "number" &&
      typeof region.clientHeight === "number";
    if (!measurable) {
      rebuild();
      return;
    }
    const previous = region.scrollTop;
    const followBottom = region.scrollHeight - previous - region.clientHeight < 24;
    rebuild();
    region.scrollTop = followBottom ? region.scrollHeight : previous;
  }

  private readonly transcriptCache = new WeakMap<HTMLElement, string>();
  private conversationKey = "";

  private renderTranscript(region: HTMLElement, chunks: BuilderTurnViewModel["transcript"], role: string): void {
    // TEXT events are deltas, not messages. Never insert whitespace at transport boundaries.
    const text = chunks.map(chunk => chunk.text).join("");
    if (this.transcriptCache.get(region) === text && (region.children.length > 0 || !text)) return;
    this.keepScroll(region, () => {
      region.textContent = "";
      if (text) {
        const message = this.el("article", "agent-chat-message");
        const label = this.el("div", "agent-chat-role");
        label.textContent = role;
        message.appendChild(label);
        const body = this.el("div", "agent-chat-body");
        renderChatMessage(body, text);
        message.appendChild(body);
        region.appendChild(message);
      }
      this.transcriptCache.set(region, text);
    });
  }

  /** Fixed guidance for a known runtime code, with the code kept for support. */
  private errorText(code: string): string {
    const message = errorGuidance(code);
    return message ? `${message} (${code})` : code;
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
    tool.textContent = toolRow.tool ? (TOOL_LABELS[toolRow.tool] ?? toolRow.tool) : "기타 도구";
    head.appendChild(tool);

    const status = this.el("span", "agent-tool-row-status");
    // A read that found no file is usually a probe, not a failure (B9). The
    // status stays FAILED in the model; only the label and tone change here.
    const fileMissing = toolRow.errorCode === "NATIVE_FILE_NOT_FOUND";
    status.textContent = fileMissing ? "파일 없음" : isPermissionDenial(toolRow.errorCode) ? "요청 제한" : TOOL_STATUS_LABELS[toolRow.status];
    status.dataset.status = fileMissing ? "NOT_FOUND" : isPermissionDenial(toolRow.errorCode) ? "DENIED" : toolRow.status;
    if (fileMissing) row.title = "프로젝트 구성을 확인하는 중 해당 파일을 찾지 못했어요. 파일이 아직 없을 수 있어요.";
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
      coreAction.textContent = CORE_ACTION_LABELS[toolRow.coreAction] ?? toolRow.coreAction;
      row.appendChild(coreAction);
    }

    if (toolRow.exitCode !== null) {
      const exit = this.el("div", "agent-tool-row-exit");
      exit.textContent = `종료 코드: ${toolRow.exitCode}`;
      row.appendChild(exit);
    }

    if (toolRow.output) {
      const output = this.el("pre", "agent-tool-row-output");
      this.labelScrollable(output, "도구 실행 출력");
      // Bounded, Core-redacted output rendered as text only (Req 2.7).
      output.textContent = toolRow.output;
      row.appendChild(output);
    }

    // Fixed guidance for a known per-tool code (e.g. a refused completion).
    const hint = toolRow.errorCode && !fileMissing ? errorGuidance(toolRow.errorCode) : undefined;
    if (hint) {
      const hintEl = this.el("div", "agent-tool-row-hint");
      hintEl.textContent = hint;
      row.appendChild(hintEl);
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
    if (message.trim().length === 0 && !this.readyToStart) {
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
    this.helperWindowOpening.hidden = helper.phase !== "RUNNING" || !helper.windowOpening || helper.transcript.length > 0;

    if (helper.phase === "FAILED" && helper.errorCode) {
      this.helperError.hidden = false;
      this.helperError.textContent = this.errorText(helper.errorCode);
    } else {
      this.helperError.hidden = true;
      this.helperError.textContent = "";
    }

    this.renderTranscript(this.helperTranscript, helper.transcript, "도우미");

    // Recorded conversations read from the After_Snapshot (Req 4.5).
    this.keepScroll(this.helperConversations, () => {
      const key = JSON.stringify(helper.conversations);
      if (this.conversationKey === key && this.helperConversations.children.length > 0) return;
      this.conversationKey = key;
      this.helperConversations.textContent = "";
      for (const conversation of helper.conversations) {
        this.helperConversations.appendChild(this.buildHelperConversation(conversation));
      }
    });

    const inFlight = helper.phase === "RUNNING";
    this.helperComposerInput.disabled = inFlight;
    this.helperSendButton.disabled = inFlight;
  }

  /** Builds one recorded Helper conversation block; all text via `textContent`. */
  private buildHelperConversation(conversation: HelperConversationViewModel): HTMLElement {
    const block = this.el("div", "agent-helper-conversation");
    block.dataset.conversationId = conversation.conversationId;

    const status = this.el("div", "agent-helper-conversation-status");
    status.textContent = { OPEN: "대화 중", PENDING_ANALYSIS: "대화 기록됨 · 근거 정리 대기", ANALYZED: "근거 정리 완료", ANALYSIS_FAILED: "근거 정리 실패" }[conversation.status];
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

    // The stored 240-character tail is analysis context, not a user-facing summary.
    // Keep the actual Helper transcript and durable user questions/status above.

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

  /**
   * `hostTaskId` set (Kiro-native, K17): the learner chooses in Kiro chat, so
   * this Task's current choices show as one compact line each, without the
   * panel's choose buttons. Otherwise the full panel forms.
   */
  private renderDecisions(decisions: readonly DecisionViewModel[], hostTaskId?: string | null): void {
    const compact = hostTaskId !== undefined;
    const shown = compact
      ? decisions.filter(d => d.taskId === hostTaskId && !d.replaced)
        .sort((left, right) => Number(left.resolved) - Number(right.resolved))
      : decisions;
    // Streaming Builder/Helper updates must not replace the focused inputs.
    // Context revisions are host-validated and do not change this form's content.
    const key = JSON.stringify([compact, shown.map(({ contextVersion: _version, ...form }) => form)]);
    if (key === this.decisionsRenderKey) return;
    this.decisionsRenderKey = key;
    this.decisionsLabel.textContent = compact ? "이번 작업의 결정" : "함께 정할 결정";
    this.decisionsRegion.textContent = "";
    for (const decision of shown) {
      this.decisionsRegion.appendChild(compact ? this.buildCompactDecision(decision) : this.buildDecision(decision));
    }
  }

  /** One Kiro-native choice: the question and what was chosen; options fold away. */
  private buildCompactDecision(decision: DecisionViewModel): HTMLElement {
    const block = this.el("details", "agent-decision agent-decision-compact");
    block.dataset.decisionId = decision.decisionId;
    block.dataset.state = !decision.resolved ? "waiting" : decision.applied ? "applied" : "chosen";
    const summary = this.el("summary", "agent-decision-compact-summary");
    const question = this.el("span", "agent-decision-compact-question");
    question.textContent = decision.question;
    summary.appendChild(question);
    const state = this.el("span", "agent-decision-compact-state");
    state.textContent = !decision.resolved
      ? "Kiro 채팅에서 답을 기다려요"
      : `${decision.chosenLabel ?? "골랐어요"}${decision.applied ? " · 반영함" : ""}`;
    summary.appendChild(state);
    block.appendChild(summary);
    const options = this.el("ol", "agent-decision-compact-options");
    for (const option of decision.options) {
      const item = this.el("li", "agent-decision-compact-option");
      item.textContent = option.id === decision.recommendedOptionId ? `${option.label} (추천)` : option.label;
      options.appendChild(item);
    }
    block.appendChild(options);
    return block;
  }

  /** Kiro-native: this Task's accepted learner Evidence, newest first; hidden elsewhere. */
  private renderTaskEvidence(items: readonly TaskEvidenceViewModel[] | undefined): void {
    this.taskEvidenceSection.hidden = items === undefined;
    if (items === undefined) return;
    const key = JSON.stringify(items);
    if (key === this.taskEvidenceRenderKey) return;
    this.taskEvidenceRenderKey = key;
    this.taskEvidenceEmpty.hidden = items.length > 0;
    this.taskEvidenceList.textContent = "";
    for (const item of items) {
      const row = this.el("li", "agent-task-evidence-item");
      const head = this.el("div", "agent-task-evidence-head");
      const name = this.el("span", "agent-task-evidence-concept");
      name.textContent = item.conceptName;
      head.appendChild(name);
      const state = this.el("span", "agent-task-evidence-state");
      state.textContent = TASK_EVIDENCE_STATE_LABELS[item.state];
      head.appendChild(state);
      row.appendChild(head);
      if (item.excerpt) {
        const quote = this.el("q", "agent-task-evidence-excerpt");
        quote.textContent = item.excerpt;
        row.appendChild(quote);
      }
      this.taskEvidenceList.appendChild(row);
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
    category.textContent = DECISION_CATEGORY_LABELS[decision.category] ?? decision.category;
    block.appendChild(category);

    const question = this.el("p", "agent-decision-question");
    question.textContent = decision.question;
    block.appendChild(question);

    if (decision.resolved) {
      const resolvedNote = this.el("div", "agent-decision-resolved");
      resolvedNote.textContent = decision.applied
        ? "이 결정을 반영했어요."
        : "선택이 저장됐어요. 빌더가 대기 중이면 ‘선택한 내용으로 계속하기’를 눌러 이어갈 수 있어요.";
      block.appendChild(resolvedNote);
    }

    // Rationale input (forwarded verbatim, Req 5.2).
    const rationaleField = this.el("div", "agent-field");
    const rationaleLabel = this.el("label", "agent-field-label");
    rationaleLabel.textContent = "고른 이유 (선택 · 적어 두면 학습 기록에 남아요)";
    const rationaleInput = this.el("textarea", "agent-decision-rationale") as HTMLTextAreaElement;
    rationaleInput.setAttribute("aria-label", "결정 이유");
    rationaleInput.rows = 2;
    rationaleInput.disabled = decision.resolved;
    rationaleField.appendChild(rationaleLabel);
    rationaleField.appendChild(rationaleInput);
    // Appended after the choices below: options first, reasoning right after.

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
      choose.textContent = "이걸로 정하고 계속하기";
      choose.disabled = decision.resolved;
      choose.addEventListener("click", () => {
        if (decision.resolved) return;
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
    acceptRecommended.textContent = "추천대로 정하고 계속하기";
    acceptRecommended.disabled = decision.resolved;
    acceptRecommended.addEventListener("click", () => {
      if (decision.resolved) return;
      this.callbacks.onResolveDecision(
        decision.decisionId,
        { kind: "RECOMMENDATION" },
        this.rationaleOf(rationaleInput),
        false,
      );
    });
    block.appendChild(acceptRecommended);
    block.appendChild(rationaleField);

    // Custom-proposal control, folded: most turns pick an option.
    const custom = this.el("details", "agent-decision-custom-group");
    const customSummary = this.el("summary", "agent-decision-custom-summary");
    customSummary.textContent = "다른 방식 직접 제안하기";
    custom.appendChild(customSummary);
    const customField = this.el("div", "agent-field");
    const customLabel = this.el("label", "agent-field-label");
    customLabel.textContent = "직접 제안";
    const customInput = this.el("textarea", "agent-decision-custom") as HTMLTextAreaElement;
    customInput.setAttribute("aria-label", "직접 제안");
    customInput.rows = 2;
    customInput.disabled = decision.resolved;
    customField.appendChild(customLabel);
    customField.appendChild(customInput);
    custom.appendChild(customField);

    const customSubmit = this.el("button", "agent-decision-custom-submit") as HTMLButtonElement;
    customSubmit.type = "button";
    customSubmit.textContent = "제안대로 정하고 계속하기";
    customSubmit.disabled = decision.resolved;
    customSubmit.addEventListener("click", () => {
      if (decision.resolved) return;
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
    custom.appendChild(customSubmit);
    block.appendChild(custom);

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
    const key = JSON.stringify(questions);
    if (key === this.nativeRenderKey) return;
    this.nativeRenderKey = key;
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
    // This host's opening code can outlive the other host's entire Helper run.
    // The run-scoped Helper banner above owns this indication.
    if (!worker || worker.stage === "HELPER_WINDOW_OPENING") {
      this.workerStatus.hidden = true;
      this.workerStatus.textContent = "";
      return;
    }
    this.workerStatus.hidden = false;
    if (worker.stage === "AGENT_ENDED" && worker.role === "DISCOVERY") {
      this.workerStatus.textContent = "탐색 작업이 끝났어요.";
      this.workerStatus.title = worker.code;
      return;
    }
    // Display-only: stage + role + raw code (no product branching, Req 12.1).
    const role = worker.role ? WORKER_ROLE_LABELS[worker.role] ?? worker.role : "";
    const guidance = workerStatusGuidance(worker.code);
    const stage = WORKER_STAGE_LABELS[worker.stage];
    this.workerStatus.textContent = guidance ?? (stage ? `${role ? `${role} · ` : ""}${stage}` : `작업 상태: ${worker.code}`);
    this.workerStatus.title = worker.code;
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
      // No success indication (Req 10.4). The reason is the Analyst's own memo
      // and quotes internal terms (Episode, USER_DECISION, BUILDER_CHAT_TURN),
      // so the learner reads a plain sentence and the memo stays one click away
      // (Windows 0.2.12 check, 2026-10-17).
      status.textContent = "이번 대화에서는 이해 근거로 인정된 내용이 없어요. 고른 이유나 내 생각을 내 말로 적으면 근거로 남아요.";
      block.appendChild(status);
      if (job.noEvidenceReason) {
        const memo = this.el("details", "agent-evidence-analysis-memo");
        const summary = this.el("summary", "agent-evidence-analysis-memo-summary");
        summary.textContent = "자세한 분석 메모";
        const reason = this.el("p", "agent-evidence-analysis-memo-text");
        reason.textContent = job.noEvidenceReason;
        memo.appendChild(summary);
        memo.appendChild(reason);
        block.appendChild(memo);
      }
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

      // Retry affordance (Req 10.5). The projection omits job revisions, so 0
      // asks the controller to read the current failed job revision. Only that
      // durable revision is sent to Core's optimistic concurrency check.
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

  /** Makes an existing scroll region reachable and identifiable by keyboard. */
  private labelScrollable(element: HTMLElement, label: string): void {
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", label);
    element.setAttribute("tabindex", "0");
    // Phase changes already use polite status. Do not repeatedly announce the
    // entire transcript on every streaming render; it remains navigable here.
  }

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
