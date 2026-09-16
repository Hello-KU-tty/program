import { z } from 'zod';
export declare const CURRENT_SCHEMA_VERSION: 1;
export declare const schemaVersionSchema: z.ZodLiteral<1>;
export declare const stableEntityIdSchema: z.ZodString;
export declare const projectIdSchema: z.ZodString;
export declare const discoverySessionIdSchema: z.ZodString;
export declare const candidateRoundIdSchema: z.ZodString;
export declare const candidatePreviewRoundIdSchema: z.ZodString;
export declare const candidateIdSchema: z.ZodString;
export declare const feedbackIdSchema: z.ZodString;
export declare const learningSpecIdSchema: z.ZodString;
export declare const taskIdSchema: z.ZodString;
export declare const liveContextIdSchema: z.ZodString;
export declare const contextRefreshRequestIdSchema: z.ZodString;
export declare const decisionIdSchema: z.ZodString;
export declare const decisionOptionIdSchema: z.ZodString;
export declare const decisionResolutionIdSchema: z.ZodString;
export declare const decisionApplicationIdSchema: z.ZodString;
export declare const completionReportIdSchema: z.ZodString;
export declare const conversationIdSchema: z.ZodString;
export declare const messageIdSchema: z.ZodString;
export declare const toolCallIdSchema: z.ZodString;
export declare const testResultIdSchema: z.ZodString;
export declare const diffIdSchema: z.ZodString;
export declare const eventIdSchema: z.ZodString;
export declare const episodeIdSchema: z.ZodString;
export declare const analysisJobIdSchema: z.ZodString;
export declare const conceptIdSchema: z.ZodString;
export declare const aliasProposalIdSchema: z.ZodString;
export declare const evidenceProposalIdSchema: z.ZodString;
export declare const evidenceIdSchema: z.ZodString;
export declare const evidenceDecisionIdSchema: z.ZodString;
export declare const misconceptionIssueIdSchema: z.ZodString;
export declare const conceptLedgerIdSchema: z.ZodString;
export declare const personalizationTraceIdSchema: z.ZodString;
export declare const auditRecordIdSchema: z.ZodString;
export declare const fixtureIdSchema: z.ZodString;
export declare const evaluationRunIdSchema: z.ZodString;
export declare const baselineResultIdSchema: z.ZodString;
export declare const correlationIdSchema: z.ZodString;
export declare const idempotencyKeySchema: z.ZodString;
export declare const utcTimestampSchema: z.ZodISODateTime;
export declare const entityRevisionSchema: z.ZodInt;
export declare const expectedRevisionSchema: z.ZodInt;
export declare const sequenceSchema: z.ZodInt;
export declare const semanticVersionSchema: z.ZodString;
export declare const nonEmptyTextSchema: z.ZodString;
export declare const shortTextSchema: z.ZodString;
export declare const labelSchema: z.ZodString;
export declare const redactionStatusSchema: z.ZodEnum<{
    NOT_REQUIRED: "NOT_REQUIRED";
    REDACTED: "REDACTED";
    VERIFIED_REDACTED: "VERIFIED_REDACTED";
}>;
export declare const agentRoleSchema: z.ZodEnum<{
    BUILDER: "BUILDER";
    DISCOVERY: "DISCOVERY";
    EVIDENCE_ANALYST: "EVIDENCE_ANALYST";
    HELPER: "HELPER";
}>;
export declare const learningScopeCategorySchema: z.ZodEnum<{
    AGENT_SUPPORT: "AGENT_SUPPORT";
    EXCLUDED: "EXCLUDED";
    LEARNER_FOCUS: "LEARNER_FOCUS";
}>;
export declare const decisionCategorySchema: z.ZodEnum<{
    API_CONTRACT: "API_CONTRACT";
    ARCHITECTURE: "ARCHITECTURE";
    AUTHENTICATION: "AUTHENTICATION";
    AUTHORIZATION: "AUTHORIZATION";
    COST_DEPLOYMENT: "COST_DEPLOYMENT";
    DATA_MODEL: "DATA_MODEL";
    LEARNING_CONCEPT: "LEARNING_CONCEPT";
    PRODUCT_BEHAVIOR: "PRODUCT_BEHAVIOR";
    RETENTION_DELETION: "RETENTION_DELETION";
    SECURITY_PRIVACY: "SECURITY_PRIVACY";
}>;
export declare const actorSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"USER">;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"AGENT">;
    role: z.ZodEnum<{
        BUILDER: "BUILDER";
        DISCOVERY: "DISCOVERY";
        EVIDENCE_ANALYST: "EVIDENCE_ANALYST";
        HELPER: "HELPER";
    }>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"CORE">;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"UI">;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"KIRO_ADAPTER">;
}, z.core.$strict>], "kind">;
export declare const relativePosixPathSchema: z.ZodString;
export type AgentRole = z.infer<typeof agentRoleSchema>;
export type Actor = z.infer<typeof actorSchema>;
export type RedactionStatus = z.infer<typeof redactionStatusSchema>;
export type LearningScopeCategory = z.infer<typeof learningScopeCategorySchema>;
export type DecisionCategory = z.infer<typeof decisionCategorySchema>;
