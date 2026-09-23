# Requirements Document

## Introduction

This feature adds a **Discovery → Spec** user flow to the existing Kiro IDE extension (the `program` project: a VS Code/Kiro webview panel extension built with TypeScript, an esbuild-bundled framework-free DOM webview, and a Vitest + fast-check test suite).

Today the extension ships a Builder/Helper Agent Panel where the extension host owns all authoritative state (`PanelController` + per-tab `TabState`) and the webview is a pure projection driven by `hydrate`/patch messages. The concrete agent transport is hidden behind an `AgentAdapter` interface with swappable implementations (`DemoAdapter`, `MockAdapter`, `KiroAcpAdapter`) chosen by a single factory (`createAgentAdapter`).

This spec introduces the **stages that precede Build**: a beginner enters a learning goal, works through rounds of generated project candidates, selects one, reviews a generated Learning Spec, and confirms it — at which point the project transitions to the Building stage and hands off to the existing Builder/Helper surface.

The flow MUST be built with **mock/test data now**, behind a clean port/adapter boundary (`Discovery_Port` / `Spec_Port`) that mirrors the existing `AgentAdapter` pattern, so the real `core` project crew-backend HTTP API can be swapped in later **without rewriting the UI**. To make that swap seamless, the domain data model in this feature MUST mirror the `core` project's published contracts (`core/packages/contracts`), including their optimistic-concurrency and idempotency envelope fields.

All user-facing copy is authored in Korean, consistent with the existing crew-app and extension. Requirements below reference "Korean UI copy" where user-visible text is involved; the exact strings are an implementation concern.

## Glossary

- **Extension_Host**: The Node-side extension process that owns authoritative state, mirrors the existing `PanelController` ownership model. The single source of truth for all Discovery/Spec state.
- **Webview**: The framework-free DOM UI rendered inside the Kiro panel. Holds only a projection of Extension_Host state, never authoritative state.
- **Discovery_Spec_Flow**: The complete four-phase user flow (Discovery Start, Discovery Workspace, Spec Review, Handoff) delivered by this feature.
- **Discovery_Port**: The transport-agnostic interface for Discovery operations (start session, generate previews, enrich candidates, submit feedback), mirroring the `AgentAdapter` pattern.
- **Spec_Port**: The transport-agnostic interface for Learning Spec operations (generate draft, refine draft, confirm spec, prepare Builder task).
- **Mock_Discovery_Port**: The current concrete implementation of Discovery_Port and Spec_Port that produces realistic, varied mock data with no backend, analogous to `DemoAdapter`/`MockAdapter`.
- **Port_Factory**: The single construction/swap point that returns the concrete Discovery_Port/Spec_Port implementation, analogous to `createAgentAdapter`.
- **Project**: A domain entity `{ id, title, learningGoal, status }` where `status` is one of `DISCOVERY`, `SPEC_REVIEW`, `BUILDING`, `COMPLETED`.
- **Discovery_Input**: The learner's starting input `{ learningGoal (required, <=240 chars), personalNeed?, recentFriction?, interestAreas?, currentLevel?, freeContext? }` where `currentLevel` is one of `NEW`, `BEGINNER`, `FAMILIAR`, `UNSPECIFIED`.
- **Discovery_Session**: A server/host-owned session opened from a Discovery_Input, against which preview rounds and feedback accumulate. Carries a monotonic `revision` for optimistic concurrency.
- **Candidate_Preview**: A lightweight candidate card `{ candidateId, position (1..10), title, summary, coreInteraction, appeal, technologyNecessity, generationTags }`.
- **Preview_Round**: A batch of exactly 10 Candidate_Preview cards plus a `generationRationale`, produced for a Discovery_Session.
- **Generation_Tag**: One of `DIRECT`, `EXPAND`, `DISCOVER`, `UPGRADE`, attached to a candidate to indicate how it was generated (1..4 per candidate).
- **Project_Candidate_Revision**: An enriched candidate that adds `targetUsers[]`, `usageMoment`, `personalNeedRelationship?`, `coreConcepts[]`, `mvpFeatures[]`, `suggestedScope { learnerFocus[], agentSupport[], excluded[] }`, `risks[]`, `revision`, and `parentRevisions[]` (lineage).
- **Candidate_Round**: An accumulated record `{ roundIndex, candidates[], generationRationale, appliedFeedbackIds[] }` describing the candidates present after a feedback-driven regeneration.
- **Basket**: The Webview affordance for selecting/pinning candidates the learner is interested in.
- **Refinement_Composer**: The Webview affordance combining free-text input with action buttons that map to Discovery_Feedback intents.
- **Discovery_Feedback**: A learner instruction to the discovery agent `{ intent, targets[], message? }` where `intent` is one of `PIN`, `REJECT`, `MERGE`, `REVISE`, `SHRINK`, `EXPAND`, `REGENERATE`, `MORE`, `SELECT`.
- **Learning_Spec_Revision**: A generated specification `{ revision, status, selectedCandidate, productPurpose, targetUsers[], primaryUsageMoment, successMoment, mvpFeatures[], scope[], expectedDecisions[], runtimeConstraint, deploymentConstraints[] }` where `status` is one of `DRAFT`, `CONFIRMED`, `SUPERSEDED` and `runtimeConstraint` is `TYPESCRIPT`.
- **Spec_Scope_Entry**: One scope line `{ category, title, rationale, conceptNames[] }` where `category` is one of `LEARNER_FOCUS`, `AGENT_SUPPORT`, `EXCLUDED`.
- **Expected_Decision**: A decision the learner will make during Build `{ category, description, whyUserInputMatters }`.
- **Request_Envelope**: The metadata every port call carries so a future backend swap is seamless: `correlationId`, `idempotencyKey`, and the relevant `expectedRevision` (optimistic-concurrency guard), mirroring the `core` UI command contracts.
- **Agent_Run_Banner**: The Webview loading indicator shown while the mock agent (or, later, the real backend) is processing an asynchronous port call.
- **Build_Surface**: The existing Builder/Helper Agent Panel that this flow hands off to once a Learning Spec is confirmed. Out of scope to reimplement.
- **Flow_Snapshot**: An immutable projection of the Extension_Host's Discovery_Spec_Flow state used to (re-)hydrate the Webview after disposal/reveal, analogous to the existing `TabStateSnapshot`.

## Requirements

### Requirement 1: Port and adapter boundary

**User Story:** As a developer, I want the Discovery→Spec UI to talk to the backend only through a port interface, so that the real crew-backend can be swapped in later without rewriting the UI.

#### Acceptance Criteria

1. THE Discovery_Spec_Flow SHALL define a Discovery_Port interface that declares operations to start a Discovery_Session, generate a Preview_Round, enrich a candidate into a Project_Candidate_Revision, and submit Discovery_Feedback.
2. THE Discovery_Spec_Flow SHALL define a Spec_Port interface that declares operations to generate a Learning_Spec_Revision draft, refine a Learning_Spec_Revision draft, confirm a Learning_Spec_Revision, and prepare a Builder task for handoff.
3. THE Discovery_Spec_Flow SHALL provide a Mock_Discovery_Port implementation of Discovery_Port and Spec_Port that returns mock data without any network access.
4. THE Discovery_Spec_Flow SHALL provide a Port_Factory function that returns the concrete Discovery_Port and Spec_Port implementations as the single swap point.
5. WHERE the Port_Factory has not been changed to a backend implementation, THE Port_Factory SHALL return the Mock_Discovery_Port.
6. WHEN any Discovery_Port or Spec_Port operation is invoked, THE Extension_Host SHALL supply a Request_Envelope containing a correlationId, an idempotencyKey, and the applicable expectedRevision for that operation.
7. THE Webview SHALL depend only on Extension_Host messages and SHALL NOT reference any Discovery_Port or Spec_Port implementation type directly.

### Requirement 2: Domain data model mirrors core contracts

**User Story:** As a developer, I want the feature's data types to match the core project's contracts, so that swapping in the real backend requires no shape translation in the UI.

#### Acceptance Criteria

1. THE Discovery_Spec_Flow SHALL represent a Project with the fields id, title, learningGoal, and status, where status is exactly one of DISCOVERY, SPEC_REVIEW, BUILDING, or COMPLETED.
2. THE Discovery_Spec_Flow SHALL represent a Discovery_Input with a required learningGoal of at most 240 characters and optional personalNeed, recentFriction, interestAreas, currentLevel, and freeContext fields.
3. THE Discovery_Spec_Flow SHALL represent currentLevel as exactly one of NEW, BEGINNER, FAMILIAR, or UNSPECIFIED.
4. THE Discovery_Spec_Flow SHALL represent a Candidate_Preview with the fields candidateId, position, title, summary, coreInteraction, appeal, technologyNecessity, and generationTags.
5. THE Discovery_Spec_Flow SHALL represent a Preview_Round as exactly 10 Candidate_Preview items with positions covering every value from 1 through 10 and a generationRationale.
6. THE Discovery_Spec_Flow SHALL represent each Generation_Tag as exactly one of DIRECT, EXPAND, DISCOVER, or UPGRADE, with between 1 and 4 tags per candidate.
7. THE Discovery_Spec_Flow SHALL represent a Project_Candidate_Revision that extends the candidate fields with targetUsers, usageMoment, personalNeedRelationship (optional), coreConcepts, mvpFeatures, suggestedScope containing learnerFocus, agentSupport, and excluded lists, risks, revision, and parentRevisions.
8. THE Discovery_Spec_Flow SHALL represent a Candidate_Round with the fields roundIndex, candidates, generationRationale, and appliedFeedbackIds.
9. THE Discovery_Spec_Flow SHALL represent a Discovery_Feedback intent as exactly one of PIN, REJECT, MERGE, REVISE, SHRINK, EXPAND, REGENERATE, MORE, or SELECT.
10. THE Discovery_Spec_Flow SHALL represent a Learning_Spec_Revision with the fields revision, status, selectedCandidate, productPurpose, targetUsers, primaryUsageMoment, successMoment, mvpFeatures, scope, expectedDecisions, runtimeConstraint, and deploymentConstraints.
11. THE Discovery_Spec_Flow SHALL represent a Learning_Spec_Revision status as exactly one of DRAFT, CONFIRMED, or SUPERSEDED, and its runtimeConstraint as TYPESCRIPT.

### Requirement 3: Discovery Feedback intent validation

**User Story:** As a learner, I want my refinement actions to be well-formed before they are sent, so that the agent receives an unambiguous instruction.

#### Acceptance Criteria

1. IF a Discovery_Feedback with intent MERGE has fewer than 2 targets, THEN THE Extension_Host SHALL reject the feedback and SHALL NOT invoke Discovery_Port.
2. IF a Discovery_Feedback with intent SELECT does not have exactly 1 target, THEN THE Extension_Host SHALL reject the feedback and SHALL NOT invoke Discovery_Port.
3. IF a Discovery_Feedback with intent REVISE, SHRINK, or EXPAND does not have exactly 1 target, THEN THE Extension_Host SHALL reject the feedback and SHALL NOT invoke Discovery_Port.
4. IF a Discovery_Feedback with intent MORE has 1 or more targets, THEN THE Extension_Host SHALL reject the feedback and SHALL NOT invoke Discovery_Port.
5. WHEN a Discovery_Feedback with intent REGENERATE is submitted, THE Extension_Host SHALL accept it with zero or more targets.
6. IF a Discovery_Feedback contains two or more targets referencing the same candidate identity and revision, THEN THE Extension_Host SHALL reject the feedback and SHALL NOT invoke Discovery_Port.
7. WHEN a Discovery_Feedback passes all validation rules, THE Extension_Host SHALL invoke the Discovery_Port submit-feedback operation exactly once with that feedback.
8. IF a Discovery_Feedback carries an intent that is not one of PIN, REJECT, MERGE, REVISE, SHRINK, EXPAND, REGENERATE, MORE, or SELECT, THEN THE Extension_Host SHALL reject the feedback and SHALL NOT invoke Discovery_Port.
9. WHEN a Discovery_Feedback is rejected for a validation reason, THE Extension_Host SHALL emit a notice identifying the reason and SHALL leave the current Discovery_Session state and Basket selection unchanged.

### Requirement 4: Discovery Start

**User Story:** As a learner, I want to enter my learning goal and optional context, so that I can begin a discovery session that generates project ideas.

#### Acceptance Criteria

1. THE Webview SHALL present a Discovery Start form with a required Learning Goal input accepting 1 to 240 characters and optional personalNeed, recentFriction, and currentLevel inputs, using Korean UI copy.
2. WHILE the Learning Goal input is empty or contains only whitespace, THE Webview SHALL keep the Discovery Start submit control disabled.
3. IF a Learning Goal exceeding 240 characters is entered, THEN THE Webview SHALL keep the submit control disabled and SHALL display a notice indicating the maximum allowed length of 240 characters.
4. WHEN the learner submits a Discovery Start form whose Learning Goal contains 1 to 240 non-whitespace-only characters, THE Extension_Host SHALL create a Project with status DISCOVERY and invoke the Discovery_Port start operation exactly once with the composed Discovery_Input.
5. WHEN the Discovery_Session start operation succeeds, THE Extension_Host SHALL invoke the Discovery_Port generate-preview operation to request the first Preview_Round.
6. WHILE the start or first-preview operation is in progress, THE Webview SHALL display the Agent_Run_Banner and SHALL keep the Discovery Start submit control disabled.
7. IF the start operation fails, THEN THE Extension_Host SHALL emit an error notice indicating the start failure, SHALL retain the entered Discovery_Input, and SHALL re-enable the Discovery Start submit control.
8. IF the first-preview operation fails, THEN THE Extension_Host SHALL emit an error notice indicating the preview-generation failure, SHALL retain the entered Discovery_Input, and SHALL re-enable the Discovery Start submit control.
9. IF the start or first-preview operation does not complete within 30 seconds, THEN THE Extension_Host SHALL treat the operation as failed, SHALL emit an error notice indicating a timeout, SHALL retain the entered Discovery_Input, and SHALL re-enable the Discovery Start submit control.

### Requirement 5: Discovery Workspace candidate rendering

**User Story:** As a learner, I want to browse the generated candidate ideas as cards, so that I can compare them and decide which to explore.

#### Acceptance Criteria

1. WHEN a Preview_Round is received, THE Webview SHALL render exactly 10 Candidate_Preview cards, each showing its title, summary, appeal, coreInteraction, and generationTags, using Korean UI copy.
2. THE Webview SHALL display the current Candidate_Round roundIndex and its generationRationale.
3. WHEN a candidate has been enriched into a Project_Candidate_Revision, THE Webview SHALL display that candidate's coreConcepts and suggestedScope in addition to its preview fields.
4. WHEN additional Candidate_Rounds are produced, THE Webview SHALL retain prior rounds and render the accumulated rounds in ascending roundIndex order.
5. WHILE any Discovery_Port operation is in progress, THE Webview SHALL display the Agent_Run_Banner.

### Requirement 6: Basket selection and pinning

**User Story:** As a learner, I want to select and pin candidates into a basket, so that my chosen ideas persist across refinement rounds.

#### Acceptance Criteria

1. WHEN the learner selects a candidate into the Basket, THE Extension_Host SHALL record that candidate reference as selected.
2. WHEN the learner removes a candidate from the Basket, THE Extension_Host SHALL remove that candidate reference from the selected set.
3. THE Webview SHALL display each candidate's current Basket selection state.
4. WHEN a new Candidate_Round is rendered, THE Extension_Host SHALL preserve the Basket selection for candidate references that remain present.

### Requirement 7: Refinement Composer and feedback mapping

**User Story:** As a learner, I want a composer with free text and quick actions, so that I can steer the agent to narrow, merge, replace, or expand the candidate set.

#### Acceptance Criteria

1. THE Webview SHALL present a Refinement_Composer with a free-text input accepting up to 2,000 characters and action controls, using Korean UI copy.
2. WHEN the learner triggers the narrow action with exactly 1 selected candidate, THE Webview SHALL submit a Discovery_Feedback with intent REVISE targeting that candidate.
3. IF the learner triggers the narrow action with 0 or 2 or more selected candidates, THEN THE Webview SHALL block submission and SHALL display a message indicating that narrow requires exactly 1 selected candidate.
4. WHEN the learner triggers the merge action with 2 or more selected candidates, THE Webview SHALL submit a Discovery_Feedback with intent MERGE targeting those candidates.
5. IF the learner triggers the merge action with fewer than 2 selected candidates, THEN THE Webview SHALL block submission and SHALL display a message indicating that merge requires 2 or more selected candidates.
6. WHEN the learner triggers the new-direction action with no selected candidate, THE Webview SHALL submit a Discovery_Feedback with intent REGENERATE and no targets.
7. WHEN the learner triggers the show-more action, THE Webview SHALL submit a Discovery_Feedback with intent MORE and no targets.
8. WHEN free-text is present in the Refinement_Composer at submission, THE Webview SHALL include that text as the Discovery_Feedback message.
9. WHEN a Discovery_Feedback is accepted, THE Extension_Host SHALL invoke the Discovery_Port submit-feedback operation exactly once and then request the resulting Candidate_Round.
10. IF the Discovery_Port submit-feedback operation fails, THEN THE Extension_Host SHALL abort the Candidate_Round request, THE Webview SHALL display an error message indicating that the refinement could not be submitted, and THE Webview SHALL retain the free-text input and candidate selections.
11. WHILE a Discovery_Feedback submission is in progress, THE Webview SHALL display the Agent_Run_Banner and SHALL disable the Refinement_Composer submit controls.
12. WHEN a Discovery_Feedback submission completes or fails, THE Webview SHALL hide the Agent_Run_Banner and SHALL re-enable the Refinement_Composer submit controls.

### Requirement 8: Candidate selection to proceed

**User Story:** As a learner, I want to select a single candidate to move forward, so that a Learning Spec can be generated from it.

#### Acceptance Criteria

1. THE Webview SHALL provide a select-to-proceed control on each candidate card.
2. WHEN the learner selects a candidate to proceed, THE Extension_Host SHALL submit a Discovery_Feedback with intent SELECT targeting exactly that candidate.
3. WHEN a candidate is selected to proceed, THE Extension_Host SHALL set the Project status to SPEC_REVIEW and record the selected candidate reference.
4. WHEN a candidate is selected to proceed, THE Extension_Host SHALL invoke the Spec_Port generate-draft operation for the selected candidate.
5. WHILE the Learning Spec draft generation is in progress, THE Webview SHALL display the Agent_Run_Banner.

### Requirement 9: Spec Review rendering

**User Story:** As a learner, I want to read a clear Learning Spec draft, so that I understand what will be built and what I will decide.

#### Acceptance Criteria

1. WHEN a Learning_Spec_Revision draft is received, THE Webview SHALL render its productPurpose as a one-line statement, using Korean UI copy.
2. THE Webview SHALL render the targetUsers, primaryUsageMoment, and successMoment of the current Learning_Spec_Revision.
3. THE Webview SHALL render the mvpFeatures of the current Learning_Spec_Revision.
4. THE Webview SHALL render the scope grouped into Learner Focus, Agent Support, and Excluded sections according to each Spec_Scope_Entry category, and SHALL display each entry's conceptNames as chips.
5. THE Webview SHALL render each Expected_Decision showing its category, description, and whyUserInputMatters.
6. THE Webview SHALL render the runtimeConstraint and deploymentConstraints of the current Learning_Spec_Revision.

### Requirement 10: Spec refinement

**User Story:** As a learner, I want to refine the spec with free text, so that the draft better matches my intent before I commit.

#### Acceptance Criteria

1. THE Webview SHALL present a spec refinement free-text input on the Spec Review surface, using Korean UI copy.
2. WHEN the learner submits a spec refinement request, THE Extension_Host SHALL invoke the Spec_Port refine operation exactly once with the current expectedRevision.
3. WHEN a refined Learning_Spec_Revision is received, THE Extension_Host SHALL record it as a new revision with status DRAFT and SHALL render it as the current draft.
4. WHILE a spec refinement is in progress, THE Webview SHALL display the Agent_Run_Banner and SHALL disable the spec refinement and confirm controls.
5. IF a spec refinement fails, THEN THE Extension_Host SHALL emit an error notice, SHALL retain the prior Learning_Spec_Revision as the current draft, and SHALL re-enable the spec refinement and confirm controls.

### Requirement 11: Spec confirmation and handoff

**User Story:** As a learner, I want to confirm the spec and start building, so that the flow transitions me into the Build stage with my chosen plan.

#### Acceptance Criteria

1. THE Webview SHALL present a confirm control ("Start with this") on the Spec Review surface, using Korean UI copy.
2. WHEN the learner confirms the current Learning_Spec_Revision, THE Extension_Host SHALL invoke the Spec_Port confirm operation exactly once with the current expectedRevision.
3. WHEN the confirm operation succeeds, THE Extension_Host SHALL set the confirmed Learning_Spec_Revision status to CONFIRMED and set the Project status to BUILDING.
4. WHEN the Project status becomes BUILDING, THE Extension_Host SHALL invoke the Spec_Port prepare-Builder-task operation to produce the handoff task for the Build_Surface.
5. WHEN the Builder task preparation succeeds, THE Extension_Host SHALL transition the panel to reveal the Build_Surface for the project within 2 seconds.
6. WHILE a confirm or Builder-task-preparation operation is in progress, THE Webview SHALL display the Agent_Run_Banner and SHALL keep the confirm control disabled so that no additional confirm invocation can be triggered.
7. IF the confirm or Builder-task-preparation operation fails, THEN THE Extension_Host SHALL emit an error notice, SHALL restore the Project status to its last successful value, and SHALL re-enable the confirm control.
8. IF a confirm or Builder-task-preparation operation does not complete within 30 seconds, THEN THE Extension_Host SHALL treat it as a failure, SHALL emit an error notice indicating a timeout, SHALL restore the Project status to its last successful value, and SHALL re-enable the confirm control.
9. IF the confirm operation is rejected because the current expectedRevision does not match the latest stored Learning_Spec_Revision, THEN THE Extension_Host SHALL emit an error notice indicating that the spec has changed, SHALL leave the Project status unchanged, and SHALL re-enable the confirm control.

### Requirement 12: Extension shell integration

**User Story:** As a learner, I want the Discovery→Spec flow to live in the same panel that precedes Builder/Helper, so that the experience is continuous from idea to build.

#### Acceptance Criteria

1. THE Discovery_Spec_Flow SHALL be presented as a project-scoped area of the extension panel that precedes the Build_Surface tabs.
2. WHILE a Project status is DISCOVERY or SPEC_REVIEW, THE Webview SHALL present the Discovery_Spec_Flow surface for that project and SHALL NOT present the Build_Surface tabs.
3. WHEN a Project status becomes BUILDING, THE Webview SHALL reveal the Build_Surface tabs for that project.
4. THE Discovery_Spec_Flow SHALL reuse the existing Extension_Host message-dispatch and Webview-projection pattern rather than introducing a separate state-ownership mechanism.

### Requirement 13: Host-owned state and re-hydration

**User Story:** As a learner, I want my in-progress discovery and spec to survive the panel being hidden and reshown, so that I do not lose my work.

#### Acceptance Criteria

1. THE Extension_Host SHALL own the authoritative Discovery_Spec_Flow state, and THE Webview SHALL hold only a projection of that state.
2. WHEN the Webview is revealed after disposal, THE Extension_Host SHALL push a Flow_Snapshot that restores the current phase, Discovery_Input, accumulated Candidate_Rounds, Basket selection, and current Learning_Spec_Revision.
3. WHEN a Flow_Snapshot is applied, THE Webview SHALL replace its prior projection with the snapshot without duplicating previously rendered candidates or rounds.
4. WHEN the Extension_Host mutates Discovery_Spec_Flow state outside of an inbound Webview intent, THE Extension_Host SHALL push an updated projection so the Webview reflects the change.

### Requirement 14: Asynchronous operation states and error handling

**User Story:** As a learner, I want clear feedback while the agent works and when something fails, so that I always know the system state.

#### Acceptance Criteria

1. WHILE any Discovery_Port or Spec_Port operation is in progress, THE Webview SHALL display the Agent_Run_Banner for the affected surface.
2. WHEN a Discovery_Port or Spec_Port operation completes, THE Extension_Host SHALL clear the in-progress state for that operation.
3. IF a Discovery_Port or Spec_Port operation fails, THEN THE Extension_Host SHALL emit an error notice for the affected surface and SHALL preserve the last successful Discovery_Spec_Flow state.
4. IF a Discovery_Port or Spec_Port operation does not complete within a defined timeout, THEN THE Extension_Host SHALL treat the operation as failed, SHALL emit an error notice, and SHALL preserve the last successful Discovery_Spec_Flow state.
5. WHILE a port operation is in progress for a surface, THE Extension_Host SHALL reject a new operation of the same kind for that surface and SHALL keep the in-progress operation active.

### Requirement 15: Mock port data quality

**User Story:** As a developer demoing the extension, I want the mock port to produce realistic and varied data, so that the flow can be shown end-to-end without a backend.

#### Acceptance Criteria

1. WHEN the Mock_Discovery_Port generates a Preview_Round, THE Mock_Discovery_Port SHALL return exactly 10 Candidate_Preview items with positions 1 through 10 and unique candidateIds.
2. WHEN the Mock_Discovery_Port generates a Preview_Round, THE Mock_Discovery_Port SHALL produce varied titles, summaries, and generationTags across the 10 candidates.
3. WHEN the Mock_Discovery_Port enriches a candidate, THE Mock_Discovery_Port SHALL return a Project_Candidate_Revision populated with non-empty targetUsers, coreConcepts, mvpFeatures, and suggestedScope fields.
4. WHEN the Mock_Discovery_Port generates a Learning_Spec_Revision, THE Mock_Discovery_Port SHALL return a draft with status DRAFT, runtimeConstraint TYPESCRIPT, and non-empty productPurpose, mvpFeatures, scope, and expectedDecisions.
5. WHEN the Mock_Discovery_Port applies a Discovery_Feedback, THE Mock_Discovery_Port SHALL return a Candidate_Round whose roundIndex is greater than the prior round's roundIndex and whose appliedFeedbackIds include the submitted feedback identifier.
