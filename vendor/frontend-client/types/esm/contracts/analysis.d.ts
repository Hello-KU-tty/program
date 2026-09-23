import { z } from 'zod';
export declare const ANALYSIS_MAX_ATTEMPTS: 2;
export declare const ANALYSIS_SOFT_TIMEOUT_MS: 30000;
export declare const analysisJobStatusSchema: z.ZodEnum<{
    FAILED: "FAILED";
    PENDING: "PENDING";
    RUNNING: "RUNNING";
    SUCCEEDED: "SUCCEEDED";
}>;
export declare const analysisFailureSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    retryable: z.ZodBoolean;
}, z.core.$strict>;
export declare const analysisResultSummarySchema: z.ZodObject<{
    proposalCount: z.ZodInt;
    acceptedCount: z.ZodInt;
    rejectedCount: z.ZodInt;
    noEvidenceReason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const analysisJobSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    projectId: z.ZodString;
    episodeId: z.ZodString;
    episodeRevision: z.ZodInt;
    correlationId: z.ZodString;
    revision: z.ZodInt;
    status: z.ZodEnum<{
        FAILED: "FAILED";
        PENDING: "PENDING";
        RUNNING: "RUNNING";
        SUCCEEDED: "SUCCEEDED";
    }>;
    attempt: z.ZodInt;
    maxAttempts: z.ZodLiteral<2>;
    timeoutMs: z.ZodLiteral<30000>;
    runtimeHandle: z.ZodOptional<z.ZodString>;
    deadlineAt: z.ZodOptional<z.ZodISODateTime>;
    lastFailure: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>>;
    resultSummary: z.ZodOptional<z.ZodObject<{
        proposalCount: z.ZodInt;
        acceptedCount: z.ZodInt;
        rejectedCount: z.ZodInt;
        noEvidenceReason: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    createdAt: z.ZodISODateTime;
    updatedAt: z.ZodISODateTime;
    startedAt: z.ZodOptional<z.ZodISODateTime>;
    completedAt: z.ZodOptional<z.ZodISODateTime>;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"CORE">;
    }, z.core.$strict>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export declare const analysisClaimJobCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_CLAIM_JOB">;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    runtimeHandle: z.ZodString;
}, z.core.$strict>;
export declare const analysisListPendingQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_LIST_PENDING">;
    limit: z.ZodInt;
}, z.core.$strict>;
export declare const analysisRecoverExpiredCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_RECOVER_EXPIRED">;
    limit: z.ZodInt;
}, z.core.$strict>;
export declare const analysisFailAttemptCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_FAIL_ATTEMPT">;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    attempt: z.ZodInt;
    failure: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const analysisSubmitResultCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_SUBMIT_RESULT">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    attempt: z.ZodInt;
    result: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        episodeId: z.ZodString;
        episodeRevision: z.ZodInt;
        correlationId: z.ZodString;
        proposals: z.ZodArray<z.ZodObject<{
            concept: z.ZodObject<{
                canonicalConceptId: z.ZodOptional<z.ZodString>;
                originalExpression: z.ZodString;
                proposedCanonicalName: z.ZodString;
            }, z.core.$strict>;
            signal: z.ZodEnum<{
                APPLICATION: "APPLICATION";
                CONTRADICTION: "CONTRADICTION";
                JUSTIFIED_DECISION: "JUSTIFIED_DECISION";
                PREDICTION: "PREDICTION";
                QUESTION: "QUESTION";
                REPHRASE: "REPHRASE";
                TRANSFER: "TRANSFER";
            }>;
            strength: z.ZodEnum<{
                MEDIUM: "MEDIUM";
                NONE: "NONE";
                STRONG: "STRONG";
                WEAK: "WEAK";
            }>;
            promptDependence: z.ZodEnum<{
                DIRECTLY_LED: "DIRECTLY_LED";
                INDEPENDENT: "INDEPENDENT";
                LIGHT_HINT: "LIGHT_HINT";
            }>;
            userEvidenceSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"USER_MESSAGE">;
                conversationId: z.ZodString;
                messageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_DECISION">;
                decisionId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_ACTION">;
                eventId: z.ZodString;
            }, z.core.$strict>], "kind">>;
            contextSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"CODE">;
                path: z.ZodString;
                lineRange: z.ZodOptional<z.ZodObject<{
                    start: z.ZodInt;
                    end: z.ZodInt;
                }, z.core.$strict>>;
                revisionRef: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"DIFF">;
                diffId: z.ZodString;
                paths: z.ZodArray<z.ZodString>;
                revisionRef: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"TEST_RESULT">;
                testResultId: z.ZodString;
                taskId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"TOOL_CALL">;
                toolCallId: z.ZodString;
                toolName: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_MESSAGE">;
                conversationId: z.ZodString;
                messageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_DECISION">;
                decisionId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_ACTION">;
                eventId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"AGENT_MESSAGE">;
                conversationId: z.ZodString;
                messageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"EVENT">;
                eventId: z.ZodString;
            }, z.core.$strict>], "kind">>;
            redactedEvidenceExcerpt: z.ZodString;
            rationale: z.ZodString;
            uncertainty: z.ZodOptional<z.ZodString>;
            maximumSupportedState: z.ZodNullable<z.ZodEnum<{
                DEMONSTRATED: "DEMONSTRATED";
                EXPLAINED: "EXPLAINED";
                TRANSFERRED: "TRANSFERRED";
            }>>;
            misconception: z.ZodObject<{
                action: z.ZodEnum<{
                    NONE: "NONE";
                    OPEN: "OPEN";
                    RESOLVE: "RESOLVE";
                }>;
                issueId: z.ZodOptional<z.ZodString>;
                summary: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        noEvidenceReason: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const analysisRuntimeRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_LIST_PENDING">;
    limit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_RECOVER_EXPIRED">;
    limit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_CLAIM_JOB">;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    runtimeHandle: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_FAIL_ATTEMPT">;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    attempt: z.ZodInt;
    failure: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYSIS_SUBMIT_RESULT">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    attempt: z.ZodInt;
    result: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        episodeId: z.ZodString;
        episodeRevision: z.ZodInt;
        correlationId: z.ZodString;
        proposals: z.ZodArray<z.ZodObject<{
            concept: z.ZodObject<{
                canonicalConceptId: z.ZodOptional<z.ZodString>;
                originalExpression: z.ZodString;
                proposedCanonicalName: z.ZodString;
            }, z.core.$strict>;
            signal: z.ZodEnum<{
                APPLICATION: "APPLICATION";
                CONTRADICTION: "CONTRADICTION";
                JUSTIFIED_DECISION: "JUSTIFIED_DECISION";
                PREDICTION: "PREDICTION";
                QUESTION: "QUESTION";
                REPHRASE: "REPHRASE";
                TRANSFER: "TRANSFER";
            }>;
            strength: z.ZodEnum<{
                MEDIUM: "MEDIUM";
                NONE: "NONE";
                STRONG: "STRONG";
                WEAK: "WEAK";
            }>;
            promptDependence: z.ZodEnum<{
                DIRECTLY_LED: "DIRECTLY_LED";
                INDEPENDENT: "INDEPENDENT";
                LIGHT_HINT: "LIGHT_HINT";
            }>;
            userEvidenceSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"USER_MESSAGE">;
                conversationId: z.ZodString;
                messageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_DECISION">;
                decisionId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_ACTION">;
                eventId: z.ZodString;
            }, z.core.$strict>], "kind">>;
            contextSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"CODE">;
                path: z.ZodString;
                lineRange: z.ZodOptional<z.ZodObject<{
                    start: z.ZodInt;
                    end: z.ZodInt;
                }, z.core.$strict>>;
                revisionRef: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"DIFF">;
                diffId: z.ZodString;
                paths: z.ZodArray<z.ZodString>;
                revisionRef: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"TEST_RESULT">;
                testResultId: z.ZodString;
                taskId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"TOOL_CALL">;
                toolCallId: z.ZodString;
                toolName: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_MESSAGE">;
                conversationId: z.ZodString;
                messageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_DECISION">;
                decisionId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"USER_ACTION">;
                eventId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"AGENT_MESSAGE">;
                conversationId: z.ZodString;
                messageId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"EVENT">;
                eventId: z.ZodString;
            }, z.core.$strict>], "kind">>;
            redactedEvidenceExcerpt: z.ZodString;
            rationale: z.ZodString;
            uncertainty: z.ZodOptional<z.ZodString>;
            maximumSupportedState: z.ZodNullable<z.ZodEnum<{
                DEMONSTRATED: "DEMONSTRATED";
                EXPLAINED: "EXPLAINED";
                TRANSFERRED: "TRANSFERRED";
            }>>;
            misconception: z.ZodObject<{
                action: z.ZodEnum<{
                    NONE: "NONE";
                    OPEN: "OPEN";
                    RESOLVE: "RESOLVE";
                }>;
                issueId: z.ZodOptional<z.ZodString>;
                summary: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        noEvidenceReason: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>], "kind">;
export type AnalysisJobStatus = z.infer<typeof analysisJobStatusSchema>;
export type AnalysisFailure = z.infer<typeof analysisFailureSchema>;
export type AnalysisResultSummary = z.infer<typeof analysisResultSummarySchema>;
export type AnalysisJob = z.infer<typeof analysisJobSchema>;
export type AnalysisRuntimeRequest = z.infer<typeof analysisRuntimeRequestSchema>;
