# Implementation Plan: Builder & Helper Agent Panel

## Overview

This plan builds the feature bottom-up so the property-testable core lands first and everything else wires into it. The order is: (1) scaffold the TypeScript extension project with Jest/Vitest + fast-check; (2) build the pure `PanelController`/`TabState` core (validation, `seq` ordering, submission-lock transitions, per-tab independence, failure/partial-retention) with an injectable clock for the start-timeout and stall watchdog; (3) define the `AgentAdapter` interface, `AgentStreamEvent` stream, and a deterministic `MockAdapter`; (4) build the webview messaging protocol and webview UI; (5) contribute the right-side view and activate the extension; and (6) add the spike-gated `KiroAcpAdapter` plus a minimal end-to-end smoke test.

Property-based tests (Properties 1–14) are placed as optional sub-tasks next to the code they validate so regressions surface early. Latency budgets and IDE contribution/rendering are validated by integration/example tests.

The design uses TypeScript. All tasks are implemented in TypeScript.

## Tasks

- [x] 1. Scaffold the TypeScript extension project and test tooling
  - Create the VS Code extension project structure (`src/`, `src/core/`, `src/adapter/`, `src/webview/`, `test/`) and `tsconfig.json`
  - Add `package.json` with the VS Code extension manifest skeleton (engines, `main`, empty `contributes` to be filled in task 8) and dependencies
  - Configure the test runner (Jest or Vitest) and add `fast-check` for property-based testing; add a `test` script that runs a single execution (e.g. `vitest --run`)
  - Add a trivial smoke unit test to confirm the toolchain runs
  - _Requirements: 1.1_

- [x] 2. Define shared data models and types
  - [x] 2.1 Implement the core domain types
    - Add `ConversationEntry`, `UserMessageEntry`, `AgentResponseEntry`, `WorkStreamItem`, `InFlightTurn`, `TabStateSnapshot`, `AdapterError`, and `TabId`/`AgentId` types
    - Include the monotonic `seq` field on entries and work items and the `state` unions (`in_progress`/`complete`/`failed`, work item `running`/`succeeded`/`failed`)
    - _Requirements: 3.1, 3.3, 3.7, 4.2, 4.4, 4.6, 6.2, 6.3_

- [x] 3. Implement the TabState core
  - [x] 3.1 Implement TabState with entry/ordering and mutation methods
    - Implement `appendUserMessage`, `beginResponse`, `appendChunk`, `appendWorkItem`, `completeResponse`, `failResponse`, and `draft` handling
    - Assign a monotonic `seq` at receipt time; render order is strictly `seq` ascending with chunks and work items interleaved by receipt order (no reordering)
    - Enforce that a Helper `TabState` rejects work items (Helper never holds work-stream items)
    - Produce an immutable `TabStateSnapshot` for re-hydration
    - _Requirements: 1.5, 1.6, 3.1, 3.2, 3.6, 4.1, 4.2, 4.3, 4.7_

  - [x]* 3.2 Write property test for response content receipt-order preservation
    - **Property 8: Response content preserves receipt order (chunks and work items interleaved)**
    - **Validates: Requirements 3.1, 3.2, 3.6, 4.1, 4.2, 4.3**

  - [x]* 3.3 Write property test for Helper tab excluding work items
    - **Property 13: Work items only ever appear in the Builder tab**
    - **Validates: Requirements 4.7**

- [x] 4. Implement work-item collapse/expand logic
  - [x] 4.1 Implement default-collapsed rule and per-item toggle
    - Set default `expanded = false` exactly when `lineCount > 3`
    - Implement a toggle that flips only the targeted item's `expanded` state and preserves all others
    - Implement failed-work-item marking that sets status to `failed` and retains the item
    - _Requirements: 4.4, 4.5, 4.6_

  - [x]* 4.2 Write property test for default-collapsed rule and toggle locality
    - **Property 11: Work-item default-collapsed rule and toggle locality**
    - **Validates: Requirements 4.4, 4.5**

  - [x]* 4.3 Write property test for failed work items marked and retained
    - **Property 12: Failed work items are marked and retained**
    - **Validates: Requirements 4.6**

- [x] 5. Implement the PanelController core (tabs, validation, routing, locking)
  - [x] 5.1 Implement tab selection and active-tab invariant
    - Implement `selectTab`, `activeTab`, and fresh-panel initial state (Builder active, empty conversation, empty draft)
    - Maintain exactly-one-active-tab invariant with active tab equal to the most recently selected
    - _Requirements: 1.3, 1.4_

  - [x]* 5.2 Write property test for exactly one active tab
    - **Property 1: Exactly one active tab**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 5.3 Implement submit with input validation and agent routing
    - Implement `submit(tab, text)` returning `SubmitResult` (`accepted`/`rejected(empty|too_long)`/`locked`/`unavailable`)
    - Reject empty/whitespace-only (no adapter call, state unchanged); reject >10,000 chars (retain text, emit length notice); accept 1..10,000 non-whitespace text
    - On accept, append exactly one user message, clear the draft, and invoke the adapter `startTurn` exactly once for that tab's agent only
    - Check `isAvailable` (or treat immediate unavailable from `startTurn` equivalently) and return `unavailable` retaining text with submission enabled
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 6.4_

  - [x]* 5.4 Write property test for valid submission behavior
    - **Property 5: Valid submission appends exactly one user message and invokes the active agent once**
    - **Validates: Requirements 2.2, 2.3**

  - [x]* 5.5 Write property test for invalid submissions rejected without invoking the agent
    - **Property 6: Invalid submissions are rejected without invoking the agent**
    - **Validates: Requirements 2.1, 2.4, 2.5**

  - [x]* 5.6 Write property test for agent routing
    - **Property 14: Messages route to the submitting tab's agent only**
    - **Validates: Requirements 5.1, 5.2**

- [x] 6. Implement submission lock, per-tab independence, and stream handling
  - [x] 6.1 Implement per-tab submission lock and turn lifecycle wiring
    - While a tab's turn is in flight, refuse further submits in that tab as `locked`; re-enable exactly on completion or failure
    - Keep the other tab's submission availability unaffected by a tab's lock (Builder and Helper stream concurrently)
    - Apply streamed chunks/work items to the originating tab even when it is not the active tab, without changing the active tab
    - _Requirements: 2.6, 3.3, 3.5, 5.4_

  - [x]* 6.2 Write property test for submission lock across a turn lifecycle
    - **Property 7: Submission lock holds per tab across a turn lifecycle**
    - **Validates: Requirements 2.6, 3.3, 5.4**

  - [x]* 6.3 Write property test for streaming to a non-active tab
    - **Property 9: Streaming targets the originating tab without changing the active tab**
    - **Validates: Requirements 3.5**

  - [x]* 6.4 Write property test for tab state independence
    - **Property 3: Tab state independence**
    - **Validates: Requirements 1.6**

  - [x]* 6.5 Write property test for tab switch preserving conversation order and draft
    - **Property 2: Tab switch preserves conversation order and draft**
    - **Validates: Requirements 1.5**

- [x] 7. Implement failure handling, partial retention, and the injectable-clock watchdog
  - [x] 7.1 Implement error/failure paths with retained content and an injectable clock
    - Introduce a `Clock` abstraction and inject it into the controller for deterministic timing
    - Implement the start-timeout (30s with no `started` event → error, unlock, retain composed text) and the stall watchdog (30s reset on each event → mark failed, retain partial content, unlock)
    - Implement stream-error mid-turn (mark response `failed`, retain received chunks/work items, unlock) and emit `error`/`unavailable`/`length_limit` notices
    - Guarantee every error/unavailability path preserves prior conversation entries (append/flip-state only, never remove or edit)
    - Handle render-failure preservation at the state boundary (error indication without mutating entries)
    - _Requirements: 1.7, 2.7, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]* 7.2 Write property test for failure/stall retaining received content and unlocking
    - **Property 10: Failure or stall retains all content received so far and unlocks**
    - **Validates: Requirements 2.7, 3.7, 6.1, 6.2, 6.4**

  - [x]* 7.3 Write property test for state preserved across render/error faults
    - **Property 4: State preserved across render/error faults**
    - **Validates: Requirements 1.7, 6.5**

- [x] 8. Checkpoint - core logic and its property tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Define the Agent_Adapter interface and MockAdapter
  - [x] 9.1 Define the AgentAdapter interface and normalized event stream
    - Add `AgentAdapter` (`isAvailable`, `startTurn`), `StartTurnRequest` (including `allowWorkStream`), `TurnHandle`, and the `AgentStreamEvent` union (`started`, `message_chunk`, `work_item`, `work_item_result`, `completed`, `failed`)
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 4.1, 4.6, 6.4_

  - [x] 9.2 Implement the MockAdapter for deterministic tests
    - Script arbitrary ordered event sequences and timings (interleaved chunks/work items terminated by completed/failed/stall) and configurable `isAvailable`
    - Record `startTurn` invocations (agent, count) so routing and single-invocation properties can assert against it
    - _Requirements: 2.2, 3.1, 3.2, 4.1, 5.1, 5.2, 6.4_

  - [x] 9.3 Wire the controller to consume MockAdapter events end-to-end
    - Connect `startTurn`'s `onEvent` callback into the controller's stream handling so `started`/chunk/work-item/completed/failed events drive `TabState`
    - Ensure `allowWorkStream` is `true` for Builder turns and `false` for Helper turns
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.7, 5.1, 5.2_

- [x] 10. Checkpoint - adapter integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement the webview messaging protocol
  - [x] 11.1 Define HostToWebview and WebviewToHost message types and serialization
    - Implement `HostToWebview` (`hydrate`, `tabActivated`, `entryAdded`, `chunkAppended`, `workItemAdded`, `responseState`, `submissionState`, `notice`) and `WebviewToHost` (`selectTab`, `submit`, `draftChanged`, `toggleWorkItem`)
    - Implement a host-side dispatcher that translates controller state changes into `HostToWebview` patches and applies `WebviewToHost` intents to the controller
    - _Requirements: 1.4, 1.5, 2.2, 3.1, 3.2, 4.1, 4.5, 5.5, 6.5_

  - [x]* 11.2 Write unit tests for the messaging dispatcher
    - Verify each controller state change maps to the correct `HostToWebview` message and each intent maps to the correct controller call
    - _Requirements: 1.4, 1.5, 2.2, 4.5_

- [x] 12. Implement the webview UI
  - [x] 12.1 Implement tabs, conversation view, and message input
    - Render exactly two tabs (Builder, Helper) with the active-agent label; render each tab's conversation view and message input, restoring unsent draft on return
    - Wire input submission and draft-change reporting to `WebviewToHost`; clear input on successful submit; show length-limit indication on over-limit
    - Render the in-progress indicator while a response streams and disable submission in that tab while locked
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 2.5, 2.6, 3.4, 5.5_

  - [x] 12.2 Implement conversation rendering for chunks, work items, and notices
    - Append streamed chunks to the addressed response in receipt order; render Builder work-stream items in `seq` order interleaved with message content in a single ordered view
    - Render long work items (>3 lines) collapsed by default with an expand/collapse control wired to `toggleWorkItem`; keep Helper tab chat-only (no work items, no code-edit/shell/decision controls)
    - Render error/unavailability notices and visually distinguish failed responses from completed ones while preserving history
    - _Requirements: 3.2, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.3, 6.3, 6.5_

  - [x] 12.3 Implement hydrate/re-hydration handling in the webview
    - On `hydrate`, rebuild both tabs' views from the snapshot (entries in order, draft, submission state, active tab) so webview disposal/reveal restores state from the host
    - _Requirements: 1.5, 3.5_

- [x] 13. Contribute the view and activate the extension
  - [x] 13.1 Add the right-side view contribution to package.json
    - Contribute a right-side view container and a webview view via `contributes.viewsContainers`/`views`
    - _Requirements: 1.1, 1.2_

  - [x] 13.2 Implement activation and AgentPanelViewProvider wiring
    - Implement `activate(context)` to register `AgentPanelViewProvider`; implement `resolveWebviewView` to create the webview, inject the UI bundle, and wire the messaging channel to the `PanelController`
    - Instantiate the controller with the real clock and (for now) the `MockAdapter` behind a swappable factory so the adapter can be replaced in task 15
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 14. Checkpoint - end-to-end wiring with MockAdapter
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement the spike-gated KiroAcpAdapter
  - [x] 15.1 Implement KiroAcpAdapter normalizing ACP session updates
    - Launch/attach to the Kiro host and normalize ACP `session/update` notifications into `AgentStreamEvent`s: message chunks → `message_chunk`, tool-call updates → `work_item`/`work_item_result`, stop reason → `completed`/`failed`
    - Map host errors to `AdapterError` codes (`start_timeout`, `stream_error`, `stalled`, `unavailable`, `unknown`); swap it in via the adapter factory from task 13.2
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.7, 4.1, 4.6, 6.1, 6.2, 6.4_

- [x] 16. Example-based and integration tests
  - [x]* 16.1 Write example-based unit tests
    - Fresh-panel initial state (Builder active, empty conversation/input); exactly two tabs with correct labels; Helper tab exposes no code-edit/shell/decision controls; active-agent label matches selected tab; representative failure/unavailability notices render with correct kind and copy
    - _Requirements: 1.2, 1.3, 5.3, 5.5_

  - [x]* 16.2 Write integration tests for IDE contribution and latency/rendering budgets
    - Extension activates and contributes the Agent_Panel to the right side within 3s; tab activation renders and swaps active/inactive within 500ms; streamed chunks appear within 200ms and the in-progress indicator shows while streaming and hides after; work-stream items appear within 500ms and long items render collapsed with a working toggle; failed responses render visually distinct; webview disposal/re-reveal re-hydrates preserving order and draft
    - _Requirements: 1.1, 1.4, 3.2, 3.4, 4.1, 4.4, 6.3, 1.5_

  - [x]* 16.3 Write a minimal end-to-end smoke test against KiroAcpAdapter
    - Verify a single real turn streams and completes (1–2 examples), gated on the host invocation spike landing
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 17. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP, though the property tests are the primary correctness guarantee for the pure core.
- Each property test uses `fast-check` with a minimum of 100 iterations (`fc.assert(prop, { numRuns: 100 })`), one property per test, tagged with a comment of the form `// Feature: builder-helper-agent-panel, Property N: {property_text}`.
- Property tests exercise the pure controller/state core with the `MockAdapter` and an in-memory clock so timing-dependent behavior (start-timeout, stall watchdog) is deterministic.
- Latency budgets (Req 1.1, 1.4, 3.2, 3.4, 4.1) and structural/IDE facts (Req 1.1–1.3, 5.3, 5.5) are validated by integration/example tests, not properties.
- The `KiroAcpAdapter` (task 15) is spike-gated: the real Kiro host invocation API is an open item, so the adapter interface is transport-agnostic and the panel is not hard-bound to it.
- Each task references specific requirements and/or correctness properties for traceability.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "5.5", "5.6", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "9.1"] },
    { "id": 8, "tasks": ["9.2"] },
    { "id": 9, "tasks": ["9.3"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["11.2", "12.1"] },
    { "id": 12, "tasks": ["12.2", "12.3"] },
    { "id": 13, "tasks": ["13.1"] },
    { "id": 14, "tasks": ["13.2"] },
    { "id": 15, "tasks": ["15.1"] },
    { "id": 16, "tasks": ["16.1", "16.2", "16.3"] }
  ]
}
```
