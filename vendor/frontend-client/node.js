// packages/frontend-client/dist/node.js
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";

// packages/contracts/dist/activity.js
import { z as z3 } from "zod";

// packages/contracts/dist/primitives.js
import { z } from "zod";
var CURRENT_SCHEMA_VERSION = 1;
var schemaVersionSchema = z.literal(CURRENT_SCHEMA_VERSION);
var UUID_V4_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
function prefixedUuidSchema(prefix) {
  return z.string().regex(new RegExp(`^${prefix}_${UUID_V4_PATTERN}$`), `Expected a ${prefix}_ prefixed lowercase UUID v4`);
}
var stableEntityIdSchema = z.string().regex(new RegExp(`^[a-z]+(?:_[a-z]+)*_${UUID_V4_PATTERN}$`), "Expected a lowercase entity prefix and UUID v4");
var projectIdSchema = prefixedUuidSchema("project");
var discoverySessionIdSchema = prefixedUuidSchema("discovery_session");
var candidateRoundIdSchema = prefixedUuidSchema("candidate_round");
var candidatePreviewRoundIdSchema = prefixedUuidSchema("candidate_preview_round");
var candidateIdSchema = prefixedUuidSchema("candidate");
var feedbackIdSchema = prefixedUuidSchema("feedback");
var learningSpecIdSchema = prefixedUuidSchema("learning_spec");
var taskIdSchema = prefixedUuidSchema("task");
var liveContextIdSchema = prefixedUuidSchema("context");
var contextRefreshRequestIdSchema = prefixedUuidSchema("context_refresh");
var decisionIdSchema = prefixedUuidSchema("decision");
var decisionOptionIdSchema = prefixedUuidSchema("decision_option");
var decisionResolutionIdSchema = prefixedUuidSchema("decision_resolution");
var decisionApplicationIdSchema = prefixedUuidSchema("decision_application");
var completionReportIdSchema = prefixedUuidSchema("completion_report");
var conversationIdSchema = prefixedUuidSchema("conversation");
var messageIdSchema = prefixedUuidSchema("message");
var toolCallIdSchema = prefixedUuidSchema("tool_call");
var testResultIdSchema = prefixedUuidSchema("test_result");
var diffIdSchema = prefixedUuidSchema("diff");
var eventIdSchema = prefixedUuidSchema("event");
var episodeIdSchema = prefixedUuidSchema("episode");
var analysisJobIdSchema = prefixedUuidSchema("analysis_job");
var conceptIdSchema = prefixedUuidSchema("concept");
var aliasProposalIdSchema = prefixedUuidSchema("alias_proposal");
var evidenceProposalIdSchema = prefixedUuidSchema("evidence_proposal");
var evidenceIdSchema = prefixedUuidSchema("evidence");
var evidenceDecisionIdSchema = prefixedUuidSchema("evidence_decision");
var misconceptionIssueIdSchema = prefixedUuidSchema("misconception");
var conceptLedgerIdSchema = prefixedUuidSchema("concept_ledger");
var personalizationTraceIdSchema = prefixedUuidSchema("personalization");
var auditRecordIdSchema = prefixedUuidSchema("audit");
var fixtureIdSchema = prefixedUuidSchema("fixture");
var evaluationRunIdSchema = prefixedUuidSchema("evaluation_run");
var baselineResultIdSchema = prefixedUuidSchema("baseline_result");
var correlationIdSchema = prefixedUuidSchema("corr");
var idempotencyKeySchema = prefixedUuidSchema("idem");
var utcTimestampSchema = z.iso.datetime({ offset: false }).refine((value) => value.endsWith("Z"), "Expected a UTC timestamp ending in Z");
var entityRevisionSchema = z.int().positive();
var expectedRevisionSchema = z.int().nonnegative();
var sequenceSchema = z.int().nonnegative();
var semanticVersionSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/, "Expected SemVer");
var nonEmptyTextSchema = z.string().trim().min(1).max(4e3);
var shortTextSchema = z.string().trim().min(1).max(240);
var labelSchema = z.string().trim().min(1).max(120);
var redactionStatusSchema = z.enum(["NOT_REQUIRED", "REDACTED", "VERIFIED_REDACTED"]);
var agentRoleSchema = z.enum(["DISCOVERY", "BUILDER", "HELPER", "EVIDENCE_ANALYST"]);
var learningScopeCategorySchema = z.enum(["LEARNER_FOCUS", "AGENT_SUPPORT", "EXCLUDED"]);
var decisionCategorySchema = z.enum([
  "PRODUCT_BEHAVIOR",
  "DATA_MODEL",
  "API_CONTRACT",
  "AUTHENTICATION",
  "AUTHORIZATION",
  "SECURITY_PRIVACY",
  "RETENTION_DELETION",
  "COST_DEPLOYMENT",
  "ARCHITECTURE",
  "LEARNING_CONCEPT"
]);
var actorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("USER") }),
  z.strictObject({ kind: z.literal("AGENT"), role: agentRoleSchema }),
  z.strictObject({ kind: z.literal("CORE") }),
  z.strictObject({ kind: z.literal("UI") }),
  z.strictObject({ kind: z.literal("KIRO_ADAPTER") })
]);
var relativePosixPathSchema = z.string().min(1).max(512).superRefine((value, context) => {
  if (value.includes("\0")) {
    context.addIssue({ code: "custom", message: "Path must not contain NUL" });
  }
  if (value.includes("\\")) {
    context.addIssue({ code: "custom", message: "Path must use POSIX separators" });
  }
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
    context.addIssue({ code: "custom", message: "Path must be relative" });
  }
  if (value.endsWith("/") || value.includes("//")) {
    context.addIssue({ code: "custom", message: "Path must be normalized" });
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || segment.length === 0)) {
    context.addIssue({ code: "custom", message: "Path must not contain dot segments" });
  }
});

// packages/contracts/dist/references.js
import { z as z2 } from "zod";
var lineRangeSchema = z2.strictObject({
  start: z2.int().positive(),
  end: z2.int().positive()
}).refine(({ start, end }) => end >= start, {
  message: "Line range end must be greater than or equal to start",
  path: ["end"]
});
var codeReferenceSchema = z2.strictObject({
  kind: z2.literal("CODE"),
  path: relativePosixPathSchema,
  lineRange: lineRangeSchema.optional(),
  revisionRef: labelSchema.optional()
});
var diffReferenceSchema = z2.strictObject({
  kind: z2.literal("DIFF"),
  diffId: diffIdSchema,
  paths: z2.array(relativePosixPathSchema).min(1).max(50),
  revisionRef: labelSchema.optional()
});
var testResultReferenceSchema = z2.strictObject({
  kind: z2.literal("TEST_RESULT"),
  testResultId: testResultIdSchema,
  taskId: taskIdSchema
});
var toolCallReferenceSchema = z2.strictObject({
  kind: z2.literal("TOOL_CALL"),
  toolCallId: toolCallIdSchema,
  toolName: labelSchema
});
var userMessageReferenceSchema = z2.strictObject({
  kind: z2.literal("USER_MESSAGE"),
  conversationId: conversationIdSchema,
  messageId: messageIdSchema
});
var userDecisionReferenceSchema = z2.strictObject({
  kind: z2.literal("USER_DECISION"),
  decisionId: decisionIdSchema
});
var userActionReferenceSchema = z2.strictObject({
  kind: z2.literal("USER_ACTION"),
  eventId: eventIdSchema
});
var agentMessageReferenceSchema = z2.strictObject({
  kind: z2.literal("AGENT_MESSAGE"),
  conversationId: conversationIdSchema,
  messageId: messageIdSchema
});
var eventReferenceSchema = z2.strictObject({
  kind: z2.literal("EVENT"),
  eventId: eventIdSchema
});
var userEvidenceSourceReferenceSchema = z2.discriminatedUnion("kind", [
  userMessageReferenceSchema,
  userDecisionReferenceSchema,
  userActionReferenceSchema
]);
var contextualSourceReferenceSchema = z2.discriminatedUnion("kind", [
  codeReferenceSchema,
  diffReferenceSchema,
  testResultReferenceSchema,
  toolCallReferenceSchema,
  userMessageReferenceSchema,
  userDecisionReferenceSchema,
  userActionReferenceSchema,
  agentMessageReferenceSchema,
  eventReferenceSchema
]);

// packages/contracts/dist/activity.js
var activityPayloadSchema = z3.discriminatedUnion("type", [
  z3.strictObject({ type: z3.literal("TASK_STARTED"), taskId: taskIdSchema }),
  z3.strictObject({
    type: z3.literal("TASK_COMPLETED"),
    taskId: taskIdSchema,
    completionReportId: completionReportIdSchema
  }),
  z3.strictObject({
    type: z3.literal("LIVE_CONTEXT_UPDATED"),
    taskId: taskIdSchema,
    liveContextId: liveContextIdSchema,
    contextVersion: entityRevisionSchema
  }),
  z3.strictObject({
    type: z3.literal("USER_MESSAGE"),
    conversationId: conversationIdSchema,
    messageId: messageIdSchema,
    redactedExcerpt: nonEmptyTextSchema
  }),
  z3.strictObject({
    type: z3.literal("HELPER_RESPONSE"),
    conversationId: conversationIdSchema,
    messageId: messageIdSchema,
    summary: shortTextSchema
  }),
  z3.strictObject({ type: z3.literal("DECISION_REQUESTED"), decisionId: decisionIdSchema }),
  z3.strictObject({
    type: z3.literal("DECISION_RESOLVED"),
    decisionId: decisionIdSchema,
    resolutionId: decisionResolutionIdSchema,
    rationaleProvided: z3.boolean()
  }),
  z3.strictObject({
    type: z3.literal("CONCEPT_REPORTED"),
    taskId: taskIdSchema,
    conceptNames: z3.array(labelSchema).min(1).max(30)
  }),
  z3.strictObject({
    type: z3.literal("VALIDATION_RESULT"),
    taskId: taskIdSchema,
    result: z3.enum(["PASSED", "FAILED"]),
    reference: testResultReferenceSchema
  })
]);
var activityEventSchema = z3.strictObject({
  schemaVersion: schemaVersionSchema,
  id: eventIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  conversationId: conversationIdSchema.optional(),
  correlationId: correlationIdSchema,
  sequence: z3.int().nonnegative(),
  actor: actorSchema,
  occurredAt: utcTimestampSchema,
  payload: activityPayloadSchema,
  sourceReferences: z3.array(contextualSourceReferenceSchema).max(30),
  redactionStatus: redactionStatusSchema
}).superRefine((event, context) => {
  if (event.payload.type === "USER_MESSAGE" && event.actor.kind !== "USER") {
    context.addIssue({
      code: "custom",
      path: ["actor"],
      message: "USER_MESSAGE must be user-authored"
    });
  }
  if (event.payload.type === "HELPER_RESPONSE" && (event.actor.kind !== "AGENT" || event.actor.role !== "HELPER")) {
    context.addIssue({
      code: "custom",
      path: ["actor"],
      message: "HELPER_RESPONSE must be authored by the Helper Agent"
    });
  }
});
var episodeTypeSchema = z3.enum([
  "BUILD_TASK",
  "DECISION",
  "HELPER_CONVERSATION",
  "FINAL_UPGRADE"
]);
var episodeStatusSchema = z3.enum([
  "OPEN",
  "PENDING_ANALYSIS",
  "ANALYZED",
  "ANALYSIS_FAILED"
]);
var episodeSchema = z3.strictObject({
  schemaVersion: schemaVersionSchema,
  id: episodeIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  conversationId: conversationIdSchema.optional(),
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  type: episodeTypeSchema,
  status: episodeStatusSchema,
  eventIds: z3.array(eventIdSchema).min(1).max(500),
  conceptCandidates: z3.array(z3.strictObject({ conceptId: conceptIdSchema.optional(), originalExpression: labelSchema })),
  contextReferences: z3.array(z3.union([codeReferenceSchema, diffReferenceSchema, contextualSourceReferenceSchema])),
  startedAt: utcTimestampSchema,
  endedAt: utcTimestampSchema.optional(),
  closeReason: nonEmptyTextSchema.optional(),
  source: z3.strictObject({ kind: z3.literal("CORE") }),
  redactionStatus: redactionStatusSchema
}).superRefine((episode, context) => {
  if (episode.status === "OPEN") {
    if (episode.endedAt !== void 0 || episode.closeReason !== void 0) {
      context.addIssue({
        code: "custom",
        message: "Open Episode must not contain close fields"
      });
    }
    return;
  }
  if (episode.endedAt === void 0 || episode.closeReason === void 0) {
    context.addIssue({
      code: "custom",
      message: "Closed Episode requires endedAt and closeReason"
    });
    return;
  }
  if (Date.parse(episode.endedAt) < Date.parse(episode.startedAt)) {
    context.addIssue({
      code: "custom",
      path: ["endedAt"],
      message: "Episode cannot end before it starts"
    });
  }
});

// packages/contracts/dist/analysis.js
import { z as z5 } from "zod";

// packages/contracts/dist/evidence.js
import { z as z4 } from "zod";
var conceptStateSchema = z4.enum(["OBSERVED", "EXPLAINED", "DEMONSTRATED", "TRANSFERRED"]);
var userUnderstandingStateSchema = z4.enum(["EXPLAINED", "DEMONSTRATED", "TRANSFERRED"]);
var evidenceSignalSchema = z4.enum([
  "QUESTION",
  "REPHRASE",
  "PREDICTION",
  "JUSTIFIED_DECISION",
  "APPLICATION",
  "TRANSFER",
  "CONTRADICTION"
]);
var evidenceStrengthSchema = z4.enum(["NONE", "WEAK", "MEDIUM", "STRONG"]);
var promptDependenceSchema = z4.enum(["INDEPENDENT", "LIGHT_HINT", "DIRECTLY_LED"]);
var canonicalConceptSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  id: conceptIdSchema,
  canonicalName: labelSchema,
  description: nonEmptyTextSchema,
  revision: entityRevisionSchema,
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  source: z4.strictObject({ kind: z4.literal("CORE") })
});
var conceptAliasProposalSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  id: aliasProposalIdSchema,
  correlationId: correlationIdSchema,
  proposedAlias: labelSchema,
  canonicalConceptId: conceptIdSchema.optional(),
  rationale: nonEmptyTextSchema,
  uncertainty: nonEmptyTextSchema.optional(),
  status: z4.enum(["PENDING", "ACCEPTED", "REJECTED"]),
  proposedAt: utcTimestampSchema,
  source: z4.strictObject({ kind: z4.literal("AGENT"), role: z4.literal("EVIDENCE_ANALYST") })
});
var misconceptionProposalSchema = z4.strictObject({
  action: z4.enum(["OPEN", "RESOLVE", "NONE"]),
  issueId: misconceptionIssueIdSchema.optional(),
  summary: nonEmptyTextSchema.optional()
}).superRefine((proposal, context) => {
  if (proposal.action === "OPEN" && proposal.summary === void 0) {
    context.addIssue({
      code: "custom",
      path: ["summary"],
      message: "Opening a misconception issue requires a summary"
    });
  }
  if (proposal.action === "RESOLVE" && proposal.issueId === void 0) {
    context.addIssue({
      code: "custom",
      path: ["issueId"],
      message: "Resolving a misconception issue requires its ID"
    });
  }
  if (proposal.action === "NONE" && (proposal.issueId !== void 0 || proposal.summary !== void 0)) {
    context.addIssue({
      code: "custom",
      message: "NONE misconception proposal must not contain issue details"
    });
  }
});
var evidenceProposalSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  id: evidenceProposalIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  episodeId: episodeIdSchema,
  correlationId: correlationIdSchema,
  concept: z4.strictObject({
    canonicalConceptId: conceptIdSchema.optional(),
    originalExpression: labelSchema,
    proposedCanonicalName: labelSchema
  }),
  signal: evidenceSignalSchema,
  strength: evidenceStrengthSchema,
  promptDependence: promptDependenceSchema,
  userEvidenceSources: z4.array(userEvidenceSourceReferenceSchema).min(1).max(20),
  contextSources: z4.array(contextualSourceReferenceSchema).max(30),
  redactedEvidenceExcerpt: nonEmptyTextSchema,
  rationale: nonEmptyTextSchema,
  uncertainty: nonEmptyTextSchema.optional(),
  maximumSupportedState: userUnderstandingStateSchema.nullable(),
  misconception: misconceptionProposalSchema,
  proposedAt: utcTimestampSchema,
  source: z4.strictObject({ kind: z4.literal("AGENT"), role: z4.literal("EVIDENCE_ANALYST") }),
  redactionStatus: redactionStatusSchema
}).superRefine((proposal, context) => {
  if (proposal.strength === "NONE" && proposal.maximumSupportedState !== null) {
    context.addIssue({
      code: "custom",
      path: ["maximumSupportedState"],
      message: "NONE Evidence cannot support a Concept State"
    });
  }
  if (proposal.promptDependence === "DIRECTLY_LED" && proposal.strength === "STRONG") {
    context.addIssue({
      code: "custom",
      path: ["strength"],
      message: "Directly led Evidence cannot be STRONG"
    });
  }
});
var evidenceProposalDraftSchema = z4.strictObject({
  concept: z4.strictObject({
    canonicalConceptId: conceptIdSchema.optional(),
    originalExpression: labelSchema,
    proposedCanonicalName: labelSchema
  }),
  signal: evidenceSignalSchema,
  strength: evidenceStrengthSchema,
  promptDependence: promptDependenceSchema,
  userEvidenceSources: z4.array(userEvidenceSourceReferenceSchema).min(1).max(20),
  contextSources: z4.array(contextualSourceReferenceSchema).max(30),
  redactedEvidenceExcerpt: nonEmptyTextSchema,
  rationale: nonEmptyTextSchema,
  uncertainty: nonEmptyTextSchema.optional(),
  maximumSupportedState: userUnderstandingStateSchema.nullable(),
  misconception: misconceptionProposalSchema
}).superRefine((proposal, context) => {
  if (proposal.strength === "NONE" && proposal.maximumSupportedState !== null) {
    context.addIssue({
      code: "custom",
      path: ["maximumSupportedState"],
      message: "NONE Evidence cannot support a Concept State"
    });
  }
  if (proposal.promptDependence === "DIRECTLY_LED" && proposal.strength === "STRONG") {
    context.addIssue({
      code: "custom",
      path: ["strength"],
      message: "Directly led Evidence cannot be STRONG"
    });
  }
});
var analystSemanticResultSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  proposals: z4.array(evidenceProposalDraftSchema).max(100),
  noEvidenceReason: nonEmptyTextSchema.optional()
}).superRefine((result, context) => {
  if (result.proposals.length === 0 && result.noEvidenceReason === void 0) {
    context.addIssue({
      code: "custom",
      path: ["noEvidenceReason"],
      message: "An empty Analyst result requires a reason"
    });
  }
  if (result.proposals.length > 0 && result.noEvidenceReason !== void 0) {
    context.addIssue({
      code: "custom",
      path: ["noEvidenceReason"],
      message: "A non-empty Analyst result must not claim no Evidence"
    });
  }
});
var evidenceProposalBatchSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  episodeId: episodeIdSchema,
  correlationId: correlationIdSchema,
  episodeRevision: entityRevisionSchema,
  proposals: z4.array(evidenceProposalSchema).max(100),
  noEvidenceReason: nonEmptyTextSchema.optional(),
  submittedAt: utcTimestampSchema,
  source: z4.strictObject({ kind: z4.literal("AGENT"), role: z4.literal("EVIDENCE_ANALYST") })
}).superRefine((batch, context) => {
  const proposalIds = /* @__PURE__ */ new Set();
  for (const [index, proposal] of batch.proposals.entries()) {
    if (proposal.projectId !== batch.projectId || proposal.episodeId !== batch.episodeId || proposal.correlationId !== batch.correlationId) {
      context.addIssue({
        code: "custom",
        path: ["proposals", index],
        message: "Evidence Proposal must match its batch Episode and correlation ID"
      });
    }
    if (proposalIds.has(proposal.id)) {
      context.addIssue({
        code: "custom",
        path: ["proposals", index, "id"],
        message: "Evidence Proposal IDs must be unique within a batch"
      });
    }
    proposalIds.add(proposal.id);
  }
  if (batch.proposals.length === 0 && batch.noEvidenceReason === void 0) {
    context.addIssue({
      code: "custom",
      path: ["noEvidenceReason"],
      message: "An empty Evidence batch requires a reason"
    });
  }
  if (batch.proposals.length > 0 && batch.noEvidenceReason !== void 0) {
    context.addIssue({
      code: "custom",
      path: ["noEvidenceReason"],
      message: "A non-empty Evidence batch must not claim no Evidence"
    });
  }
});
var evidenceDecisionSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  id: evidenceDecisionIdSchema,
  evidenceProposalId: evidenceProposalIdSchema,
  correlationId: correlationIdSchema,
  outcome: z4.enum(["ACCEPTED", "REJECTED"]),
  reasonCode: z4.enum([
    "VALID_USER_EVIDENCE",
    "INVALID_SCHEMA",
    "AGENT_AUTHORED_SOURCE",
    "INSUFFICIENT_EVIDENCE",
    "OVERSTATED_MAXIMUM_STATE",
    "STALE_EPISODE_REVISION",
    "DUPLICATE_PROPOSAL",
    "INVALID_REFERENCE",
    "INVALID_STATE_TRANSITION",
    "MISCONCEPTION_ISSUE_NOT_FOUND"
  ]),
  explanation: nonEmptyTextSchema,
  decidedAt: utcTimestampSchema,
  source: z4.strictObject({ kind: z4.literal("CORE") })
});
var acceptedEvidenceSchema = z4.discriminatedUnion("kind", [
  z4.strictObject({
    schemaVersion: schemaVersionSchema,
    id: evidenceIdSchema,
    kind: z4.literal("USER_UNDERSTANDING"),
    projectId: projectIdSchema,
    taskId: taskIdSchema.optional(),
    episodeId: episodeIdSchema,
    conceptId: conceptIdSchema,
    correlationId: correlationIdSchema,
    evidenceProposalId: evidenceProposalIdSchema,
    evidenceDecisionId: evidenceDecisionIdSchema,
    signal: z4.enum(["REPHRASE", "PREDICTION", "JUSTIFIED_DECISION", "APPLICATION", "TRANSFER"]),
    strength: evidenceStrengthSchema,
    promptDependence: promptDependenceSchema,
    supportsState: userUnderstandingStateSchema,
    userEvidenceSources: z4.array(userEvidenceSourceReferenceSchema).min(1).max(20),
    acceptedAt: utcTimestampSchema,
    source: z4.strictObject({ kind: z4.literal("CORE") }),
    redactionStatus: redactionStatusSchema
  }),
  z4.strictObject({
    schemaVersion: schemaVersionSchema,
    id: evidenceIdSchema,
    kind: z4.literal("MISCONCEPTION_SIGNAL"),
    projectId: projectIdSchema,
    taskId: taskIdSchema.optional(),
    episodeId: episodeIdSchema,
    conceptId: conceptIdSchema,
    correlationId: correlationIdSchema,
    evidenceProposalId: evidenceProposalIdSchema,
    evidenceDecisionId: evidenceDecisionIdSchema,
    signal: z4.literal("CONTRADICTION"),
    strength: z4.enum(["MEDIUM", "STRONG"]),
    promptDependence: z4.enum(["INDEPENDENT", "LIGHT_HINT"]),
    userEvidenceSources: z4.array(userEvidenceSourceReferenceSchema).min(1).max(20),
    acceptedAt: utcTimestampSchema,
    source: z4.strictObject({ kind: z4.literal("CORE") }),
    redactionStatus: redactionStatusSchema
  }),
  z4.strictObject({
    schemaVersion: schemaVersionSchema,
    id: evidenceIdSchema,
    kind: z4.literal("CONCEPT_OBSERVATION"),
    projectId: projectIdSchema,
    taskId: taskIdSchema.optional(),
    episodeId: episodeIdSchema,
    conceptId: conceptIdSchema,
    correlationId: correlationIdSchema,
    supportsState: z4.literal("OBSERVED"),
    contextSources: z4.array(contextualSourceReferenceSchema).min(1).max(30),
    acceptedAt: utcTimestampSchema,
    source: z4.strictObject({ kind: z4.literal("CORE") }),
    redactionStatus: redactionStatusSchema
  })
]);
var misconceptionIssueSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  id: misconceptionIssueIdSchema,
  conceptId: conceptIdSchema,
  projectId: projectIdSchema,
  openedByEvidenceId: evidenceIdSchema,
  status: z4.enum(["OPEN", "RESOLVED"]),
  summary: nonEmptyTextSchema,
  supportingEvidenceIds: z4.array(evidenceIdSchema).min(1).max(50),
  resolvedByEvidenceId: evidenceIdSchema.optional(),
  openedAt: utcTimestampSchema,
  resolvedAt: utcTimestampSchema.optional(),
  source: z4.strictObject({ kind: z4.literal("CORE") })
}).superRefine((issue, context) => {
  const hasResolution = issue.resolvedByEvidenceId !== void 0 && issue.resolvedAt !== void 0;
  if (issue.status === "RESOLVED" && !hasResolution) {
    context.addIssue({
      code: "custom",
      message: "Resolved issue requires resolution Evidence and time"
    });
  }
  if (issue.status === "OPEN" && (issue.resolvedByEvidenceId !== void 0 || issue.resolvedAt !== void 0)) {
    context.addIssue({ code: "custom", message: "Open issue must not contain resolution fields" });
  }
});
var conceptStateSnapshotSchema = z4.strictObject({
  conceptId: conceptIdSchema,
  state: conceptStateSchema,
  acceptedEvidenceIds: z4.array(evidenceIdSchema).min(1).max(500),
  reducerVersion: semanticVersionSchema,
  revision: entityRevisionSchema,
  updatedAt: utcTimestampSchema
});
var conceptLedgerEntrySchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  id: conceptLedgerIdSchema,
  concept: canonicalConceptSchema,
  acceptedAliases: z4.array(labelSchema).max(100),
  state: conceptStateSnapshotSchema,
  openIssues: z4.array(misconceptionIssueSchema).max(100),
  relatedProjectIds: z4.array(projectIdSchema).min(1).max(100),
  relatedTaskIds: z4.array(taskIdSchema).max(500),
  revision: entityRevisionSchema,
  updatedAt: utcTimestampSchema,
  source: z4.strictObject({ kind: z4.literal("CORE") })
}).superRefine((entry, context) => {
  if (entry.state.conceptId !== entry.concept.id) {
    context.addIssue({
      code: "custom",
      path: ["state", "conceptId"],
      message: "Concept State must belong to the Ledger concept"
    });
  }
  for (const [index, issue] of entry.openIssues.entries()) {
    if (issue.conceptId !== entry.concept.id || issue.status !== "OPEN") {
      context.addIssue({
        code: "custom",
        path: ["openIssues", index],
        message: "Ledger openIssues must be open and belong to the Ledger concept"
      });
    }
  }
});
var evidenceBatchApplicationResultSchema = z4.strictObject({
  schemaVersion: schemaVersionSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  outcomes: z4.array(z4.strictObject({
    proposalId: evidenceProposalIdSchema,
    decision: evidenceDecisionSchema,
    acceptedEvidenceId: evidenceIdSchema.optional(),
    conceptId: conceptIdSchema.optional(),
    ledgerRevision: entityRevisionSchema.optional()
  })).max(100)
});

// packages/contracts/dist/analysis.js
var ANALYSIS_MAX_ATTEMPTS = 2;
var ANALYSIS_SOFT_TIMEOUT_MS = 3e4;
var analysisJobStatusSchema = z5.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]);
var analysisFailureSchema = z5.strictObject({
  code: z5.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/),
  message: nonEmptyTextSchema,
  retryable: z5.boolean()
});
var analysisResultSummarySchema = z5.strictObject({
  proposalCount: z5.int().min(0).max(100),
  acceptedCount: z5.int().min(0).max(100),
  rejectedCount: z5.int().min(0).max(100),
  noEvidenceReason: nonEmptyTextSchema.optional()
}).superRefine((summary, context) => {
  if (summary.acceptedCount + summary.rejectedCount !== summary.proposalCount) {
    context.addIssue({ code: "custom", message: "Analysis result counts must balance" });
  }
  if (summary.proposalCount === 0 && summary.noEvidenceReason === void 0) {
    context.addIssue({ code: "custom", message: "Empty analysis requires a reason" });
  }
  if (summary.proposalCount > 0 && summary.noEvidenceReason !== void 0) {
    context.addIssue({ code: "custom", message: "Non-empty analysis cannot claim no Evidence" });
  }
});
var analysisJobSchema = z5.strictObject({
  schemaVersion: schemaVersionSchema,
  id: analysisJobIdSchema,
  projectId: projectIdSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  status: analysisJobStatusSchema,
  attempt: z5.int().min(0).max(ANALYSIS_MAX_ATTEMPTS),
  maxAttempts: z5.literal(ANALYSIS_MAX_ATTEMPTS),
  timeoutMs: z5.literal(ANALYSIS_SOFT_TIMEOUT_MS),
  runtimeHandle: shortTextSchema.optional(),
  deadlineAt: utcTimestampSchema.optional(),
  lastFailure: analysisFailureSchema.optional(),
  resultSummary: analysisResultSummarySchema.optional(),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  startedAt: utcTimestampSchema.optional(),
  completedAt: utcTimestampSchema.optional(),
  source: z5.strictObject({ kind: z5.literal("CORE") }),
  redactionStatus: redactionStatusSchema
}).superRefine((job, context) => {
  if (job.status === "RUNNING") {
    if (job.attempt < 1 || job.startedAt === void 0 || job.deadlineAt === void 0) {
      context.addIssue({
        code: "custom",
        message: "Running Analysis Job requires an attempt, start time and deadline"
      });
    }
    if (job.completedAt !== void 0) {
      context.addIssue({ code: "custom", message: "Running Analysis Job cannot be completed" });
    }
    if (job.resultSummary !== void 0) {
      context.addIssue({
        code: "custom",
        message: "Running Analysis Job cannot have a result summary"
      });
    }
    return;
  }
  if (job.deadlineAt !== void 0 || job.runtimeHandle !== void 0) {
    context.addIssue({
      code: "custom",
      message: "Only a running Analysis Job may retain runtime attempt fields"
    });
  }
  if (job.status === "SUCCEEDED" || job.status === "FAILED") {
    if (job.attempt < 1 || job.completedAt === void 0) {
      context.addIssue({
        code: "custom",
        message: "Terminal Analysis Job requires an attempted and completed result"
      });
    }
  } else if (job.completedAt !== void 0) {
    context.addIssue({ code: "custom", message: "Pending Analysis Job cannot be completed" });
  }
  if (job.status === "FAILED" && job.lastFailure === void 0) {
    context.addIssue({ code: "custom", message: "Failed Analysis Job requires failure details" });
  }
  if (job.status === "SUCCEEDED" && job.resultSummary === void 0) {
    context.addIssue({
      code: "custom",
      message: "Succeeded Analysis Job requires a result summary"
    });
  }
  if (job.status !== "SUCCEEDED" && job.resultSummary !== void 0) {
    context.addIssue({
      code: "custom",
      message: "Only a succeeded Analysis Job has a result summary"
    });
  }
});
var analysisRuntimeMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: z5.strictObject({ kind: z5.literal("KIRO_ADAPTER") })
};
var analysisClaimJobCommandSchema = z5.strictObject({
  ...analysisRuntimeMetadata,
  kind: z5.literal("ANALYSIS_CLAIM_JOB"),
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  runtimeHandle: shortTextSchema
});
var analysisListPendingQuerySchema = z5.strictObject({
  ...analysisRuntimeMetadata,
  kind: z5.literal("ANALYSIS_LIST_PENDING"),
  limit: z5.int().min(1).max(100)
});
var analysisRecoverExpiredCommandSchema = z5.strictObject({
  ...analysisRuntimeMetadata,
  kind: z5.literal("ANALYSIS_RECOVER_EXPIRED"),
  limit: z5.int().min(1).max(100)
});
var analysisFailAttemptCommandSchema = z5.strictObject({
  ...analysisRuntimeMetadata,
  kind: z5.literal("ANALYSIS_FAIL_ATTEMPT"),
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  attempt: z5.int().min(1).max(ANALYSIS_MAX_ATTEMPTS),
  failure: analysisFailureSchema
});
var analysisSubmitResultCommandSchema = z5.strictObject({
  ...analysisRuntimeMetadata,
  kind: z5.literal("ANALYSIS_SUBMIT_RESULT"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  attempt: z5.int().min(1).max(ANALYSIS_MAX_ATTEMPTS),
  result: analystSemanticResultSchema
});
var analysisRuntimeRequestSchema = z5.discriminatedUnion("kind", [
  analysisListPendingQuerySchema,
  analysisRecoverExpiredCommandSchema,
  analysisClaimJobCommandSchema,
  analysisFailAttemptCommandSchema,
  analysisSubmitResultCommandSchema
]);

// packages/contracts/dist/agent-contracts.js
import { z as z10 } from "zod";

// packages/contracts/dist/build.js
import { z as z6 } from "zod";
var builderTaskStatusSchema = z6.enum([
  "PENDING",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);
var acceptanceCriterionSchema = z6.strictObject({
  key: z6.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  description: nonEmptyTextSchema
});
var builderTaskSchema = z6.strictObject({
  schemaVersion: schemaVersionSchema,
  id: taskIdSchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  learningSpecRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  title: labelSchema,
  productGoal: nonEmptyTextSchema,
  requirements: z6.array(nonEmptyTextSchema).min(1).max(40),
  acceptanceCriteria: z6.array(acceptanceCriterionSchema).min(1).max(40),
  expectedConcepts: z6.array(labelSchema).max(20),
  excludedWork: z6.array(shortTextSchema).max(30),
  prerequisiteTaskIds: z6.array(taskIdSchema).max(20),
  expectedDecisionCategories: z6.array(decisionCategorySchema).max(10),
  finalUpgrade: z6.strictObject({
    sourceTaskId: taskIdSchema,
    personalizationTraceId: personalizationTraceIdSchema,
    userGoal: nonEmptyTextSchema
  }).optional(),
  sequence: z6.int().positive(),
  status: builderTaskStatusSchema,
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  source: z6.strictObject({ kind: z6.literal("CORE") }),
  redactionStatus: redactionStatusSchema
});
var buildCheckpointSchema = z6.enum([
  "TASK_STARTED",
  "DIRECTION_CHANGED",
  "CONCEPT_INTRODUCED",
  "DECISION_REQUIRED",
  "PLAN_CHANGED_AFTER_ERROR",
  "VALIDATION_STARTED",
  "TASK_COMPLETED"
]);
var liveProjectContextSchema = z6.strictObject({
  schemaVersion: schemaVersionSchema,
  id: liveContextIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  contextVersion: entityRevisionSchema,
  expectedPreviousVersion: expectedRevisionSchema,
  checkpoint: buildCheckpointSchema,
  stage: labelSchema,
  currentGoal: nonEmptyTextSchema,
  recentChanges: z6.array(shortTextSchema).max(30),
  activeDecisionIds: z6.array(decisionIdSchema).max(10),
  activeConceptNames: z6.array(labelSchema).max(20),
  relatedFiles: z6.array(codeReferenceSchema).max(30),
  nextActions: z6.array(shortTextSchema).max(20),
  blockingReason: nonEmptyTextSchema.optional(),
  updatedAt: utcTimestampSchema,
  source: z6.strictObject({ kind: z6.literal("AGENT"), role: z6.literal("BUILDER") }),
  redactionStatus: redactionStatusSchema
}).refine((context) => context.contextVersion === context.expectedPreviousVersion + 1, {
  path: ["contextVersion"],
  message: "Live Context version must immediately follow expectedPreviousVersion"
});
var contextRefreshRequestStatusSchema = z6.enum(["PENDING", "FULFILLED"]);
var contextRefreshRequestSchema = z6.strictObject({
  schemaVersion: schemaVersionSchema,
  id: contextRefreshRequestIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  observedContextVersion: entityRevisionSchema.optional(),
  reason: nonEmptyTextSchema,
  status: contextRefreshRequestStatusSchema,
  requestedAt: utcTimestampSchema,
  fulfilledAt: utcTimestampSchema.optional(),
  fulfilledByContextVersion: entityRevisionSchema.optional(),
  source: z6.strictObject({ kind: z6.literal("AGENT"), role: z6.literal("HELPER") }),
  redactionStatus: redactionStatusSchema
}).superRefine((request, context) => {
  if (request.revision === 1 && request.status !== "PENDING" || request.status === "FULFILLED" && request.revision < 2) {
    context.addIssue({
      code: "custom",
      path: ["revision"],
      message: "Context refresh must begin pending at revision 1 before fulfillment"
    });
  }
  const hasFulfillment = request.fulfilledAt !== void 0 || request.fulfilledByContextVersion !== void 0;
  if (request.status === "PENDING" && hasFulfillment) {
    context.addIssue({
      code: "custom",
      message: "Pending Context refresh request must not contain fulfillment fields"
    });
  }
  if (request.status === "FULFILLED" && (request.fulfilledAt === void 0 || request.fulfilledByContextVersion === void 0)) {
    context.addIssue({
      code: "custom",
      message: "Fulfilled Context refresh request requires fulfillment fields"
    });
  }
  if (request.fulfilledAt !== void 0 && Date.parse(request.fulfilledAt) < Date.parse(request.requestedAt)) {
    context.addIssue({
      code: "custom",
      path: ["fulfilledAt"],
      message: "Context refresh request cannot be fulfilled before it was requested"
    });
  }
  if (request.fulfilledByContextVersion !== void 0 && request.observedContextVersion !== void 0 && request.fulfilledByContextVersion <= request.observedContextVersion) {
    context.addIssue({
      code: "custom",
      path: ["fulfilledByContextVersion"],
      message: "Fulfillment must reference a newer Context version"
    });
  }
});
var builderUpdateLiveContextToolInputSchema = z6.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedPreviousVersion: expectedRevisionSchema,
  checkpoint: buildCheckpointSchema,
  stage: labelSchema,
  currentGoal: nonEmptyTextSchema,
  recentChanges: z6.array(shortTextSchema).max(30),
  activeDecisionIds: z6.array(decisionIdSchema).max(10),
  activeConceptNames: z6.array(labelSchema).max(20),
  relatedFiles: z6.array(codeReferenceSchema).max(30),
  nextActions: z6.array(shortTextSchema).max(20),
  blockingReason: nonEmptyTextSchema.optional()
});
var decisionOptionSchema = z6.strictObject({
  id: decisionOptionIdSchema,
  label: labelSchema,
  description: nonEmptyTextSchema,
  impacts: z6.array(shortTextSchema).min(1).max(12),
  tradeoffs: z6.array(shortTextSchema).max(12)
});
var decisionOptionDraftSchema = z6.strictObject({
  key: z6.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  label: labelSchema,
  description: nonEmptyTextSchema,
  impacts: z6.array(shortTextSchema).min(1).max(12),
  tradeoffs: z6.array(shortTextSchema).max(12)
});
var decisionRequestDraftSchema = z6.strictObject({
  category: decisionCategorySchema,
  question: nonEmptyTextSchema,
  reasonRequiredNow: nonEmptyTextSchema,
  options: z6.array(decisionOptionDraftSchema).min(2).max(6),
  recommendedOptionKey: z6.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  recommendationRationale: nonEmptyTextSchema,
  relatedConceptNames: z6.array(labelSchema).max(12),
  sourceReferences: z6.array(contextualSourceReferenceSchema).max(30),
  independentWorkCanContinue: z6.boolean()
}).superRefine((request, context) => {
  const optionKeys = new Set(request.options.map((option) => option.key));
  if (optionKeys.size !== request.options.length) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Decision option keys must be unique"
    });
  }
  if (!optionKeys.has(request.recommendedOptionKey)) {
    context.addIssue({
      code: "custom",
      path: ["recommendedOptionKey"],
      message: "Recommended option key must reference one of the Decision options"
    });
  }
});
var decisionContextDraftSchema = z6.strictObject({
  stage: labelSchema,
  currentGoal: nonEmptyTextSchema,
  recentChanges: z6.array(shortTextSchema).max(30),
  activeConceptNames: z6.array(labelSchema).max(20),
  relatedFiles: z6.array(codeReferenceSchema).max(30),
  nextActions: z6.array(shortTextSchema).max(20),
  blockingReason: nonEmptyTextSchema.optional()
});
var builderRequestDecisionToolInputSchema = z6.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedTaskRevision: entityRevisionSchema,
  expectedContextVersion: entityRevisionSchema,
  decision: decisionRequestDraftSchema,
  context: decisionContextDraftSchema
}).refine((input) => input.decision.independentWorkCanContinue || input.context.blockingReason !== void 0, {
  path: ["context", "blockingReason"],
  message: "A blocking Decision requires a blocking reason"
});
var decisionRequestSchema = z6.strictObject({
  schemaVersion: schemaVersionSchema,
  id: decisionIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  contextVersion: entityRevisionSchema,
  category: decisionCategorySchema,
  question: nonEmptyTextSchema,
  reasonRequiredNow: nonEmptyTextSchema,
  options: z6.array(decisionOptionSchema).min(2).max(6),
  recommendedOptionId: decisionOptionIdSchema,
  recommendationRationale: nonEmptyTextSchema,
  relatedConceptNames: z6.array(labelSchema).max(12),
  sourceReferences: z6.array(contextualSourceReferenceSchema).max(30),
  independentWorkCanContinue: z6.boolean(),
  requestedAt: utcTimestampSchema,
  source: z6.strictObject({ kind: z6.literal("AGENT"), role: z6.literal("BUILDER") }),
  redactionStatus: redactionStatusSchema
}).superRefine((request, context) => {
  const optionIds = new Set(request.options.map((option) => option.id));
  if (optionIds.size !== request.options.length) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Decision option IDs must be unique"
    });
  }
  if (!optionIds.has(request.recommendedOptionId)) {
    context.addIssue({
      code: "custom",
      path: ["recommendedOptionId"],
      message: "Recommended option must reference one of the Decision options"
    });
  }
});
var decisionResolutionSchema = z6.strictObject({
  schemaVersion: schemaVersionSchema,
  id: decisionResolutionIdSchema,
  decisionId: decisionIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  expectedContextVersion: entityRevisionSchema,
  selectionKind: z6.enum(["OPTION", "RECOMMENDATION", "CUSTOM"]),
  selectedOptionId: decisionOptionIdSchema.optional(),
  customProposal: nonEmptyTextSchema.optional(),
  rationale: nonEmptyTextSchema.optional(),
  helperUsed: z6.boolean(),
  resolvedAt: utcTimestampSchema,
  source: z6.strictObject({ kind: z6.literal("USER") }),
  redactionStatus: redactionStatusSchema
}).superRefine((resolution, context) => {
  if (resolution.selectionKind === "CUSTOM") {
    if (resolution.customProposal === void 0 || resolution.selectedOptionId !== void 0) {
      context.addIssue({
        code: "custom",
        path: ["customProposal"],
        message: "CUSTOM resolution requires only a custom proposal"
      });
    }
    return;
  }
  if (resolution.selectedOptionId === void 0 || resolution.customProposal !== void 0) {
    context.addIssue({
      code: "custom",
      path: ["selectedOptionId"],
      message: `${resolution.selectionKind} resolution requires only a selected option`
    });
  }
});
var decisionApplicationSchema = z6.strictObject({
  schemaVersion: schemaVersionSchema,
  id: decisionApplicationIdSchema,
  decisionId: decisionIdSchema,
  resolutionId: decisionResolutionIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  appliedResult: nonEmptyTextSchema,
  sourceReferences: z6.array(contextualSourceReferenceSchema).max(30),
  appliedAt: utcTimestampSchema,
  source: z6.strictObject({ kind: z6.literal("AGENT"), role: z6.literal("BUILDER") }),
  redactionStatus: redactionStatusSchema
});
var builderApplyDecisionToolInputSchema = z6.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  decisionId: decisionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedTaskRevision: entityRevisionSchema,
  expectedContextVersion: entityRevisionSchema,
  appliedResult: nonEmptyTextSchema,
  sourceReferences: z6.array(contextualSourceReferenceSchema).max(30),
  context: decisionContextDraftSchema.omit({ blockingReason: true })
});
var validationResultSchema = z6.strictObject({
  name: labelSchema,
  status: z6.enum(["PASSED", "FAILED", "NOT_RUN"]),
  summary: nonEmptyTextSchema,
  reference: testResultReferenceSchema.optional()
});
var conceptUsageReportSchema = z6.strictObject({
  conceptName: labelSchema,
  scope: learningScopeCategorySchema,
  importance: z6.enum(["CORE", "SUPPORTING"]),
  usageReason: nonEmptyTextSchema,
  codeReferences: z6.array(codeReferenceSchema).max(20)
});
var taskCompletionReportSchema = z6.strictObject({
  schemaVersion: schemaVersionSchema,
  id: completionReportIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  expectedTaskRevision: entityRevisionSchema,
  implementedFeatures: z6.array(nonEmptyTextSchema).min(1).max(40),
  acceptanceResults: z6.array(z6.strictObject({
    criterionKey: z6.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    status: z6.enum(["PASSED", "FAILED"]),
    evidence: z6.array(contextualSourceReferenceSchema).max(20)
  })),
  validationResults: z6.array(validationResultSchema).max(40),
  conceptUsage: z6.array(conceptUsageReportSchema).max(30),
  appliedDecisionIds: z6.array(decisionIdSchema).max(20),
  codeReferences: z6.array(codeReferenceSchema).max(50),
  diffReferences: z6.array(diffReferenceSchema).max(20),
  specDeviations: z6.array(nonEmptyTextSchema).max(20),
  remainingIssues: z6.array(nonEmptyTextSchema).max(30),
  limitations: z6.array(nonEmptyTextSchema).max(30),
  completedAt: utcTimestampSchema,
  source: z6.strictObject({ kind: z6.literal("AGENT"), role: z6.literal("BUILDER") }),
  redactionStatus: redactionStatusSchema
});
var builderCompleteTaskToolInputSchema = z6.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedTaskRevision: entityRevisionSchema,
  report: taskCompletionReportSchema.omit({
    schemaVersion: true,
    id: true,
    projectId: true,
    taskId: true,
    correlationId: true,
    expectedTaskRevision: true,
    completedAt: true,
    source: true,
    redactionStatus: true
  })
});

// packages/contracts/dist/discovery.js
import { z as z7 } from "zod";
var projectStatusSchema = z7.enum(["DISCOVERY", "SPEC_REVIEW", "BUILDING", "COMPLETED"]);
var projectSchema = z7.strictObject({
  schemaVersion: schemaVersionSchema,
  id: projectIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  title: labelSchema,
  learningGoal: shortTextSchema,
  status: projectStatusSchema,
  generatedWorkspacePath: relativePosixPathSchema.optional(),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  source: actorSchema,
  redactionStatus: redactionStatusSchema
});
var learnerLevelSchema = z7.enum(["NEW", "BEGINNER", "FAMILIAR", "UNSPECIFIED"]);
var discoveryInputSchema = z7.strictObject({
  learningGoal: shortTextSchema,
  personalNeed: nonEmptyTextSchema.optional(),
  recentFriction: nonEmptyTextSchema.optional(),
  interestAreas: z7.array(labelSchema).max(12).optional(),
  currentLevel: learnerLevelSchema.optional(),
  freeContext: nonEmptyTextSchema.optional()
});
var discoverySessionStatusSchema = z7.enum(["ACTIVE", "SELECTED", "ABANDONED"]);
var discoverySessionSchema = z7.strictObject({
  schemaVersion: schemaVersionSchema,
  id: discoverySessionIdSchema,
  projectId: projectIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  input: discoveryInputSchema,
  status: discoverySessionStatusSchema,
  openedAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  closedAt: utcTimestampSchema.optional(),
  source: actorSchema,
  redactionStatus: redactionStatusSchema
});
var candidateGenerationTagSchema = z7.enum(["DIRECT", "EXPAND", "DISCOVER", "UPGRADE"]);
var candidateEvaluationCriterionSchema = z7.enum([
  "CONCEPT_NECESSITY",
  "PERSONAL_UTILITY",
  "ADOPTION_FEASIBILITY",
  "LEARNER_FIT",
  "SCOPE_FEASIBILITY",
  "ADJACENT_COMPLEXITY",
  "DEPLOYABILITY",
  "DISTINCTIVENESS"
]);
var ALL_CANDIDATE_EVALUATION_CRITERIA = candidateEvaluationCriterionSchema.options;
var candidateEvaluationSchema = z7.array(z7.strictObject({
  criterion: candidateEvaluationCriterionSchema,
  assessment: z7.enum(["POSITIVE", "MIXED", "CONCERN"]),
  rationale: nonEmptyTextSchema
})).length(ALL_CANDIDATE_EVALUATION_CRITERIA.length).superRefine((items, context) => {
  const criteria = new Set(items.map((item) => item.criterion));
  for (const criterion of ALL_CANDIDATE_EVALUATION_CRITERIA) {
    if (!criteria.has(criterion)) {
      context.addIssue({
        code: "custom",
        message: `Missing candidate evaluation criterion ${criterion}`
      });
    }
  }
  if (criteria.size !== items.length) {
    context.addIssue({ code: "custom", message: "Candidate evaluation criteria must be unique" });
  }
});
var candidateRevisionReferenceSchema = z7.strictObject({
  candidateId: candidateIdSchema,
  revision: entityRevisionSchema
});
var candidateScopeSuggestionSchema = z7.strictObject({
  learnerFocus: z7.array(shortTextSchema).max(20),
  agentSupport: z7.array(shortTextSchema).max(20),
  excluded: z7.array(shortTextSchema).max(20)
});
var projectCandidateContentShape = {
  title: labelSchema,
  summary: shortTextSchema,
  targetUsers: z7.array(shortTextSchema).min(1).max(8),
  coreInteraction: nonEmptyTextSchema,
  usageMoment: nonEmptyTextSchema,
  appeal: nonEmptyTextSchema,
  personalNeedRelationship: nonEmptyTextSchema.optional(),
  technologyNecessity: nonEmptyTextSchema,
  coreConcepts: z7.array(labelSchema).min(1).max(12),
  mvpFeatures: z7.array(shortTextSchema).min(1).max(20),
  suggestedScope: candidateScopeSuggestionSchema,
  risks: z7.array(shortTextSchema).max(12).optional(),
  generationTags: z7.array(candidateGenerationTagSchema).min(1).max(4),
  evaluation: candidateEvaluationSchema.optional()
};
var candidatePreviewContentShape = {
  title: labelSchema,
  summary: shortTextSchema,
  coreInteraction: nonEmptyTextSchema,
  appeal: nonEmptyTextSchema,
  technologyNecessity: nonEmptyTextSchema,
  generationTags: z7.array(candidateGenerationTagSchema).min(1).max(4)
};
var candidatePreviewDraftSchema = z7.strictObject(candidatePreviewContentShape);
var candidatePreviewSchema = z7.strictObject({
  candidateId: candidateIdSchema,
  position: z7.int().min(1).max(10),
  ...candidatePreviewContentShape
});
var candidatePreviewRoundSchema = z7.strictObject({
  schemaVersion: schemaVersionSchema,
  id: candidatePreviewRoundIdSchema,
  finalRoundId: candidateRoundIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  inputSnapshot: discoveryInputSchema,
  previews: z7.array(candidatePreviewSchema).length(10),
  generationRationale: nonEmptyTextSchema,
  createdAt: utcTimestampSchema,
  source: z7.strictObject({ kind: z7.literal("AGENT"), role: z7.literal("DISCOVERY") }),
  redactionStatus: redactionStatusSchema
}).superRefine((round, context) => {
  const candidateIds = round.previews.map((preview) => preview.candidateId);
  if (new Set(candidateIds).size !== candidateIds.length) {
    context.addIssue({
      code: "custom",
      path: ["previews"],
      message: "Candidate preview identities must be unique"
    });
  }
  const positions = round.previews.map((preview) => preview.position).sort((a, b) => a - b);
  if (positions.some((position, index) => position !== index + 1)) {
    context.addIssue({
      code: "custom",
      path: ["previews"],
      message: "Candidate preview positions must contain every position from 1 through 10"
    });
  }
});
var projectCandidateRevisionSchema = z7.strictObject({
  schemaVersion: schemaVersionSchema,
  id: candidateIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  parentRevisions: z7.array(candidateRevisionReferenceSchema).max(8),
  ...projectCandidateContentShape,
  createdAt: utcTimestampSchema,
  source: z7.strictObject({ kind: z7.literal("AGENT"), role: z7.literal("DISCOVERY") }),
  redactionStatus: redactionStatusSchema
}).superRefine((candidate, context) => {
  if (candidate.revision === 1 && candidate.parentRevisions.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["parentRevisions"],
      message: "First candidate revision must not have parents"
    });
  }
  if (candidate.revision > 1 && candidate.parentRevisions.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["parentRevisions"],
      message: "Later candidate revisions require lineage"
    });
  }
  const parentKeys = /* @__PURE__ */ new Set();
  for (const [index, parent] of candidate.parentRevisions.entries()) {
    const key = `${parent.candidateId}:${parent.revision}`;
    if (parentKeys.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["parentRevisions", index],
        message: "Candidate lineage references must be unique"
      });
    }
    parentKeys.add(key);
    if (parent.candidateId === candidate.id && parent.revision >= candidate.revision) {
      context.addIssue({
        code: "custom",
        path: ["parentRevisions", index],
        message: "Candidate cannot descend from its current or future revision"
      });
    }
  }
});
var candidateDiversityCheckSchema = z7.strictObject({
  dimensionsReviewed: z7.array(z7.enum(["PROBLEM_DOMAIN", "TARGET_USER", "CORE_INTERACTION", "DATA_SHAPE", "USER_APPEAL"])),
  modeCollapseDetected: z7.boolean(),
  rationale: nonEmptyTextSchema
});
var candidateDraftSchema = z7.strictObject({
  lineage: z7.discriminatedUnion("kind", [
    z7.strictObject({ kind: z7.literal("NEW") }),
    z7.strictObject({
      kind: z7.literal("REVISION"),
      candidateId: candidateIdSchema,
      revision: entityRevisionSchema,
      parentRevisions: z7.array(candidateRevisionReferenceSchema).min(1).max(8)
    })
  ]),
  ...projectCandidateContentShape
});
var discoverySubmitCandidateRoundToolInputSchema = z7.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  appliedFeedbackIds: z7.array(feedbackIdSchema).max(100),
  carriedCandidates: z7.array(candidateRevisionReferenceSchema).max(30),
  candidates: z7.array(candidateDraftSchema).max(30),
  generationRationale: nonEmptyTextSchema,
  diversityCheck: candidateDiversityCheckSchema
});
var discoverySubmitCandidateMergeToolInputSchema = discoverySubmitCandidateRoundToolInputSchema.omit({ appliedFeedbackIds: true, carriedCandidates: true, candidates: true }).extend({ candidate: candidateDraftSchema.omit({ lineage: true }) });
var discoverySubmitCandidatePreviewsToolInputSchema = z7.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previews: z7.array(candidatePreviewDraftSchema).length(10),
  generationRationale: nonEmptyTextSchema
});
var candidateEnrichmentBatchSchema = z7.enum(["FIRST", "SECOND", "SELECTED"]);
var candidateEnrichmentDraftSchema = z7.strictObject({
  candidateId: candidateIdSchema,
  ...projectCandidateContentShape
});
var candidateEnrichmentSchema = z7.strictObject({
  schemaVersion: schemaVersionSchema,
  previewRoundId: candidatePreviewRoundIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  candidate: projectCandidateRevisionSchema,
  createdAt: utcTimestampSchema,
  source: z7.strictObject({ kind: z7.literal("AGENT"), role: z7.literal("DISCOVERY") }),
  redactionStatus: redactionStatusSchema
});
var discoverySubmitCandidateEnrichmentsToolInputBaseSchema = z7.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previewRoundId: candidatePreviewRoundIdSchema,
  batch: candidateEnrichmentBatchSchema,
  candidates: z7.array(candidateEnrichmentDraftSchema).min(1).max(10)
});
var discoverySubmitCandidateEnrichmentsToolInputSchema = discoverySubmitCandidateEnrichmentsToolInputBaseSchema.superRefine((input, context) => {
  if (input.batch !== "SELECTED" && input.candidates.length !== 5) {
    context.addIssue({
      code: "custom",
      path: ["candidates"],
      message: `${input.batch} enrichment must contain exactly five candidates`
    });
  }
});
var candidateRoundSchema = z7.strictObject({
  schemaVersion: schemaVersionSchema,
  id: candidateRoundIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  roundIndex: entityRevisionSchema,
  inputSnapshot: discoveryInputSchema,
  appliedFeedbackIds: z7.array(feedbackIdSchema).max(100),
  candidates: z7.array(candidateRevisionReferenceSchema).min(1).max(30),
  generationRationale: nonEmptyTextSchema,
  diversityCheck: candidateDiversityCheckSchema,
  createdAt: utcTimestampSchema,
  source: z7.strictObject({ kind: z7.literal("AGENT"), role: z7.literal("DISCOVERY") }),
  redactionStatus: redactionStatusSchema
}).superRefine((round, context) => {
  if (new Set(round.appliedFeedbackIds).size !== round.appliedFeedbackIds.length) {
    context.addIssue({
      code: "custom",
      path: ["appliedFeedbackIds"],
      message: "Applied Discovery Feedback IDs must be unique"
    });
  }
  const references = round.candidates.map((candidate) => `${candidate.candidateId}:${candidate.revision}`);
  if (new Set(references).size !== references.length) {
    context.addIssue({
      code: "custom",
      path: ["candidates"],
      message: "Candidate Round references must be unique"
    });
  }
});
var discoveryFeedbackIntentSchema = z7.enum([
  "PIN",
  "REJECT",
  "MERGE",
  "REVISE",
  "SHRINK",
  "EXPAND",
  "REGENERATE",
  "MORE",
  "SELECT"
]);
var discoveryFeedbackSchema = z7.strictObject({
  schemaVersion: schemaVersionSchema,
  id: feedbackIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  roundId: candidateRoundIdSchema,
  correlationId: correlationIdSchema,
  intent: discoveryFeedbackIntentSchema,
  targets: z7.array(candidateRevisionReferenceSchema).max(8),
  message: nonEmptyTextSchema.optional(),
  createdAt: utcTimestampSchema,
  source: z7.strictObject({ kind: z7.literal("USER") }),
  redactionStatus: redactionStatusSchema
}).superRefine((feedback, context) => {
  if (feedback.intent === "MERGE" && feedback.targets.length < 2) {
    context.addIssue({
      code: "custom",
      path: ["targets"],
      message: "MERGE feedback requires at least two candidate revisions"
    });
  }
  if (feedback.intent === "SELECT" && feedback.targets.length !== 1) {
    context.addIssue({
      code: "custom",
      path: ["targets"],
      message: "SELECT feedback requires exactly one candidate revision"
    });
  }
  if (!["REGENERATE", "MORE"].includes(feedback.intent) && feedback.targets.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["targets"],
      message: `${feedback.intent} feedback requires a candidate revision`
    });
  }
  if (feedback.intent === "MORE" && feedback.targets.length !== 0) {
    context.addIssue({
      code: "custom",
      path: ["targets"],
      message: "MORE feedback must not target an existing candidate revision"
    });
  }
  if (["REVISE", "SHRINK", "EXPAND"].includes(feedback.intent) && feedback.targets.length !== 1) {
    context.addIssue({
      code: "custom",
      path: ["targets"],
      message: `${feedback.intent} feedback requires exactly one candidate revision`
    });
  }
  const targetKeys = feedback.targets.map((target) => `${target.candidateId}:${target.revision}`);
  if (new Set(targetKeys).size !== targetKeys.length) {
    context.addIssue({
      code: "custom",
      path: ["targets"],
      message: "Discovery Feedback targets must be unique"
    });
  }
});

// packages/contracts/dist/learning-spec.js
import { z as z8 } from "zod";
var learningScopeItemSchema = z8.strictObject({
  category: learningScopeCategorySchema,
  title: labelSchema,
  rationale: nonEmptyTextSchema,
  conceptNames: z8.array(labelSchema).max(12)
});
var expectedDecisionAreaSchema = z8.strictObject({
  category: decisionCategorySchema,
  description: nonEmptyTextSchema,
  whyUserInputMatters: nonEmptyTextSchema
});
var learningSpecStatusSchema = z8.enum(["DRAFT", "CONFIRMED", "SUPERSEDED"]);
var learningSpecConfirmationSchema = z8.strictObject({
  confirmedAt: utcTimestampSchema,
  confirmedBy: z8.strictObject({ kind: z8.literal("USER") })
});
var learningSpecContentShape = {
  productPurpose: nonEmptyTextSchema,
  targetUsers: z8.array(shortTextSchema).min(1).max(8),
  primaryUsageMoment: nonEmptyTextSchema,
  successMoment: nonEmptyTextSchema,
  mvpFeatures: z8.array(shortTextSchema).min(1).max(30),
  scope: z8.array(learningScopeItemSchema).min(1).max(60),
  expectedDecisions: z8.array(expectedDecisionAreaSchema).max(20),
  runtimeConstraint: z8.literal("TYPESCRIPT"),
  deploymentConstraints: z8.array(shortTextSchema).min(1).max(12)
};
function requireAllScopeCategories(value, context) {
  const categories = new Set(value.scope.map((item) => item.category));
  for (const category of learningScopeCategorySchema.options) {
    if (!categories.has(category)) {
      context.addIssue({
        code: "custom",
        path: ["scope"],
        message: `Learning Spec must represent ${category}`,
        input: value
      });
    }
  }
  if (!value.scope.some((item) => item.category === "LEARNER_FOCUS" && item.conceptNames.length > 0)) {
    context.addIssue({
      code: "custom",
      path: ["scope"],
      message: "Learning Spec requires at least one Learner Focus concept",
      input: value
    });
  }
  const categoryByConcept = /* @__PURE__ */ new Map();
  for (const item of value.scope) {
    for (const conceptName of item.conceptNames) {
      const key = conceptName.trim().toLocaleLowerCase("en-US");
      const existingCategory = categoryByConcept.get(key);
      if (existingCategory !== void 0 && existingCategory !== item.category) {
        context.addIssue({
          code: "custom",
          path: ["scope"],
          message: `Learning Spec concept ${conceptName} cannot belong to multiple scope categories`,
          input: value
        });
      }
      categoryByConcept.set(key, item.category);
    }
  }
}
var learningSpecDraftContentSchema = z8.strictObject(learningSpecContentShape).superRefine(requireAllScopeCategories);
var discoverySubmitLearningSpecToolInputSchema = z8.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  expectedSpecRevision: expectedRevisionSchema,
  draft: learningSpecDraftContentSchema
});
var learningSpecRevisionSchema = z8.strictObject({
  schemaVersion: schemaVersionSchema,
  id: learningSpecIdSchema,
  projectId: projectIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  parentRevision: entityRevisionSchema.optional(),
  selectedCandidate: candidateRevisionReferenceSchema,
  ...learningSpecContentShape,
  status: learningSpecStatusSchema,
  confirmation: learningSpecConfirmationSchema.optional(),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  source: actorSchema,
  redactionStatus: redactionStatusSchema
}).superRefine((spec, context) => {
  if (spec.revision === 1 && spec.parentRevision !== void 0) {
    context.addIssue({
      code: "custom",
      path: ["parentRevision"],
      message: "First Learning Spec revision must not have a parent"
    });
  }
  if (spec.revision > 1 && spec.parentRevision !== spec.revision - 1) {
    context.addIssue({
      code: "custom",
      path: ["parentRevision"],
      message: "Learning Spec revision must point to its immediate predecessor"
    });
  }
  if (spec.status === "CONFIRMED" && spec.confirmation === void 0) {
    context.addIssue({
      code: "custom",
      path: ["confirmation"],
      message: "Confirmed Learning Spec requires explicit user confirmation"
    });
  }
  if (spec.status === "CONFIRMED" && spec.source.kind !== "USER") {
    context.addIssue({
      code: "custom",
      path: ["source"],
      message: "Confirmed Learning Spec must be user-authored"
    });
  }
  if (spec.status !== "CONFIRMED" && spec.confirmation !== void 0) {
    context.addIssue({
      code: "custom",
      path: ["confirmation"],
      message: "Only a confirmed Learning Spec can contain confirmation"
    });
  }
  requireAllScopeCategories(spec, context);
});

// packages/contracts/dist/personalization.js
import { z as z9 } from "zod";
var personalizationPurposeSchema = z9.enum([
  "DISCOVERY_TIE_BREAK",
  "HELPER_EXPLANATION_START",
  "HELPER_PAST_EXPERIENCE_CONNECTION",
  "HELPER_TASK_USER_EVIDENCE_CONNECTION"
]);
var personalizationBasisSchema = z9.strictObject({
  conceptId: conceptIdSchema,
  conceptName: labelSchema,
  ledgerRevision: entityRevisionSchema,
  state: conceptStateSchema,
  evidenceIds: z9.array(evidenceIdSchema).min(1).max(5),
  episodeIds: z9.array(episodeIdSchema).min(1).max(5),
  sourceProjectIds: z9.array(projectIdSchema).min(1).max(5),
  sourceProjectTitles: z9.array(labelSchema).min(1).max(5),
  openIssueIds: z9.array(misconceptionIssueIdSchema).max(10),
  purpose: personalizationPurposeSchema,
  redactedEvidenceExcerpt: shortTextSchema.optional()
});
var personalizationFallbackReasonSchema = z9.enum([
  "NO_LEDGER",
  "NO_RELEVANT_CONCEPT",
  "NO_PRIOR_PROJECT_EVIDENCE"
]);
var personalizationTargetSchema = z9.discriminatedUnion("kind", [
  z9.strictObject({
    kind: z9.literal("DISCOVERY_SESSION"),
    discoverySessionId: discoverySessionIdSchema
  }),
  z9.strictObject({
    kind: z9.literal("HELPER_TURN"),
    taskId: taskIdSchema,
    decisionId: decisionIdSchema.optional()
  })
]);
var personalizationTraceSchema = z9.strictObject({
  schemaVersion: schemaVersionSchema,
  id: personalizationTraceIdSchema,
  projectId: projectIdSchema,
  correlationId: correlationIdSchema,
  target: personalizationTargetSchema,
  mode: z9.enum(["EVIDENCE_AWARE", "NO_RELEVANT_EVIDENCE"]),
  basis: z9.array(personalizationBasisSchema).max(5),
  fallbackReason: personalizationFallbackReasonSchema.optional(),
  createdAt: utcTimestampSchema,
  source: z9.strictObject({ kind: z9.literal("CORE") }),
  redactionStatus: z9.literal("VERIFIED_REDACTED")
}).superRefine((trace, context) => {
  if (trace.mode === "EVIDENCE_AWARE" && (trace.basis.length === 0 || trace.fallbackReason !== void 0)) {
    context.addIssue({
      code: "custom",
      message: "Evidence-aware personalization requires basis and no fallback reason"
    });
  }
  if (trace.mode === "NO_RELEVANT_EVIDENCE" && (trace.basis.length > 0 || trace.fallbackReason === void 0)) {
    context.addIssue({
      code: "custom",
      message: "No-evidence personalization requires an empty basis and fallback reason"
    });
  }
});
var evidenceTraceEvidenceItemSchema = z9.strictObject({
  evidenceId: evidenceIdSchema,
  kind: z9.enum(["USER_UNDERSTANDING", "MISCONCEPTION_SIGNAL", "CONCEPT_OBSERVATION"]),
  projectId: projectIdSchema,
  projectTitle: labelSchema,
  taskId: taskIdSchema.optional(),
  episodeId: episodeIdSchema,
  episodeType: episodeTypeSchema,
  episodeStatus: episodeStatusSchema,
  episodeEndedAt: utcTimestampSchema.optional(),
  acceptedAt: utcTimestampSchema,
  supportsState: conceptStateSchema.optional(),
  signal: evidenceSignalSchema.optional(),
  strength: evidenceStrengthSchema.optional(),
  promptDependence: promptDependenceSchema.optional(),
  redactedEvidenceExcerpt: nonEmptyTextSchema.optional(),
  rationale: nonEmptyTextSchema.optional()
});
var rejectedEvidenceItemSchema = z9.strictObject({
  proposalId: evidenceProposalIdSchema,
  evidenceDecisionId: evidenceDecisionIdSchema,
  projectId: projectIdSchema,
  projectTitle: labelSchema,
  episodeId: episodeIdSchema,
  episodeType: episodeTypeSchema,
  proposedConceptName: labelSchema,
  signal: z9.enum([
    "QUESTION",
    "REPHRASE",
    "PREDICTION",
    "JUSTIFIED_DECISION",
    "APPLICATION",
    "TRANSFER",
    "CONTRADICTION"
  ]),
  strength: z9.enum(["NONE", "WEAK", "MEDIUM", "STRONG"]),
  promptDependence: z9.enum(["INDEPENDENT", "LIGHT_HINT", "DIRECTLY_LED"]),
  redactedEvidenceExcerpt: nonEmptyTextSchema,
  reasonCode: z9.enum([
    "VALID_USER_EVIDENCE",
    "INVALID_SCHEMA",
    "AGENT_AUTHORED_SOURCE",
    "INSUFFICIENT_EVIDENCE",
    "OVERSTATED_MAXIMUM_STATE",
    "STALE_EPISODE_REVISION",
    "DUPLICATE_PROPOSAL",
    "INVALID_REFERENCE",
    "INVALID_STATE_TRANSITION",
    "MISCONCEPTION_ISSUE_NOT_FOUND"
  ]),
  explanation: nonEmptyTextSchema,
  decidedAt: utcTimestampSchema
});
var conceptEvidenceTraceViewSchema = z9.strictObject({
  conceptId: conceptIdSchema,
  conceptName: labelSchema,
  description: nonEmptyTextSchema,
  state: conceptStateSchema.nullable(),
  stateRevision: entityRevisionSchema.nullable(),
  reducerVersion: z9.string().trim().min(1).max(64).nullable(),
  updatedAt: utcTimestampSchema.nullable(),
  stateEvidenceIds: z9.array(evidenceIdSchema).max(500),
  evidence: z9.array(evidenceTraceEvidenceItemSchema).max(100),
  rejectedEvidence: z9.array(rejectedEvidenceItemSchema).max(100),
  openIssues: z9.array(misconceptionIssueSchema).max(100)
});
var evidenceAnalysisStatusItemSchema = z9.strictObject({
  analysisJobId: analysisJobIdSchema,
  episodeId: episodeIdSchema,
  status: z9.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]),
  revision: entityRevisionSchema,
  resultSummary: analysisResultSummarySchema.optional(),
  lastFailure: analysisFailureSchema.optional(),
  updatedAt: utcTimestampSchema
});
var projectEvidenceTraceSchema = z9.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  concepts: z9.array(conceptEvidenceTraceViewSchema).max(100),
  analysis: z9.array(evidenceAnalysisStatusItemSchema).max(100),
  personalization: z9.array(personalizationTraceSchema).max(100),
  emptyReason: shortTextSchema.optional(),
  redactionStatus: redactionStatusSchema
});

// packages/contracts/dist/agent-contracts.js
var discoveryQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: z10.strictObject({ kind: z10.literal("AGENT"), role: z10.literal("DISCOVERY") })
};
var builderQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: z10.strictObject({ kind: z10.literal("AGENT"), role: z10.literal("BUILDER") })
};
var helperQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: z10.strictObject({ kind: z10.literal("AGENT"), role: z10.literal("HELPER") })
};
var analystQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: z10.strictObject({ kind: z10.literal("AGENT"), role: z10.literal("EVIDENCE_ANALYST") })
};
var discoveryGetContextQuerySchema = z10.strictObject({
  ...discoveryQueryMetadata,
  kind: z10.literal("DISCOVERY_GET_CONTEXT"),
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema.optional()
});
var builderGetTaskQuerySchema = z10.strictObject({
  ...builderQueryMetadata,
  kind: z10.literal("BUILDER_GET_TASK"),
  projectId: projectIdSchema,
  taskId: taskIdSchema
});
var builderGetDecisionResultQuerySchema = z10.strictObject({
  ...builderQueryMetadata,
  kind: z10.literal("BUILDER_GET_DECISION_RESULT"),
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  decisionId: decisionIdSchema
});
var helperGetContextQuerySchema = z10.strictObject({
  ...helperQueryMetadata,
  kind: z10.literal("HELPER_GET_CONTEXT"),
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  question: nonEmptyTextSchema,
  relatedConceptNames: z10.array(labelSchema).max(5),
  observedContextVersion: entityRevisionSchema.optional()
});
var analystGetEpisodeContextQuerySchema = z10.strictObject({
  ...analystQueryMetadata,
  kind: z10.literal("ANALYST_GET_EPISODE_CONTEXT"),
  projectId: projectIdSchema,
  episodeId: episodeIdSchema,
  expectedEpisodeRevision: entityRevisionSchema
});
var discoverySubmitCandidateRoundCommandSchema = z10.strictObject({
  ...discoveryQueryMetadata,
  kind: z10.literal("DISCOVERY_SUBMIT_CANDIDATE_ROUND"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  round: candidateRoundSchema,
  candidates: z10.array(projectCandidateRevisionSchema).max(30)
}).superRefine((command, context) => {
  if (command.round.correlationId !== command.correlationId) {
    context.addIssue({
      code: "custom",
      path: ["round", "correlationId"],
      message: "Candidate Round correlation ID must match its command"
    });
  }
  const roundCandidates = new Set(command.round.candidates.map((candidate) => `${candidate.candidateId}:${candidate.revision}`));
  const submittedCandidates = /* @__PURE__ */ new Set();
  for (const [index, candidate] of command.candidates.entries()) {
    const key = `${candidate.id}:${candidate.revision}`;
    if (submittedCandidates.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["candidates", index],
        message: "Submitted Candidate revisions must be unique"
      });
    }
    submittedCandidates.add(key);
    if (candidate.discoverySessionId !== command.round.discoverySessionId || candidate.correlationId !== command.correlationId) {
      context.addIssue({
        code: "custom",
        path: ["candidates", index],
        message: "Candidate must match its Round session and correlation ID"
      });
    }
    if (!roundCandidates.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["candidates", index],
        message: "Every submitted Candidate revision must appear in the Candidate Round"
      });
    }
  }
});
var discoverySubmitCandidatePreviewsCommandSchema = z10.strictObject({
  ...discoveryQueryMetadata,
  kind: z10.literal("DISCOVERY_SUBMIT_CANDIDATE_PREVIEWS"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previewRound: candidatePreviewRoundSchema
}).refine((command) => command.previewRound.correlationId === command.correlationId, {
  path: ["previewRound", "correlationId"],
  message: "Candidate Preview Round correlation ID must match its command"
});
var discoverySubmitCandidateEnrichmentsCommandSchema = z10.strictObject({
  ...discoveryQueryMetadata,
  kind: z10.literal("DISCOVERY_SUBMIT_CANDIDATE_ENRICHMENTS"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previewRoundId: candidatePreviewRoundSchema.shape.id,
  batch: candidateEnrichmentBatchSchema,
  enrichments: z10.array(candidateEnrichmentSchema).min(1).max(10)
}).superRefine((command, context) => {
  if (command.batch !== "SELECTED" && command.enrichments.length !== 5) {
    context.addIssue({
      code: "custom",
      path: ["enrichments"],
      message: `${command.batch} enrichment must contain exactly five candidates`
    });
  }
});
var discoverySubmitLearningSpecCommandSchema = z10.strictObject({
  ...discoveryQueryMetadata,
  kind: z10.literal("DISCOVERY_SUBMIT_LEARNING_SPEC"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  expectedSpecRevision: expectedRevisionSchema,
  learningSpec: learningSpecRevisionSchema
}).superRefine((command, context) => {
  if (command.learningSpec.status !== "DRAFT") {
    context.addIssue({
      code: "custom",
      path: ["learningSpec", "status"],
      message: "Discovery Agent can submit only a draft Learning Spec"
    });
  }
  if (command.learningSpec.source.kind !== "AGENT" || command.learningSpec.source.role !== "DISCOVERY") {
    context.addIssue({
      code: "custom",
      path: ["learningSpec", "source"],
      message: "Discovery Learning Spec proposal must be authored by the Discovery Agent"
    });
  }
  if (command.learningSpec.correlationId !== command.correlationId) {
    context.addIssue({
      code: "custom",
      path: ["learningSpec", "correlationId"],
      message: "Learning Spec correlation ID must match its command"
    });
  }
});
var builderStartTaskCommandSchema = z10.strictObject({
  ...builderQueryMetadata,
  kind: z10.literal("BUILDER_START_TASK"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  expectedTaskRevision: expectedRevisionSchema
});
var builderUpdateLiveContextCommandSchema = z10.strictObject({
  ...builderQueryMetadata,
  kind: z10.literal("BUILDER_UPDATE_LIVE_CONTEXT"),
  idempotencyKey: idempotencyKeySchema,
  context: liveProjectContextSchema
}).refine((command) => command.context.correlationId === command.correlationId, {
  path: ["context", "correlationId"],
  message: "Live Context correlation ID must match its command"
});
var builderRequestDecisionCommandSchema = z10.strictObject({
  ...builderQueryMetadata,
  kind: z10.literal("BUILDER_REQUEST_DECISION"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  expectedTaskRevision: expectedRevisionSchema,
  expectedContextVersion: entityRevisionSchema,
  decision: decisionRequestDraftSchema,
  context: decisionContextDraftSchema
}).refine((command) => command.decision.independentWorkCanContinue || command.context.blockingReason !== void 0, {
  path: ["context", "blockingReason"],
  message: "A blocking Decision requires a blocking reason"
});
var builderApplyDecisionCommandSchema = z10.strictObject({
  ...builderQueryMetadata,
  kind: z10.literal("BUILDER_APPLY_DECISION"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  decisionId: decisionIdSchema,
  expectedTaskRevision: expectedRevisionSchema,
  expectedContextVersion: entityRevisionSchema,
  appliedResult: nonEmptyTextSchema,
  sourceReferences: z10.array(contextualSourceReferenceSchema).max(30),
  context: decisionContextDraftSchema.omit({ blockingReason: true })
});
var builderCompleteTaskCommandSchema = z10.strictObject({
  ...builderQueryMetadata,
  kind: z10.literal("BUILDER_COMPLETE_TASK"),
  idempotencyKey: idempotencyKeySchema,
  report: taskCompletionReportSchema
}).refine((command) => command.report.correlationId === command.correlationId, {
  path: ["report", "correlationId"],
  message: "Completion Report correlation ID must match its command"
});
var helperRequestContextRefreshCommandSchema = z10.strictObject({
  ...helperQueryMetadata,
  kind: z10.literal("HELPER_REQUEST_CONTEXT_REFRESH"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  observedContextVersion: entityRevisionSchema.optional(),
  reason: nonEmptyTextSchema
});
var analystSubmitEvidenceProposalsCommandSchema = z10.strictObject({
  ...analystQueryMetadata,
  kind: z10.literal("ANALYST_SUBMIT_EVIDENCE_PROPOSALS"),
  idempotencyKey: idempotencyKeySchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  attempt: z10.int().min(1).max(2),
  batch: evidenceProposalBatchSchema
}).refine((command) => command.batch.correlationId === command.correlationId, {
  path: ["batch", "correlationId"],
  message: "Evidence batch correlation ID must match its command"
});
var discoveryAgentRequestSchema = z10.discriminatedUnion("kind", [
  discoveryGetContextQuerySchema,
  discoverySubmitCandidatePreviewsCommandSchema,
  discoverySubmitCandidateEnrichmentsCommandSchema,
  discoverySubmitCandidateRoundCommandSchema,
  discoverySubmitLearningSpecCommandSchema
]);
var builderAgentRequestSchema = z10.discriminatedUnion("kind", [
  builderGetTaskQuerySchema,
  builderGetDecisionResultQuerySchema,
  builderStartTaskCommandSchema,
  builderUpdateLiveContextCommandSchema,
  builderRequestDecisionCommandSchema,
  builderApplyDecisionCommandSchema,
  builderCompleteTaskCommandSchema
]);
var helperAgentRequestSchema = z10.discriminatedUnion("kind", [
  helperGetContextQuerySchema,
  helperRequestContextRefreshCommandSchema
]);
var evidenceAnalystRequestSchema = z10.discriminatedUnion("kind", [
  analystGetEpisodeContextQuerySchema,
  analystSubmitEvidenceProposalsCommandSchema
]);
var agentRequestSchema = z10.discriminatedUnion("kind", [
  discoveryGetContextQuerySchema,
  discoverySubmitCandidatePreviewsCommandSchema,
  discoverySubmitCandidateEnrichmentsCommandSchema,
  discoverySubmitCandidateRoundCommandSchema,
  discoverySubmitLearningSpecCommandSchema,
  builderGetTaskQuerySchema,
  builderGetDecisionResultQuerySchema,
  builderStartTaskCommandSchema,
  builderUpdateLiveContextCommandSchema,
  builderRequestDecisionCommandSchema,
  builderApplyDecisionCommandSchema,
  builderCompleteTaskCommandSchema,
  helperGetContextQuerySchema,
  helperRequestContextRefreshCommandSchema,
  analystGetEpisodeContextQuerySchema,
  analystSubmitEvidenceProposalsCommandSchema
]);
var discoveryContextSchema = z10.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  project: projectSchema,
  session: discoverySessionSchema,
  rounds: z10.array(candidateRoundSchema).max(100),
  candidates: z10.array(projectCandidateRevisionSchema).max(1e3),
  feedback: z10.array(discoveryFeedbackSchema).max(1e3),
  learningSpec: learningSpecRevisionSchema.nullable(),
  previewRound: candidatePreviewRoundSchema.nullable().default(null),
  candidateEnrichments: z10.array(candidateEnrichmentSchema).max(10).default([]),
  relevantLedgerEntries: z10.array(conceptLedgerEntrySchema).max(20),
  personalization: personalizationTraceSchema
});
var builderTaskContextSchema = z10.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  project: projectSchema,
  learningSpec: learningSpecRevisionSchema,
  task: builderTaskSchema,
  liveContext: liveProjectContextSchema.nullable(),
  decisionRequests: z10.array(decisionRequestSchema).max(50),
  decisionResolutions: z10.array(decisionResolutionSchema).max(50),
  decisionApplications: z10.array(decisionApplicationSchema).max(50),
  pendingContextRefreshRequests: z10.array(contextRefreshRequestSchema).max(20)
});
var helperEpisodeSummarySchema = z10.strictObject({
  episodeId: episodeIdSchema,
  type: z10.enum(["BUILD_TASK", "DECISION", "HELPER_CONVERSATION", "FINAL_UPGRADE"]),
  endedAt: utcTimestampSchema,
  conceptNames: z10.array(labelSchema).max(20),
  redactedUserExcerpts: z10.array(nonEmptyTextSchema).max(5),
  helperResponseSummaries: z10.array(nonEmptyTextSchema).max(5),
  contextReferences: z10.array(contextualSourceReferenceSchema).max(10)
});
var helperSourceExcerptSchema = z10.strictObject({
  reference: codeReferenceSchema,
  redactedExcerpt: z10.string().trim().min(1).max(8192),
  truncated: z10.boolean(),
  redactionStatus: z10.literal("VERIFIED_REDACTED")
});
var helperReferenceDetailSchema = z10.strictObject({
  reference: contextualSourceReferenceSchema,
  availability: z10.enum(["EXCERPT_INCLUDED", "REFERENCE_ONLY", "UNAVAILABLE"]),
  reason: z10.string().trim().min(1).max(240).optional()
});
var helperContextSchema = z10.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  project: projectSchema,
  learningSpec: learningSpecRevisionSchema,
  task: builderTaskSchema,
  liveContext: liveProjectContextSchema.nullable(),
  activeDecisions: z10.array(decisionRequestSchema).max(10),
  focusedDecision: decisionRequestSchema.nullable(),
  relevantLedgerEntries: z10.array(conceptLedgerEntrySchema).max(5),
  personalization: personalizationTraceSchema,
  recentEpisodes: z10.array(helperEpisodeSummarySchema).max(5),
  contextReferences: z10.array(contextualSourceReferenceSchema).max(30),
  referenceDetails: z10.array(helperReferenceDetailSchema).max(30),
  sourceExcerpts: z10.array(helperSourceExcerptSchema).max(3),
  pendingContextRefreshRequests: z10.array(contextRefreshRequestSchema).max(20),
  freshness: z10.strictObject({
    currentContextVersion: entityRevisionSchema.nullable(),
    observedContextVersion: entityRevisionSchema.nullable(),
    status: z10.enum(["CURRENT", "STALE", "MISSING"]),
    stale: z10.boolean(),
    refreshRequired: z10.boolean()
  })
});
var episodeContextSchema = z10.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  episode: episodeSchema,
  events: z10.array(activityEventSchema).min(1).max(500),
  relevantLedgerEntries: z10.array(conceptLedgerEntrySchema).max(20),
  analysisJob: analysisJobSchema.nullable(),
  decisionContext: z10.strictObject({
    request: decisionRequestSchema,
    resolution: decisionResolutionSchema.nullable()
  }).nullable()
});
var decisionResultSchema = z10.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  request: decisionRequestSchema,
  resolution: decisionResolutionSchema.nullable(),
  application: decisionApplicationSchema.nullable()
});
var decisionCommandReceiptSchema = z10.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  accepted: z10.literal(true),
  resourceRevision: entityRevisionSchema,
  decisionId: decisionIdSchema
});
var commandReceiptSchema = z10.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  accepted: z10.literal(true),
  resourceRevision: entityRevisionSchema
});

// packages/contracts/dist/audit.js
import { z as z11 } from "zod";
var auditActionSchema = z11.enum([
  "CREATED",
  "UPDATED",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "RESOLVED",
  "APPLIED",
  "REDACTED"
]);
var auditOutcomeSchema = z11.enum(["SUCCEEDED", "REJECTED", "FAILED"]);
var auditRecordSchema = z11.strictObject({
  schemaVersion: schemaVersionSchema,
  id: auditRecordIdSchema,
  correlationId: correlationIdSchema,
  actor: actorSchema,
  action: auditActionSchema,
  resource: z11.strictObject({
    type: z11.enum([
      "PROJECT",
      "DISCOVERY_SESSION",
      "CANDIDATE_PREVIEW_ROUND",
      "CANDIDATE_REVISION",
      "LEARNING_SPEC",
      "BUILDER_TASK",
      "LIVE_CONTEXT",
      "CONTEXT_REFRESH_REQUEST",
      "DECISION",
      "EVENT",
      "EPISODE",
      "ANALYSIS_JOB",
      "EVIDENCE_PROPOSAL",
      "EVIDENCE",
      "CONCEPT_LEDGER",
      "EVALUATION_RUN"
    ]),
    id: stableEntityIdSchema,
    revision: z11.int().positive().optional()
  }),
  outcome: auditOutcomeSchema,
  reasonCode: z11.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/).optional(),
  summary: nonEmptyTextSchema,
  changedFields: z11.array(z11.string().regex(/^[a-z][A-Za-z0-9.]{0,119}$/)).max(100),
  occurredAt: utcTimestampSchema,
  redactionStatus: redactionStatusSchema
});

// packages/contracts/dist/evaluation.js
import { z as z12 } from "zod";
var contractDomainSchema = z12.enum([
  "DISCOVERY",
  "LEARNING_SPEC",
  "BUILD",
  "DECISION",
  "ACTIVITY",
  "EPISODE",
  "EVIDENCE",
  "CONCEPT_LEDGER",
  "AUDIT",
  "EVALUATION"
]);
var evaluationDimensionSchema = z12.enum([
  "DISCOVERY_DIVERSITY",
  "CONCEPT_NECESSITY",
  "SPEC_SCOPE",
  "CONTEXT_COMPLETENESS",
  "DECISION_NECESSITY",
  "EVIDENCE_QUALITY",
  "REDACTION",
  "CONTRACT_INTEGRITY"
]);
var evaluationReviewModeSchema = z12.enum(["AUTOMATED", "HUMAN"]);
var evaluationCriterionStatusSchema = z12.enum(["PASSED", "FAILED", "NEEDS_REVIEW", "ERROR"]);
var criterionKeySchema = z12.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
var evaluationCriterionSchema = z12.strictObject({
  key: criterionKeySchema,
  dimension: evaluationDimensionSchema,
  reviewMode: evaluationReviewModeSchema,
  description: nonEmptyTextSchema,
  successDefinition: nonEmptyTextSchema
});
var evaluationFixtureSchema = z12.strictObject({
  schemaVersion: schemaVersionSchema,
  id: fixtureIdSchema,
  name: labelSchema,
  description: nonEmptyTextSchema,
  kind: z12.enum([
    "GOLDEN_PATH",
    "UNSEEN_DISCOVERY",
    "FALSE_MASTERY",
    "FALSE_MISCONCEPTION",
    "STALE_CONTEXT",
    "CANDIDATE_MODE_COLLAPSE",
    "SPEC_SCOPE",
    "DECISION_QUALITY",
    "REDACTION"
  ]),
  inputPath: relativePosixPathSchema,
  calibrationSubjectPath: relativePosixPathSchema.optional(),
  calibrationReviewPath: relativePosixPathSchema.optional(),
  expectedContractDomains: z12.array(contractDomainSchema).min(1).max(20),
  criteria: z12.array(evaluationCriterionSchema).min(1).max(50),
  scenarioTags: z12.array(labelSchema).max(20),
  fixtureVersion: semanticVersionSchema,
  containsPersonalData: z12.literal(false),
  redactionStatus: z12.literal("VERIFIED_REDACTED")
}).superRefine((fixture, context) => {
  const keys = new Set(fixture.criteria.map((criterion) => criterion.key));
  if (keys.size !== fixture.criteria.length) {
    context.addIssue({
      code: "custom",
      path: ["criteria"],
      message: "Evaluation criterion keys must be unique within a fixture"
    });
  }
  const domains = new Set(fixture.expectedContractDomains);
  if (domains.size !== fixture.expectedContractDomains.length) {
    context.addIssue({
      code: "custom",
      path: ["expectedContractDomains"],
      message: "Expected contract domains must be unique"
    });
  }
  if (fixture.calibrationReviewPath !== void 0 && fixture.calibrationSubjectPath === void 0) {
    context.addIssue({
      code: "custom",
      path: ["calibrationReviewPath"],
      message: "A calibration review requires a calibration subject"
    });
  }
});
var evaluationMetricSchema = z12.strictObject({
  name: labelSchema,
  value: z12.number().finite(),
  unit: z12.enum(["COUNT", "RATIO", "MILLISECONDS", "TOKENS"]),
  interpretation: nonEmptyTextSchema
});
var evaluationCriterionResultSchema = z12.strictObject({
  criterionKey: criterionKeySchema,
  dimension: evaluationDimensionSchema,
  reviewMode: evaluationReviewModeSchema,
  status: evaluationCriterionStatusSchema,
  explanation: nonEmptyTextSchema,
  evidenceReferences: z12.array(nonEmptyTextSchema).max(30),
  metrics: z12.array(evaluationMetricSchema).max(30)
});
function expectedCaseStatus(results) {
  if (results.some((result) => result.status === "ERROR"))
    return "ERROR";
  if (results.some((result) => result.status === "FAILED"))
    return "FAILED";
  if (results.some((result) => result.status === "NEEDS_REVIEW"))
    return "NEEDS_REVIEW";
  return "PASSED";
}
var evaluationCaseResultSchema = z12.strictObject({
  fixtureId: fixtureIdSchema,
  fixtureVersion: semanticVersionSchema,
  status: evaluationCriterionStatusSchema,
  criterionResults: z12.array(evaluationCriterionResultSchema).min(1).max(50),
  metrics: z12.array(evaluationMetricSchema).max(100),
  notes: z12.array(nonEmptyTextSchema).max(50)
}).superRefine((result, context) => {
  const keys = new Set(result.criterionResults.map((criterion) => criterion.criterionKey));
  if (keys.size !== result.criterionResults.length) {
    context.addIssue({
      code: "custom",
      path: ["criterionResults"],
      message: "Evaluation criterion results must be unique within a case"
    });
  }
  if (result.status !== expectedCaseStatus(result.criterionResults)) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Evaluation case status must summarize its criterion results"
    });
  }
});
var evaluationRunSchema = z12.strictObject({
  schemaVersion: schemaVersionSchema,
  id: evaluationRunIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  evaluatorVersion: semanticVersionSchema,
  systemUnderTestVersion: semanticVersionSchema,
  fixtureIds: z12.array(fixtureIdSchema).min(1).max(500),
  status: z12.enum(["PENDING", "RUNNING", "NEEDS_REVIEW", "COMPLETED", "FAILED"]),
  startedAt: utcTimestampSchema,
  completedAt: utcTimestampSchema.optional(),
  results: z12.array(evaluationCaseResultSchema).max(500),
  redactionStatus: z12.literal("VERIFIED_REDACTED")
}).superRefine((run, context) => {
  const fixtureIds = new Set(run.fixtureIds);
  if (fixtureIds.size !== run.fixtureIds.length) {
    context.addIssue({
      code: "custom",
      path: ["fixtureIds"],
      message: "Evaluation run fixture IDs must be unique"
    });
  }
  const resultFixtureIds = new Set(run.results.map((result) => result.fixtureId));
  if (resultFixtureIds.size !== run.results.length) {
    context.addIssue({
      code: "custom",
      path: ["results"],
      message: "Evaluation run can contain only one result per fixture"
    });
  }
  for (const [index, result] of run.results.entries()) {
    if (!fixtureIds.has(result.fixtureId)) {
      context.addIssue({
        code: "custom",
        path: ["results", index, "fixtureId"],
        message: "Evaluation result must belong to the run fixture set"
      });
    }
  }
  const terminal = ["NEEDS_REVIEW", "COMPLETED", "FAILED"].includes(run.status);
  if (terminal !== (run.completedAt !== void 0)) {
    context.addIssue({
      code: "custom",
      path: ["completedAt"],
      message: "Only terminal Evaluation runs require completedAt"
    });
  }
  if (run.status === "PENDING" && run.results.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["results"],
      message: "Pending Evaluation run must not contain results"
    });
  }
  if (terminal && resultFixtureIds.size !== fixtureIds.size) {
    context.addIssue({
      code: "custom",
      path: ["results"],
      message: "Terminal Evaluation run requires one result for every fixture"
    });
  }
  if (run.status === "NEEDS_REVIEW" && !run.results.some((result) => result.status === "NEEDS_REVIEW")) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "NEEDS_REVIEW run requires at least one case awaiting review"
    });
  }
  if (run.status === "COMPLETED" && run.results.some((result) => ["NEEDS_REVIEW", "ERROR"].includes(result.status))) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Completed Evaluation run cannot contain pending review or scorer errors"
    });
  }
  if (run.status === "FAILED" && !run.results.some((result) => result.status === "ERROR")) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Failed Evaluation run requires a scorer error"
    });
  }
});
var baselineResultSchema = z12.strictObject({
  schemaVersion: schemaVersionSchema,
  id: baselineResultIdSchema,
  evaluationRunId: evaluationRunIdSchema,
  correlationId: correlationIdSchema,
  kind: z12.enum(["CALIBRATION", "GENERIC_KIRO", "SIMPLE_MEMORY", "ABLATION"]),
  baselineName: labelSchema,
  baselineVersion: semanticVersionSchema,
  results: z12.array(evaluationCaseResultSchema).min(1).max(500),
  recordedAt: utcTimestampSchema,
  redactionStatus: z12.literal("VERIFIED_REDACTED")
}).superRefine((baseline, context) => {
  const fixtureIds = new Set(baseline.results.map((result) => result.fixtureId));
  if (fixtureIds.size !== baseline.results.length) {
    context.addIssue({
      code: "custom",
      path: ["results"],
      message: "Baseline result can contain only one result per fixture"
    });
  }
});

// packages/contracts/dist/generated-result.js
import { z as z13 } from "zod";
var generatedResultUrlPathSchema = z13.string().trim().min(1).max(240).refine((value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.includes("?") && !value.includes("#") && !value.split("/").includes(".."), "Generated web result path must be a local absolute URL path");
var generatedResultManifestSchema = z13.strictObject({
  schemaVersion: schemaVersionSchema,
  kind: z13.literal("WEB"),
  entry: relativePosixPathSchema.refine((value) => /\.(?:cjs|mjs|js)$/.test(value), "Generated web result entry must be compiled JavaScript"),
  healthPath: generatedResultUrlPathSchema,
  openPath: generatedResultUrlPathSchema.default("/")
});

// packages/contracts/dist/ui-contracts.js
import { z as z14 } from "zod";
var uiRequestMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: z14.strictObject({ kind: z14.literal("UI") })
};
var uiStartDiscoveryCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_START_DISCOVERY"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  input: discoveryInputSchema
});
var uiRecordDiscoveryFeedbackCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_RECORD_DISCOVERY_FEEDBACK"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: entityRevisionSchema,
  feedback: discoveryFeedbackSchema
}).refine((command) => command.feedback.correlationId === command.correlationId, {
  path: ["feedback", "correlationId"],
  message: "Discovery Feedback correlation ID must match its command"
});
var uiConfirmLearningSpecCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_CONFIRM_LEARNING_SPEC"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  expectedSpecRevision: entityRevisionSchema
});
var uiPrepareBuilderTaskCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_PREPARE_BUILDER_TASK"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  expectedSpecRevision: entityRevisionSchema
});
var uiPrepareFinalUpgradeTaskCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_PREPARE_FINAL_UPGRADE_TASK"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  sourceTaskId: taskIdSchema,
  expectedSourceTaskRevision: entityRevisionSchema,
  personalizationTraceId: personalizationTraceIdSchema,
  userGoal: nonEmptyTextSchema
});
var uiUpdateLearningSpecCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_UPDATE_LEARNING_SPEC"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  expectedSessionRevision: entityRevisionSchema,
  expectedSpecRevision: entityRevisionSchema,
  draft: learningSpecDraftContentSchema
});
var uiReturnToDiscoveryCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_RETURN_TO_DISCOVERY"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  expectedSessionRevision: entityRevisionSchema,
  expectedSpecRevision: z14.int().nonnegative(),
  input: discoveryInputSchema.optional()
});
var uiResolveDecisionCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_RESOLVE_DECISION"),
  idempotencyKey: idempotencyKeySchema,
  resolution: decisionResolutionSchema
}).refine((command) => command.resolution.correlationId === command.correlationId, {
  path: ["resolution", "correlationId"],
  message: "Decision Resolution correlation ID must match its command"
});
var uiOpenHelperQuerySchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_OPEN_HELPER"),
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  question: nonEmptyTextSchema.optional()
});
var uiPrepareBuilderSessionQuerySchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_PREPARE_BUILDER_SESSION"),
  purpose: z14.enum(["AGENT_SESSION", "WORKSPACE_VIEW"]).optional(),
  projectId: projectIdSchema,
  taskId: taskIdSchema
});
var uiListProjectsQuerySchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_LIST_PROJECTS"),
  limit: z14.int().min(1).max(100)
});
var uiRestoreProjectSessionQuerySchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_RESTORE_PROJECT_SESSION"),
  projectId: projectIdSchema,
  helperConversationLimit: z14.int().min(1).max(20)
});
var uiPrepareDiscoveryAgentContextQuerySchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_PREPARE_DISCOVERY_AGENT_CONTEXT"),
  projectId: projectIdSchema,
  helperConversationLimit: z14.int().min(1).max(20)
});
var uiRecordHelperExchangeCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_RECORD_HELPER_EXCHANGE"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  conversationId: conversationIdSchema.optional(),
  userMessage: nonEmptyTextSchema,
  helperResponseSummary: shortTextSchema,
  origin: z14.enum(["FREE_TEXT", "QUICK_ACTION"]).default("FREE_TEXT"),
  closeConversation: z14.boolean()
});
var uiRetryAnalysisCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_RETRY_ANALYSIS"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema
});
var uiReadAnalysisJobsQuerySchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_READ_ANALYSIS_JOBS"),
  projectId: projectIdSchema,
  status: analysisJobStatusSchema.optional(),
  limit: z14.int().min(1).max(100)
});
var uiReadEvidenceTraceQuerySchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_READ_EVIDENCE_TRACE"),
  projectId: projectIdSchema,
  conceptId: conceptIdSchema.optional()
});
var uiLaunchResultCommandSchema = z14.strictObject({
  ...uiRequestMetadata,
  kind: z14.literal("UI_LAUNCH_RESULT"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema
});
var generatedResultDescriptorBase = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  workspacePath: relativePosixPathSchema
};
var generatedResultDescriptorSchema = z14.discriminatedUnion("status", [
  z14.strictObject({
    ...generatedResultDescriptorBase,
    status: z14.literal("READY")
  }),
  z14.strictObject({
    ...generatedResultDescriptorBase,
    status: z14.literal("RUNNING"),
    url: z14.url().refine((value) => {
      const match = value.match(/^http:\/\/127\.0\.0\.1:([1-9]\d{0,4})(?:\/[^?#]*)?$/);
      if (match?.[1] === void 0)
        return false;
      return Number(match[1]) <= 65535;
    }, "Generated result URL must use loopback HTTP"),
    reused: z14.boolean()
  })
]);
var builderSessionBindingDescriptorSchema = z14.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  workspaceDirectory: z14.string().min(1).max(4096).refine((value) => (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) && !/[\0\r\n]/.test(value), "Expected an absolute local POSIX or Windows drive path"),
  status: z14.literal("READY")
});
var preparedBuilderTaskDescriptorSchema = z14.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  workspacePath: relativePosixPathSchema,
  task: builderTaskSchema,
  status: z14.literal("READY")
});
var helperExchangeReceiptSchema = z14.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  conversationId: conversationIdSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  status: z14.enum(["OPEN", "PENDING_ANALYSIS"])
});
var uiRequestSchema = z14.discriminatedUnion("kind", [
  uiStartDiscoveryCommandSchema,
  uiRecordDiscoveryFeedbackCommandSchema,
  uiUpdateLearningSpecCommandSchema,
  uiConfirmLearningSpecCommandSchema,
  uiPrepareBuilderTaskCommandSchema,
  uiPrepareFinalUpgradeTaskCommandSchema,
  uiReturnToDiscoveryCommandSchema,
  uiResolveDecisionCommandSchema,
  uiListProjectsQuerySchema,
  uiRestoreProjectSessionQuerySchema,
  uiPrepareDiscoveryAgentContextQuerySchema,
  uiOpenHelperQuerySchema,
  uiPrepareBuilderSessionQuerySchema,
  uiRecordHelperExchangeCommandSchema,
  uiRetryAnalysisCommandSchema,
  uiReadAnalysisJobsQuerySchema,
  uiReadEvidenceTraceQuerySchema,
  uiLaunchResultCommandSchema
]);

// packages/contracts/dist/ui-session.js
import { z as z15 } from "zod";
var crewAppSurfaceSchema = z15.enum(["DISCOVERY", "SPEC", "BUILD"]);
var helperConversationSummarySchema = z15.strictObject({
  conversationId: conversationIdSchema,
  episodeId: episodeIdSchema,
  taskId: taskIdSchema,
  decisionId: decisionIdSchema.optional(),
  status: episodeStatusSchema,
  startedAt: utcTimestampSchema,
  endedAt: utcTimestampSchema.optional(),
  redactedUserExcerpts: z15.array(nonEmptyTextSchema).max(5),
  helperResponseSummaries: z15.array(nonEmptyTextSchema).max(5)
});
var decisionSessionItemSchema = z15.strictObject({
  request: decisionRequestSchema,
  resolution: decisionResolutionSchema.nullable(),
  application: decisionApplicationSchema.nullable()
});
var projectHistoryItemSchema = z15.strictObject({
  project: projectSchema,
  suggestedSurface: crewAppSurfaceSchema,
  activeTask: builderTaskSchema.nullable(),
  pendingDecisionCount: z15.int().nonnegative().max(100),
  currentContextVersion: z15.int().positive().nullable(),
  helperConversationCount: z15.int().nonnegative()
});
var projectHistorySchema = z15.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projects: z15.array(projectHistoryItemSchema).max(100)
});
var projectSessionSnapshotSchema = z15.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  project: projectSchema,
  suggestedSurface: crewAppSurfaceSchema,
  discoverySession: discoverySessionSchema.nullable(),
  discoveryContext: discoveryContextSchema.nullable(),
  selectedCandidate: projectCandidateRevisionSchema.nullable(),
  learningSpec: learningSpecRevisionSchema.nullable(),
  activeTask: builderTaskSchema.nullable(),
  currentTask: builderTaskSchema.nullable(),
  liveContext: liveProjectContextSchema.nullable(),
  pendingDecisions: z15.array(decisionRequestSchema).max(100),
  decisions: z15.array(decisionSessionItemSchema).max(100).default([]),
  completionReport: taskCompletionReportSchema.nullable().default(null),
  helperConversations: z15.array(helperConversationSummarySchema).max(20)
});

// packages/contracts/dist/validation.js
import { z as z16 } from "zod";
var contractValidationIssueSchema = z16.strictObject({
  path: z16.array(z16.union([z16.string(), z16.int().nonnegative()])),
  code: z16.string().min(1),
  message: z16.string().min(1)
});
var contractErrorSchema = z16.strictObject({
  schemaVersion: schemaVersionSchema,
  kind: z16.literal("CONTRACT_ERROR"),
  category: z16.enum(["VALIDATION", "PERMISSION"]),
  code: z16.enum([
    "INVALID_PAYLOAD",
    "UNSUPPORTED_SCHEMA_VERSION",
    "UNEXPECTED_FIELD",
    "AGENT_PERMISSION_MISMATCH"
  ]),
  message: z16.string().min(1),
  correlationId: correlationIdSchema.optional(),
  retryable: z16.literal(false),
  issues: z16.array(contractValidationIssueSchema).min(1)
});
var operationErrorCategorySchema = z16.enum([
  "VALIDATION",
  "PERMISSION",
  "STALE_CONTEXT",
  "EXTERNAL",
  "ANALYSIS",
  "STORAGE",
  "GENERATED_PROJECT"
]);
var operationErrorSchema = z16.strictObject({
  schemaVersion: schemaVersionSchema,
  kind: z16.literal("OPERATION_ERROR"),
  category: operationErrorCategorySchema,
  code: z16.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/),
  disposition: z16.enum(["RETRYABLE", "USER_ACTION_REQUIRED", "PERMANENT"]),
  message: z16.string().min(1).max(1e3),
  correlationId: correlationIdSchema,
  issues: z16.array(contractValidationIssueSchema).max(100),
  redactionStatus: redactionStatusSchema
});

// packages/contracts/dist/local-runtime.js
import { z as z17 } from "zod";
var LOCAL_PROTOCOL_VERSION = 1;
var localRunIdSchema = z17.string().regex(/^run_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
var metadata = {
  projectId: projectIdSchema,
  idempotencyKey: idempotencyKeySchema
};
var localRunRequestSchema = z17.discriminatedUnion("kind", [
  z17.strictObject({
    ...metadata,
    kind: z17.literal("DISCOVERY"),
    discoverySessionId: discoverySessionIdSchema,
    expectedSessionRevision: expectedRevisionSchema,
    phase: z17.enum(["PREVIEW", "ENRICH_ALL", "ENRICH_SELECTED", "ROUND", "MERGE", "SPEC"]),
    candidateIds: z17.array(candidateIdSchema).max(10).default([]),
    message: nonEmptyTextSchema.optional(),
    expectedSpecRevision: expectedRevisionSchema.optional(),
    enrichAfterPreview: z17.boolean().default(true)
  }),
  z17.strictObject({
    ...metadata,
    kind: z17.literal("BUILDER"),
    taskId: taskIdSchema,
    expectedTaskRevision: expectedRevisionSchema,
    message: nonEmptyTextSchema
  }),
  z17.strictObject({
    ...metadata,
    kind: z17.literal("HELPER"),
    taskId: taskIdSchema,
    decisionId: decisionIdSchema.optional(),
    message: nonEmptyTextSchema,
    origin: z17.enum(["FREE_TEXT", "QUICK_ACTION"]).default("FREE_TEXT")
  })
]);
var localRunSchema = z17.strictObject({
  protocolVersion: z17.literal(LOCAL_PROTOCOL_VERSION),
  backendInstanceId: z17.string().uuid(),
  id: localRunIdSchema,
  projectId: projectIdSchema,
  kind: z17.enum(["DISCOVERY", "BUILDER", "HELPER"]),
  phase: z17.string().max(40),
  status: z17.enum(["ACCEPTED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  outcome: z17.enum(["PENDING", "DURABLE_RESULT", "TURN_ENDED", "HELPER_RECORDED", "NONE"]),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  errorCode: z17.string().regex(/^[A-Z0-9_]{1,100}$/).nullable(),
  lastSequence: z17.int().nonnegative(),
  retainedFromSequence: z17.int().nonnegative()
});
var localRunEventSchema = z17.strictObject({
  runId: localRunIdSchema,
  projectId: projectIdSchema,
  sequence: z17.int().positive(),
  kind: z17.enum(["STATE", "TEXT", "TOOL", "PERMISSION_DENIED"]),
  text: z17.string().max(65536).optional(),
  update: z17.record(z17.string(), z17.unknown()).optional(),
  run: localRunSchema.optional(),
  transient: z17.literal(true),
  redactionStatus: z17.literal("VERIFIED_REDACTED")
});
var localConnectionSchema = z17.strictObject({
  protocolVersion: z17.literal(LOCAL_PROTOCOL_VERSION),
  backendInstanceId: z17.string().uuid(),
  baseUrl: z17.string().regex(/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/),
  token: z17.string().regex(/^[0-9a-f]{64}$/)
});
var localApplicationEnvelopeSchema = z17.strictObject({
  protocolVersion: z17.literal(LOCAL_PROTOCOL_VERSION),
  request: uiRequestSchema
});
var localRunEnvelopeSchema = z17.strictObject({
  protocolVersion: z17.literal(LOCAL_PROTOCOL_VERSION),
  request: localRunRequestSchema
});
var localResponseSchemas = {
  UI_START_DISCOVERY: commandReceiptSchema,
  UI_RECORD_DISCOVERY_FEEDBACK: commandReceiptSchema,
  UI_UPDATE_LEARNING_SPEC: commandReceiptSchema,
  UI_CONFIRM_LEARNING_SPEC: commandReceiptSchema,
  UI_PREPARE_BUILDER_TASK: preparedBuilderTaskDescriptorSchema,
  UI_PREPARE_FINAL_UPGRADE_TASK: preparedBuilderTaskDescriptorSchema,
  UI_RETURN_TO_DISCOVERY: commandReceiptSchema,
  UI_RESOLVE_DECISION: commandReceiptSchema,
  UI_LIST_PROJECTS: projectHistorySchema,
  UI_RESTORE_PROJECT_SESSION: projectSessionSnapshotSchema,
  UI_PREPARE_DISCOVERY_AGENT_CONTEXT: projectSessionSnapshotSchema,
  UI_OPEN_HELPER: helperContextSchema,
  UI_PREPARE_BUILDER_SESSION: builderSessionBindingDescriptorSchema,
  UI_RECORD_HELPER_EXCHANGE: helperExchangeReceiptSchema,
  UI_RETRY_ANALYSIS: analysisJobSchema,
  UI_READ_ANALYSIS_JOBS: analysisJobSchema.array(),
  UI_READ_EVIDENCE_TRACE: projectEvidenceTraceSchema,
  UI_LAUNCH_RESULT: generatedResultDescriptorSchema
};
var localUiMetadataSchema = z17.strictObject({
  schemaVersion: z17.literal(1),
  correlationId: correlationIdSchema,
  actor: z17.strictObject({ kind: z17.literal("UI") })
});

// packages/frontend-client/dist/index.js
import { randomUUID } from "node:crypto";
function entityId(prefix) {
  return `${prefix}_${randomUUID()}`;
}
function uiMetadata(correlationId = entityId("corr")) {
  return { schemaVersion: 1, correlationId, actor: { kind: "UI" } };
}
var LocalClientError = class extends Error {
  code;
  status;
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
    this.name = "LocalClientError";
  }
};
var isRecord = (input) => typeof input === "object" && input !== null && !Array.isArray(input);
var complete = (run) => !["ACCEPTED", "RUNNING"].includes(run.status);
var LocalCoreClient = class {
  #connection;
  #fetch;
  constructor(connection, options = {}) {
    this.#connection = localConnectionSchema.parse(connection);
    const port = Number(new URL(connection.baseUrl).port);
    if (port < 1 || port > 65535)
      throw new LocalClientError("INVALID_LOCAL_PORT");
    this.#fetch = options.fetch ?? globalThis.fetch;
  }
  async health() {
    const value = await this.#json("/health");
    if (!isRecord(value) || value.protocolVersion !== LOCAL_PROTOCOL_VERSION || value.backendInstanceId !== this.#connection.backendInstanceId)
      throw new LocalClientError("BACKEND_RESTARTED_RELOAD_CONNECTION");
    return {
      protocolVersion: LOCAL_PROTOCOL_VERSION,
      backendInstanceId: this.#connection.backendInstanceId,
      ...typeof value.agent === "string" ? { agent: value.agent } : {}
    };
  }
  async execute(request) {
    const value = await this.#json("/api/application", {
      protocolVersion: LOCAL_PROTOCOL_VERSION,
      request: uiRequestSchema.parse(request)
    });
    if (!isRecord(value))
      throw new LocalClientError("INVALID_CORE_RESPONSE");
    if (value.success === false) {
      const error = isRecord(value.error) ? value.error : {};
      throw new LocalClientError(typeof error.code === "string" && /^[A-Z0-9_]{1,100}$/.test(error.code) ? error.code : "CORE_OPERATION_FAILED");
    }
    if (value.success !== true)
      throw new LocalClientError("INVALID_CORE_RESPONSE");
    const parsed = localResponseSchemas[request.kind].safeParse(value.data);
    if (!parsed.success)
      throw new LocalClientError("INVALID_CORE_RESPONSE");
    return parsed.data;
  }
  listProjects(limit = 50) {
    return this.execute({ ...uiMetadata(), kind: "UI_LIST_PROJECTS", limit });
  }
  restoreProject(projectId) {
    return this.execute({
      ...uiMetadata(),
      kind: "UI_RESTORE_PROJECT_SESSION",
      projectId,
      helperConversationLimit: 20
    });
  }
  async startDiscovery(input, options = {}) {
    const projectId = entityId("project");
    await this.execute({
      ...uiMetadata(),
      kind: "UI_START_DISCOVERY",
      projectId,
      idempotencyKey: entityId("idem"),
      input
    });
    const snapshot = await this.restoreProject(projectId);
    if (snapshot.discoverySession === null)
      throw new LocalClientError("DISCOVERY_SESSION_MISSING");
    const run = await this.startRun({
      kind: "DISCOVERY",
      projectId,
      idempotencyKey: entityId("idem"),
      phase: "PREVIEW",
      discoverySessionId: snapshot.discoverySession.id,
      expectedSessionRevision: snapshot.discoverySession.revision,
      enrichAfterPreview: options.enrichAfterPreview ?? true
    });
    return { projectId, run };
  }
  async startRun(request) {
    return localRunSchema.parse(await this.#json("/api/runs", {
      protocolVersion: LOCAL_PROTOCOL_VERSION,
      request: localRunRequestSchema.parse(request)
    }));
  }
  async getRun(id) {
    return localRunSchema.parse(await this.#json(`/api/runs/${localRunIdSchema.parse(id)}`));
  }
  async listRuns(projectId) {
    return localRunSchema.array().parse(await this.#json(`/api/runs?projectId=${projectIdSchema.parse(projectId)}`));
  }
  async cancelRun(id) {
    return localRunSchema.parse(await this.#json(`/api/runs/${localRunIdSchema.parse(id)}/cancel`, {}));
  }
  async watchRun(id, onEvent, options = {}) {
    localRunIdSchema.parse(id);
    const after = options.after ?? 0;
    if (!Number.isSafeInteger(after) || after < 0)
      throw new LocalClientError("INVALID_SEQUENCE");
    const response = await this.#request(`/api/runs/${id}/events?after=${after}`, void 0, options.signal, true);
    if (!response.body || !response.headers.get("content-type")?.startsWith("text/event-stream"))
      throw new LocalClientError("INVALID_STREAM");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let latest;
    let receivedSequence = after;
    let replayThrough = after;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done)
          break;
        buffer += decoder.decode(chunk.value, { stream: true }).replaceAll("\r\n", "\n");
        if (buffer.length > 2097152)
          throw new LocalClientError("STREAM_TOO_LARGE");
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
          if (data) {
            let value;
            try {
              value = JSON.parse(data);
            } catch {
              throw new LocalClientError("INVALID_STREAM");
            }
            if (frame.includes("event: run")) {
              latest = localRunSchema.parse(value);
              if (latest.backendInstanceId !== this.#connection.backendInstanceId || latest.id !== id)
                throw new LocalClientError("RUN_BINDING_MISMATCH");
              options.onRun?.(latest);
              replayThrough = latest.lastSequence;
            } else {
              const event = localRunEventSchema.parse(value);
              if (event.runId !== id || latest && event.projectId !== latest.projectId)
                throw new LocalClientError("RUN_BINDING_MISMATCH");
              if (event.run && (event.run.id !== id || event.run.projectId !== event.projectId || event.run.backendInstanceId !== this.#connection.backendInstanceId))
                throw new LocalClientError("RUN_BINDING_MISMATCH");
              onEvent(event);
              receivedSequence = Math.max(receivedSequence, event.sequence);
              if (event.run && (!latest || event.run.lastSequence >= latest.lastSequence)) {
                latest = event.run;
                options.onRun?.(latest);
              }
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
        if (latest && complete(latest) && receivedSequence >= replayThrough)
          return latest;
      }
      if (latest && complete(latest) && receivedSequence >= replayThrough)
        return latest;
      throw new LocalClientError("STREAM_DISCONNECTED_RESTORE_PROJECT");
    } finally {
      await reader.cancel().catch(() => void 0);
      reader.releaseLock();
    }
  }
  async #json(path, body) {
    const response = await this.#request(path, body);
    const text = await response.text();
    if (text.length > 4194304)
      throw new LocalClientError("RESPONSE_TOO_LARGE");
    try {
      return JSON.parse(text);
    } catch {
      throw new LocalClientError("INVALID_JSON_RESPONSE");
    }
  }
  async #request(path, body, signal, stream = false) {
    let response;
    try {
      response = await this.#fetch(`${this.#connection.baseUrl}${path}`, {
        method: body === void 0 ? "GET" : "POST",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${this.#connection.token}`,
          ...body === void 0 ? {} : { "content-type": "application/json" }
        },
        ...body === void 0 ? {} : { body: JSON.stringify(body) },
        ...signal === void 0 && stream ? {} : { signal: signal ?? AbortSignal.timeout(15e3) }
      });
    } catch {
      throw new LocalClientError(signal?.aborted ? "CANCELLED" : "CORE_CONNECTION_UNAVAILABLE");
    }
    if (!response.ok) {
      let code = `HTTP_${response.status}`;
      try {
        const error = await response.json();
        if (isRecord(error) && typeof error.error === "string" && /^[A-Z0-9_]{1,100}$/.test(error.error))
          code = error.error;
      } catch {
      }
      throw new LocalClientError(code, response.status);
    }
    return response;
  }
};

// packages/frontend-client/dist/node.js
async function readLocalConnection(file) {
  if (!isAbsolute(file))
    throw new LocalClientError("ABSOLUTE_CONNECTION_FILE_REQUIRED");
  const stats = await lstat(file);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size > 16384)
    throw new LocalClientError("CONNECTION_FILE_INVALID");
  if (process.platform !== "win32" && (stats.mode & 63) !== 0)
    throw new LocalClientError("CONNECTION_FILE_NOT_PRIVATE");
  try {
    return localConnectionSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch {
    throw new LocalClientError("CONNECTION_FILE_INVALID");
  }
}
async function connectLocalCore(file) {
  const client = new LocalCoreClient(await readLocalConnection(file));
  await client.health();
  return client;
}
export {
  connectLocalCore,
  readLocalConnection
};
