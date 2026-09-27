# Implementation Plan: builder-helper-live-runs

## Overview

This plan wires the Builder / Helper agent surfaces (and the remaining §4 areas: Decision resolution, run cancellation, native user inputs, generated-workspace open, launch result, evidence trace, final upgrade, and native worker status) to the real local Core through the already-integrated managed `FrontendHost`. Work proceeds bottom-up so every step builds on the previous and ends wired into the shell: view-model DTOs + message contracts → non-throwing port interfaces + error mapping → `ManagedAgentPort` → pure `builder-turn` reducer/classify wrappers → host-owned `AgentSurfaceController` state machine → `AgentDispatcher` → provider wiring in `wireWebviewMessaging` → framework-free webview render → deterministic test-support fakes. All Core/worker access stays behind `AgentRunPort`/`NativeInputPort` (non-throwing `AgentResult<T>`), mirroring the shipped `LocalCoreDiscoveryPort` / `FlowController` / `FlowDispatcher` patterns. Connection objects, tokens, the host object, and absolute `workspaceDirectory` values never cross into the webview; task completion is decided only by `classifyBuilderTurn`, never by `run.status === 'SUCCEEDED'` alone.

The integration is strictly additive: the live controller/dispatcher/messages live in new modules under `src/core/agent/`, `src/adapter/agent/`, `src/webview/agent/`, and are constructed by `wireWebviewMessaging` only when `managedHost` is present. No existing `HostToWebview` message shape or `PanelController` state transition changes, so the shipped Discovery/Spec/History flow and its 228 tests remain green (Requirement 14).

Language: TypeScript (the design specifies concrete TypeScript throughout; no pseudocode, so no language selection is needed). Build: esbuild. Tests: Vitest + fast-check.

Because this PC is Kiro 1.0.293 (an unsupported pin), the live runtime is fail-closed. There are therefore NO deployment, manual, or live-runtime steps in this plan — no live model calls, no real process spawn, no real SSE socket, no `openFolder`/`openExternal` side effects. All verification is deterministic through a fake `CoreClient` / `NativeWorker` plus the real SDK helpers, mirroring `test/support/*` and `test/local-core-port.test.ts`. Verify commands (cwd = program root): `npm run typecheck`, `npm test`, `npm run build`.

References: `.kiro/specs/builder-helper-live-runs/requirements.md`, `.kiro/specs/builder-helper-live-runs/design.md`.

## Tasks

- [x] 1. View-model DTOs and webview message contract
  - [x] 1.1 Create `src/core/agent/agent-view-model.ts` with the safe projection DTOs
    - Define `AgentViewModel`, `BuilderTurnViewModel` (phase union `IDLE`/`STARTING`/`RUNNING`/`CLASSIFYING`/`TASK_COMPLETED`/`DECISION_REQUIRED`/`TURN_ENDED`/`FAILED`/`CANCELLED`/`CLEANUP`/`RECOVERING`/`START_ERROR`), `ToolRowViewModel`, `TranscriptLine`, `HelperViewModel`, `HelperConversationViewModel`, `DecisionViewModel`, `NativeQuestionViewModel`, `NoticeViewModel`
    - Every field is a safe scalar/relative value only — no connection, token, host object, or absolute path; `ToolRowViewModel.relativePath` is relative only
    - Export `initialAgentViewModel()` returning the IDLE projection
    - _Requirements: 2.9, 13.1_

  - [x] 1.2 Create `src/webview/agent/agent-messages.ts` with the discriminated unions
    - Define `AgentAction` (webview→host: `builder/start`, `builder/stop`, `helper/start`, `decision/resolve`, `builder/resumeAfterDecision`, `native/answer`, `workspace/open`, `result/launch`, `evidence/read`, `evidence/retry`, `finalUpgrade/list`, `finalUpgrade/prepare`) and `AgentHostMessage` (host→webview: `agent/hydrate`, `agent/patch/builder`, `agent/patch/helper`, `agent/patch/worker`, `agent/evidence`, `agent/finalUpgrade`, `agent/notice`) exactly per design §B.16
    - Implement `parseAgentAction(raw): AgentAction | null` with strict discriminator + field validation, returning `null` on any mismatch or extra/unexpected field (mirroring `parseWebviewToHostFlow`)
    - _Requirements: 13.1, 13.2_

  - [x]* 1.3 Write unit tests for `parseAgentAction`
    - Reject malformed payloads, wrong discriminators, and extra-field payloads (returns `null`); accept each well-formed `AgentAction` variant verbatim
    - _Requirements: 13.2_

- [x] 2. Port interfaces and error mapping
  - [x] 2.1 Create `src/adapter/agent/agent-run-port.ts` and `native-input-port.ts`
    - Define `AgentErrorCode` union, `AgentError`, `AgentResult<T>`, `WatchHandlers` (`onEvent`/`onRun`/`signal`/`after`), and the `AgentRunPort` interface (`prepareBuilder`, `startBuilder`, `startHelper`, `watch`, `cancel`, `listActiveBuilderRun`, `snapshot`, `execute`) per design §B.1
    - Define the `NativeInputPort` interface (`getStatus`, `listUserInputs`, `subscribeStatus`, `subscribeUserInputs`, `submit`) per design §B.1; import SDK types from `../../../vendor/frontend-client` / `vendor/frontend-host`; declare no concrete implementation here
    - _Requirements: 13.1_

  - [x] 2.2 Create `src/adapter/agent/agent-error.ts` with `toAgentError`
    - Implement `toAgentError(raw, status?): AgentError` mapping raw Core/worker codes to `AgentErrorCode` by exact-string match first, then substring (mirroring `local-core-port.ts` `mapClientCode`): `RUN_BUSY`, `STALE_TASK_REVISION`, `TASK_ALREADY_COMPLETED`, `TASK_BINDING_MISMATCH`, `RUNTIME_CAPACITY`, `RUN_IDEMPOTENCY_CONFLICT`, `DECISION_BINDING_MISMATCH`, `HELPER_EMPTY_RESPONSE`, `NATIVE_ROLE_CATALOG_UNVERIFIED`, `DECISION_ALREADY_RESOLVED`, `LIVE_CONTEXT_STALE`, `NATIVE_USER_INPUT_STALE`, `NATIVE_USER_INPUT_RESPONSE_INVALID`, `NATIVE_NOT_READY`, `RESULT_*`, `FINAL_UPGRADE_*`, with `timeout`/`unavailable`/`invalid`/`unknown` fallbacks; never throws on a non-Error input
    - _Requirements: 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 4.6, 5.6, 7.7, 9.4, 11.3_

  - [x]* 2.3 Write unit tests for `toAgentError` mapping tables
    - Assert each raw code maps to the expected `AgentErrorCode`; unknown/empty/non-Error inputs map to `unknown`; substring fallback works
    - _Requirements: 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 4.6, 5.6, 7.7, 9.4, 11.3_

- [x] 3. ManagedAgentPort (live, non-throwing wrapper)
  - [x] 3.1 Create `src/adapter/agent/managed-agent-port.ts` implementing both port interfaces
    - `ManagedAgentPort` wraps `host.client` / `host.worker`; it is the only module importing `entityId`/`uiMetadata` and `projectRunEvent`/`isRunActive`; every method is `try/await/ok`, `catch → err(toAgentError(...))` — never throws
    - `prepareBuilder` calls `restoreProject` and requires `currentTask` (`err('invalid','CURRENT_TASK_REQUIRED')` when absent); `startBuilder`/`startHelper` call `startRun` with a fresh `entityId('idem')` and captured revision/origin/decisionId; `watch` opens `watchRun` projecting each event via `projectRunEvent` and forwarding `onRun`, mapping `AbortError` through `errFrom` so the controller can distinguish it; `listActiveBuilderRun` uses `listRuns` + `isRunActive` + `kind==='BUILDER'`; `cancel`, `snapshot`, `execute`, and the `NativeInputPort` methods follow the same wrapping
    - _Requirements: 1.2, 1.3, 2.2, 3.2, 3.3, 4.1, 6.1, 7.1, 8.2, 9.1, 10.1, 11.1, 11.2_

  - [x]* 3.2 Write unit tests for `ManagedAgentPort` (fake client/worker)
    - Each method maps success → `ok`; each mapped Core/worker code → the right `AgentErrorCode`; never throws even on a raw non-Error throw; `prepareBuilder` with no `currentTask` → `err('invalid')`; `watch` forwards `projectRunEvent`-projected views and `after`
    - _Requirements: 1.11, 11.2_

  - [x]* 3.3 Write property test: ports never throw
    - **Property 11: Ports never throw**
    - **Validates: Requirements 11.1, 11.2 (design §Correctness Property 11)**

- [x] 4. Pure Builder-turn reducer and classification wrappers
  - [x] 4.1 Create `src/core/agent/builder-turn.ts`
    - Implement pure, total `reduceEvent(vm, view)`: `TEXT` appends a `TranscriptLine` keyed by sequence; `TOOL` upserts a row keyed by `toolId ?? seq:<sequence>` (RUNNING→SUCCEEDED/FAILED/UNKNOWN, project `relativePath` only, bounded redacted `output` + `truncated`); `PERMISSION_DENIED` sets the flag; `STATE` is a transcript no-op
    - Implement `phaseFromOutcome(outcome)` mapping `BuilderTurnOutcome` kinds to display phases and `classifyTurn(run, after, taskId)` delegating to the real `classifyBuilderTurn` (SUCCEEDED alone ≠ complete)
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_

  - [x]* 4.2 Write unit tests for `reduceEvent` / `classifyTurn`
    - TEXT appends; TOOL upserts by `toolId` and transitions status; null `toolId` uses synthetic `seq:<n>`; `PERMISSION_DENIED` sets flag; `STATE` is a no-op; `classifyTurn` with a `SUCCEEDED` run but non-`COMPLETED` task snapshot is not `TASK_COMPLETED`
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.6_

  - [x]* 4.3 Write property test: completion only via classify
    - **Property 1: Completion requires classification**
    - **Validates: Requirements 1.5, 1.6 (design §Correctness Property 1)**

  - [x]* 4.4 Write property test: tool-row keying is stable
    - **Property 8: Tool-row keying is stable**
    - **Validates: Requirements 2.2, 2.3, 2.4 (design §Correctness Property 8)**

  - [x]* 4.5 Write property test: unapplied decision blocks completion display
    - **Property 3: Unapplied decision blocks completion display**
    - **Validates: Requirements 1.5, 5.4 (design §Correctness Property 3)**

- [x] 5. AgentSurfaceController (host-owned state machine)
  - [x] 5.1 Implement `src/core/agent/agent-controller.ts` construction and state ownership
    - Define `AgentControllerDeps` (`port`, `globalState`, `onChange`, injected `openFolder`/`openExternal` spies); own the authoritative `AgentViewModel`, a single `AbortController`, and worker/input subscriptions established in the constructor via `subscribeStatus`/`subscribeUserInputs`; expose `getViewModel()`
    - Implement `applyEvent`, `setBuilderPhase`, `notify`/`notice`, `fail`, and `reprojectFromSnapshot` helpers used by the behaviors below
    - _Requirements: 13.1_

  - [x] 5.2 Implement `startBuilder`, `superviseRun`, and event streaming
    - `startBuilder(message)` requires `bhlr.lastProjectId`, calls `prepareBuilder` (require currentTask → else `START_ERROR`), persists `bhlr.lastProjectId`, enters `STARTING`, calls `startBuilder` (each start-error code → `START_ERROR` with mapped code), then `superviseRun`; `superviseRun` opens the AbortController, sets `RUNNING`, folds events via `reduceEvent`, on terminal reads the After_Snapshot and calls `classifyTurn` → `phaseFromOutcome` (carrying `completionReportId`/decision ids/error code); on `STALE_TASK_REVISION` re-reads snapshot and re-projects before surfacing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 2.1, 2.5, 2.6, 3.1_

  - [x] 5.3 Implement `cancelActive`, `dispose`, and worker-settled cleanup
    - `cancelActive` calls `port.cancel` for the active run (`CANCELLED`→`CLEANUP`); `dispose` aborts the SSE subscription only (≠ cancel) and unsubscribes; `superviseRun` short-circuits without `CANCELLED` when `signal.aborted`; `onWorkerStatus` classifies via `classifyNativeWorkerStatus` and transitions `CLEANUP → IDLE` on stage `AGENT_ENDED`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.1, 12.2, 12.3_

  - [x] 5.4 Implement `recover` (window-switch reload recovery)
    - On reactivation, read `bhlr.lastProjectId`, call `listActiveBuilderRun`; when an active BUILDER run exists set `RECOVERING`, `prepareBuilder`, then `superviseRun` with `after: 0` (full replay → `RUNNING`); otherwise `IDLE`; subscribe worker status so window-switch stages surface
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.5 Implement `startHelper` and helper terminal read-back
    - `startHelper({message, origin, decisionId?})` calls `startRun` kind HELPER with no Builder side effects; surface `windowOpening` from worker status; on terminal `outcome === 'HELPER_RECORDED'` set Helper `RECORDED` and read `helperConversations` from the After_Snapshot (redactedUserExcerpts / helperResponseSummaries); map `DECISION_BINDING_MISMATCH`/`HELPER_EMPTY_RESPONSE`/`NATIVE_ROLE_CATALOG_UNVERIFIED` → Helper `FAILED`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.6 Implement `resolveDecision` and explicit `resumeAfterDecision`
    - Read the latest snapshot, build via `createDecisionResolutionRequest` forwarding `rationale` verbatim (never synthesized); `DecisionInputError` → `DECISION_INPUT_<code>` notice with no `execute` call; `execute` `UI_RESOLVE_DECISION`; on `DECISION_ALREADY_RESOLVED`/`LIVE_CONTEXT_STALE` re-project then notify; NEVER call `startBuilder` — Builder resumes only via the explicit `builder/resumeAfterDecision` action
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.7 Implement `submitNativeAnswer` and native-question refresh
    - `refreshNativeQuestions` re-reads `listUserInputs` on `subscribeUserInputs` notify; `submitNativeAnswer` validates the referenced question against the current snapshot role/task (missing or mismatch → `NATIVE_USER_INPUT_STALE`, no submit), submits exactly the user's selection (never auto-answer), surfaces `SUBMITTED`/`ALREADY_SUBMITTED`/`ALREADY_HANDLED` info, re-lists; maps `NATIVE_*` rejections
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 5.8 Implement workspace open, launch, evidence, and final upgrade
    - `openGeneratedWorkspace`: idle-check active BUILDER run (`RUN_ACTIVE` notice if active), `execute` `UI_PREPARE_BUILDER_SESSION` purpose `WORKSPACE_VIEW`, pass absolute `workspaceDirectory` only to host `openFolder` (never into a message); `launchResult`: `execute` `UI_LAUNCH_RESULT` with fresh idem key, open validated `http://127.0.0.1:<port>/` via `openExternal` when `RUNNING` else `RESULT_NOT_RUNNING`, `RESULT_*` → `result_unavailable`; `readEvidence`: `execute` `UI_READ_EVIDENCE_TRACE` + `summarizeEvidenceTrace`, retry via `UI_READ_ANALYSIS_JOBS`/`UI_RETRY_ANALYSIS`; `listFinalUpgradeCandidates`/`prepareFinalUpgrade`: `eligibleFinalUpgradeTraces` pre-filter + `UI_PREPARE_FINAL_UPGRADE_TASK`, `FINAL_UPGRADE_*` → refresh list + `final_upgrade_rejected`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.5, 11.1, 11.2, 11.3_

  - [x]* 5.9 Write unit tests for controller behaviors
    - start→run→classify happy path; each start-error code → `START_ERROR`; helper → `RECORDED` reads `helperConversations`; decision resolve → zero `startBuilder` invocations (spy); cancel → `CANCELLED`→`CLEANUP` then `AGENT_ENDED` → `IDLE`; abort → phase not `CANCELLED`; recover → `watch` called with `after:0`; native submit validates before submit; workspace absolute path only reaches `openFolder` spy
    - _Requirements: 1.1, 3.3, 4.3, 5.3, 6.2, 6.4, 6.6, 7.2, 8.3_

  - [x]* 5.10 Write property test: decision resolution never resumes Builder
    - **Property 2: Decision resolution never resumes Builder**
    - **Validates: Requirements 4.2, 5.3 (design §Correctness Property 2)**

  - [x]* 5.11 Write property test: abort is not cancel
    - **Property 4: Abort is not cancel**
    - **Validates: Requirements 6.3, 6.4 (design §Correctness Property 4)**

  - [x]* 5.12 Write property test: cleanup is settled by the worker
    - **Property 5: Cleanup is settled by the worker**
    - **Validates: Requirements 6.5, 6.6, 12.1 (design §Correctness Property 5)**

  - [x]* 5.13 Write property test: recovery replays fully
    - **Property 6: Recovery replays fully**
    - **Validates: Requirements 3.3 (design §Correctness Property 6)**

  - [x]* 5.14 Write property test: native answers are verbatim
    - **Property 9: Native answers are verbatim**
    - **Validates: Requirements 7.5 (design §Correctness Property 9)**

  - [x]* 5.15 Write property test: honest evidence display
    - **Property 10: Honest evidence display**
    - **Validates: Requirements 10.2, 10.3, 10.4 (design §Correctness Property 10)**

- [x] 6. Checkpoint - controller core validated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. AgentDispatcher (validate → controller → post)
  - [x] 7.1 Create `src/webview/agent/agent-dispatcher.ts` with `AgentDispatcher`
    - Constructor `(controller, post)`; `hydrate()` posts `{ kind: 'agent/hydrate', vm: controller.getViewModel() }`; `handle(raw)` runs `parseAgentAction` first (drop `null`), routes each `AgentAction` to the matching controller method, and posts `agent/patch/*`, `agent/evidence`, `agent/finalUpgrade`, and `agent/notice`; use the forward-reference closure so `controller.onChange` → `hydrate()` (mirroring `FlowDispatcher`)
    - _Requirements: 13.2, 13.3, 13.4_

  - [x]* 7.2 Write unit tests for `AgentDispatcher`
    - Malformed payloads are dropped (no controller call); each valid action reaches its controller method; `onChange` triggers exactly one `agent/hydrate`; notices post `agent/notice`
    - _Requirements: 13.2, 13.4_

- [x] 8. Provider wiring in wireWebviewMessaging (product mode)
  - [x] 8.1 Extend `wireWebviewMessaging` to construct the live agent controller + dispatcher when `managedHost` present
    - Build `ManagedAgentPort` from the awaited `host.client` + `host.worker`; construct `AgentSurfaceController` (with `context.globalState` for `bhlr.lastProjectId`, injected `openFolder`/`openExternal`, `onChange → agentDispatcher.hydrate()`) and `AgentDispatcher`; route inbound messages by trying `parseAgentAction` first for agent gestures, then falling back to flow intents; remove the Demo `submit` placeholder branch in product mode only
    - Widen the `MessagingWebview.postMessage` union to include `AgentHostMessage` (additive); when `managedHost` is absent, leave the existing Demo/`PanelController` path untouched
    - _Requirements: 13.3, 14.2, 14.3, 14.4_

  - [x] 8.2 Wire reactivation recovery and dispose in `AgentPanelViewProvider.resolveWebviewView`
    - Call `agentController.recover()` after wiring; `webviewView.onDidDispose(() => agentController.dispose())` aborts the SSE subscription only; `onDidChangeVisibility` re-hydrates the agent surface alongside the flow
    - _Requirements: 3.2, 6.3_

  - [x]* 8.3 Write integration test through `wireWebviewMessaging` with a fake host
    - With `managedHost` present and a fake host, a `builder/start` action drives a full start→stream→classify cycle producing exactly one `agent/hydrate` reflecting `TASK_COMPLETED` (or `DECISION_REQUIRED`); assert connection/token/absolute path never appear in posted messages
    - _Requirements: 1.3, 1.4, 13.1, 14.3_

- [x] 9. Webview render for the agent surface (framework-free DOM)
  - [x] 9.1 Create `src/webview/agent/agent-render.ts` rendering the `AgentViewModel`
    - Framework-free DOM, build-once/update-in-place; render Builder transcript + tool rows (keyed by `key`), Helper transcript/conversations, decisions, native questions, worker status, notices, evidence, and final-upgrade candidates; agent text and tool `output` set via `textContent` only (never HTML); render `relativePath` only; encode gestures back as `AgentAction`
    - Honest-evidence display rules: `OBSERVED_ONLY` / `userUnderstandingCount === 0` never shown as understanding; `ANALYZED` with `acceptedCount === 0` shows `noEvidenceReason`
    - _Requirements: 2.7, 2.8, 2.9, 4.5, 7.1, 8.1, 9.1, 10.2, 10.3, 10.4, 11.1, 12.1_

  - [x]* 9.2 Write unit/DOM tests for the agent render
    - Agent text/output rendered as text (no markup interpretation); duplicate `toolId` events render a single row; `OBSERVED_ONLY`/empty-analysis honest display; no absolute path in rendered tool rows
    - _Requirements: 2.7, 2.8, 2.9, 10.2, 10.4_

- [x] 10. Test-support fakes
  - [x] 10.1 Add `test/support/fake-core-client.ts`, `fake-native-worker.ts`, and `fake-global-state.ts`
    - `FakeCoreClient`: contract-shaped, overridable `startRun`/`cancelRun`/`listRuns`/`restoreProject`/`execute`, a controllable `watchRun` (pump `LocalRunEvent`s into `onEvent`, resolve a chosen terminal `LocalRun`), an `after` recorder for replay-from-0 assertions, and the ability to throw `LocalClientError`-like codes; `FakeNativeWorker`: in-memory `NativeQuestion[]`, triggerable `subscribeUserInputs`/`subscribeStatus`, `submitUserInput` returning the three result values or throwing mapped codes; `FakeGlobalState`: a `Map` for `bhlr.lastProjectId`
    - _Requirements: 14.1_

  - [x]* 10.2 Write property test: secret-free projection
    - **Property 7: Secret-free projection**
    - **Validates: Requirements 2.9, 8.4, 13.1 (design §Correctness Property 7)**

- [x] 11. Regression guard - additive invariance
  - [x] 11.1 Add a regression-guard test asserting the shipped flow is unchanged
    - Assert the existing 29 files / 228 tests stay green and that no existing `HostToWebview` message shape or `PanelController` state transition changed (compile-level shape assertion plus a check that with no `managedHost` the Demo path is retained); run `npm run typecheck`, `npm test`, `npm run build`
    - _Requirements: 14.1, 14.2, 14.4 (design §Correctness Property 12)_

- [x] 12. Final checkpoint - full suite green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional and are never marked with `*`.
- Property test sub-tasks each implement exactly one of the design's 12 Correctness Properties, placed beside the code they cover so errors are caught early: ports-never-throw under task 3; completion-only-via-classify / tool-row-keying / unapplied-blocks-completion under task 4; no-auto-resume / abort≠cancel / cleanup-settled-by-worker / recovery-replays-from-0 / verbatim-native-answers / honest-evidence under task 5; secret-free-projection under task 10; additive-invariance under task 11.
- Unit tests cover the non-PBT criteria: `parseAgentAction` (1.3), `toAgentError` mapping (2.3), `ManagedAgentPort` error mapping (3.2), `reduceEvent`/`classifyTurn` (4.2), controller behaviors (5.9), dispatcher (7.2), and render (9.2). The integration test (8.3) exercises the full path through `wireWebviewMessaging` with a fake host.
- All verification is deterministic (fake `CoreClient`/`NativeWorker` + real SDK helpers). No live model calls, real process spawn, real SSE socket, or `openFolder`/`openExternal` side effects (those deps are injected spies) — consistent with the fail-closed Kiro 1.0.293 pin.
- Every task references the specific requirements and/or correctness properties it implements for traceability.
- The integration is strictly additive; the regression guard (11.1) protects the existing 228-test Discovery/Spec/History suite (Requirement 14).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["2.3", "3.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["3.2", "3.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8"] },
    { "id": 6, "tasks": ["5.9", "5.10", "5.11", "5.12", "5.13", "5.14", "5.15", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1"] },
    { "id": 8, "tasks": ["8.2", "9.1"] },
    { "id": 9, "tasks": ["8.3", "9.2", "10.1"] },
    { "id": 10, "tasks": ["10.2", "11.1"] }
  ]
}
```
