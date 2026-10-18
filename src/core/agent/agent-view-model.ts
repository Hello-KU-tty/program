/**
 * Safe agent-surface projections (host-owned view model).
 *
 * These DTOs are the ONLY agent shapes allowed to cross the trusted host →
 * untrusted webview boundary (Requirement 13.1). Every field is a safe scalar
 * or relative value: no connection object, no token, no host object, and no
 * absolute path. The host holds the raw `LocalRun` / `ProjectSessionSnapshot`
 * and projects only what appears here.
 *
 * `ToolRowViewModel.relativePath` is always relative and is never an absolute
 * path (Requirement 2.9); the absolute `workspaceDirectory` is consumed only by
 * host-side `openFolder` and never placed in any of these projections.
 *
 * The only SDK type reused directly is {@link NativeWorkerStatusView}, which
 * already contains only display-safe scalars (stage / role / raw diagnostic
 * code).
 */
import type { EvidenceTraceView, NativeWorkerStatusView, ProjectSessionSnapshot } from "../../../vendor/frontend-client";

/**
 * K23: the learning record. Concept states are the learner's, across Projects, so a quote from
 * another Project names it: `sources` maps such an Evidence id to its Project title.
 */
export type LearningRecordView = EvidenceTraceView & { readonly sources?: Readonly<Record<string, string>> };

/** Core names a follow-up "<Project title> 후속 작업" (domain `planFollowUpTask`). */
const FOLLOW_UP_SUFFIX = " 후속 작업";

/**
 * Use the selected product name when a task only repeats the goal. K23: a follow-up started
 * from a Next Move is named by that suggestion, and any other follow-up by the product name,
 * since Projects made before 0.2.13 are titled by their whole learning goal.
 */
export function builderTaskLabel(snapshot: ProjectSessionSnapshot): string | null {
  const task = snapshot.currentTask;
  if (!task) return null;
  const moveTitle = task.nextMove?.title.trim();
  if (moveTitle) return moveTitle;
  const isGoal = (title: string) => title === snapshot.project.title || title === snapshot.project.learningGoal;
  const product = snapshot.selectedCandidate?.title;
  if (!product) return task.title;
  if (task.sequence === 1 && isGoal(task.title)) return product;
  if (task.sequence > 1 && task.title.endsWith(FOLLOW_UP_SUFFIX) && isGoal(task.title.slice(0, -FOLLOW_UP_SUFFIX.length)))
    return `${product}${FOLLOW_UP_SUFFIX}`;
  return task.title;
}

/** Top-level agent surface projection posted to the webview. */
export interface AgentViewModel {
  readonly surface: "BUILDER" | "HELPER";
  readonly builder: BuilderTurnViewModel;
  readonly helper: HelperViewModel;
  readonly decisions: readonly DecisionViewModel[];
  readonly nativeQuestions: readonly NativeQuestionViewModel[];
  /** Worker stage/role/code, display-only. */
  readonly worker: NativeWorkerStatusView | null;
  /** Last error / info notice (code + message). */
  readonly notice: NoticeViewModel | null;
  /**
   * Present only on a Kiro-native host, where the Builder runs in the
   * learner's Kiro chat and Core refuses panel Builder runs
   * (`BUILDER_RUNS_IN_HOST_CHAT`). The panel then offers "Kiro 채팅에서 열기".
   */
  readonly hostChat?: HostChatViewModel;
  /**
   * Kiro-native host only: Agent-authored ways to grow the project after the
   * latest finished Task (Core `UI_READ_NEXT_MOVE`). Suggestions only; the
   * learner starts one by saying it in Kiro chat, so there is no start button.
   */
  readonly nextMove?: NextMoveViewModel;
  /** Kiro-native only: what this Task's learner Evidence shows (K17). */
  readonly taskEvidence?: readonly TaskEvidenceViewModel[];
}

/** Kiro-native Builder connection state (no path, no token). */
export interface HostChatViewModel {
  /** An open-in-Kiro request is in flight (host dialogs may be showing). */
  readonly opening: boolean;
  /**
   * K23: whether Kiro chat in THIS window reaches the Project. `READY`: the open folder is
   * a connected, trusted Project folder; `UNTRUSTED`: connected but not trusted yet;
   * `RELOAD`: trusted after the window opened, so it needs one reload; `NOT_BOUND`: the
   * folder is not a Project folder. Absent when the host cannot tell (older host).
   */
  readonly window?: KiroWindowState;
  /** K23: the last "Kiro 채팅에서 열기" here opened the Project in a new window. */
  readonly openedNewWindow?: boolean;
}

/** K23: what Kiro chat in this window can reach (see {@link HostChatViewModel.window}). */
export type KiroWindowState = "READY" | "UNTRUSTED" | "RELOAD" | "NOT_BOUND";

/** K23: the panel's suggested first chat message; only ever copied, never sent. */
export const CHAT_START_TEXT = "시작해 줘";

/**
 * K23: the chat message that picks one Next Move suggestion; only ever copied, never sent.
 * "다음 한 걸음" names the panel card, so the Builder reads it as a Next Move number, not a
 * Decision option (Steering "Next moves").
 */
export function nextMoveChatText(move: { readonly number: number }): string {
  return `다음 한 걸음 ${move.number}번 해 보자`;
}

/** Next Move card state. `NONE` hides the card (no finished latest Task). */
export interface NextMoveViewModel {
  readonly status: "NONE" | "GENERATING" | "READY" | "FAILED";
  readonly moves: readonly {
    readonly number: number;
    readonly title: string;
    readonly summary: string;
    readonly benefit: string;
    readonly size: "SMALL" | "MEDIUM";
  }[];
  /** An explicit "다시 만들기" request is in flight. */
  readonly retrying: boolean;
}

/**
 * K23: what Kiro chat last said it is doing in this Task, from Core's Live Context. The Builder
 * writes it (`save_progress`) and Core adds checkpoints (choices, tests, completion), so it is
 * Agent-authored and shown only as the Builder's note, never as learner Evidence. It changes
 * only at those points, not with every file the Builder writes.
 */
export interface TaskProgressViewModel {
  readonly stage: string;
  readonly goal: string;
  /** The Builder's planned steps (`nextActions`), possibly empty. */
  readonly steps: readonly string[];
  readonly updatedAt: string;
}

/** Builder turn projection. `phase` is the display-only turn state. */
export interface BuilderTurnViewModel {
  readonly phase:
    | "IDLE"
    | "STARTING"
    | "RUNNING"
    | "CLASSIFYING"
    | "TASK_COMPLETED"
    | "DECISION_REQUIRED"
    | "TURN_ENDED"
    | "FAILED"
    | "CANCELLED"
    | "CLEANUP"
    | "RECOVERING"
    | "START_ERROR";
  readonly taskId: string | null;
  readonly taskTitle: string | null;
  /** K23: the current Task's 1-based order in its Project (follow-ups are 2, 3, …). */
  readonly taskSequence?: number | null;
  /** K23: the Builder's latest progress note for this Task (Core Live Context), if any. */
  readonly progress?: TaskProgressViewModel | null;
  /** A durable PENDING task exists; an explicit empty-message start is allowed. */
  readonly readyToStart?: boolean;
  /** Durable revision used to fill the existing upgrade form (never a path). */
  readonly taskRevision?: number | null;
  /** Appended TEXT stream (Core-redacted). */
  readonly transcript: readonly TranscriptLine[];
  /** TOOL rows keyed by toolId (stable), newest last. */
  readonly toolRows: readonly ToolRowViewModel[];
  readonly completionReportId: string | null;
  /** FAILED / START_ERROR code. */
  readonly errorCode: string | null;
  readonly permissionDenied: boolean;
}

/** A single tool activity row, keyed stably for in-place upsert. */
export interface ToolRowViewModel {
  /** `toolId` when present, else a synthetic `seq:<n>` key. */
  readonly key: string;
  /** `read` / `search` / `write` / `shell` / `core` / title. */
  readonly tool: string | null;
  readonly status: "RUNNING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
  /**
   * Relative path only — NEVER an absolute path (Requirement 2.9). An absolute
   * `workspaceDirectory` is used only in host-side `openFolder` and never
   * projected here.
   */
  readonly relativePath: string | null;
  readonly command: string | null;
  readonly exitCode: number | null;
  readonly coreAction: string | null;
  /** Bounded, Core-redacted output. Render as text only. */
  readonly output: string | null;
  readonly truncated: boolean;
  /**
   * Safe fixed code for this tool call, if any (e.g. `NATIVE_FILE_NOT_FOUND`
   * for a read that found no file). The row status stays as reported.
   */
  readonly errorCode: string | null;
}

/** One appended transcript line, keyed by run event sequence. */
export interface TranscriptLine {
  readonly sequence: number;
  readonly text: string;
}

/** Read-only Helper turn projection. */
export interface HelperViewModel {
  readonly phase: "IDLE" | "RUNNING" | "RECORDED" | "FAILED";
  /** HELPER_WINDOW_OPENING (Windows separate window). */
  readonly windowOpening: boolean;
  readonly transcript: readonly TranscriptLine[];
  /** Read back from the After_Snapshot's helperConversations. */
  readonly conversations: readonly HelperConversationViewModel[];
  readonly errorCode: string | null;
}

/** A recorded Helper conversation, projected from the snapshot. */
export interface HelperConversationViewModel {
  readonly conversationId: string;
  readonly taskId: string;
  readonly decisionId: string | null;
  readonly status: "OPEN" | "PENDING_ANALYSIS" | "ANALYZED" | "ANALYSIS_FAILED";
  /** redactedUserExcerpts. */
  readonly userExcerpts: readonly string[];
  /** helperResponseSummaries. */
  readonly responseSummaries: readonly string[];
}

/** A Builder decision request projected for resolution. */
export interface DecisionViewModel {
  readonly decisionId: string;
  readonly taskId: string;
  readonly category: string;
  readonly question: string;
  readonly options: readonly {
    readonly id: string;
    readonly label: string;
    readonly description: string;
  }[];
  readonly recommendedOptionId: string;
  /** resolution != null. */
  readonly resolved: boolean;
  /** application != null (blocks completion display when false). */
  readonly applied: boolean;
  readonly contextVersion: number;
  /** The chosen option's label, "직접 낸 안" for the learner's own idea, or null while open. */
  readonly chosenLabel?: string | null;
  /** A later Decision replaced this one (a changed or undone choice); Kiro-native hides it. */
  readonly replaced?: boolean;
}

/**
 * Kiro-native: learner Evidence Core accepted in the current Task (K17), for the
 * Builder tab. Agent output and clicks never appear here; only accepted user
 * understanding with its quoted learner words.
 */
export interface TaskEvidenceViewModel {
  readonly evidenceId: string;
  readonly conceptName: string;
  readonly state: "EXPLAINED" | "DEMONSTRATED" | "TRANSFERRED";
  /** The learner's own words Core quoted, if any. */
  readonly excerpt: string | null;
}

/** A native user-input question awaiting a verbatim answer. */
export interface NativeQuestionViewModel {
  readonly requestId: string;
  readonly nativeJobId: string;
  readonly role: "DISCOVERY" | "BUILDER" | "HELPER" | "EVIDENCE_ANALYST";
  readonly status: "WAITING" | "RESPONDING";
  readonly question: string;
  readonly options: readonly {
    readonly title: string;
    readonly description?: string;
    readonly recommended: boolean;
    readonly subOptionsLabel?: string;
    readonly subOptions: readonly {
      readonly title: string;
      readonly description?: string;
    }[];
  }[];
}

/** A display-only error / info notice (code + message). */
export interface NoticeViewModel {
  readonly kind: "error" | "info";
  readonly code: string;
  readonly message: string;
}

/** The IDLE projection: empty Builder/Helper turns, no decisions or questions. */
export function initialAgentViewModel(): AgentViewModel {
  return {
    surface: "BUILDER",
    builder: {
      phase: "IDLE",
      taskId: null,
      taskTitle: null,
      transcript: [],
      toolRows: [],
      completionReportId: null,
      errorCode: null,
      permissionDenied: false,
    },
    helper: {
      phase: "IDLE",
      windowOpening: false,
      transcript: [],
      conversations: [],
      errorCode: null,
    },
    decisions: [],
    nativeQuestions: [],
    worker: null,
    notice: null,
  };
}
