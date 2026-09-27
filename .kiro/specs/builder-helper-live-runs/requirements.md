# Requirements Document

## Introduction

This feature connects the extension's Builder and Helper agent surfaces (and the related capability areas: Decision resolution, run cancellation, native user inputs, generated-workspace open, launch result, evidence trace, final upgrade, and native worker status) to the real local Core through the already-integrated managed host (`FrontendHost`, exposing `CoreClient` and `NativeWorker`). It supersedes the Demo `PanelController` agent path in product mode only, while leaving the shipped Discovery/Spec/History flow and its 228 passing tests fully intact.

The host owns all run, turn, decision, and native-question state; the webview is a pure projection that receives hydrate/patch messages and returns only discriminated semantic actions. Connection objects, tokens, the host object, and absolute `workspaceDirectory` values never cross into the webview. Live turns are streamed over SSE (`watchRun`); task completion is decided only by `classifyBuilderTurn`, never by `run.status === 'SUCCEEDED'` alone. Because the live runtime is fail-closed on this environment, all behavior described here is verified by a deterministic test strategy using fake `CoreClient` / `NativeWorker` fakes with the real SDK helpers — no live model calls, no real process spawn, no real SSE socket.

The requirements below are derived from the approved design and are testable by that deterministic strategy. Where a criterion maps to a design Correctness Property, the mapping is noted after the acceptance criteria list.

## Glossary

- **System**: The extension host-side agent surface implementation, comprising the `AgentSurfaceController`, `AgentDispatcher`, `AgentRunPort`/`NativeInputPort` adapters, and their SDK-helper usage. Unless stated otherwise, "THE System" refers to this host-side implementation.
- **Webview**: The untrusted projection surface. It renders the `AgentViewModel` and emits discriminated `AgentAction` messages only.
- **CoreClient**: The host-only structural client exposing `startRun`, `watchRun`, `cancelRun`, `execute`, `listRuns`, `restoreProject`, and related methods.
- **NativeWorker**: The host-side worker exposing `getStatus`, `listUserInputs`, `subscribeStatus`, `subscribeUserInputs`, and `submitUserInput`.
- **Managed_Host**: The `FrontendHost` instance created once on activation; its presence (`managedHost` set) selects product mode.
- **Builder_Turn**: A single live Builder run with its associated turn state machine, owned per Project.
- **Helper_Turn**: A single read-only Helper run that records a conversation and never resumes Builder or resolves a Decision.
- **Run_Event_View**: The transport-independent event view produced by `projectRunEvent` (`TEXT` / `TOOL` / `STATE` / `PERMISSION_DENIED`).
- **Builder_Turn_Outcome**: The result of `classifyBuilderTurn(run, afterSnapshot, taskId)`.
- **After_Snapshot**: A `ProjectSessionSnapshot` read via `restoreProject` after a run becomes terminal, used for classification and read-back.
- **Idempotency_Key**: A freshly generated key (`entityId('idem')`) supplied on each start/prepare request.
- **Expected_Task_Revision**: The `revision` of the current Task captured from the durable snapshot at prepare time.
- **AbortController**: The controller owning the SSE subscription lifecycle; aborting it closes the subscription without cancelling the run.
- **globalState**: Persistent extension state used to store `bhlr.lastProjectId`.

## Requirements

### Requirement 1: Builder Run Start and Completion Classification

**User Story:** As a learner, I want to start a Builder turn on my current task and see it run to a correct completion state, so that I can trust that "task complete" reflects durable truth rather than a transient run status.

#### Acceptance Criteria

1. WHEN the Webview submits a `builder/start` action, THE System SHALL require a current Task from the durable snapshot obtained via `restoreProject`, and IF no current Task exists, THEN THE System SHALL enter phase `START_ERROR` with a notice code and SHALL NOT call `startRun`.
2. WHEN the System starts a Builder run, THE System SHALL call `startRun` with a freshly generated Idempotency_Key and the captured Expected_Task_Revision.
3. WHEN `startRun` is accepted, THE System SHALL enter phase `RUNNING` and SHALL open a `watchRun` subscription to stream Run_Event_Views.
4. WHEN a Builder run becomes terminal, THE System SHALL read an After_Snapshot and SHALL determine the outcome only via `classifyBuilderTurn(run, afterSnapshot, taskId)`.
5. WHILE a run has `status === 'SUCCEEDED'`, THE System SHALL present phase `TASK_COMPLETED` only when `classifyBuilderTurn` returns outcome kind `TASK_COMPLETED`, and SHALL NOT present `TASK_COMPLETED` based on `status === 'SUCCEEDED'` alone.
6. WHEN `classifyBuilderTurn` returns `TASK_COMPLETED`, THE System SHALL present phase `TASK_COMPLETED` carrying the returned `completionReportId`.
7. WHEN `classifyBuilderTurn` returns `DECISION_REQUIRED`, THE System SHALL present phase `DECISION_REQUIRED` carrying the returned decision identifiers.
8. WHEN `classifyBuilderTurn` returns `TURN_ENDED_TASK_ACTIVE` or `TASK_BINDING_CHANGED`, THE System SHALL present phase `TURN_ENDED`.
9. WHEN `classifyBuilderTurn` returns `FAILED`, THE System SHALL present phase `FAILED` carrying the returned error code.
10. IF `startRun` is rejected with `RUN_BUSY`, THEN THE System SHALL present phase `START_ERROR` with error code `run_busy`.
11. IF `startRun` is rejected with `STALE_TASK_REVISION`, THEN THE System SHALL re-read the durable snapshot via `restoreProject`, re-project the view, and present phase `START_ERROR` with error code `stale_task_revision`.
12. IF `startRun` is rejected with `TASK_ALREADY_COMPLETED`, THEN THE System SHALL present phase `START_ERROR` with error code `task_already_completed`.
13. IF `startRun` is rejected with `TASK_BINDING_MISMATCH`, THEN THE System SHALL present phase `START_ERROR` with error code `task_binding_mismatch`.
14. IF `startRun` is rejected with `RUNTIME_CAPACITY`, THEN THE System SHALL present phase `START_ERROR` with error code `runtime_capacity`.
15. IF `startRun` is rejected with `RUN_IDEMPOTENCY_CONFLICT`, THEN THE System SHALL present phase `START_ERROR` with error code `idempotency_conflict`.

_Maps to Correctness Properties 1 (completion requires classification) and 3 (unapplied decision blocks completion display)._

### Requirement 2: Live Event Rendering

**User Story:** As a learner, I want live Builder/Helper events rendered clearly and safely, so that I can follow progress without being exposed to injected markup or unbounded output.

#### Acceptance Criteria

1. WHEN a Run_Event_View of kind `TEXT` is received, THE System SHALL append its text to the transcript keyed by sequence.
2. WHEN a Run_Event_View of kind `TOOL` is received, THE System SHALL upsert a tool row keyed by `toolId`, using the synthetic key `seq:<sequence>` when `toolId` is null.
3. WHEN successive `TOOL` events share the same key, THE System SHALL update the existing row's status among `RUNNING`, `SUCCEEDED`, `FAILED`, and `UNKNOWN` rather than creating a duplicate row.
4. WHEN `TOOL` events carry distinct keys, THE System SHALL append a separate row per distinct key.
5. WHEN a Run_Event_View of kind `PERMISSION_DENIED` is received, THE System SHALL surface a permission-denied indicator in the turn view model.
6. WHEN a Run_Event_View of kind `STATE` is received, THE System SHALL NOT append transcript text and SHALL update run state via the run-state callback only.
7. THE System SHALL render agent-produced text as text only and SHALL NOT interpret it as HTML or markup.
8. THE System SHALL present only the Core-redacted, bounded tool `output` provided by the Run_Event_View, along with its `truncated` flag.
9. THE System SHALL project a tool row's `relativePath` only and SHALL NOT include any absolute path in a tool row.

_Maps to Correctness Properties 7 (secret-free projection) and 8 (tool-row keying is stable)._

### Requirement 3: Window-Switch Reload Recovery

**User Story:** As a learner, I want an in-progress Builder run to resume after the window switch that opens the generated workspace, so that starting Builder does not silently lose my run when the extension host reloads.

#### Acceptance Criteria

1. WHEN the System starts a Builder run, THE System SHALL persist the current project identifier to `globalState` under `bhlr.lastProjectId`.
2. WHEN the extension host reactivates, THE System SHALL read `bhlr.lastProjectId` from `globalState` and, WHERE a project identifier is present, SHALL call `listRuns` for that project.
3. WHEN a run returned by `listRuns` satisfies `isRunActive(run)` and has `kind === 'BUILDER'`, THE System SHALL re-subscribe via `watchRun` with `after` equal to 0 and present phase `RECOVERING` transitioning to `RUNNING`.
4. IF no returned run is an active Builder run, THEN THE System SHALL present phase `IDLE`.
5. WHILE recovery is in progress, THE System SHALL subscribe to worker status so that worker stages relevant to a window switch are surfaced for display.

_Maps to Correctness Property 6 (recovery replays fully)._

### Requirement 4: Read-Only Helper Turn

**User Story:** As a learner, I want to ask a Helper for guidance without it changing my Builder run or resolving a Decision, so that Helper stays a safe, read-only assistant.

#### Acceptance Criteria

1. WHEN the Webview submits a `helper/start` action, THE System SHALL call `startRun` with kind `HELPER`, the current Task, the supplied origin, and an optional decision identifier, and SHALL NOT resume Builder as a side effect.
2. THE System SHALL NOT issue a Builder `startRun` or a `UI_RESOLVE_DECISION` request as a side effect of a Helper turn.
3. WHEN a Helper run becomes terminal with `outcome === 'HELPER_RECORDED'`, THE System SHALL present Helper phase `RECORDED`.
4. WHEN a Helper turn is recorded, THE System SHALL read the conversation content from the After_Snapshot's `helperConversations` rather than from live text alone.
5. WHERE the worker reports a helper window opening on Windows, THE System SHALL surface a separate helper window indicator in the Helper view model.
6. IF `startRun` for Helper is rejected with `DECISION_BINDING_MISMATCH`, `HELPER_EMPTY_RESPONSE`, or `NATIVE_ROLE_CATALOG_UNVERIFIED`, THEN THE System SHALL present Helper phase `FAILED` with the mapped error code and a notice.

_Maps to Correctness Property 2 (decision resolution never resumes Builder), applied to Helper's read-only guarantee._

### Requirement 5: Decision Resolution and Explicit Resume

**User Story:** As a learner, I want to resolve a Decision with my own rationale and then explicitly restart Builder, so that resolution reflects my intent and never auto-resumes work behind my back.

#### Acceptance Criteria

1. WHEN the Webview submits a `decision/resolve` action, THE System SHALL read the latest durable snapshot and SHALL build the request via `createDecisionResolutionRequest` using that snapshot and the user-supplied input.
2. THE System SHALL forward the `rationale` verbatim from the user and SHALL NOT synthesize or generate a rationale.
3. WHEN a Decision is resolved, THE System SHALL NOT call Builder `startRun`, and THE System SHALL resume Builder only in response to an explicit `builder/resumeAfterDecision` action.
4. WHILE any Decision has `applied === false`, THE System SHALL NOT present phase `TASK_COMPLETED` for the same Task.
5. IF `createDecisionResolutionRequest` raises a `DecisionInputError`, THEN THE System SHALL present a notice with code `DECISION_INPUT_<code>` and SHALL NOT call `execute`.
6. IF the resolution request is rejected with `DECISION_ALREADY_RESOLVED` or `LIVE_CONTEXT_STALE`, THEN THE System SHALL re-read the snapshot, re-project the view, and then surface the mapped notice.

_Maps to Correctness Properties 2 (decision resolution never resumes Builder) and 3 (unapplied decision blocks completion display)._

### Requirement 6: Run Cancellation

**User Story:** As a learner, I want an explicit stop to cancel my run while merely closing the panel does not, so that cancellation reflects my intent and cleanup state is shown honestly.

#### Acceptance Criteria

1. WHEN the Webview submits a `builder/stop` action for an active run, THE System SHALL call `cancelRun` for that run.
2. WHEN `cancelRun` returns a terminal run with `status === 'CANCELLED'`, error code `CANCELLED`, and outcome `NONE`, THE System SHALL present phase `CANCELLED` transitioning to `CLEANUP`.
3. WHEN the panel is disposed, THE System SHALL abort the SSE subscription via the AbortController only and SHALL NOT call `cancelRun`.
4. IF a `watchRun` subscription resolves with an error while its abort signal is set, THEN THE System SHALL NOT present phase `CANCELLED`.
5. WHILE the run is cancelled but no native acknowledgement is present in the run result, THE System SHALL remain in phase `CLEANUP`.
6. WHEN `classifyNativeWorkerStatus` reports stage `AGENT_ENDED`, THE System SHALL transition phase `CLEANUP` to `IDLE`.

_Maps to Correctness Properties 4 (abort is not cancel) and 5 (cleanup is settled by the worker)._

### Requirement 7: Native User Inputs

**User Story:** As a learner, I want native questions from an agent presented and answered with exactly my choice, so that no answer is ever fabricated or misdirected.

#### Acceptance Criteria

1. WHEN the worker notifies of user-input changes, THE System SHALL re-read questions via `listUserInputs` for the project and re-project the native question list.
2. WHEN the Webview submits a `native/answer` action, THE System SHALL validate the referenced question against the current snapshot's role and task before submitting.
3. IF the referenced question is no longer present, THEN THE System SHALL present a notice with code `NATIVE_USER_INPUT_STALE` and SHALL NOT submit an answer.
4. IF the referenced question's role or task is inconsistent with the current snapshot, THEN THE System SHALL present a notice with code `NATIVE_USER_INPUT_STALE` and SHALL NOT submit an answer.
5. THE System SHALL submit exactly the user's selected action, option index and sub-option indices, or free-text answer, and SHALL NOT auto-answer.
6. WHEN `submitUserInput` succeeds, THE System SHALL surface an info notice reflecting the result value `SUBMITTED`, `ALREADY_SUBMITTED`, or `ALREADY_HANDLED`, and SHALL re-read the native question list.
7. IF `submitUserInput` is rejected with `NATIVE_USER_INPUT_STALE`, `NATIVE_USER_INPUT_RESPONSE_INVALID`, or `NATIVE_NOT_READY`, THEN THE System SHALL surface the mapped notice.
8. WHERE native questions are held in host memory only, THE System SHALL treat them as lost on reload and SHALL rely on `listUserInputs` re-reads rather than persistence.

_Maps to Correctness Property 9 (native answers are verbatim)._

### Requirement 8: Open Generated Workspace

**User Story:** As a learner, I want to open the generated workspace for a task, so that I can inspect the produced code, without any absolute path being exposed to the webview.

#### Acceptance Criteria

1. WHEN the Webview submits a `workspace/open` action, THE System SHALL check for an active Builder run first, and IF an active Builder run exists, THEN THE System SHALL present a notice with code `RUN_ACTIVE` and SHALL NOT open a workspace.
2. WHEN no active Builder run exists, THE System SHALL call `execute` with a `UI_PREPARE_BUILDER_SESSION` request whose purpose is `WORKSPACE_VIEW`.
3. WHEN the prepare request succeeds, THE System SHALL pass the returned absolute `workspaceDirectory` only to the host-side `openFolder` call.
4. THE System SHALL NOT include the absolute `workspaceDirectory` in any message sent to the Webview.

_Maps to Correctness Property 7 (secret-free projection)._

### Requirement 9: Launch Result

**User Story:** As a learner, I want to launch the running result of my task in a browser, so that I can view the live output, while only a validated local URL is ever opened.

#### Acceptance Criteria

1. WHEN the Webview submits a `result/launch` action, THE System SHALL call `execute` with a `UI_LAUNCH_RESULT` request carrying a freshly generated Idempotency_Key.
2. WHEN the launch response has `status === 'RUNNING'`, THE System SHALL open its validated `http://127.0.0.1:<port>/` URL via the host-side `openExternal` call.
3. IF the launch response has a status other than `RUNNING`, THEN THE System SHALL present a notice with code `RESULT_NOT_RUNNING` and SHALL NOT open a URL.
4. IF the launch request is rejected with a `RESULT_*` code, THEN THE System SHALL present a notice with error code `result_unavailable`.

### Requirement 10: Evidence Trace Honest Display

**User Story:** As a learner, I want the evidence trace to represent my understanding honestly, so that observed-only signals and empty analyses are never presented as learning.

#### Acceptance Criteria

1. WHEN the Webview submits an `evidence/read` action, THE System SHALL call `execute` with a `UI_READ_EVIDENCE_TRACE` request and SHALL project the result via `summarizeEvidenceTrace`.
2. WHERE a concept has display state `OBSERVED_ONLY`, THE System SHALL NOT present that concept as user understanding.
3. WHERE a concept has `userUnderstandingCount === 0`, THE System SHALL NOT present a "learned" claim for that concept.
4. WHERE an analysis has display state `ANALYZED` with `acceptedCount === 0`, THE System SHALL present its `noEvidenceReason` rather than a success indication.
5. WHEN an analysis has display state `ANALYSIS_FAILED`, THE System SHALL support retry via `UI_READ_ANALYSIS_JOBS` and `UI_RETRY_ANALYSIS`.

_Maps to Correctness Property 10 (honest evidence display)._

### Requirement 11: Final Upgrade

**User Story:** As a learner, I want to prepare a final upgrade task from eligible evidence traces, so that only qualified traces are offered and stale choices are refreshed.

#### Acceptance Criteria

1. WHEN the Webview submits a `finalUpgrade/list` action, THE System SHALL read the latest snapshot and the evidence trace and SHALL pre-filter candidates via `eligibleFinalUpgradeTraces`.
2. WHEN the Webview submits a `finalUpgrade/prepare` action, THE System SHALL call `execute` with a `UI_PREPARE_FINAL_UPGRADE_TASK` request carrying a freshly generated Idempotency_Key.
3. IF the prepare request is rejected with a `FINAL_UPGRADE_*` code, THEN THE System SHALL refresh the candidate list and present a notice with error code `final_upgrade_rejected`.

### Requirement 12: Native Worker Status Display

**User Story:** As a learner, I want the native worker's stage and role shown for context, so that I understand what the worker is doing without the UI making product decisions from raw diagnostic strings.

#### Acceptance Criteria

1. WHEN the worker reports a status code, THE System SHALL classify it via `classifyNativeWorkerStatus` and SHALL project the resulting stage and role for display.
2. THE System SHALL NOT branch product logic on the raw suffixes of a worker status code.
3. WHEN `classifyNativeWorkerStatus` returns null for an unreported or unrecognized code, THE System SHALL project a null worker status view.

_Maps to Correctness Property 5 (cleanup is settled by the worker)._

### Requirement 13: Security Boundary

**User Story:** As a security-conscious maintainer, I want the trusted host boundary enforced, so that secrets and absolute paths never reach the untrusted webview and inbound messages are always re-validated.

#### Acceptance Criteria

1. THE System SHALL NOT include any connection object, token, host object, or absolute `workspaceDirectory` in any message sent to the Webview.
2. WHEN the Webview sends a message, THE System SHALL validate it as a discriminated `AgentAction` via strict field validation, and IF the payload is malformed or carries unexpected fields, THEN THE System SHALL drop the message and SHALL NOT act on it.
3. WHEN acting on any validated `AgentAction`, THE System SHALL re-validate it against the current durable snapshot before invoking Core.

_Maps to Correctness Property 7 (secret-free projection)._

### Requirement 14: Additive Non-Breaking Integration

**User Story:** As a maintainer, I want the live agent surfaces added without breaking the shipped flow, so that the existing Discovery/Spec/History experience and its tests remain intact.

#### Acceptance Criteria

1. THE System SHALL preserve the existing Discovery/Spec/History flow behavior and SHALL keep its 228 existing tests passing.
2. THE System SHALL NOT change any existing `HostToWebview` message shape or any `PanelController` state transition.
3. WHERE the Managed_Host is present, THE System SHALL route agent gestures to the live agent controller and supersede the Demo agent path.
4. WHERE the Managed_Host is absent, THE System SHALL retain the existing Demo agent path for development and tests.

_Maps to Correctness Properties 11 (ports never throw) and 12 (additive invariance)._
