import { z } from 'zod';
export declare const auditActionSchema: z.ZodEnum<{
    ACCEPTED: "ACCEPTED";
    APPLIED: "APPLIED";
    CREATED: "CREATED";
    REDACTED: "REDACTED";
    REJECTED: "REJECTED";
    RESOLVED: "RESOLVED";
    SUBMITTED: "SUBMITTED";
    UPDATED: "UPDATED";
}>;
export declare const auditOutcomeSchema: z.ZodEnum<{
    FAILED: "FAILED";
    REJECTED: "REJECTED";
    SUCCEEDED: "SUCCEEDED";
}>;
export declare const auditRecordSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    correlationId: z.ZodString;
    actor: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    action: z.ZodEnum<{
        ACCEPTED: "ACCEPTED";
        APPLIED: "APPLIED";
        CREATED: "CREATED";
        REDACTED: "REDACTED";
        REJECTED: "REJECTED";
        RESOLVED: "RESOLVED";
        SUBMITTED: "SUBMITTED";
        UPDATED: "UPDATED";
    }>;
    resource: z.ZodObject<{
        type: z.ZodEnum<{
            ANALYSIS_JOB: "ANALYSIS_JOB";
            BUILDER_TASK: "BUILDER_TASK";
            CANDIDATE_PREVIEW_ROUND: "CANDIDATE_PREVIEW_ROUND";
            CANDIDATE_REVISION: "CANDIDATE_REVISION";
            CONCEPT_LEDGER: "CONCEPT_LEDGER";
            CONTEXT_REFRESH_REQUEST: "CONTEXT_REFRESH_REQUEST";
            DECISION: "DECISION";
            DISCOVERY_SESSION: "DISCOVERY_SESSION";
            EPISODE: "EPISODE";
            EVALUATION_RUN: "EVALUATION_RUN";
            EVENT: "EVENT";
            EVIDENCE: "EVIDENCE";
            EVIDENCE_PROPOSAL: "EVIDENCE_PROPOSAL";
            LEARNING_SPEC: "LEARNING_SPEC";
            LIVE_CONTEXT: "LIVE_CONTEXT";
            PROJECT: "PROJECT";
        }>;
        id: z.ZodString;
        revision: z.ZodOptional<z.ZodInt>;
    }, z.core.$strict>;
    outcome: z.ZodEnum<{
        FAILED: "FAILED";
        REJECTED: "REJECTED";
        SUCCEEDED: "SUCCEEDED";
    }>;
    reasonCode: z.ZodOptional<z.ZodString>;
    summary: z.ZodString;
    changedFields: z.ZodArray<z.ZodString>;
    occurredAt: z.ZodISODateTime;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>;
export type AuditRecord = z.infer<typeof auditRecordSchema>;
