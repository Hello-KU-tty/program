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
import type { NativeWorkerStatusView, ProjectSessionSnapshot } from "../../../vendor/frontend-client";

/** Use the selected product name when the initial task only repeats the goal. */
export function builderTaskLabel(snapshot: ProjectSessionSnapshot): string | null {
  const task = snapshot.currentTask;
  if (!task) return null;
  const goalTitle = task.title === snapshot.project.title || task.title === snapshot.project.learningGoal;
  return task.sequence === 1 && goalTitle && snapshot.selectedCandidate
    ? snapshot.selectedCandidate.title : task.title;
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
