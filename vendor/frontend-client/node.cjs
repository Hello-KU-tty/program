"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/frontend-client/dist/node.js
var node_exports = {};
__export(node_exports, {
  connectLocalCore: () => connectLocalCore,
  readLocalConnection: () => readLocalConnection
});
module.exports = __toCommonJS(node_exports);
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");

// packages/contracts/dist/activity.js
var import_zod3 = require("zod");

// packages/contracts/dist/primitives.js
var import_zod = require("zod");
var CURRENT_SCHEMA_VERSION = 1;
var schemaVersionSchema = import_zod.z.literal(CURRENT_SCHEMA_VERSION);
var UUID_V4_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
function prefixedUuidSchema(prefix) {
  return import_zod.z.string().regex(new RegExp(`^${prefix}_${UUID_V4_PATTERN}$`), `Expected a ${prefix}_ prefixed lowercase UUID v4`);
}
var stableEntityIdSchema = import_zod.z.string().regex(new RegExp(`^[a-z]+(?:_[a-z]+)*_${UUID_V4_PATTERN}$`), "Expected a lowercase entity prefix and UUID v4");
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
var utcTimestampSchema = import_zod.z.iso.datetime({ offset: false }).refine((value) => value.endsWith("Z"), "Expected a UTC timestamp ending in Z");
var entityRevisionSchema = import_zod.z.int().positive();
var expectedRevisionSchema = import_zod.z.int().nonnegative();
var sequenceSchema = import_zod.z.int().nonnegative();
var semanticVersionSchema = import_zod.z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/, "Expected SemVer");
var nonEmptyTextSchema = import_zod.z.string().trim().min(1).max(4e3);
var shortTextSchema = import_zod.z.string().trim().min(1).max(240);
var labelSchema = import_zod.z.string().trim().min(1).max(120);
var redactionStatusSchema = import_zod.z.enum(["NOT_REQUIRED", "REDACTED", "VERIFIED_REDACTED"]);
var agentRoleSchema = import_zod.z.enum(["DISCOVERY", "BUILDER", "HELPER", "EVIDENCE_ANALYST"]);
var learningScopeCategorySchema = import_zod.z.enum(["LEARNER_FOCUS", "AGENT_SUPPORT", "EXCLUDED"]);
var decisionCategorySchema = import_zod.z.enum([
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
var actorSchema = import_zod.z.discriminatedUnion("kind", [
  import_zod.z.strictObject({ kind: import_zod.z.literal("USER") }),
  import_zod.z.strictObject({ kind: import_zod.z.literal("AGENT"), role: agentRoleSchema }),
  import_zod.z.strictObject({ kind: import_zod.z.literal("CORE") }),
  import_zod.z.strictObject({ kind: import_zod.z.literal("UI") }),
  import_zod.z.strictObject({ kind: import_zod.z.literal("KIRO_ADAPTER") })
]);
var relativePosixPathSchema = import_zod.z.string().min(1).max(512).superRefine((value, context) => {
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
var import_zod2 = require("zod");
var lineRangeSchema = import_zod2.z.strictObject({
  start: import_zod2.z.int().positive(),
  end: import_zod2.z.int().positive()
}).refine(({ start, end }) => end >= start, {
  message: "Line range end must be greater than or equal to start",
  path: ["end"]
});
var codeReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("CODE"),
  path: relativePosixPathSchema,
  lineRange: lineRangeSchema.optional(),
  revisionRef: labelSchema.optional()
});
var diffReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("DIFF"),
  diffId: diffIdSchema,
  paths: import_zod2.z.array(relativePosixPathSchema).min(1).max(50),
  revisionRef: labelSchema.optional()
});
var testResultReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("TEST_RESULT"),
  testResultId: testResultIdSchema,
  taskId: taskIdSchema
});
var toolCallReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("TOOL_CALL"),
  toolCallId: toolCallIdSchema,
  toolName: labelSchema
});
var userMessageReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("USER_MESSAGE"),
  conversationId: conversationIdSchema,
  messageId: messageIdSchema
});
var userDecisionReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("USER_DECISION"),
  decisionId: decisionIdSchema
});
var userActionReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("USER_ACTION"),
  eventId: eventIdSchema
});
var agentMessageReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("AGENT_MESSAGE"),
  conversationId: conversationIdSchema,
  messageId: messageIdSchema
});
var eventReferenceSchema = import_zod2.z.strictObject({
  kind: import_zod2.z.literal("EVENT"),
  eventId: eventIdSchema
});
var userEvidenceSourceReferenceSchema = import_zod2.z.discriminatedUnion("kind", [
  userMessageReferenceSchema,
  userDecisionReferenceSchema,
  userActionReferenceSchema
]);
var contextualSourceReferenceSchema = import_zod2.z.discriminatedUnion("kind", [
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
var activityPayloadSchema = import_zod3.z.discriminatedUnion("type", [
  import_zod3.z.strictObject({ type: import_zod3.z.literal("TASK_STARTED"), taskId: taskIdSchema }),
  import_zod3.z.strictObject({
    type: import_zod3.z.literal("TASK_COMPLETED"),
    taskId: taskIdSchema,
    completionReportId: completionReportIdSchema
  }),
  import_zod3.z.strictObject({
    type: import_zod3.z.literal("LIVE_CONTEXT_UPDATED"),
    taskId: taskIdSchema,
    liveContextId: liveContextIdSchema,
    contextVersion: entityRevisionSchema
  }),
  import_zod3.z.strictObject({
    type: import_zod3.z.literal("USER_MESSAGE"),
    conversationId: conversationIdSchema,
    messageId: messageIdSchema,
    redactedExcerpt: nonEmptyTextSchema
  }),
  import_zod3.z.strictObject({
    type: import_zod3.z.literal("HELPER_RESPONSE"),
    conversationId: conversationIdSchema,
    messageId: messageIdSchema,
    summary: shortTextSchema
  }),
  import_zod3.z.strictObject({ type: import_zod3.z.literal("DECISION_REQUESTED"), decisionId: decisionIdSchema }),
  import_zod3.z.strictObject({
    type: import_zod3.z.literal("DECISION_RESOLVED"),
    decisionId: decisionIdSchema,
    resolutionId: decisionResolutionIdSchema,
    rationaleProvided: import_zod3.z.boolean()
  }),
  import_zod3.z.strictObject({
    type: import_zod3.z.literal("CONCEPT_REPORTED"),
    taskId: taskIdSchema,
    conceptNames: import_zod3.z.array(labelSchema).min(1).max(30)
  }),
  import_zod3.z.strictObject({
    type: import_zod3.z.literal("VALIDATION_RESULT"),
    taskId: taskIdSchema,
    result: import_zod3.z.enum(["PASSED", "FAILED"]),
    reference: testResultReferenceSchema
  })
]);
var activityEventSchema = import_zod3.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: eventIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  conversationId: conversationIdSchema.optional(),
  correlationId: correlationIdSchema,
  sequence: import_zod3.z.int().nonnegative(),
  actor: actorSchema,
  occurredAt: utcTimestampSchema,
  payload: activityPayloadSchema,
  sourceReferences: import_zod3.z.array(contextualSourceReferenceSchema).max(30),
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
var episodeTypeSchema = import_zod3.z.enum([
  "BUILD_TASK",
  "DECISION",
  "HELPER_CONVERSATION",
  "FINAL_UPGRADE"
]);
var episodeStatusSchema = import_zod3.z.enum([
  "OPEN",
  "PENDING_ANALYSIS",
  "ANALYZED",
  "ANALYSIS_FAILED"
]);
var episodeSchema = import_zod3.z.strictObject({
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
  eventIds: import_zod3.z.array(eventIdSchema).min(1).max(500),
  conceptCandidates: import_zod3.z.array(import_zod3.z.strictObject({ conceptId: conceptIdSchema.optional(), originalExpression: labelSchema })),
  contextReferences: import_zod3.z.array(import_zod3.z.union([codeReferenceSchema, diffReferenceSchema, contextualSourceReferenceSchema])),
  startedAt: utcTimestampSchema,
  endedAt: utcTimestampSchema.optional(),
  closeReason: nonEmptyTextSchema.optional(),
  source: import_zod3.z.strictObject({ kind: import_zod3.z.literal("CORE") }),
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
var import_zod5 = require("zod");

// packages/contracts/dist/evidence.js
var import_zod4 = require("zod");
var conceptStateSchema = import_zod4.z.enum(["OBSERVED", "EXPLAINED", "DEMONSTRATED", "TRANSFERRED"]);
var userUnderstandingStateSchema = import_zod4.z.enum(["EXPLAINED", "DEMONSTRATED", "TRANSFERRED"]);
var evidenceSignalSchema = import_zod4.z.enum([
  "QUESTION",
  "REPHRASE",
  "PREDICTION",
  "JUSTIFIED_DECISION",
  "APPLICATION",
  "TRANSFER",
  "CONTRADICTION"
]);
var evidenceStrengthSchema = import_zod4.z.enum(["NONE", "WEAK", "MEDIUM", "STRONG"]);
var promptDependenceSchema = import_zod4.z.enum(["INDEPENDENT", "LIGHT_HINT", "DIRECTLY_LED"]);
var canonicalConceptSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: conceptIdSchema,
  canonicalName: labelSchema,
  description: nonEmptyTextSchema,
  revision: entityRevisionSchema,
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("CORE") })
});
var conceptAliasProposalSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: aliasProposalIdSchema,
  correlationId: correlationIdSchema,
  proposedAlias: labelSchema,
  canonicalConceptId: conceptIdSchema.optional(),
  rationale: nonEmptyTextSchema,
  uncertainty: nonEmptyTextSchema.optional(),
  status: import_zod4.z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
  proposedAt: utcTimestampSchema,
  source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("AGENT"), role: import_zod4.z.literal("EVIDENCE_ANALYST") })
});
var misconceptionProposalSchema = import_zod4.z.strictObject({
  action: import_zod4.z.enum(["OPEN", "RESOLVE", "NONE"]),
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
var evidenceProposalSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: evidenceProposalIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  episodeId: episodeIdSchema,
  correlationId: correlationIdSchema,
  concept: import_zod4.z.strictObject({
    canonicalConceptId: conceptIdSchema.optional(),
    originalExpression: labelSchema,
    proposedCanonicalName: labelSchema
  }),
  signal: evidenceSignalSchema,
  strength: evidenceStrengthSchema,
  promptDependence: promptDependenceSchema,
  userEvidenceSources: import_zod4.z.array(userEvidenceSourceReferenceSchema).min(1).max(20),
  contextSources: import_zod4.z.array(contextualSourceReferenceSchema).max(30),
  redactedEvidenceExcerpt: nonEmptyTextSchema,
  rationale: nonEmptyTextSchema,
  uncertainty: nonEmptyTextSchema.optional(),
  maximumSupportedState: userUnderstandingStateSchema.nullable(),
  misconception: misconceptionProposalSchema,
  proposedAt: utcTimestampSchema,
  source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("AGENT"), role: import_zod4.z.literal("EVIDENCE_ANALYST") }),
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
var evidenceProposalDraftSchema = import_zod4.z.strictObject({
  concept: import_zod4.z.strictObject({
    canonicalConceptId: conceptIdSchema.optional(),
    originalExpression: labelSchema,
    proposedCanonicalName: labelSchema
  }),
  signal: evidenceSignalSchema,
  strength: evidenceStrengthSchema,
  promptDependence: promptDependenceSchema,
  userEvidenceSources: import_zod4.z.array(userEvidenceSourceReferenceSchema).min(1).max(20),
  contextSources: import_zod4.z.array(contextualSourceReferenceSchema).max(30),
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
var analystSemanticResultSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  proposals: import_zod4.z.array(evidenceProposalDraftSchema).max(100),
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
var evidenceProposalBatchSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  episodeId: episodeIdSchema,
  correlationId: correlationIdSchema,
  episodeRevision: entityRevisionSchema,
  proposals: import_zod4.z.array(evidenceProposalSchema).max(100),
  noEvidenceReason: nonEmptyTextSchema.optional(),
  submittedAt: utcTimestampSchema,
  source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("AGENT"), role: import_zod4.z.literal("EVIDENCE_ANALYST") })
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
var evidenceDecisionSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: evidenceDecisionIdSchema,
  evidenceProposalId: evidenceProposalIdSchema,
  correlationId: correlationIdSchema,
  outcome: import_zod4.z.enum(["ACCEPTED", "REJECTED"]),
  reasonCode: import_zod4.z.enum([
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
  source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("CORE") })
});
var acceptedEvidenceSchema = import_zod4.z.discriminatedUnion("kind", [
  import_zod4.z.strictObject({
    schemaVersion: schemaVersionSchema,
    id: evidenceIdSchema,
    kind: import_zod4.z.literal("USER_UNDERSTANDING"),
    projectId: projectIdSchema,
    taskId: taskIdSchema.optional(),
    episodeId: episodeIdSchema,
    conceptId: conceptIdSchema,
    correlationId: correlationIdSchema,
    evidenceProposalId: evidenceProposalIdSchema,
    evidenceDecisionId: evidenceDecisionIdSchema,
    signal: import_zod4.z.enum(["REPHRASE", "PREDICTION", "JUSTIFIED_DECISION", "APPLICATION", "TRANSFER"]),
    strength: evidenceStrengthSchema,
    promptDependence: promptDependenceSchema,
    supportsState: userUnderstandingStateSchema,
    userEvidenceSources: import_zod4.z.array(userEvidenceSourceReferenceSchema).min(1).max(20),
    acceptedAt: utcTimestampSchema,
    source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("CORE") }),
    redactionStatus: redactionStatusSchema
  }),
  import_zod4.z.strictObject({
    schemaVersion: schemaVersionSchema,
    id: evidenceIdSchema,
    kind: import_zod4.z.literal("MISCONCEPTION_SIGNAL"),
    projectId: projectIdSchema,
    taskId: taskIdSchema.optional(),
    episodeId: episodeIdSchema,
    conceptId: conceptIdSchema,
    correlationId: correlationIdSchema,
    evidenceProposalId: evidenceProposalIdSchema,
    evidenceDecisionId: evidenceDecisionIdSchema,
    signal: import_zod4.z.literal("CONTRADICTION"),
    strength: import_zod4.z.enum(["MEDIUM", "STRONG"]),
    promptDependence: import_zod4.z.enum(["INDEPENDENT", "LIGHT_HINT"]),
    userEvidenceSources: import_zod4.z.array(userEvidenceSourceReferenceSchema).min(1).max(20),
    acceptedAt: utcTimestampSchema,
    source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("CORE") }),
    redactionStatus: redactionStatusSchema
  }),
  import_zod4.z.strictObject({
    schemaVersion: schemaVersionSchema,
    id: evidenceIdSchema,
    kind: import_zod4.z.literal("CONCEPT_OBSERVATION"),
    projectId: projectIdSchema,
    taskId: taskIdSchema.optional(),
    episodeId: episodeIdSchema,
    conceptId: conceptIdSchema,
    correlationId: correlationIdSchema,
    supportsState: import_zod4.z.literal("OBSERVED"),
    contextSources: import_zod4.z.array(contextualSourceReferenceSchema).min(1).max(30),
    acceptedAt: utcTimestampSchema,
    source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("CORE") }),
    redactionStatus: redactionStatusSchema
  })
]);
var misconceptionIssueSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: misconceptionIssueIdSchema,
  conceptId: conceptIdSchema,
  projectId: projectIdSchema,
  openedByEvidenceId: evidenceIdSchema,
  status: import_zod4.z.enum(["OPEN", "RESOLVED"]),
  summary: nonEmptyTextSchema,
  supportingEvidenceIds: import_zod4.z.array(evidenceIdSchema).min(1).max(50),
  resolvedByEvidenceId: evidenceIdSchema.optional(),
  openedAt: utcTimestampSchema,
  resolvedAt: utcTimestampSchema.optional(),
  source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("CORE") })
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
var conceptStateSnapshotSchema = import_zod4.z.strictObject({
  conceptId: conceptIdSchema,
  state: conceptStateSchema,
  acceptedEvidenceIds: import_zod4.z.array(evidenceIdSchema).min(1).max(500),
  reducerVersion: semanticVersionSchema,
  revision: entityRevisionSchema,
  updatedAt: utcTimestampSchema
});
var conceptLedgerEntrySchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: conceptLedgerIdSchema,
  concept: canonicalConceptSchema,
  acceptedAliases: import_zod4.z.array(labelSchema).max(100),
  state: conceptStateSnapshotSchema,
  openIssues: import_zod4.z.array(misconceptionIssueSchema).max(100),
  relatedProjectIds: import_zod4.z.array(projectIdSchema).min(1).max(100),
  relatedTaskIds: import_zod4.z.array(taskIdSchema).max(500),
  revision: entityRevisionSchema,
  updatedAt: utcTimestampSchema,
  source: import_zod4.z.strictObject({ kind: import_zod4.z.literal("CORE") })
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
var evidenceBatchApplicationResultSchema = import_zod4.z.strictObject({
  schemaVersion: schemaVersionSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  outcomes: import_zod4.z.array(import_zod4.z.strictObject({
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
var analysisJobStatusSchema = import_zod5.z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]);
var analysisFailureSchema = import_zod5.z.strictObject({
  code: import_zod5.z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/),
  message: nonEmptyTextSchema,
  retryable: import_zod5.z.boolean()
});
var analysisResultSummarySchema = import_zod5.z.strictObject({
  proposalCount: import_zod5.z.int().min(0).max(100),
  acceptedCount: import_zod5.z.int().min(0).max(100),
  rejectedCount: import_zod5.z.int().min(0).max(100),
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
var analysisJobSchema = import_zod5.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: analysisJobIdSchema,
  projectId: projectIdSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  status: analysisJobStatusSchema,
  attempt: import_zod5.z.int().min(0).max(ANALYSIS_MAX_ATTEMPTS),
  maxAttempts: import_zod5.z.literal(ANALYSIS_MAX_ATTEMPTS),
  timeoutMs: import_zod5.z.literal(ANALYSIS_SOFT_TIMEOUT_MS),
  runtimeHandle: shortTextSchema.optional(),
  deadlineAt: utcTimestampSchema.optional(),
  lastFailure: analysisFailureSchema.optional(),
  resultSummary: analysisResultSummarySchema.optional(),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  startedAt: utcTimestampSchema.optional(),
  completedAt: utcTimestampSchema.optional(),
  source: import_zod5.z.strictObject({ kind: import_zod5.z.literal("CORE") }),
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
  actor: import_zod5.z.strictObject({ kind: import_zod5.z.literal("KIRO_ADAPTER") })
};
var analysisClaimJobCommandSchema = import_zod5.z.strictObject({
  ...analysisRuntimeMetadata,
  kind: import_zod5.z.literal("ANALYSIS_CLAIM_JOB"),
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  runtimeHandle: shortTextSchema
});
var analysisListPendingQuerySchema = import_zod5.z.strictObject({
  ...analysisRuntimeMetadata,
  kind: import_zod5.z.literal("ANALYSIS_LIST_PENDING"),
  limit: import_zod5.z.int().min(1).max(100)
});
var analysisRecoverExpiredCommandSchema = import_zod5.z.strictObject({
  ...analysisRuntimeMetadata,
  kind: import_zod5.z.literal("ANALYSIS_RECOVER_EXPIRED"),
  limit: import_zod5.z.int().min(1).max(100)
});
var analysisFailAttemptCommandSchema = import_zod5.z.strictObject({
  ...analysisRuntimeMetadata,
  kind: import_zod5.z.literal("ANALYSIS_FAIL_ATTEMPT"),
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  attempt: import_zod5.z.int().min(1).max(ANALYSIS_MAX_ATTEMPTS),
  failure: analysisFailureSchema
});
var analysisSubmitResultCommandSchema = import_zod5.z.strictObject({
  ...analysisRuntimeMetadata,
  kind: import_zod5.z.literal("ANALYSIS_SUBMIT_RESULT"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  attempt: import_zod5.z.int().min(1).max(ANALYSIS_MAX_ATTEMPTS),
  result: analystSemanticResultSchema
});
var analysisRuntimeRequestSchema = import_zod5.z.discriminatedUnion("kind", [
  analysisListPendingQuerySchema,
  analysisRecoverExpiredCommandSchema,
  analysisClaimJobCommandSchema,
  analysisFailAttemptCommandSchema,
  analysisSubmitResultCommandSchema
]);

// packages/contracts/dist/agent-contracts.js
var import_zod10 = require("zod");

// packages/contracts/dist/build.js
var import_zod6 = require("zod");
var builderTaskStatusSchema = import_zod6.z.enum([
  "PENDING",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);
var acceptanceCriterionSchema = import_zod6.z.strictObject({
  key: import_zod6.z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  description: nonEmptyTextSchema
});
var builderTaskSchema = import_zod6.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: taskIdSchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  learningSpecRevision: entityRevisionSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  title: labelSchema,
  productGoal: nonEmptyTextSchema,
  requirements: import_zod6.z.array(nonEmptyTextSchema).min(1).max(40),
  acceptanceCriteria: import_zod6.z.array(acceptanceCriterionSchema).min(1).max(40),
  expectedConcepts: import_zod6.z.array(labelSchema).max(20),
  excludedWork: import_zod6.z.array(shortTextSchema).max(30),
  prerequisiteTaskIds: import_zod6.z.array(taskIdSchema).max(20),
  expectedDecisionCategories: import_zod6.z.array(decisionCategorySchema).max(10),
  finalUpgrade: import_zod6.z.strictObject({
    sourceTaskId: taskIdSchema,
    personalizationTraceId: personalizationTraceIdSchema,
    userGoal: nonEmptyTextSchema
  }).optional(),
  sequence: import_zod6.z.int().positive(),
  status: builderTaskStatusSchema,
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  source: import_zod6.z.strictObject({ kind: import_zod6.z.literal("CORE") }),
  redactionStatus: redactionStatusSchema
});
var buildCheckpointSchema = import_zod6.z.enum([
  "TASK_STARTED",
  "DIRECTION_CHANGED",
  "CONCEPT_INTRODUCED",
  "DECISION_REQUIRED",
  "PLAN_CHANGED_AFTER_ERROR",
  "VALIDATION_STARTED",
  "TASK_COMPLETED"
]);
var liveProjectContextSchema = import_zod6.z.strictObject({
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
  recentChanges: import_zod6.z.array(shortTextSchema).max(30),
  activeDecisionIds: import_zod6.z.array(decisionIdSchema).max(10),
  activeConceptNames: import_zod6.z.array(labelSchema).max(20),
  relatedFiles: import_zod6.z.array(codeReferenceSchema).max(30),
  nextActions: import_zod6.z.array(shortTextSchema).max(20),
  blockingReason: nonEmptyTextSchema.optional(),
  updatedAt: utcTimestampSchema,
  source: import_zod6.z.strictObject({ kind: import_zod6.z.literal("AGENT"), role: import_zod6.z.literal("BUILDER") }),
  redactionStatus: redactionStatusSchema
}).refine((context) => context.contextVersion === context.expectedPreviousVersion + 1, {
  path: ["contextVersion"],
  message: "Live Context version must immediately follow expectedPreviousVersion"
});
var contextRefreshRequestStatusSchema = import_zod6.z.enum(["PENDING", "FULFILLED"]);
var contextRefreshRequestSchema = import_zod6.z.strictObject({
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
  source: import_zod6.z.strictObject({ kind: import_zod6.z.literal("AGENT"), role: import_zod6.z.literal("HELPER") }),
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
var builderUpdateLiveContextToolInputSchema = import_zod6.z.strictObject({
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
  recentChanges: import_zod6.z.array(shortTextSchema).max(30),
  activeDecisionIds: import_zod6.z.array(decisionIdSchema).max(10),
  activeConceptNames: import_zod6.z.array(labelSchema).max(20),
  relatedFiles: import_zod6.z.array(codeReferenceSchema).max(30),
  nextActions: import_zod6.z.array(shortTextSchema).max(20),
  blockingReason: nonEmptyTextSchema.optional()
});
var decisionOptionSchema = import_zod6.z.strictObject({
  id: decisionOptionIdSchema,
  label: labelSchema,
  description: nonEmptyTextSchema,
  impacts: import_zod6.z.array(shortTextSchema).min(1).max(12),
  tradeoffs: import_zod6.z.array(shortTextSchema).max(12)
});
var decisionOptionDraftSchema = import_zod6.z.strictObject({
  key: import_zod6.z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  label: labelSchema,
  description: nonEmptyTextSchema,
  impacts: import_zod6.z.array(shortTextSchema).min(1).max(12),
  tradeoffs: import_zod6.z.array(shortTextSchema).max(12)
});
var decisionRequestDraftSchema = import_zod6.z.strictObject({
  category: decisionCategorySchema,
  question: nonEmptyTextSchema,
  reasonRequiredNow: nonEmptyTextSchema,
  options: import_zod6.z.array(decisionOptionDraftSchema).min(2).max(6),
  recommendedOptionKey: import_zod6.z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  recommendationRationale: nonEmptyTextSchema,
  relatedConceptNames: import_zod6.z.array(labelSchema).max(12),
  sourceReferences: import_zod6.z.array(contextualSourceReferenceSchema).max(30),
  independentWorkCanContinue: import_zod6.z.boolean()
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
var decisionContextDraftSchema = import_zod6.z.strictObject({
  stage: labelSchema,
  currentGoal: nonEmptyTextSchema,
  recentChanges: import_zod6.z.array(shortTextSchema).max(30),
  activeConceptNames: import_zod6.z.array(labelSchema).max(20),
  relatedFiles: import_zod6.z.array(codeReferenceSchema).max(30),
  nextActions: import_zod6.z.array(shortTextSchema).max(20),
  blockingReason: nonEmptyTextSchema.optional()
});
var builderRequestDecisionToolInputSchema = import_zod6.z.strictObject({
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
var decisionRequestSchema = import_zod6.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: decisionIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  contextVersion: entityRevisionSchema,
  category: decisionCategorySchema,
  question: nonEmptyTextSchema,
  reasonRequiredNow: nonEmptyTextSchema,
  options: import_zod6.z.array(decisionOptionSchema).min(2).max(6),
  recommendedOptionId: decisionOptionIdSchema,
  recommendationRationale: nonEmptyTextSchema,
  relatedConceptNames: import_zod6.z.array(labelSchema).max(12),
  sourceReferences: import_zod6.z.array(contextualSourceReferenceSchema).max(30),
  independentWorkCanContinue: import_zod6.z.boolean(),
  requestedAt: utcTimestampSchema,
  source: import_zod6.z.strictObject({ kind: import_zod6.z.literal("AGENT"), role: import_zod6.z.literal("BUILDER") }),
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
var decisionResolutionSchema = import_zod6.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: decisionResolutionIdSchema,
  decisionId: decisionIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  expectedContextVersion: entityRevisionSchema,
  selectionKind: import_zod6.z.enum(["OPTION", "RECOMMENDATION", "CUSTOM"]),
  selectedOptionId: decisionOptionIdSchema.optional(),
  customProposal: nonEmptyTextSchema.optional(),
  rationale: nonEmptyTextSchema.optional(),
  helperUsed: import_zod6.z.boolean(),
  resolvedAt: utcTimestampSchema,
  source: import_zod6.z.strictObject({ kind: import_zod6.z.literal("USER") }),
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
var decisionApplicationSchema = import_zod6.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: decisionApplicationIdSchema,
  decisionId: decisionIdSchema,
  resolutionId: decisionResolutionIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  appliedResult: nonEmptyTextSchema,
  sourceReferences: import_zod6.z.array(contextualSourceReferenceSchema).max(30),
  appliedAt: utcTimestampSchema,
  source: import_zod6.z.strictObject({ kind: import_zod6.z.literal("AGENT"), role: import_zod6.z.literal("BUILDER") }),
  redactionStatus: redactionStatusSchema
});
var builderApplyDecisionToolInputSchema = import_zod6.z.strictObject({
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
  sourceReferences: import_zod6.z.array(contextualSourceReferenceSchema).max(30),
  context: decisionContextDraftSchema.omit({ blockingReason: true })
});
var validationResultSchema = import_zod6.z.strictObject({
  name: labelSchema,
  status: import_zod6.z.enum(["PASSED", "FAILED", "NOT_RUN"]),
  summary: nonEmptyTextSchema,
  reference: testResultReferenceSchema.optional()
});
var conceptUsageReportSchema = import_zod6.z.strictObject({
  conceptName: labelSchema,
  scope: learningScopeCategorySchema,
  importance: import_zod6.z.enum(["CORE", "SUPPORTING"]),
  usageReason: nonEmptyTextSchema,
  codeReferences: import_zod6.z.array(codeReferenceSchema).max(20)
});
var taskCompletionReportSchema = import_zod6.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: completionReportIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  correlationId: correlationIdSchema,
  expectedTaskRevision: entityRevisionSchema,
  implementedFeatures: import_zod6.z.array(nonEmptyTextSchema).min(1).max(40),
  acceptanceResults: import_zod6.z.array(import_zod6.z.strictObject({
    criterionKey: import_zod6.z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    status: import_zod6.z.enum(["PASSED", "FAILED"]),
    evidence: import_zod6.z.array(contextualSourceReferenceSchema).max(20)
  })),
  validationResults: import_zod6.z.array(validationResultSchema).max(40),
  conceptUsage: import_zod6.z.array(conceptUsageReportSchema).max(30),
  appliedDecisionIds: import_zod6.z.array(decisionIdSchema).max(20),
  codeReferences: import_zod6.z.array(codeReferenceSchema).max(50),
  diffReferences: import_zod6.z.array(diffReferenceSchema).max(20),
  specDeviations: import_zod6.z.array(nonEmptyTextSchema).max(20),
  remainingIssues: import_zod6.z.array(nonEmptyTextSchema).max(30),
  limitations: import_zod6.z.array(nonEmptyTextSchema).max(30),
  completedAt: utcTimestampSchema,
  source: import_zod6.z.strictObject({ kind: import_zod6.z.literal("AGENT"), role: import_zod6.z.literal("BUILDER") }),
  redactionStatus: redactionStatusSchema
});
var builderCompleteTaskToolInputSchema = import_zod6.z.strictObject({
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
var import_zod7 = require("zod");
var projectStatusSchema = import_zod7.z.enum(["DISCOVERY", "SPEC_REVIEW", "BUILDING", "COMPLETED"]);
var projectSchema = import_zod7.z.strictObject({
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
var learnerLevelSchema = import_zod7.z.enum(["NEW", "BEGINNER", "FAMILIAR", "UNSPECIFIED"]);
var discoveryInputSchema = import_zod7.z.strictObject({
  learningGoal: shortTextSchema,
  personalNeed: nonEmptyTextSchema.optional(),
  recentFriction: nonEmptyTextSchema.optional(),
  interestAreas: import_zod7.z.array(labelSchema).max(12).optional(),
  currentLevel: learnerLevelSchema.optional(),
  freeContext: nonEmptyTextSchema.optional()
});
var discoverySessionStatusSchema = import_zod7.z.enum(["ACTIVE", "SELECTED", "ABANDONED"]);
var discoverySessionSchema = import_zod7.z.strictObject({
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
var candidateGenerationTagSchema = import_zod7.z.enum(["DIRECT", "EXPAND", "DISCOVER", "UPGRADE"]);
var candidateEvaluationCriterionSchema = import_zod7.z.enum([
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
var candidateEvaluationSchema = import_zod7.z.array(import_zod7.z.strictObject({
  criterion: candidateEvaluationCriterionSchema,
  assessment: import_zod7.z.enum(["POSITIVE", "MIXED", "CONCERN"]),
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
var candidateRevisionReferenceSchema = import_zod7.z.strictObject({
  candidateId: candidateIdSchema,
  revision: entityRevisionSchema
});
var candidateScopeSuggestionSchema = import_zod7.z.strictObject({
  learnerFocus: import_zod7.z.array(shortTextSchema).max(20),
  agentSupport: import_zod7.z.array(shortTextSchema).max(20),
  excluded: import_zod7.z.array(shortTextSchema).max(20)
});
var projectCandidateContentShape = {
  title: labelSchema,
  summary: shortTextSchema,
  targetUsers: import_zod7.z.array(shortTextSchema).min(1).max(8),
  coreInteraction: nonEmptyTextSchema,
  usageMoment: nonEmptyTextSchema,
  appeal: nonEmptyTextSchema,
  personalNeedRelationship: nonEmptyTextSchema.optional(),
  technologyNecessity: nonEmptyTextSchema,
  coreConcepts: import_zod7.z.array(labelSchema).min(1).max(12),
  mvpFeatures: import_zod7.z.array(shortTextSchema).min(1).max(20),
  suggestedScope: candidateScopeSuggestionSchema,
  risks: import_zod7.z.array(shortTextSchema).max(12).optional(),
  generationTags: import_zod7.z.array(candidateGenerationTagSchema).min(1).max(4),
  evaluation: candidateEvaluationSchema.optional()
};
var candidatePreviewContentShape = {
  title: labelSchema,
  summary: shortTextSchema,
  coreInteraction: nonEmptyTextSchema,
  appeal: nonEmptyTextSchema,
  technologyNecessity: nonEmptyTextSchema,
  generationTags: import_zod7.z.array(candidateGenerationTagSchema).min(1).max(4)
};
var candidatePreviewDraftSchema = import_zod7.z.strictObject(candidatePreviewContentShape);
var candidatePreviewSchema = import_zod7.z.strictObject({
  candidateId: candidateIdSchema,
  position: import_zod7.z.int().min(1).max(10),
  ...candidatePreviewContentShape
});
var candidatePreviewRoundSchema = import_zod7.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: candidatePreviewRoundIdSchema,
  finalRoundId: candidateRoundIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  inputSnapshot: discoveryInputSchema,
  previews: import_zod7.z.array(candidatePreviewSchema).length(10),
  generationRationale: nonEmptyTextSchema,
  createdAt: utcTimestampSchema,
  source: import_zod7.z.strictObject({ kind: import_zod7.z.literal("AGENT"), role: import_zod7.z.literal("DISCOVERY") }),
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
var projectCandidateRevisionSchema = import_zod7.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: candidateIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  parentRevisions: import_zod7.z.array(candidateRevisionReferenceSchema).max(8),
  ...projectCandidateContentShape,
  createdAt: utcTimestampSchema,
  source: import_zod7.z.strictObject({ kind: import_zod7.z.literal("AGENT"), role: import_zod7.z.literal("DISCOVERY") }),
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
var candidateDiversityCheckSchema = import_zod7.z.strictObject({
  dimensionsReviewed: import_zod7.z.array(import_zod7.z.enum(["PROBLEM_DOMAIN", "TARGET_USER", "CORE_INTERACTION", "DATA_SHAPE", "USER_APPEAL"])),
  modeCollapseDetected: import_zod7.z.boolean(),
  rationale: nonEmptyTextSchema
});
var candidateDraftSchema = import_zod7.z.strictObject({
  lineage: import_zod7.z.discriminatedUnion("kind", [
    import_zod7.z.strictObject({ kind: import_zod7.z.literal("NEW") }),
    import_zod7.z.strictObject({
      kind: import_zod7.z.literal("REVISION"),
      candidateId: candidateIdSchema,
      revision: entityRevisionSchema,
      parentRevisions: import_zod7.z.array(candidateRevisionReferenceSchema).min(1).max(8)
    })
  ]),
  ...projectCandidateContentShape
});
var discoverySubmitCandidateRoundToolInputSchema = import_zod7.z.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  appliedFeedbackIds: import_zod7.z.array(feedbackIdSchema).max(100),
  carriedCandidates: import_zod7.z.array(candidateRevisionReferenceSchema).max(30),
  candidates: import_zod7.z.array(candidateDraftSchema).max(30),
  generationRationale: nonEmptyTextSchema,
  diversityCheck: candidateDiversityCheckSchema
});
var discoverySubmitCandidateMergeToolInputSchema = discoverySubmitCandidateRoundToolInputSchema.omit({ appliedFeedbackIds: true, carriedCandidates: true, candidates: true }).extend({ candidate: candidateDraftSchema.omit({ lineage: true }) });
var discoverySubmitCandidatePreviewsToolInputSchema = import_zod7.z.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previews: import_zod7.z.array(candidatePreviewDraftSchema).length(10),
  generationRationale: nonEmptyTextSchema
});
var candidateEnrichmentBatchSchema = import_zod7.z.enum(["FIRST", "SECOND", "SELECTED"]);
var candidateEnrichmentDraftSchema = import_zod7.z.strictObject({
  candidateId: candidateIdSchema,
  ...projectCandidateContentShape
});
var candidateEnrichmentSchema = import_zod7.z.strictObject({
  schemaVersion: schemaVersionSchema,
  previewRoundId: candidatePreviewRoundIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  candidate: projectCandidateRevisionSchema,
  createdAt: utcTimestampSchema,
  source: import_zod7.z.strictObject({ kind: import_zod7.z.literal("AGENT"), role: import_zod7.z.literal("DISCOVERY") }),
  redactionStatus: redactionStatusSchema
});
var discoverySubmitCandidateEnrichmentsToolInputBaseSchema = import_zod7.z.strictObject({
  __tool_use_purpose: nonEmptyTextSchema.optional(),
  schemaVersion: schemaVersionSchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previewRoundId: candidatePreviewRoundIdSchema,
  batch: candidateEnrichmentBatchSchema,
  candidates: import_zod7.z.array(candidateEnrichmentDraftSchema).min(1).max(10)
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
var candidateRoundSchema = import_zod7.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: candidateRoundIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  correlationId: correlationIdSchema,
  roundIndex: entityRevisionSchema,
  inputSnapshot: discoveryInputSchema,
  appliedFeedbackIds: import_zod7.z.array(feedbackIdSchema).max(100),
  candidates: import_zod7.z.array(candidateRevisionReferenceSchema).min(1).max(30),
  generationRationale: nonEmptyTextSchema,
  diversityCheck: candidateDiversityCheckSchema,
  createdAt: utcTimestampSchema,
  source: import_zod7.z.strictObject({ kind: import_zod7.z.literal("AGENT"), role: import_zod7.z.literal("DISCOVERY") }),
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
var discoveryFeedbackIntentSchema = import_zod7.z.enum([
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
var discoveryFeedbackSchema = import_zod7.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: feedbackIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  roundId: candidateRoundIdSchema,
  correlationId: correlationIdSchema,
  intent: discoveryFeedbackIntentSchema,
  targets: import_zod7.z.array(candidateRevisionReferenceSchema).max(8),
  message: nonEmptyTextSchema.optional(),
  createdAt: utcTimestampSchema,
  source: import_zod7.z.strictObject({ kind: import_zod7.z.literal("USER") }),
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
var import_zod8 = require("zod");
var learningScopeItemSchema = import_zod8.z.strictObject({
  category: learningScopeCategorySchema,
  title: labelSchema,
  rationale: nonEmptyTextSchema,
  conceptNames: import_zod8.z.array(labelSchema).max(12)
});
var expectedDecisionAreaSchema = import_zod8.z.strictObject({
  category: decisionCategorySchema,
  description: nonEmptyTextSchema,
  whyUserInputMatters: nonEmptyTextSchema
});
var learningSpecStatusSchema = import_zod8.z.enum(["DRAFT", "CONFIRMED", "SUPERSEDED"]);
var learningSpecConfirmationSchema = import_zod8.z.strictObject({
  confirmedAt: utcTimestampSchema,
  confirmedBy: import_zod8.z.strictObject({ kind: import_zod8.z.literal("USER") })
});
var learningSpecContentShape = {
  productPurpose: nonEmptyTextSchema,
  targetUsers: import_zod8.z.array(shortTextSchema).min(1).max(8),
  primaryUsageMoment: nonEmptyTextSchema,
  successMoment: nonEmptyTextSchema,
  mvpFeatures: import_zod8.z.array(shortTextSchema).min(1).max(30),
  scope: import_zod8.z.array(learningScopeItemSchema).min(1).max(60),
  expectedDecisions: import_zod8.z.array(expectedDecisionAreaSchema).max(20),
  runtimeConstraint: import_zod8.z.literal("TYPESCRIPT"),
  deploymentConstraints: import_zod8.z.array(shortTextSchema).min(1).max(12)
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
var learningSpecDraftContentSchema = import_zod8.z.strictObject(learningSpecContentShape).superRefine(requireAllScopeCategories);
var discoverySubmitLearningSpecToolInputSchema = import_zod8.z.strictObject({
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
var learningSpecRevisionSchema = import_zod8.z.strictObject({
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
var import_zod9 = require("zod");
var personalizationPurposeSchema = import_zod9.z.enum([
  "DISCOVERY_TIE_BREAK",
  "HELPER_EXPLANATION_START",
  "HELPER_PAST_EXPERIENCE_CONNECTION",
  "HELPER_TASK_USER_EVIDENCE_CONNECTION"
]);
var personalizationBasisSchema = import_zod9.z.strictObject({
  conceptId: conceptIdSchema,
  conceptName: labelSchema,
  ledgerRevision: entityRevisionSchema,
  state: conceptStateSchema,
  evidenceIds: import_zod9.z.array(evidenceIdSchema).min(1).max(5),
  episodeIds: import_zod9.z.array(episodeIdSchema).min(1).max(5),
  sourceProjectIds: import_zod9.z.array(projectIdSchema).min(1).max(5),
  sourceProjectTitles: import_zod9.z.array(labelSchema).min(1).max(5),
  openIssueIds: import_zod9.z.array(misconceptionIssueIdSchema).max(10),
  purpose: personalizationPurposeSchema,
  redactedEvidenceExcerpt: shortTextSchema.optional()
});
var personalizationFallbackReasonSchema = import_zod9.z.enum([
  "NO_LEDGER",
  "NO_RELEVANT_CONCEPT",
  "NO_PRIOR_PROJECT_EVIDENCE"
]);
var personalizationTargetSchema = import_zod9.z.discriminatedUnion("kind", [
  import_zod9.z.strictObject({
    kind: import_zod9.z.literal("DISCOVERY_SESSION"),
    discoverySessionId: discoverySessionIdSchema
  }),
  import_zod9.z.strictObject({
    kind: import_zod9.z.literal("HELPER_TURN"),
    taskId: taskIdSchema,
    decisionId: decisionIdSchema.optional()
  })
]);
var personalizationTraceSchema = import_zod9.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: personalizationTraceIdSchema,
  projectId: projectIdSchema,
  correlationId: correlationIdSchema,
  target: personalizationTargetSchema,
  mode: import_zod9.z.enum(["EVIDENCE_AWARE", "NO_RELEVANT_EVIDENCE"]),
  basis: import_zod9.z.array(personalizationBasisSchema).max(5),
  fallbackReason: personalizationFallbackReasonSchema.optional(),
  createdAt: utcTimestampSchema,
  source: import_zod9.z.strictObject({ kind: import_zod9.z.literal("CORE") }),
  redactionStatus: import_zod9.z.literal("VERIFIED_REDACTED")
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
var evidenceTraceEvidenceItemSchema = import_zod9.z.strictObject({
  evidenceId: evidenceIdSchema,
  kind: import_zod9.z.enum(["USER_UNDERSTANDING", "MISCONCEPTION_SIGNAL", "CONCEPT_OBSERVATION"]),
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
var rejectedEvidenceItemSchema = import_zod9.z.strictObject({
  proposalId: evidenceProposalIdSchema,
  evidenceDecisionId: evidenceDecisionIdSchema,
  projectId: projectIdSchema,
  projectTitle: labelSchema,
  episodeId: episodeIdSchema,
  episodeType: episodeTypeSchema,
  proposedConceptName: labelSchema,
  signal: import_zod9.z.enum([
    "QUESTION",
    "REPHRASE",
    "PREDICTION",
    "JUSTIFIED_DECISION",
    "APPLICATION",
    "TRANSFER",
    "CONTRADICTION"
  ]),
  strength: import_zod9.z.enum(["NONE", "WEAK", "MEDIUM", "STRONG"]),
  promptDependence: import_zod9.z.enum(["INDEPENDENT", "LIGHT_HINT", "DIRECTLY_LED"]),
  redactedEvidenceExcerpt: nonEmptyTextSchema,
  reasonCode: import_zod9.z.enum([
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
var conceptEvidenceTraceViewSchema = import_zod9.z.strictObject({
  conceptId: conceptIdSchema,
  conceptName: labelSchema,
  description: nonEmptyTextSchema,
  state: conceptStateSchema.nullable(),
  stateRevision: entityRevisionSchema.nullable(),
  reducerVersion: import_zod9.z.string().trim().min(1).max(64).nullable(),
  updatedAt: utcTimestampSchema.nullable(),
  stateEvidenceIds: import_zod9.z.array(evidenceIdSchema).max(500),
  evidence: import_zod9.z.array(evidenceTraceEvidenceItemSchema).max(100),
  rejectedEvidence: import_zod9.z.array(rejectedEvidenceItemSchema).max(100),
  openIssues: import_zod9.z.array(misconceptionIssueSchema).max(100)
});
var evidenceAnalysisStatusItemSchema = import_zod9.z.strictObject({
  analysisJobId: analysisJobIdSchema,
  episodeId: episodeIdSchema,
  status: import_zod9.z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]),
  revision: entityRevisionSchema,
  resultSummary: analysisResultSummarySchema.optional(),
  lastFailure: analysisFailureSchema.optional(),
  updatedAt: utcTimestampSchema
});
var projectEvidenceTraceSchema = import_zod9.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  concepts: import_zod9.z.array(conceptEvidenceTraceViewSchema).max(100),
  analysis: import_zod9.z.array(evidenceAnalysisStatusItemSchema).max(100),
  personalization: import_zod9.z.array(personalizationTraceSchema).max(100),
  emptyReason: shortTextSchema.optional(),
  redactionStatus: redactionStatusSchema
});

// packages/contracts/dist/agent-contracts.js
var discoveryQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: import_zod10.z.strictObject({ kind: import_zod10.z.literal("AGENT"), role: import_zod10.z.literal("DISCOVERY") })
};
var builderQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: import_zod10.z.strictObject({ kind: import_zod10.z.literal("AGENT"), role: import_zod10.z.literal("BUILDER") })
};
var helperQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: import_zod10.z.strictObject({ kind: import_zod10.z.literal("AGENT"), role: import_zod10.z.literal("HELPER") })
};
var analystQueryMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: import_zod10.z.strictObject({ kind: import_zod10.z.literal("AGENT"), role: import_zod10.z.literal("EVIDENCE_ANALYST") })
};
var discoveryGetContextQuerySchema = import_zod10.z.strictObject({
  ...discoveryQueryMetadata,
  kind: import_zod10.z.literal("DISCOVERY_GET_CONTEXT"),
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema.optional()
});
var builderGetTaskQuerySchema = import_zod10.z.strictObject({
  ...builderQueryMetadata,
  kind: import_zod10.z.literal("BUILDER_GET_TASK"),
  projectId: projectIdSchema,
  taskId: taskIdSchema
});
var builderGetDecisionResultQuerySchema = import_zod10.z.strictObject({
  ...builderQueryMetadata,
  kind: import_zod10.z.literal("BUILDER_GET_DECISION_RESULT"),
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  decisionId: decisionIdSchema
});
var helperGetContextQuerySchema = import_zod10.z.strictObject({
  ...helperQueryMetadata,
  kind: import_zod10.z.literal("HELPER_GET_CONTEXT"),
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  question: nonEmptyTextSchema,
  relatedConceptNames: import_zod10.z.array(labelSchema).max(5),
  observedContextVersion: entityRevisionSchema.optional()
});
var analystGetEpisodeContextQuerySchema = import_zod10.z.strictObject({
  ...analystQueryMetadata,
  kind: import_zod10.z.literal("ANALYST_GET_EPISODE_CONTEXT"),
  projectId: projectIdSchema,
  episodeId: episodeIdSchema,
  expectedEpisodeRevision: entityRevisionSchema
});
var discoverySubmitCandidateRoundCommandSchema = import_zod10.z.strictObject({
  ...discoveryQueryMetadata,
  kind: import_zod10.z.literal("DISCOVERY_SUBMIT_CANDIDATE_ROUND"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  round: candidateRoundSchema,
  candidates: import_zod10.z.array(projectCandidateRevisionSchema).max(30)
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
var discoverySubmitCandidatePreviewsCommandSchema = import_zod10.z.strictObject({
  ...discoveryQueryMetadata,
  kind: import_zod10.z.literal("DISCOVERY_SUBMIT_CANDIDATE_PREVIEWS"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previewRound: candidatePreviewRoundSchema
}).refine((command) => command.previewRound.correlationId === command.correlationId, {
  path: ["previewRound", "correlationId"],
  message: "Candidate Preview Round correlation ID must match its command"
});
var discoverySubmitCandidateEnrichmentsCommandSchema = import_zod10.z.strictObject({
  ...discoveryQueryMetadata,
  kind: import_zod10.z.literal("DISCOVERY_SUBMIT_CANDIDATE_ENRICHMENTS"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: expectedRevisionSchema,
  previewRoundId: candidatePreviewRoundSchema.shape.id,
  batch: candidateEnrichmentBatchSchema,
  enrichments: import_zod10.z.array(candidateEnrichmentSchema).min(1).max(10)
}).superRefine((command, context) => {
  if (command.batch !== "SELECTED" && command.enrichments.length !== 5) {
    context.addIssue({
      code: "custom",
      path: ["enrichments"],
      message: `${command.batch} enrichment must contain exactly five candidates`
    });
  }
});
var discoverySubmitLearningSpecCommandSchema = import_zod10.z.strictObject({
  ...discoveryQueryMetadata,
  kind: import_zod10.z.literal("DISCOVERY_SUBMIT_LEARNING_SPEC"),
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
var builderStartTaskCommandSchema = import_zod10.z.strictObject({
  ...builderQueryMetadata,
  kind: import_zod10.z.literal("BUILDER_START_TASK"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  expectedTaskRevision: expectedRevisionSchema
});
var builderUpdateLiveContextCommandSchema = import_zod10.z.strictObject({
  ...builderQueryMetadata,
  kind: import_zod10.z.literal("BUILDER_UPDATE_LIVE_CONTEXT"),
  idempotencyKey: idempotencyKeySchema,
  context: liveProjectContextSchema
}).refine((command) => command.context.correlationId === command.correlationId, {
  path: ["context", "correlationId"],
  message: "Live Context correlation ID must match its command"
});
var builderRequestDecisionCommandSchema = import_zod10.z.strictObject({
  ...builderQueryMetadata,
  kind: import_zod10.z.literal("BUILDER_REQUEST_DECISION"),
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
var builderApplyDecisionCommandSchema = import_zod10.z.strictObject({
  ...builderQueryMetadata,
  kind: import_zod10.z.literal("BUILDER_APPLY_DECISION"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  decisionId: decisionIdSchema,
  expectedTaskRevision: expectedRevisionSchema,
  expectedContextVersion: entityRevisionSchema,
  appliedResult: nonEmptyTextSchema,
  sourceReferences: import_zod10.z.array(contextualSourceReferenceSchema).max(30),
  context: decisionContextDraftSchema.omit({ blockingReason: true })
});
var builderCompleteTaskCommandSchema = import_zod10.z.strictObject({
  ...builderQueryMetadata,
  kind: import_zod10.z.literal("BUILDER_COMPLETE_TASK"),
  idempotencyKey: idempotencyKeySchema,
  report: taskCompletionReportSchema
}).refine((command) => command.report.correlationId === command.correlationId, {
  path: ["report", "correlationId"],
  message: "Completion Report correlation ID must match its command"
});
var helperRequestContextRefreshCommandSchema = import_zod10.z.strictObject({
  ...helperQueryMetadata,
  kind: import_zod10.z.literal("HELPER_REQUEST_CONTEXT_REFRESH"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  observedContextVersion: entityRevisionSchema.optional(),
  reason: nonEmptyTextSchema
});
var analystSubmitEvidenceProposalsCommandSchema = import_zod10.z.strictObject({
  ...analystQueryMetadata,
  kind: import_zod10.z.literal("ANALYST_SUBMIT_EVIDENCE_PROPOSALS"),
  idempotencyKey: idempotencyKeySchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema,
  attempt: import_zod10.z.int().min(1).max(2),
  batch: evidenceProposalBatchSchema
}).refine((command) => command.batch.correlationId === command.correlationId, {
  path: ["batch", "correlationId"],
  message: "Evidence batch correlation ID must match its command"
});
var discoveryAgentRequestSchema = import_zod10.z.discriminatedUnion("kind", [
  discoveryGetContextQuerySchema,
  discoverySubmitCandidatePreviewsCommandSchema,
  discoverySubmitCandidateEnrichmentsCommandSchema,
  discoverySubmitCandidateRoundCommandSchema,
  discoverySubmitLearningSpecCommandSchema
]);
var builderAgentRequestSchema = import_zod10.z.discriminatedUnion("kind", [
  builderGetTaskQuerySchema,
  builderGetDecisionResultQuerySchema,
  builderStartTaskCommandSchema,
  builderUpdateLiveContextCommandSchema,
  builderRequestDecisionCommandSchema,
  builderApplyDecisionCommandSchema,
  builderCompleteTaskCommandSchema
]);
var helperAgentRequestSchema = import_zod10.z.discriminatedUnion("kind", [
  helperGetContextQuerySchema,
  helperRequestContextRefreshCommandSchema
]);
var evidenceAnalystRequestSchema = import_zod10.z.discriminatedUnion("kind", [
  analystGetEpisodeContextQuerySchema,
  analystSubmitEvidenceProposalsCommandSchema
]);
var agentRequestSchema = import_zod10.z.discriminatedUnion("kind", [
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
var discoveryContextSchema = import_zod10.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  project: projectSchema,
  session: discoverySessionSchema,
  rounds: import_zod10.z.array(candidateRoundSchema).max(100),
  candidates: import_zod10.z.array(projectCandidateRevisionSchema).max(1e3),
  feedback: import_zod10.z.array(discoveryFeedbackSchema).max(1e3),
  learningSpec: learningSpecRevisionSchema.nullable(),
  previewRound: candidatePreviewRoundSchema.nullable().default(null),
  candidateEnrichments: import_zod10.z.array(candidateEnrichmentSchema).max(10).default([]),
  relevantLedgerEntries: import_zod10.z.array(conceptLedgerEntrySchema).max(20),
  personalization: personalizationTraceSchema
});
var builderTaskContextSchema = import_zod10.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  project: projectSchema,
  learningSpec: learningSpecRevisionSchema,
  task: builderTaskSchema,
  liveContext: liveProjectContextSchema.nullable(),
  decisionRequests: import_zod10.z.array(decisionRequestSchema).max(50),
  decisionResolutions: import_zod10.z.array(decisionResolutionSchema).max(50),
  decisionApplications: import_zod10.z.array(decisionApplicationSchema).max(50),
  pendingContextRefreshRequests: import_zod10.z.array(contextRefreshRequestSchema).max(20)
});
var helperEpisodeSummarySchema = import_zod10.z.strictObject({
  episodeId: episodeIdSchema,
  type: import_zod10.z.enum(["BUILD_TASK", "DECISION", "HELPER_CONVERSATION", "FINAL_UPGRADE"]),
  endedAt: utcTimestampSchema,
  conceptNames: import_zod10.z.array(labelSchema).max(20),
  redactedUserExcerpts: import_zod10.z.array(nonEmptyTextSchema).max(5),
  helperResponseSummaries: import_zod10.z.array(nonEmptyTextSchema).max(5),
  contextReferences: import_zod10.z.array(contextualSourceReferenceSchema).max(10)
});
var helperSourceExcerptSchema = import_zod10.z.strictObject({
  reference: codeReferenceSchema,
  redactedExcerpt: import_zod10.z.string().trim().min(1).max(8192),
  truncated: import_zod10.z.boolean(),
  redactionStatus: import_zod10.z.literal("VERIFIED_REDACTED")
});
var helperReferenceDetailSchema = import_zod10.z.strictObject({
  reference: contextualSourceReferenceSchema,
  availability: import_zod10.z.enum(["EXCERPT_INCLUDED", "REFERENCE_ONLY", "UNAVAILABLE"]),
  reason: import_zod10.z.string().trim().min(1).max(240).optional()
});
var helperContextSchema = import_zod10.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  project: projectSchema,
  learningSpec: learningSpecRevisionSchema,
  task: builderTaskSchema,
  liveContext: liveProjectContextSchema.nullable(),
  activeDecisions: import_zod10.z.array(decisionRequestSchema).max(10),
  focusedDecision: decisionRequestSchema.nullable(),
  relevantLedgerEntries: import_zod10.z.array(conceptLedgerEntrySchema).max(5),
  personalization: personalizationTraceSchema,
  recentEpisodes: import_zod10.z.array(helperEpisodeSummarySchema).max(5),
  contextReferences: import_zod10.z.array(contextualSourceReferenceSchema).max(30),
  referenceDetails: import_zod10.z.array(helperReferenceDetailSchema).max(30),
  sourceExcerpts: import_zod10.z.array(helperSourceExcerptSchema).max(3),
  pendingContextRefreshRequests: import_zod10.z.array(contextRefreshRequestSchema).max(20),
  freshness: import_zod10.z.strictObject({
    currentContextVersion: entityRevisionSchema.nullable(),
    observedContextVersion: entityRevisionSchema.nullable(),
    status: import_zod10.z.enum(["CURRENT", "STALE", "MISSING"]),
    stale: import_zod10.z.boolean(),
    refreshRequired: import_zod10.z.boolean()
  })
});
var episodeContextSchema = import_zod10.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  episode: episodeSchema,
  events: import_zod10.z.array(activityEventSchema).min(1).max(500),
  relevantLedgerEntries: import_zod10.z.array(conceptLedgerEntrySchema).max(20),
  analysisJob: analysisJobSchema.nullable(),
  decisionContext: import_zod10.z.strictObject({
    request: decisionRequestSchema,
    resolution: decisionResolutionSchema.nullable()
  }).nullable()
});
var decisionResultSchema = import_zod10.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  request: decisionRequestSchema,
  resolution: decisionResolutionSchema.nullable(),
  application: decisionApplicationSchema.nullable()
});
var decisionCommandReceiptSchema = import_zod10.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  accepted: import_zod10.z.literal(true),
  resourceRevision: entityRevisionSchema,
  decisionId: decisionIdSchema
});
var commandReceiptSchema = import_zod10.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  accepted: import_zod10.z.literal(true),
  resourceRevision: entityRevisionSchema
});

// packages/contracts/dist/audit.js
var import_zod11 = require("zod");
var auditActionSchema = import_zod11.z.enum([
  "CREATED",
  "UPDATED",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "RESOLVED",
  "APPLIED",
  "REDACTED"
]);
var auditOutcomeSchema = import_zod11.z.enum(["SUCCEEDED", "REJECTED", "FAILED"]);
var auditRecordSchema = import_zod11.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: auditRecordIdSchema,
  correlationId: correlationIdSchema,
  actor: actorSchema,
  action: auditActionSchema,
  resource: import_zod11.z.strictObject({
    type: import_zod11.z.enum([
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
    revision: import_zod11.z.int().positive().optional()
  }),
  outcome: auditOutcomeSchema,
  reasonCode: import_zod11.z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/).optional(),
  summary: nonEmptyTextSchema,
  changedFields: import_zod11.z.array(import_zod11.z.string().regex(/^[a-z][A-Za-z0-9.]{0,119}$/)).max(100),
  occurredAt: utcTimestampSchema,
  redactionStatus: redactionStatusSchema
});

// packages/contracts/dist/evaluation.js
var import_zod12 = require("zod");
var contractDomainSchema = import_zod12.z.enum([
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
var evaluationDimensionSchema = import_zod12.z.enum([
  "DISCOVERY_DIVERSITY",
  "CONCEPT_NECESSITY",
  "SPEC_SCOPE",
  "CONTEXT_COMPLETENESS",
  "DECISION_NECESSITY",
  "EVIDENCE_QUALITY",
  "REDACTION",
  "CONTRACT_INTEGRITY"
]);
var evaluationReviewModeSchema = import_zod12.z.enum(["AUTOMATED", "HUMAN"]);
var evaluationCriterionStatusSchema = import_zod12.z.enum(["PASSED", "FAILED", "NEEDS_REVIEW", "ERROR"]);
var criterionKeySchema = import_zod12.z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
var evaluationCriterionSchema = import_zod12.z.strictObject({
  key: criterionKeySchema,
  dimension: evaluationDimensionSchema,
  reviewMode: evaluationReviewModeSchema,
  description: nonEmptyTextSchema,
  successDefinition: nonEmptyTextSchema
});
var evaluationFixtureSchema = import_zod12.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: fixtureIdSchema,
  name: labelSchema,
  description: nonEmptyTextSchema,
  kind: import_zod12.z.enum([
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
  expectedContractDomains: import_zod12.z.array(contractDomainSchema).min(1).max(20),
  criteria: import_zod12.z.array(evaluationCriterionSchema).min(1).max(50),
  scenarioTags: import_zod12.z.array(labelSchema).max(20),
  fixtureVersion: semanticVersionSchema,
  containsPersonalData: import_zod12.z.literal(false),
  redactionStatus: import_zod12.z.literal("VERIFIED_REDACTED")
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
var evaluationMetricSchema = import_zod12.z.strictObject({
  name: labelSchema,
  value: import_zod12.z.number().finite(),
  unit: import_zod12.z.enum(["COUNT", "RATIO", "MILLISECONDS", "TOKENS"]),
  interpretation: nonEmptyTextSchema
});
var evaluationCriterionResultSchema = import_zod12.z.strictObject({
  criterionKey: criterionKeySchema,
  dimension: evaluationDimensionSchema,
  reviewMode: evaluationReviewModeSchema,
  status: evaluationCriterionStatusSchema,
  explanation: nonEmptyTextSchema,
  evidenceReferences: import_zod12.z.array(nonEmptyTextSchema).max(30),
  metrics: import_zod12.z.array(evaluationMetricSchema).max(30)
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
var evaluationCaseResultSchema = import_zod12.z.strictObject({
  fixtureId: fixtureIdSchema,
  fixtureVersion: semanticVersionSchema,
  status: evaluationCriterionStatusSchema,
  criterionResults: import_zod12.z.array(evaluationCriterionResultSchema).min(1).max(50),
  metrics: import_zod12.z.array(evaluationMetricSchema).max(100),
  notes: import_zod12.z.array(nonEmptyTextSchema).max(50)
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
var evaluationRunSchema = import_zod12.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: evaluationRunIdSchema,
  correlationId: correlationIdSchema,
  revision: entityRevisionSchema,
  evaluatorVersion: semanticVersionSchema,
  systemUnderTestVersion: semanticVersionSchema,
  fixtureIds: import_zod12.z.array(fixtureIdSchema).min(1).max(500),
  status: import_zod12.z.enum(["PENDING", "RUNNING", "NEEDS_REVIEW", "COMPLETED", "FAILED"]),
  startedAt: utcTimestampSchema,
  completedAt: utcTimestampSchema.optional(),
  results: import_zod12.z.array(evaluationCaseResultSchema).max(500),
  redactionStatus: import_zod12.z.literal("VERIFIED_REDACTED")
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
var baselineResultSchema = import_zod12.z.strictObject({
  schemaVersion: schemaVersionSchema,
  id: baselineResultIdSchema,
  evaluationRunId: evaluationRunIdSchema,
  correlationId: correlationIdSchema,
  kind: import_zod12.z.enum(["CALIBRATION", "GENERIC_KIRO", "SIMPLE_MEMORY", "ABLATION"]),
  baselineName: labelSchema,
  baselineVersion: semanticVersionSchema,
  results: import_zod12.z.array(evaluationCaseResultSchema).min(1).max(500),
  recordedAt: utcTimestampSchema,
  redactionStatus: import_zod12.z.literal("VERIFIED_REDACTED")
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
var import_zod13 = require("zod");
var generatedResultUrlPathSchema = import_zod13.z.string().trim().min(1).max(240).refine((value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.includes("?") && !value.includes("#") && !value.split("/").includes(".."), "Generated web result path must be a local absolute URL path");
var generatedResultManifestSchema = import_zod13.z.strictObject({
  schemaVersion: schemaVersionSchema,
  kind: import_zod13.z.literal("WEB"),
  entry: relativePosixPathSchema.refine((value) => /\.(?:cjs|mjs|js)$/.test(value), "Generated web result entry must be compiled JavaScript"),
  healthPath: generatedResultUrlPathSchema,
  openPath: generatedResultUrlPathSchema.default("/")
});

// packages/contracts/dist/ui-contracts.js
var import_zod14 = require("zod");
var uiRequestMetadata = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  actor: import_zod14.z.strictObject({ kind: import_zod14.z.literal("UI") })
};
var uiStartDiscoveryCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_START_DISCOVERY"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  input: discoveryInputSchema
});
var uiRecordDiscoveryFeedbackCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_RECORD_DISCOVERY_FEEDBACK"),
  idempotencyKey: idempotencyKeySchema,
  expectedSessionRevision: entityRevisionSchema,
  feedback: discoveryFeedbackSchema
}).refine((command) => command.feedback.correlationId === command.correlationId, {
  path: ["feedback", "correlationId"],
  message: "Discovery Feedback correlation ID must match its command"
});
var uiConfirmLearningSpecCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_CONFIRM_LEARNING_SPEC"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  expectedSpecRevision: entityRevisionSchema
});
var uiPrepareBuilderTaskCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_PREPARE_BUILDER_TASK"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  expectedSpecRevision: entityRevisionSchema
});
var uiPrepareFinalUpgradeTaskCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_PREPARE_FINAL_UPGRADE_TASK"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  sourceTaskId: taskIdSchema,
  expectedSourceTaskRevision: entityRevisionSchema,
  personalizationTraceId: personalizationTraceIdSchema,
  userGoal: nonEmptyTextSchema
});
var uiUpdateLearningSpecCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_UPDATE_LEARNING_SPEC"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  learningSpecId: learningSpecIdSchema,
  expectedSessionRevision: entityRevisionSchema,
  expectedSpecRevision: entityRevisionSchema,
  draft: learningSpecDraftContentSchema
});
var uiReturnToDiscoveryCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_RETURN_TO_DISCOVERY"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  discoverySessionId: discoverySessionIdSchema,
  expectedSessionRevision: entityRevisionSchema,
  expectedSpecRevision: import_zod14.z.int().nonnegative(),
  input: discoveryInputSchema.optional()
});
var uiResolveDecisionCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_RESOLVE_DECISION"),
  idempotencyKey: idempotencyKeySchema,
  resolution: decisionResolutionSchema
}).refine((command) => command.resolution.correlationId === command.correlationId, {
  path: ["resolution", "correlationId"],
  message: "Decision Resolution correlation ID must match its command"
});
var uiOpenHelperQuerySchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_OPEN_HELPER"),
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  question: nonEmptyTextSchema.optional()
});
var uiPrepareBuilderSessionQuerySchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_PREPARE_BUILDER_SESSION"),
  purpose: import_zod14.z.enum(["AGENT_SESSION", "WORKSPACE_VIEW"]).optional(),
  projectId: projectIdSchema,
  taskId: taskIdSchema
});
var uiListProjectsQuerySchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_LIST_PROJECTS"),
  limit: import_zod14.z.int().min(1).max(100)
});
var uiRestoreProjectSessionQuerySchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_RESTORE_PROJECT_SESSION"),
  projectId: projectIdSchema,
  helperConversationLimit: import_zod14.z.int().min(1).max(20)
});
var uiPrepareDiscoveryAgentContextQuerySchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_PREPARE_DISCOVERY_AGENT_CONTEXT"),
  projectId: projectIdSchema,
  helperConversationLimit: import_zod14.z.int().min(1).max(20)
});
var uiRecordHelperExchangeCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_RECORD_HELPER_EXCHANGE"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  decisionId: decisionIdSchema.optional(),
  conversationId: conversationIdSchema.optional(),
  userMessage: nonEmptyTextSchema,
  helperResponseSummary: shortTextSchema,
  origin: import_zod14.z.enum(["FREE_TEXT", "QUICK_ACTION"]).default("FREE_TEXT"),
  closeConversation: import_zod14.z.boolean()
});
var uiRetryAnalysisCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_RETRY_ANALYSIS"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema,
  analysisJobId: analysisJobIdSchema,
  expectedJobRevision: entityRevisionSchema
});
var uiReadAnalysisJobsQuerySchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_READ_ANALYSIS_JOBS"),
  projectId: projectIdSchema,
  status: analysisJobStatusSchema.optional(),
  limit: import_zod14.z.int().min(1).max(100)
});
var uiReadEvidenceTraceQuerySchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_READ_EVIDENCE_TRACE"),
  projectId: projectIdSchema,
  conceptId: conceptIdSchema.optional()
});
var uiLaunchResultCommandSchema = import_zod14.z.strictObject({
  ...uiRequestMetadata,
  kind: import_zod14.z.literal("UI_LAUNCH_RESULT"),
  idempotencyKey: idempotencyKeySchema,
  projectId: projectIdSchema
});
var generatedResultDescriptorBase = {
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  workspacePath: relativePosixPathSchema
};
var generatedResultDescriptorSchema = import_zod14.z.discriminatedUnion("status", [
  import_zod14.z.strictObject({
    ...generatedResultDescriptorBase,
    status: import_zod14.z.literal("READY")
  }),
  import_zod14.z.strictObject({
    ...generatedResultDescriptorBase,
    status: import_zod14.z.literal("RUNNING"),
    url: import_zod14.z.url().refine((value) => {
      const match = value.match(/^http:\/\/127\.0\.0\.1:([1-9]\d{0,4})(?:\/[^?#]*)?$/);
      if (match?.[1] === void 0)
        return false;
      return Number(match[1]) <= 65535;
    }, "Generated result URL must use loopback HTTP"),
    reused: import_zod14.z.boolean()
  })
]);
var builderSessionBindingDescriptorSchema = import_zod14.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  taskId: taskIdSchema,
  workspaceDirectory: import_zod14.z.string().min(1).max(4096).refine((value) => (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) && !/[\0\r\n]/.test(value), "Expected an absolute local POSIX or Windows drive path"),
  status: import_zod14.z.literal("READY")
});
var preparedBuilderTaskDescriptorSchema = import_zod14.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projectId: projectIdSchema,
  workspacePath: relativePosixPathSchema,
  task: builderTaskSchema,
  status: import_zod14.z.literal("READY")
});
var helperExchangeReceiptSchema = import_zod14.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  conversationId: conversationIdSchema,
  episodeId: episodeIdSchema,
  episodeRevision: entityRevisionSchema,
  status: import_zod14.z.enum(["OPEN", "PENDING_ANALYSIS"])
});
var uiRequestSchema = import_zod14.z.discriminatedUnion("kind", [
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
var import_zod15 = require("zod");
var crewAppSurfaceSchema = import_zod15.z.enum(["DISCOVERY", "SPEC", "BUILD"]);
var helperConversationSummarySchema = import_zod15.z.strictObject({
  conversationId: conversationIdSchema,
  episodeId: episodeIdSchema,
  taskId: taskIdSchema,
  decisionId: decisionIdSchema.optional(),
  status: episodeStatusSchema,
  startedAt: utcTimestampSchema,
  endedAt: utcTimestampSchema.optional(),
  redactedUserExcerpts: import_zod15.z.array(nonEmptyTextSchema).max(5),
  helperResponseSummaries: import_zod15.z.array(nonEmptyTextSchema).max(5)
});
var decisionSessionItemSchema = import_zod15.z.strictObject({
  request: decisionRequestSchema,
  resolution: decisionResolutionSchema.nullable(),
  application: decisionApplicationSchema.nullable()
});
var projectHistoryItemSchema = import_zod15.z.strictObject({
  project: projectSchema,
  suggestedSurface: crewAppSurfaceSchema,
  activeTask: builderTaskSchema.nullable(),
  pendingDecisionCount: import_zod15.z.int().nonnegative().max(100),
  currentContextVersion: import_zod15.z.int().positive().nullable(),
  helperConversationCount: import_zod15.z.int().nonnegative()
});
var projectHistorySchema = import_zod15.z.strictObject({
  schemaVersion: schemaVersionSchema,
  correlationId: correlationIdSchema,
  projects: import_zod15.z.array(projectHistoryItemSchema).max(100)
});
var projectSessionSnapshotSchema = import_zod15.z.strictObject({
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
  pendingDecisions: import_zod15.z.array(decisionRequestSchema).max(100),
  decisions: import_zod15.z.array(decisionSessionItemSchema).max(100).default([]),
  completionReport: taskCompletionReportSchema.nullable().default(null),
  helperConversations: import_zod15.z.array(helperConversationSummarySchema).max(20)
});

// packages/contracts/dist/validation.js
var import_zod16 = require("zod");
var contractValidationIssueSchema = import_zod16.z.strictObject({
  path: import_zod16.z.array(import_zod16.z.union([import_zod16.z.string(), import_zod16.z.int().nonnegative()])),
  code: import_zod16.z.string().min(1),
  message: import_zod16.z.string().min(1)
});
var contractErrorSchema = import_zod16.z.strictObject({
  schemaVersion: schemaVersionSchema,
  kind: import_zod16.z.literal("CONTRACT_ERROR"),
  category: import_zod16.z.enum(["VALIDATION", "PERMISSION"]),
  code: import_zod16.z.enum([
    "INVALID_PAYLOAD",
    "UNSUPPORTED_SCHEMA_VERSION",
    "UNEXPECTED_FIELD",
    "AGENT_PERMISSION_MISMATCH"
  ]),
  message: import_zod16.z.string().min(1),
  correlationId: correlationIdSchema.optional(),
  retryable: import_zod16.z.literal(false),
  issues: import_zod16.z.array(contractValidationIssueSchema).min(1)
});
var operationErrorCategorySchema = import_zod16.z.enum([
  "VALIDATION",
  "PERMISSION",
  "STALE_CONTEXT",
  "EXTERNAL",
  "ANALYSIS",
  "STORAGE",
  "GENERATED_PROJECT"
]);
var operationErrorSchema = import_zod16.z.strictObject({
  schemaVersion: schemaVersionSchema,
  kind: import_zod16.z.literal("OPERATION_ERROR"),
  category: operationErrorCategorySchema,
  code: import_zod16.z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/),
  disposition: import_zod16.z.enum(["RETRYABLE", "USER_ACTION_REQUIRED", "PERMANENT"]),
  message: import_zod16.z.string().min(1).max(1e3),
  correlationId: correlationIdSchema,
  issues: import_zod16.z.array(contractValidationIssueSchema).max(100),
  redactionStatus: redactionStatusSchema
});

// packages/contracts/dist/local-runtime.js
var import_zod17 = require("zod");
var LOCAL_PROTOCOL_VERSION = 1;
var localRunIdSchema = import_zod17.z.string().regex(/^run_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
var metadata = {
  projectId: projectIdSchema,
  idempotencyKey: idempotencyKeySchema
};
var localRunRequestSchema = import_zod17.z.discriminatedUnion("kind", [
  import_zod17.z.strictObject({
    ...metadata,
    kind: import_zod17.z.literal("DISCOVERY"),
    discoverySessionId: discoverySessionIdSchema,
    expectedSessionRevision: expectedRevisionSchema,
    phase: import_zod17.z.enum(["PREVIEW", "ENRICH_ALL", "ENRICH_SELECTED", "ROUND", "MERGE", "SPEC"]),
    candidateIds: import_zod17.z.array(candidateIdSchema).max(10).default([]),
    message: nonEmptyTextSchema.optional(),
    expectedSpecRevision: expectedRevisionSchema.optional(),
    enrichAfterPreview: import_zod17.z.boolean().default(true)
  }),
  import_zod17.z.strictObject({
    ...metadata,
    kind: import_zod17.z.literal("BUILDER"),
    taskId: taskIdSchema,
    expectedTaskRevision: expectedRevisionSchema,
    message: nonEmptyTextSchema
  }),
  import_zod17.z.strictObject({
    ...metadata,
    kind: import_zod17.z.literal("HELPER"),
    taskId: taskIdSchema,
    decisionId: decisionIdSchema.optional(),
    message: nonEmptyTextSchema,
    origin: import_zod17.z.enum(["FREE_TEXT", "QUICK_ACTION"]).default("FREE_TEXT")
  })
]);
var localRunSchema = import_zod17.z.strictObject({
  protocolVersion: import_zod17.z.literal(LOCAL_PROTOCOL_VERSION),
  backendInstanceId: import_zod17.z.string().uuid(),
  id: localRunIdSchema,
  projectId: projectIdSchema,
  kind: import_zod17.z.enum(["DISCOVERY", "BUILDER", "HELPER"]),
  phase: import_zod17.z.string().max(40),
  status: import_zod17.z.enum(["ACCEPTED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  outcome: import_zod17.z.enum(["PENDING", "DURABLE_RESULT", "TURN_ENDED", "HELPER_RECORDED", "NONE"]),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  errorCode: import_zod17.z.string().regex(/^[A-Z0-9_]{1,100}$/).nullable(),
  lastSequence: import_zod17.z.int().nonnegative(),
  retainedFromSequence: import_zod17.z.int().nonnegative()
});
var localRunEventSchema = import_zod17.z.strictObject({
  runId: localRunIdSchema,
  projectId: projectIdSchema,
  sequence: import_zod17.z.int().positive(),
  kind: import_zod17.z.enum(["STATE", "TEXT", "TOOL", "PERMISSION_DENIED"]),
  text: import_zod17.z.string().max(65536).optional(),
  update: import_zod17.z.record(import_zod17.z.string(), import_zod17.z.unknown()).optional(),
  run: localRunSchema.optional(),
  transient: import_zod17.z.literal(true),
  redactionStatus: import_zod17.z.literal("VERIFIED_REDACTED")
});
var localConnectionSchema = import_zod17.z.strictObject({
  protocolVersion: import_zod17.z.literal(LOCAL_PROTOCOL_VERSION),
  backendInstanceId: import_zod17.z.string().uuid(),
  baseUrl: import_zod17.z.string().regex(/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/),
  token: import_zod17.z.string().regex(/^[0-9a-f]{64}$/)
});
var localApplicationEnvelopeSchema = import_zod17.z.strictObject({
  protocolVersion: import_zod17.z.literal(LOCAL_PROTOCOL_VERSION),
  request: uiRequestSchema
});
var localRunEnvelopeSchema = import_zod17.z.strictObject({
  protocolVersion: import_zod17.z.literal(LOCAL_PROTOCOL_VERSION),
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
var localUiMetadataSchema = import_zod17.z.strictObject({
  schemaVersion: import_zod17.z.literal(1),
  correlationId: correlationIdSchema,
  actor: import_zod17.z.strictObject({ kind: import_zod17.z.literal("UI") })
});

// packages/frontend-client/dist/index.js
var import_node_crypto = require("node:crypto");
function entityId(prefix) {
  return `${prefix}_${(0, import_node_crypto.randomUUID)()}`;
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
  if (!(0, import_node_path.isAbsolute)(file))
    throw new LocalClientError("ABSOLUTE_CONNECTION_FILE_REQUIRED");
  const stats = await (0, import_promises.lstat)(file);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size > 16384)
    throw new LocalClientError("CONNECTION_FILE_INVALID");
  if (process.platform !== "win32" && (stats.mode & 63) !== 0)
    throw new LocalClientError("CONNECTION_FILE_NOT_PRIVATE");
  try {
    return localConnectionSchema.parse(JSON.parse(await (0, import_promises.readFile)(file, "utf8")));
  } catch {
    throw new LocalClientError("CONNECTION_FILE_INVALID");
  }
}
async function connectLocalCore(file) {
  const client = new LocalCoreClient(await readLocalConnection(file));
  await client.health();
  return client;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  connectLocalCore,
  readLocalConnection
});
