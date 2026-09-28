import type { LocalRun, LocalRunEvent, ProjectEvidenceTrace, ProjectSessionSnapshot, UiRequest } from './contracts/index.cjs';
export declare function isRunActive(run: Pick<LocalRun, 'status'>): boolean;
export type ToolActivityStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
export type RunEventView = {
    readonly kind: 'TEXT';
    readonly sequence: number;
    readonly text: string;
} | {
    readonly kind: 'TOOL';
    readonly sequence: number;
    /** Stable per tool call within a run when the transport provides one. */
    readonly toolId: string | null;
    /** Display only: known category, legacy transport title, or explicit `unknown`. */
    readonly tool: string;
    readonly status: ToolActivityStatus;
    readonly relativePath: string | null;
    readonly command: string | null;
    readonly exitCode: number | null;
    readonly coreAction: string | null;
    readonly errorCode: string | null;
    /** Core-redacted, bounded tool output. Render as text only. */
    readonly output: string | null;
    readonly truncated: boolean;
} | {
    readonly kind: 'STATE';
    readonly sequence: number;
    readonly run: LocalRun | null;
} | {
    readonly kind: 'PERMISSION_DENIED';
    readonly sequence: number;
};
/**
 * Map a transient run event to a transport-independent view. Diagnostic fields of the native
 * and CLI transports are intentionally dropped; unknown TOOL shapes degrade to `UNKNOWN`.
 */
export declare function projectRunEvent(event: LocalRunEvent): RunEventView;
export type BuilderTurnOutcome = {
    readonly kind: 'RUNNING';
} | {
    readonly kind: 'CANCELLED';
} | {
    readonly kind: 'FAILED';
    readonly errorCode: string;
} | {
    readonly kind: 'TASK_COMPLETED';
    readonly completionReportId: string;
} | {
    readonly kind: 'DECISION_REQUIRED';
    readonly decisionIds: readonly string[];
} | {
    readonly kind: 'TURN_ENDED_TASK_ACTIVE';
    readonly taskStatus: string;
} | {
    readonly kind: 'TASK_BINDING_CHANGED';
};
/**
 * Classify a Builder turn from its run and a snapshot read AFTER the run became terminal.
 * `SUCCEEDED/TURN_ENDED` only means the model turn ended; completion requires the durable
 * Task status and Completion Report of the same Task.
 */
export declare function classifyBuilderTurn(run: Pick<LocalRun, 'kind' | 'status' | 'errorCode' | 'projectId'>, after: ProjectSessionSnapshot, taskId: string): BuilderTurnOutcome;
export type DecisionSelection = {
    readonly kind: 'OPTION';
    readonly optionId: string;
} | {
    readonly kind: 'RECOMMENDATION';
} | {
    readonly kind: 'CUSTOM';
    readonly customProposal: string;
};
export declare class DecisionInputError extends Error {
    readonly code: string;
    constructor(code: string);
}
/**
 * Build a `UI_RESOLVE_DECISION` request from the latest snapshot and explicit user input.
 * `rationale` must be text the user actually typed; never generate it. The Builder is not
 * resumed by this command; start a new Builder run on the user's explicit action.
 */
export declare function createDecisionResolutionRequest(snapshot: ProjectSessionSnapshot, input: {
    readonly decisionId: string;
    readonly selection: DecisionSelection;
    readonly rationale?: string;
    readonly helperUsed: boolean;
}): Extract<UiRequest, {
    kind: 'UI_RESOLVE_DECISION';
}>;
/**
 * How a Concept may be labelled. Only accepted USER_UNDERSTANDING Evidence supports an
 * understanding claim; Agent explanations, successful runs, card clicks and OBSERVED
 * observations never do.
 */
export type ConceptDisplayState = 'NO_STATE' | 'OBSERVED_ONLY' | 'USER_EVIDENCE_EXPLAINED' | 'USER_EVIDENCE_DEMONSTRATED' | 'USER_EVIDENCE_TRANSFERRED';
export type AnalysisDisplayState = 'WAITING' | 'ANALYZING' | 'ANALYZED' | 'ANALYSIS_FAILED';
export interface EvidenceTraceView {
    readonly concepts: readonly {
        readonly id: string;
        readonly name: string;
        readonly state: string | null;
        readonly displayState: ConceptDisplayState;
        readonly userUnderstandingCount: number;
        readonly openIssueCount: number;
        readonly accepted: readonly {
            readonly id: string;
            readonly kind: string;
            readonly signal: string | null;
            readonly strength: string | null;
            readonly promptDependence: string | null;
            readonly supportsState: string | null;
            readonly episodeId: string;
            readonly excerpt: string | null;
            readonly rationale: string | null;
        }[];
        readonly rejected: readonly {
            readonly proposalId: string;
            readonly reasonCode: string;
            readonly excerpt: string | null;
            readonly explanation: string | null;
        }[];
    }[];
    readonly analysis: readonly {
        readonly jobId: string;
        readonly episodeId: string;
        readonly status: string;
        readonly displayState: AnalysisDisplayState;
        /** A SUCCEEDED job may still have accepted no Evidence. */
        readonly acceptedCount: number | null;
        readonly noEvidenceReason: string | null;
        readonly failureCode: string | null;
    }[];
    readonly userUnderstandingTotal: number;
    readonly emptyReason: string | null;
}
export declare function summarizeEvidenceTrace(projectId: string, trace: ProjectEvidenceTrace, options?: {
    readonly redactText?: (text: string) => string;
}): EvidenceTraceView;
export interface FinalUpgradeCandidate {
    readonly id: string;
    readonly createdAt: string;
    readonly basisCount: number;
}
/**
 * UI pre-filter for `UI_PREPARE_FINAL_UPGRADE_TASK`. A trace qualifies only when its Helper
 * turn has a recorded answer (same correlation). Core re-checks every condition and rejects
 * stale choices with `FINAL_UPGRADE_*` codes; refresh the list on rejection.
 */
export declare function eligibleFinalUpgradeTraces(snapshot: ProjectSessionSnapshot, trace: ProjectEvidenceTrace): FinalUpgradeCandidate[];
export type NativeWorkerRole = 'DISCOVERY' | 'BUILDER' | 'HELPER' | 'EVIDENCE_ANALYST';
export type NativeWorkerStage = 'STARTING' | 'CONNECTED' | 'JOB_CLAIMED' | 'AGENT_OPENING' | 'AGENT_QUEUED' | 'AGENT_RUNNING' | 'AGENT_ENDED' | 'AGENT_FAILED' | 'USER_INPUT' | 'PERMISSION' | 'HELPER_WINDOW_OPENING' | 'WORKSPACE_SWITCHING' | 'WORKSPACE_SWITCH_FAILED' | 'DIAGNOSTIC';
export interface NativeWorkerStatusView {
    readonly stage: NativeWorkerStage;
    readonly role: NativeWorkerRole | null;
    /** Raw diagnostic code. Display only; do not branch product logic on its suffixes. */
    readonly code: string;
}
/** Classify the worker's diagnostic status string (`host.worker.getStatus()`). */
export declare function classifyNativeWorkerStatus(code: unknown): NativeWorkerStatusView | null;
