# Implementation Plan: Discovery → Spec Flow

## Overview

This plan implements the Discovery → Spec user flow additively on top of the existing `program` extension (TypeScript, esbuild-bundled framework-free DOM webview, Vitest + fast-check). Work proceeds bottom-up so each step builds on the previous and ends wired into the shell: domain types → pure feedback validation → port interfaces → mock port → factory/stub → host-owned `FlowController` → snapshot → webview messaging → dispatcher → view-model → renderers → shell + view-provider wiring → flow CSS, then property tests (as optional `*` sub-tasks beside the code they cover), example/edge tests, and integration tests through a new `FlowHostWebviewHarness`. All backend calls stay behind `DiscoveryPort`/`SpecPort` with `MockDiscoveryPort` as the default so the real crew-backend swaps in behind `createFlowPorts` later. All user-visible copy is Korean. The shell integration must remain inert until a `hydrateFlow` arrives so existing Builder/Helper tests keep passing.

Language: TypeScript (the design specifies concrete TypeScript throughout; no pseudocode, so no language selection is needed).

References: `.kiro/specs/discovery-spec-flow/requirements.md`, `.kiro/specs/discovery-spec-flow/design.md`.

## Tasks

- [x] 1. Domain types and identity helper
  - [x] 1.1 Create `src/core/flow/flow-types.ts` with all domain types
    - Define `ProjectStatus`, `Project`, `LearnerLevel`, `DiscoveryInput`, `DiscoverySession`, `GenerationTag`, `CandidateRevisionReference`, `CandidatePreview`, `PreviewRound`, `CandidateScopeSuggestion`, `ProjectCandidateRevision`, `CandidateRound`, `DiscoveryFeedbackIntent`, `DiscoveryFeedback`, `DiscoveryFeedbackInput`, `LearningSpecStatus`, `LearningScopeCategory`, `SpecScopeEntry`, `DecisionCategory`, `ExpectedDecision`, `LearningSpecRevision`, `PreparedBuilderTask`
    - Include contract-optional fields (`schemaVersion`, `createdAt`, etc.) as optional so mock output validates against the future core schemas
    - Export the pure `refKey(ref) => \`${candidateId}:${revision}\`` helper matching core's `candidateReferenceKey`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [ ]* 1.2 Write example/edge tests for enum literal facts and `refKey`
    - Assert enum members for `ProjectStatus`, `LearnerLevel`, `GenerationTag`, `DiscoveryFeedbackIntent`, `LearningSpecStatus`, `LearningScopeCategory`, and `runtimeConstraint === "TYPESCRIPT"`
    - Assert `refKey` produces the canonical `candidateId:revision` key
    - _Requirements: 2.3, 2.6, 2.11_

- [x] 2. Pure feedback validation
  - [x] 2.1 Create `src/core/flow/feedback-validation.ts`
    - Implement pure `validateFeedback(input: DiscoveryFeedbackInput): { ok: true } | { ok: false; reason: string }`
    - Enforce: MERGE ≥ 2 targets; SELECT/REVISE/SHRINK/EXPAND exactly 1 target; MORE 0 targets; REGENERATE ≥ 0 targets; reject duplicate identity+revision targets (via `refKey`); reject unknown/off-enum intents
    - No side effects, no port access
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_

- [x] 3. Port boundary interfaces and envelope types
  - [x] 3.1 Create `src/adapter/flow/discovery-port.ts`
    - Define `RequestEnvelope` (`correlationId`, `idempotencyKey`, `expectedRevision`), `PortError` (`timeout` | `revision_conflict` | `unavailable` | `invalid` | `unknown`), `PortResult<T>`, `DiscoveryPort`, `SpecPort`, and `FlowPorts`
    - Method signatures per design (startDiscovery, generatePreviewRound, enrichCandidate, submitFeedback; generateSpecDraft, refineSpec, confirmSpec, prepareBuilderTask), each async taking a typed request plus `RequestEnvelope` and returning `Promise<PortResult<T>>`
    - Import domain types from `../../core/flow/flow-types`; declare no concrete implementation here
    - _Requirements: 1.1, 1.2, 1.6_

  - [ ]* 3.2 Write example test asserting the mock satisfies both interfaces
    - Type-level/compile assertion plus a smoke check that a constructed mock is assignable to `DiscoveryPort` and `SpecPort`
    - _Requirements: 1.1, 1.2_

- [x] 4. Mock port implementation
  - [x] 4.1 Create `src/adapter/flow/mock-flow-port.ts` with `MockDiscoveryPort`
    - Implement both `DiscoveryPort` and `SpecPort` in one class with `MockPortOptions` (`seed`, injectable `Clock` defaulting to `SystemClock`, `latency`, scripted `failures`)
    - Seeded RNG + curated varied Korean corpora (project themes, interaction verbs, appeal phrases); preview rounds return exactly 10 previews with positions 1..10, unique `candidateId`s, 1..4 varied `generationTags`, varied titles/summaries
    - Enrichment returns non-empty `targetUsers`/`coreConcepts`/`mvpFeatures`/`suggestedScope`; spec draft returns `status: "DRAFT"`, `runtimeConstraint: "TYPESCRIPT"`, non-empty `productPurpose`/`mvpFeatures`/`scope` (all three categories)/`expectedDecisions`
    - Feedback returns a `CandidateRound` with `roundIndex` strictly greater than prior and `appliedFeedbackIds` including the submitted id; SELECT/PIN preserve, MORE/REGENERATE add fresh, MERGE synthesizes combined
    - Schedule each op's resolution via `clock.setTimeout` at a seeded latency well under 30s; scripted failures resolve `err`
    - _Requirements: 1.3, 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 4.2 Write property test for well-formed varied preview rounds
    - **Property 16: Mock preview rounds are well-formed and varied**
    - **Validates: Requirements 15.1, 15.2**

  - [ ]* 4.3 Write property test for populated enrichment and spec drafts
    - **Property 17: Mock enrichment and spec drafts are fully populated**
    - **Validates: Requirements 15.3, 15.4**

  - [ ]* 4.4 Write property test for monotonic feedback round advancement
    - **Property 18: Mock feedback advances the round monotonically**
    - **Validates: Requirements 15.5**

  - [ ]* 4.5 Write property test for core-contract shape conformance
    - **Property 19: Mock output conforms to the core contract shape**
    - **Validates: Requirements 2.1, 2.4, 2.5, 2.7, 2.8, 2.10, 2.11, 15.1, 15.3, 15.4**

- [x] 5. Port factory and documented crew-backend stub
  - [x] 5.1 Create `src/adapter/flow/flow-port-factory.ts`
    - Implement `createFlowPorts(options?: { seed?: number }): FlowPorts` returning the `MockDiscoveryPort` instance as both `discovery` and `spec` (single swap point; unchanged factory returns the mock)
    - _Requirements: 1.4, 1.5_

  - [x] 5.2 Create `src/adapter/flow/crew-backend-port.ts` doc-only stub
    - Exported class implementing the interfaces but throwing `not implemented`, with JSDoc documenting `POST /api/application`, the `x-kirocrew-proxy` timestamped HMAC-SHA256 signature, and `clientProtocolVersion: 3`; compiles but is never wired
    - _Requirements: 1.4_

  - [ ]* 5.3 Write smoke test that the default factory returns the mock
    - Assert `createFlowPorts()` yields a `MockDiscoveryPort` for both ports without network access
    - _Requirements: 1.5_

- [x] 6. FlowController host-owned core
  - [x] 6.1 Implement `src/core/flow/flow-controller.ts` state and construction
    - Define `FlowSurface`, `FlowControllerOptions` (`clock`, `onNotice`, `onChange`, `ids`), `FlowNotice`/kind, and `InFlightOp`
    - Own authoritative state: `project`, `lastSuccessfulStatus`, `session`, `input`, `rounds`, `candidatesByRef`, `basket`, `spec`, per-surface `inFlight`, append-only `notices`
    - Build a fresh `RequestEnvelope` (new `correlationId`, `idempotencyKey`, current `expectedRevision`) for every port call via injected `IdSource`
    - _Requirements: 1.6, 13.1, 14.1, 14.2_

  - [x] 6.2 Implement `startDiscovery`, timeouts, and single-flight
    - `startDiscovery(input)` creates `Project(status=DISCOVERY)`, arms a 30s `clock.setTimeout`, calls `startDiscovery` then on success `generatePreviewRound`; per-op token guards stale/late resolution after timeout
    - Single-flight lock per surface rejects same-kind ops while one is in flight; set `inProgress` true on invoke, clear on settle
    - _Requirements: 4.4, 4.5, 4.9, 14.1, 14.2, 14.5_

  - [x] 6.3 Implement `toggleBasket` and `submitFeedback`
    - `toggleBasket` adds/removes a `refKey` from the basket
    - `submitFeedback` runs `validateFeedback` first: on reject emit a notice and leave session/basket unchanged with no port call; on accept invoke `submitFeedback` exactly once then request the resulting round; accumulate rounds ascending and preserve basket for still-present refs; SELECT sets `Project.status = SPEC_REVIEW`, records the selected ref, and calls `generateSpecDraft`
    - On feedback failure abort the round request, emit notice, retain composer text + selections
    - _Requirements: 3.7, 3.9, 5.4, 6.1, 6.2, 6.4, 7.9, 7.10, 8.2, 8.3, 8.4_

  - [x] 6.4 Implement `refineSpec` and `confirmSpec`
    - `refineSpec(message)` calls `refineSpec` once with current `expectedRevision`; success records a new `DRAFT` with strictly greater revision; failure emits notice, retains prior revision, re-enables controls
    - `confirmSpec()` calls `confirmSpec` once with current `expectedRevision`; success sets spec `CONFIRMED`, `Project.status = BUILDING`, then calls `prepareBuilderTask`; failure/timeout restores `lastSuccessfulStatus` and re-enables; `revision_conflict` emits "스펙이 변경되었습니다", leaves status unchanged, re-enables
    - _Requirements: 10.2, 10.3, 10.5, 11.2, 11.3, 11.4, 11.6, 11.7, 11.8, 11.9, 14.3, 14.4_

  - [ ]* 6.5 Write property test for the feedback validity gate
    - **Property 1: Feedback validity gate**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8**

  - [ ]* 6.6 Write property test for exactly-once enveloped port calls
    - **Property 2: Valid action makes exactly one enveloped port call**
    - **Validates: Requirements 1.6, 3.7, 7.9, 4.4, 8.2, 10.2, 11.2**

  - [ ]* 6.7 Write property test for rejected feedback preserving session and basket
    - **Property 3: Rejected feedback preserves session and basket**
    - **Validates: Requirements 3.9**

  - [ ]* 6.8 Write property test for discovery start creating a project and requesting previews
    - **Property 4: Discovery start creates a project and requests previews**
    - **Validates: Requirements 4.4, 4.5**

  - [ ]* 6.9 Write property test for round accumulation and basket preservation
    - **Property 5: Rounds accumulate and preserve basket membership**
    - **Validates: Requirements 5.4, 6.4**

  - [ ]* 6.10 Write property test for failure preserving last-successful state
    - **Property 6: Failure preserves last-successful state and re-enables the surface**
    - **Validates: Requirements 4.7, 4.8, 10.5, 11.7, 14.3**

  - [ ]* 6.11 Write property test for timeout treated as failure
    - **Property 7: Timeout is treated as failure with state preserved**
    - **Validates: Requirements 4.9, 11.8, 14.4**

  - [ ]* 6.12 Write property test for SELECT transitioning to spec review
    - **Property 8: Candidate selection transitions to spec review and drafts a spec**
    - **Validates: Requirements 8.2, 8.3, 8.4**

  - [ ]* 6.13 Write property test for spec refinement producing a new monotonic DRAFT
    - **Property 9: Spec refinement produces a new monotonic DRAFT revision**
    - **Validates: Requirements 10.2, 10.3**

  - [ ]* 6.14 Write property test for confirmation advancing to building
    - **Property 10: Confirmation confirms the spec and advances to building**
    - **Validates: Requirements 11.3, 11.4**

  - [ ]* 6.15 Write property test for single-flight per surface
    - **Property 11: One operation in flight per surface (single-flight)**
    - **Validates: Requirements 11.6, 14.5**

  - [ ]* 6.16 Write property test for revision-conflict handling
    - **Property 12: Confirmation revision conflict is surfaced without status change**
    - **Validates: Requirements 11.9**

  - [ ]* 6.17 Write property test for in-progress flag lifecycle
    - **Property 13: In-progress state is set on start and cleared on settle**
    - **Validates: Requirements 14.1, 14.2**

- [x] 7. Checkpoint - controller core validated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Flow snapshot projection
  - [x] 8.1 Create `src/core/flow/flow-snapshot.ts`
    - Define `FlowSnapshot` (derived `phase`, `DiscoveryInput`, accumulated `CandidateRound[]` with enriched candidates, `basket` refs, current `LearningSpecRevision`, per-surface in-flight flags, latest notice) and a pure builder from `FlowController` state
    - Derive `phase`: DISCOVERY → `discovery_start`/`discovery_workspace`, SPEC_REVIEW → `spec_review`, BUILDING/COMPLETED → `building`
    - Wire `FlowController.snapshot()` to return this immutable projection
    - _Requirements: 12.2, 12.3, 13.2_

- [x] 9. Webview flow messaging contract
  - [x] 9.1 Create `src/webview/flow/flow-messages.ts`
    - Define `HostToWebviewFlow` (`hydrateFlow`, `flowNotice`) and `WebviewToHostFlow` (`startDiscovery`, `toggleBasket`, `submitRefinement`, `selectCandidate`, `refineSpec`, `confirmSpec`, `draftChangedFlow`) unions plus `RefinementAction`
    - Implement `parseWebviewToHostFlow`/serialize guards validating discriminators and dropping malformed payloads (mirroring `messages.ts`)
    - _Requirements: 12.4, 13.2_

- [x] 10. Flow dispatcher
  - [x] 10.1 Create `src/webview/flow/flow-dispatcher.ts` with `FlowDispatcher`
    - Constructor `(controller, post)`; `hydrateFlow()` posts `{ type: "hydrateFlow", snapshot }`; `handle(msg)` applies validated inbound intents to the controller; `onNotice`/`forwardNotice` closure mirroring `WebviewDispatcher`
    - Register `controller.onChange` → `hydrateFlow()` and `controller.onNotice` → post `flowNotice`
    - _Requirements: 12.4, 13.4_

- [x] 11. Flow view-model store
  - [x] 11.1 Create `src/webview/flow/flow-view-model.ts` with `FlowViewModelStore`
    - `apply(snapshot)` fully replaces the prior projection (rebuild rounds from snapshot, no duplication); idempotent so applying twice equals once; expose projection for renderers
    - _Requirements: 13.2, 13.3_

  - [ ]* 11.2 Write property test for snapshot round-trip without duplication
    - **Property 14: Flow snapshot round-trips controller state without duplication**
    - **Validates: Requirements 13.2, 13.3**

- [x] 12. Flow renderers (framework-free DOM, Korean copy)
  - [x] 12.1 Create `src/webview/flow/flow-render.ts` with `DiscoveryStartView`
    - Required Learning Goal input (1–240 chars) + optional personalNeed/recentFriction/currentLevel; submit disabled while empty/whitespace or > 240 chars (with length notice); Agent_Run_Banner while starting; idempotent build-once/update-in-place; `FlowRenderCallbacks`
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [x] 12.2 Add `DiscoveryWorkspace` renderer to `flow-render.ts`
    - Round rationale + `roundIndex` header; accumulated rounds ascending; 10 candidate cards showing title/summary/appeal/coreInteraction/generationTags and, when enriched, coreConcepts + suggestedScope; basket affordance with per-card selection state; Refinement_Composer (≤ 2000-char free text + action buttons) with client-side narrow/merge guards and messages; select-to-proceed per card; Agent_Run_Banner during discovery ops; feedback→intent mapping (narrow→REVISE, merge→MERGE, new-direction→REGENERATE, show-more→MORE, proceed→SELECT) attaching free text as message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.11, 7.12, 8.1, 8.5_

  - [x] 12.3 Add `SpecReview` renderer to `flow-render.ts`
    - productPurpose one-liner; targetUsers/primaryUsageMoment/successMoment; mvpFeatures; scope grouped into Learner Focus / Agent Support / Excluded with conceptNames as chips; each Expected_Decision (category/description/whyUserInputMatters); runtimeConstraint + deploymentConstraints; refine free-text input and "이걸로 시작" confirm control; Agent_Run_Banner during refine/confirm with controls disabled
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.4, 11.1, 11.6_

  - [ ]* 12.4 Write example/edge tests for composer mapping, boundary, and Korean copy
    - Feedback→intent action mapping (narrow/merge/new-direction/show-more); 2000-char composer boundary; specific Korean copy strings; chip-per-conceptName
    - _Requirements: 7.1, 7.2, 7.4, 7.6, 7.7, 9.4_

- [x] 13. Shell integration and view-provider wiring
  - [x] 13.1 Create `src/webview/shell-view-model.ts` top-level phase selector
    - Derive shell phase from snapshot/status; select flow surfaces vs Build_Surface; default to existing Build_Surface behavior when no flow state exists
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 13.2 Extend `src/webview/main.ts` to route hydrate vs hydrateFlow
    - Add a phase branch routing `hydrateFlow` to the flow shell and existing `hydrate` to the current panel; branch inert until a `hydrateFlow` arrives so existing behavior is unchanged
    - _Requirements: 12.2, 12.3, 12.4_

  - [ ]* 13.3 Write property test for deterministic phase derivation and gating
    - **Property 15: Phase derives deterministically from project status**
    - **Validates: Requirements 12.2, 12.3**

  - [x] 13.4 Extend `src/agent-panel-view-provider.ts` to construct and wire flow
    - Construct `FlowController` (with `SystemClock`) + `FlowDispatcher` alongside the existing `PanelController`/`WebviewDispatcher`; route inbound messages by discriminator namespace (flow vs panel); push `hydrateFlow` (and, at building, `hydrate`); additive and non-breaking
    - _Requirements: 12.1, 12.4, 13.1, 13.4_

- [x] 14. Flow-specific inline CSS
  - [x] 14.1 Extend `buildWebviewHtml` inline CSS with flow styles
    - Add styles for candidate cards, basket, composer, and spec review reusing the existing theme vars, 8px spacing scale, radius/transition tokens, and per-agent accent system
    - _Requirements: 4.1, 5.1, 7.1, 9.1_

- [x] 15. Test support scaffolding for flow
  - [x] 15.1 Add flow test support (fake Clock, spy ports, deterministic IdSource, harness)
    - Add `test/support/fake-clock.ts`, `test/support/spy-flow-ports.ts` (records `{ op, req, env }` per call), a deterministic `IdSource`, and a `FlowHostWebviewHarness` modeled on `HostWebviewHarness` reusing `test/support/fake-dom.ts`
    - _Requirements: 13.2, 14.1_

- [ ] 16. Integration tests through the flow harness
  - [ ]* 16.1 Write integration tests for discovery start and workspace rendering
    - Start form fields/banner (Req 4.1/4.6); 10 cards with fields, roundIndex + rationale, enriched fields, ascending accumulated rounds, banner (Req 5.1–5.5); basket selection state (Req 6.3)
    - _Requirements: 4.1, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.3_

  - [ ]* 16.2 Write integration tests for composer, select, spec review, and confirm reveal
    - Composer banner/disable/re-enable (Req 7.11/7.12); select control + draft banner (Req 8.1/8.5); spec review rendering (Req 9.1–9.6); refine input/banner (Req 10.1/10.4); confirm control + Build_Surface reveal on building (Req 11.1/11.5)
    - _Requirements: 7.11, 7.12, 8.1, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.4, 11.1, 11.5_

  - [ ]* 16.3 Write integration tests for shell phase gating and re-hydration
    - Flow surfaces render while DISCOVERY/SPEC_REVIEW and hide Build tabs; Build tabs revealed on BUILDING; onChange re-hydration outside inbound intent (Req 13.4)
    - _Requirements: 12.2, 12.3, 13.4_

  - [ ]* 16.4 Write regression guard integration test for existing Build_Surface
    - Assert that with no `hydrateFlow` ever posted the Build_Surface renders exactly as before and the `main.ts` phase branch stays inert, so existing Builder/Helper tests do not regress
    - _Requirements: 12.1, 12.2_

- [x] 17. Final checkpoint - full suite green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Property test sub-tasks each implement exactly one design property, configured with fast-check `{ numRuns: 100 }` minimum and tagged `// Feature: discovery-spec-flow, Property N: <property text>`.
- Property tests are placed beside the code they cover (mock quality under task 4, controller laws under task 6, snapshot under task 11, phase derivation under task 13) to catch errors early.
- Example/edge and integration tests cover the non-PBT criteria (Korean copy, composer mapping, DOM rendering, shell gating, re-hydration) per the design's classification.
- Every task references the specific requirements and/or correctness properties it implements for traceability.
- Shell integration is strictly additive; the regression guard (16.4) protects the existing Builder/Helper suite.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["6.5", "6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "6.12", "6.13", "6.14", "6.15", "6.16", "6.17", "8.1"] },
    { "id": 7, "tasks": ["9.1", "11.1"] },
    { "id": 8, "tasks": ["10.1", "11.2", "12.1"] },
    { "id": 9, "tasks": ["12.2", "12.3"] },
    { "id": 10, "tasks": ["12.4", "13.1", "13.2"] },
    { "id": 11, "tasks": ["13.3", "13.4", "14.1"] },
    { "id": 12, "tasks": ["15.1"] },
    { "id": 13, "tasks": ["16.1", "16.2", "16.3", "16.4"] }
  ]
}
```
