/**
 * Domain types for the Discovery -> Spec flow.
 *
 * These types are LOCAL to the extension (no import from the `core` project)
 * but are intentionally SHAPE-COMPATIBLE with `core/packages/contracts`
 * (`discovery.ts`, `learning-spec.ts`, `ui-contracts.ts`). Fields that the
 * mock does not populate but the core contracts mark as optional (e.g.
 * `schemaVersion`, `createdAt`, `redactionStatus`, `evaluation`) are declared
 * here as optional so that mock-produced objects validate against the future
 * core Zod schemas when the real crew-backend port is wired in behind
 * `createFlowPorts` with no shape translation.
 *
 * They are pure, transport-agnostic, and free of any VS Code or adapter
 * runtime dependency so they can be exercised by the property-based suite.
 *
 * See design.md "Data Models" for the authoritative field definitions.
 * Requirements: 2.1-2.11.
 */

// --- Project (mirrors core projectSchema; Req 2.1) ---

/** Lifecycle status of a {@link Project}. */
export type ProjectStatus = "DISCOVERY" | "SPEC_REVIEW" | "BUILDING" | "COMPLETED";

/** A learning project moving through the Discovery -> Spec -> Build lifecycle. */
export interface Project {
  /** `project_<uuid>`. */
  id: string;
  title: string;
  /** <= 240 chars. */
  learningGoal: string;
  status: ProjectStatus;
  /** Contract-optional envelope fields (present when a real backend is wired). */
  schemaVersion?: number;
  createdAt?: number;
  updatedAt?: number;
}

// --- Discovery_Input (mirrors discoveryInputSchema; Req 2.2, 2.3) ---

/** The learner's self-reported familiarity. */
export type LearnerLevel = "NEW" | "BEGINNER" | "FAMILIAR" | "UNSPECIFIED";

/** The learner's starting input that opens a {@link DiscoverySession}. */
export interface DiscoveryInput {
  /** Required, 1..240 non-whitespace-only characters. */
  learningGoal: string;
  personalNeed?: string;
  recentFriction?: string;
  interestAreas?: string[];
  currentLevel?: LearnerLevel;
  freeContext?: string;
}

// --- Discovery_Session ---

/** A host-owned session against which preview rounds and feedback accumulate. */
export interface DiscoverySession {
  /** `discovery_session_<uuid>`. */
  id: string;
  projectId: string;
  /** Monotonic; drives optimistic concurrency. */
  revision: number;
  input: DiscoveryInput;
  status: "ACTIVE" | "SELECTED" | "ABANDONED";
  /** Contract-optional envelope fields. */
  schemaVersion?: number;
  createdAt?: number;
  updatedAt?: number;
}

// --- Generation tags + candidate reference ---

/** How a candidate was generated (1..4 per candidate; Req 2.6). */
export type GenerationTag = "DIRECT" | "EXPAND" | "DISCOVER" | "UPGRADE";

/** A stable identity + revision pointer to a candidate. */
export interface CandidateRevisionReference {
  candidateId: string;
  revision: number;
}

// --- Candidate_Preview (mirrors candidatePreviewSchema; Req 2.4) ---

/** A lightweight candidate card shown in a {@link PreviewRound}. */
export interface CandidatePreview {
  candidateId: string;
  /** 1..10. */
  position: number;
  title: string;
  summary: string;
  coreInteraction: string;
  appeal: string;
  technologyNecessity: string;
  /** 1..4 tags. */
  generationTags: GenerationTag[];
}

// --- Preview_Round (exactly 10; Req 2.5) ---

/** A batch of exactly 10 {@link CandidatePreview} items plus a rationale. */
export interface PreviewRound {
  discoverySessionId: string;
  /** Length 10, positions covering every value 1..10. */
  previews: CandidatePreview[];
  generationRationale: string;
}

// --- Suggested scope for a candidate ---

/** The suggested learner/agent/excluded scope split for a candidate. */
export interface CandidateScopeSuggestion {
  learnerFocus: string[];
  agentSupport: string[];
  excluded: string[];
}

// --- Project_Candidate_Revision (mirrors projectCandidateRevisionSchema; Req 2.7) ---

/** An enriched candidate carrying full detail and revision lineage. */
export interface ProjectCandidateRevision {
  candidateId: string;
  revision: number;
  /** Lineage of the revisions this one was derived from. */
  parentRevisions: CandidateRevisionReference[];
  title: string;
  summary: string;
  targetUsers: string[];
  coreInteraction: string;
  usageMoment: string;
  appeal: string;
  personalNeedRelationship?: string;
  technologyNecessity: string;
  coreConcepts: string[];
  mvpFeatures: string[];
  suggestedScope: CandidateScopeSuggestion;
  risks?: string[];
  generationTags: GenerationTag[];
  /** Contract-optional envelope fields. */
  schemaVersion?: number;
  createdAt?: number;
}

// --- Candidate_Round (mirrors candidateRoundSchema; Req 2.8) ---

/** The candidates present after a feedback-driven regeneration. */
export interface CandidateRound {
  /** 1-based, strictly increasing across accumulated rounds. */
  roundIndex: number;
  candidates: CandidateRevisionReference[];
  generationRationale: string;
  appliedFeedbackIds: string[];
}

// --- Discovery_Feedback (mirrors discoveryFeedbackSchema; Req 2.9) ---

/** A learner instruction to the discovery agent. */
export type DiscoveryFeedbackIntent =
  | "PIN"
  | "REJECT"
  | "MERGE"
  | "REVISE"
  | "SHRINK"
  | "EXPAND"
  | "REGENERATE"
  | "MORE"
  | "SELECT";

/** A fully-formed feedback instruction (host assigns the `id`). */
export interface DiscoveryFeedback {
  /** `feedback_<uuid>`. */
  id: string;
  intent: DiscoveryFeedbackIntent;
  targets: CandidateRevisionReference[];
  message?: string;
}

/** The webview-supplied shape before the host assigns an id. */
export type DiscoveryFeedbackInput = Omit<DiscoveryFeedback, "id">;

// --- Learning_Spec_Revision (mirrors learningSpecRevisionSchema; Req 2.10, 2.11) ---

/** Lifecycle status of a {@link LearningSpecRevision}. */
export type LearningSpecStatus = "DRAFT" | "CONFIRMED" | "SUPERSEDED";

/** Category grouping for a {@link SpecScopeEntry}. */
export type LearningScopeCategory = "LEARNER_FOCUS" | "AGENT_SUPPORT" | "EXCLUDED";

/** One scope line within a Learning Spec. */
export interface SpecScopeEntry {
  category: LearningScopeCategory;
  title: string;
  rationale: string;
  conceptNames: string[];
}

/** Category of an {@link ExpectedDecision} the learner will make during Build. */
export type DecisionCategory =
  | "PRODUCT_BEHAVIOR"
  | "DATA_MODEL"
  | "API_CONTRACT"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "SECURITY_PRIVACY"
  | "RETENTION_DELETION"
  | "COST_DEPLOYMENT"
  | "ARCHITECTURE"
  | "LEARNING_CONCEPT";

/** A decision the learner will make during Build. */
export interface ExpectedDecision {
  category: DecisionCategory;
  description: string;
  whyUserInputMatters: string;
}

/** A generated Learning Specification revision. */
export interface LearningSpecRevision {
  /** `learning_spec_<uuid>`. */
  id: string;
  /** Monotonic. */
  revision: number;
  parentRevision?: number;
  status: LearningSpecStatus;
  selectedCandidate: CandidateRevisionReference;
  productPurpose: string;
  targetUsers: string[];
  primaryUsageMoment: string;
  successMoment: string;
  mvpFeatures: string[];
  scope: SpecScopeEntry[];
  expectedDecisions: ExpectedDecision[];
  runtimeConstraint: "TYPESCRIPT";
  deploymentConstraints: string[];
  /** Contract-optional envelope fields. */
  schemaVersion?: number;
  createdAt?: number;
}

// --- Prepared Builder handoff task (mirrors preparedBuilderTaskDescriptorSchema) ---

/** The handoff task produced once a project reaches BUILDING. */
export interface PreparedBuilderTask {
  projectId: string;
  workspacePath: string;
  status: "READY";
  /** Contract-optional envelope fields. */
  schemaVersion?: number;
  createdAt?: number;
}

// --- refKey helper ---

/**
 * The canonical `${candidateId}:${revision}` key for a candidate reference,
 * matching core's `candidateReferenceKey`. Used pervasively for Set/Map
 * membership (basket entries, feedback-target uniqueness).
 *
 * Pure; no side effects.
 */
export function refKey(ref: CandidateRevisionReference): string {
  return `${ref.candidateId}:${ref.revision}`;
}
