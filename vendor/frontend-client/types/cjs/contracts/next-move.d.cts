import { z } from 'zod';
/**
 * Next Move (SPEC 5.8.1): after each finished Task a Discovery sub-agent suggests three ways to
 * grow the project. Suggestions are Agent-authored proposals; reading or choosing one never
 * changes Evidence or Concept State. The learner starts one only by saying so in the Builder chat.
 */
export declare const NEXT_MOVE_COUNT: 3;
export declare const NEXT_MOVE_MAX_ATTEMPTS: 2;
export declare const NEXT_MOVE_SOFT_TIMEOUT_MS: 120000;
export declare const nextMoveSizeSchema: z.ZodEnum<{
    MEDIUM: "MEDIUM";
    SMALL: "SMALL";
}>;
/** What the Agent returns for one suggestion; Core numbers them in the given order. */
export declare const nextMoveProposalSchema: z.ZodObject<{
    title: z.ZodString;
    summary: z.ZodString;
    benefit: z.ZodString;
    size: z.ZodEnum<{
        MEDIUM: "MEDIUM";
        SMALL: "SMALL";
    }>;
    concepts: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const nextMoveSemanticResultSchema: z.ZodObject<{
    moves: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        benefit: z.ZodString;
        size: z.ZodEnum<{
            MEDIUM: "MEDIUM";
            SMALL: "SMALL";
        }>;
        concepts: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const nextMoveSchema: z.ZodObject<{
    title: z.ZodString;
    summary: z.ZodString;
    benefit: z.ZodString;
    size: z.ZodEnum<{
        MEDIUM: "MEDIUM";
        SMALL: "SMALL";
    }>;
    concepts: z.ZodArray<z.ZodString>;
    number: z.ZodInt;
}, z.core.$strict>;
export declare const nextMoveJobStatusSchema: z.ZodEnum<{
    FAILED: "FAILED";
    PENDING: "PENDING";
    RUNNING: "RUNNING";
    SUCCEEDED: "SUCCEEDED";
}>;
export declare const nextMoveJobSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    projectId: z.ZodString;
    sourceTaskId: z.ZodString;
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
    timeoutMs: z.ZodLiteral<120000>;
    runtimeHandle: z.ZodOptional<z.ZodString>;
    deadlineAt: z.ZodOptional<z.ZodISODateTime>;
    lastFailure: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>>;
    moves: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        benefit: z.ZodString;
        size: z.ZodEnum<{
            MEDIUM: "MEDIUM";
            SMALL: "SMALL";
        }>;
        concepts: z.ZodArray<z.ZodString>;
        number: z.ZodInt;
    }, z.core.$strict>>>;
    author: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
        promptVersion: z.ZodString;
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
/** Bounded, redacted input for one Next Move attempt. */
export declare const nextMoveContextSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    nextMoveJobId: z.ZodString;
    projectTitle: z.ZodString;
    learningSpec: z.ZodObject<{
        productPurpose: z.ZodString;
        targetUsers: z.ZodArray<z.ZodString>;
        primaryUsageMoment: z.ZodString;
        successMoment: z.ZodString;
        mvpFeatures: z.ZodArray<z.ZodString>;
        scope: z.ZodArray<z.ZodObject<{
            category: z.ZodEnum<{
                AGENT_SUPPORT: "AGENT_SUPPORT";
                EXCLUDED: "EXCLUDED";
                LEARNER_FOCUS: "LEARNER_FOCUS";
            }>;
            title: z.ZodString;
            rationale: z.ZodString;
            conceptNames: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        expectedDecisions: z.ZodArray<z.ZodObject<{
            category: z.ZodEnum<{
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
            description: z.ZodString;
            whyUserInputMatters: z.ZodString;
        }, z.core.$strict>>;
        runtimeConstraint: z.ZodLiteral<"TYPESCRIPT">;
        deploymentConstraints: z.ZodArray<z.ZodString>;
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        parentRevision: z.ZodOptional<z.ZodInt>;
        selectedCandidate: z.ZodObject<{
            candidateId: z.ZodString;
            revision: z.ZodInt;
        }, z.core.$strict>;
        status: z.ZodEnum<{
            CONFIRMED: "CONFIRMED";
            DRAFT: "DRAFT";
            SUPERSEDED: "SUPERSEDED";
        }>;
        confirmation: z.ZodOptional<z.ZodObject<{
            confirmedAt: z.ZodISODateTime;
            confirmedBy: z.ZodObject<{
                kind: z.ZodLiteral<"USER">;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
        source: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>;
    tasks: z.ZodArray<z.ZodObject<{
        sequence: z.ZodInt;
        title: z.ZodString;
        goal: z.ZodString;
        implemented: z.ZodArray<z.ZodString>;
        remaining: z.ZodArray<z.ZodString>;
        limitations: z.ZodArray<z.ZodString>;
        fromNextMove: z.ZodOptional<z.ZodObject<{
            title: z.ZodString;
            summary: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    learnerProfile: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const nextMoveViewStatusSchema: z.ZodEnum<{
    FAILED: "FAILED";
    GENERATING: "GENERATING";
    NONE: "NONE";
    READY: "READY";
}>;
/** What the panel, the Builder chat and Helper see. Concepts stay internal. */
export declare const nextMoveViewSchema: z.ZodObject<{
    status: z.ZodEnum<{
        FAILED: "FAILED";
        GENERATING: "GENERATING";
        NONE: "NONE";
        READY: "READY";
    }>;
    nextMoveJobId: z.ZodOptional<z.ZodString>;
    jobRevision: z.ZodOptional<z.ZodInt>;
    sourceTaskId: z.ZodOptional<z.ZodString>;
    moves: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        benefit: z.ZodString;
        size: z.ZodEnum<{
            MEDIUM: "MEDIUM";
            SMALL: "SMALL";
        }>;
        number: z.ZodInt;
    }, z.core.$strict>>;
    failureCode: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const nextMoveListPendingQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"NEXT_MOVE_LIST_PENDING">;
    limit: z.ZodInt;
}, z.core.$strict>;
export declare const nextMoveRecoverExpiredCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"NEXT_MOVE_RECOVER_EXPIRED">;
    limit: z.ZodInt;
}, z.core.$strict>;
export declare const nextMoveClaimJobCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_CLAIM_JOB">;
    runtimeHandle: z.ZodString;
}, z.core.$strict>;
export declare const nextMoveGetContextQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_GET_CONTEXT">;
}, z.core.$strict>;
export declare const nextMoveFailAttemptCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_FAIL_ATTEMPT">;
    attempt: z.ZodInt;
    failure: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const nextMoveSubmitResultCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_SUBMIT_RESULT">;
    attempt: z.ZodInt;
    promptVersion: z.ZodString;
    result: z.ZodObject<{
        moves: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            summary: z.ZodString;
            benefit: z.ZodString;
            size: z.ZodEnum<{
                MEDIUM: "MEDIUM";
                SMALL: "SMALL";
            }>;
            concepts: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const nextMoveRuntimeRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"NEXT_MOVE_LIST_PENDING">;
    limit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"NEXT_MOVE_RECOVER_EXPIRED">;
    limit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_CLAIM_JOB">;
    runtimeHandle: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_GET_CONTEXT">;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"KIRO_ADAPTER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_FAIL_ATTEMPT">;
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
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    kind: z.ZodLiteral<"NEXT_MOVE_SUBMIT_RESULT">;
    attempt: z.ZodInt;
    promptVersion: z.ZodString;
    result: z.ZodObject<{
        moves: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            summary: z.ZodString;
            benefit: z.ZodString;
            size: z.ZodEnum<{
                MEDIUM: "MEDIUM";
                SMALL: "SMALL";
            }>;
            concepts: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>], "kind">;
export type NextMoveSize = z.infer<typeof nextMoveSizeSchema>;
export type NextMoveProposal = z.infer<typeof nextMoveProposalSchema>;
export type NextMoveSemanticResult = z.infer<typeof nextMoveSemanticResultSchema>;
export type NextMove = z.infer<typeof nextMoveSchema>;
export type NextMoveJobStatus = z.infer<typeof nextMoveJobStatusSchema>;
export type NextMoveJob = z.infer<typeof nextMoveJobSchema>;
export type NextMoveContext = z.infer<typeof nextMoveContextSchema>;
export type NextMoveView = z.infer<typeof nextMoveViewSchema>;
export type NextMoveRuntimeRequest = z.infer<typeof nextMoveRuntimeRequestSchema>;
