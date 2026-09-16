import { z } from 'zod';
export declare const learningScopeItemSchema: z.ZodObject<{
    category: z.ZodEnum<{
        AGENT_SUPPORT: "AGENT_SUPPORT";
        EXCLUDED: "EXCLUDED";
        LEARNER_FOCUS: "LEARNER_FOCUS";
    }>;
    title: z.ZodString;
    rationale: z.ZodString;
    conceptNames: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const expectedDecisionAreaSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const learningSpecStatusSchema: z.ZodEnum<{
    CONFIRMED: "CONFIRMED";
    DRAFT: "DRAFT";
    SUPERSEDED: "SUPERSEDED";
}>;
export declare const learningSpecConfirmationSchema: z.ZodObject<{
    confirmedAt: z.ZodISODateTime;
    confirmedBy: z.ZodObject<{
        kind: z.ZodLiteral<"USER">;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const learningSpecDraftContentSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const discoverySubmitLearningSpecToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    expectedSpecRevision: z.ZodInt;
    draft: z.ZodObject<{
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
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const learningSpecRevisionSchema: z.ZodObject<{
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
export type LearningScopeItem = z.infer<typeof learningScopeItemSchema>;
export type ExpectedDecisionArea = z.infer<typeof expectedDecisionAreaSchema>;
export type LearningSpecDraftContent = z.infer<typeof learningSpecDraftContentSchema>;
export type LearningSpecRevision = z.infer<typeof learningSpecRevisionSchema>;
