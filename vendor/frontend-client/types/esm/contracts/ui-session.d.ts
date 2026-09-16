import { z } from 'zod';
export declare const crewAppSurfaceSchema: z.ZodEnum<{
    BUILD: "BUILD";
    DISCOVERY: "DISCOVERY";
    SPEC: "SPEC";
}>;
export declare const helperConversationSummarySchema: z.ZodObject<{
    conversationId: z.ZodString;
    episodeId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        ANALYSIS_FAILED: "ANALYSIS_FAILED";
        ANALYZED: "ANALYZED";
        OPEN: "OPEN";
        PENDING_ANALYSIS: "PENDING_ANALYSIS";
    }>;
    startedAt: z.ZodISODateTime;
    endedAt: z.ZodOptional<z.ZodISODateTime>;
    redactedUserExcerpts: z.ZodArray<z.ZodString>;
    helperResponseSummaries: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const decisionSessionItemSchema: z.ZodObject<{
    request: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        taskId: z.ZodString;
        correlationId: z.ZodString;
        contextVersion: z.ZodInt;
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
        question: z.ZodString;
        reasonRequiredNow: z.ZodString;
        options: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            description: z.ZodString;
            impacts: z.ZodArray<z.ZodString>;
            tradeoffs: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        recommendedOptionId: z.ZodString;
        recommendationRationale: z.ZodString;
        relatedConceptNames: z.ZodArray<z.ZodString>;
        sourceReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        independentWorkCanContinue: z.ZodBoolean;
        requestedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"AGENT">;
            role: z.ZodLiteral<"BUILDER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>;
    resolution: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        decisionId: z.ZodString;
        projectId: z.ZodString;
        taskId: z.ZodString;
        correlationId: z.ZodString;
        expectedContextVersion: z.ZodInt;
        selectionKind: z.ZodEnum<{
            CUSTOM: "CUSTOM";
            OPTION: "OPTION";
            RECOMMENDATION: "RECOMMENDATION";
        }>;
        selectedOptionId: z.ZodOptional<z.ZodString>;
        customProposal: z.ZodOptional<z.ZodString>;
        rationale: z.ZodOptional<z.ZodString>;
        helperUsed: z.ZodBoolean;
        resolvedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"USER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    application: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        decisionId: z.ZodString;
        resolutionId: z.ZodString;
        projectId: z.ZodString;
        taskId: z.ZodString;
        correlationId: z.ZodString;
        appliedResult: z.ZodString;
        sourceReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        appliedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"AGENT">;
            role: z.ZodLiteral<"BUILDER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const projectHistoryItemSchema: z.ZodObject<{
    project: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        title: z.ZodString;
        learningGoal: z.ZodString;
        status: z.ZodEnum<{
            BUILDING: "BUILDING";
            COMPLETED: "COMPLETED";
            DISCOVERY: "DISCOVERY";
            SPEC_REVIEW: "SPEC_REVIEW";
        }>;
        generatedWorkspacePath: z.ZodOptional<z.ZodString>;
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
    suggestedSurface: z.ZodEnum<{
        BUILD: "BUILD";
        DISCOVERY: "DISCOVERY";
        SPEC: "SPEC";
    }>;
    activeTask: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        learningSpecId: z.ZodString;
        learningSpecRevision: z.ZodInt;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        title: z.ZodString;
        productGoal: z.ZodString;
        requirements: z.ZodArray<z.ZodString>;
        acceptanceCriteria: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            description: z.ZodString;
        }, z.core.$strict>>;
        expectedConcepts: z.ZodArray<z.ZodString>;
        excludedWork: z.ZodArray<z.ZodString>;
        prerequisiteTaskIds: z.ZodArray<z.ZodString>;
        expectedDecisionCategories: z.ZodArray<z.ZodEnum<{
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
        }>>;
        finalUpgrade: z.ZodOptional<z.ZodObject<{
            sourceTaskId: z.ZodString;
            personalizationTraceId: z.ZodString;
            userGoal: z.ZodString;
        }, z.core.$strict>>;
        sequence: z.ZodInt;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            BLOCKED: "BLOCKED";
            CANCELLED: "CANCELLED";
            COMPLETED: "COMPLETED";
            FAILED: "FAILED";
            PENDING: "PENDING";
        }>;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"CORE">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    pendingDecisionCount: z.ZodInt;
    currentContextVersion: z.ZodNullable<z.ZodInt>;
    helperConversationCount: z.ZodInt;
}, z.core.$strict>;
export declare const projectHistorySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    projects: z.ZodArray<z.ZodObject<{
        project: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            correlationId: z.ZodString;
            revision: z.ZodInt;
            title: z.ZodString;
            learningGoal: z.ZodString;
            status: z.ZodEnum<{
                BUILDING: "BUILDING";
                COMPLETED: "COMPLETED";
                DISCOVERY: "DISCOVERY";
                SPEC_REVIEW: "SPEC_REVIEW";
            }>;
            generatedWorkspacePath: z.ZodOptional<z.ZodString>;
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
        suggestedSurface: z.ZodEnum<{
            BUILD: "BUILD";
            DISCOVERY: "DISCOVERY";
            SPEC: "SPEC";
        }>;
        activeTask: z.ZodNullable<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            projectId: z.ZodString;
            learningSpecId: z.ZodString;
            learningSpecRevision: z.ZodInt;
            correlationId: z.ZodString;
            revision: z.ZodInt;
            title: z.ZodString;
            productGoal: z.ZodString;
            requirements: z.ZodArray<z.ZodString>;
            acceptanceCriteria: z.ZodArray<z.ZodObject<{
                key: z.ZodString;
                description: z.ZodString;
            }, z.core.$strict>>;
            expectedConcepts: z.ZodArray<z.ZodString>;
            excludedWork: z.ZodArray<z.ZodString>;
            prerequisiteTaskIds: z.ZodArray<z.ZodString>;
            expectedDecisionCategories: z.ZodArray<z.ZodEnum<{
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
            }>>;
            finalUpgrade: z.ZodOptional<z.ZodObject<{
                sourceTaskId: z.ZodString;
                personalizationTraceId: z.ZodString;
                userGoal: z.ZodString;
            }, z.core.$strict>>;
            sequence: z.ZodInt;
            status: z.ZodEnum<{
                ACTIVE: "ACTIVE";
                BLOCKED: "BLOCKED";
                CANCELLED: "CANCELLED";
                COMPLETED: "COMPLETED";
                FAILED: "FAILED";
                PENDING: "PENDING";
            }>;
            createdAt: z.ZodISODateTime;
            updatedAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"CORE">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>;
        pendingDecisionCount: z.ZodInt;
        currentContextVersion: z.ZodNullable<z.ZodInt>;
        helperConversationCount: z.ZodInt;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const projectSessionSnapshotSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    project: z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        title: z.ZodString;
        learningGoal: z.ZodString;
        status: z.ZodEnum<{
            BUILDING: "BUILDING";
            COMPLETED: "COMPLETED";
            DISCOVERY: "DISCOVERY";
            SPEC_REVIEW: "SPEC_REVIEW";
        }>;
        generatedWorkspacePath: z.ZodOptional<z.ZodString>;
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
    suggestedSurface: z.ZodEnum<{
        BUILD: "BUILD";
        DISCOVERY: "DISCOVERY";
        SPEC: "SPEC";
    }>;
    discoverySession: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        input: z.ZodObject<{
            learningGoal: z.ZodString;
            personalNeed: z.ZodOptional<z.ZodString>;
            recentFriction: z.ZodOptional<z.ZodString>;
            interestAreas: z.ZodOptional<z.ZodArray<z.ZodString>>;
            currentLevel: z.ZodOptional<z.ZodEnum<{
                BEGINNER: "BEGINNER";
                FAMILIAR: "FAMILIAR";
                NEW: "NEW";
                UNSPECIFIED: "UNSPECIFIED";
            }>>;
            freeContext: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        status: z.ZodEnum<{
            ABANDONED: "ABANDONED";
            ACTIVE: "ACTIVE";
            SELECTED: "SELECTED";
        }>;
        openedAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
        closedAt: z.ZodOptional<z.ZodISODateTime>;
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
    }, z.core.$strict>>;
    discoveryContext: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        correlationId: z.ZodString;
        project: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            correlationId: z.ZodString;
            revision: z.ZodInt;
            title: z.ZodString;
            learningGoal: z.ZodString;
            status: z.ZodEnum<{
                BUILDING: "BUILDING";
                COMPLETED: "COMPLETED";
                DISCOVERY: "DISCOVERY";
                SPEC_REVIEW: "SPEC_REVIEW";
            }>;
            generatedWorkspacePath: z.ZodOptional<z.ZodString>;
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
        session: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            projectId: z.ZodString;
            correlationId: z.ZodString;
            revision: z.ZodInt;
            input: z.ZodObject<{
                learningGoal: z.ZodString;
                personalNeed: z.ZodOptional<z.ZodString>;
                recentFriction: z.ZodOptional<z.ZodString>;
                interestAreas: z.ZodOptional<z.ZodArray<z.ZodString>>;
                currentLevel: z.ZodOptional<z.ZodEnum<{
                    BEGINNER: "BEGINNER";
                    FAMILIAR: "FAMILIAR";
                    NEW: "NEW";
                    UNSPECIFIED: "UNSPECIFIED";
                }>>;
                freeContext: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
            status: z.ZodEnum<{
                ABANDONED: "ABANDONED";
                ACTIVE: "ACTIVE";
                SELECTED: "SELECTED";
            }>;
            openedAt: z.ZodISODateTime;
            updatedAt: z.ZodISODateTime;
            closedAt: z.ZodOptional<z.ZodISODateTime>;
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
        rounds: z.ZodArray<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            discoverySessionId: z.ZodString;
            correlationId: z.ZodString;
            roundIndex: z.ZodInt;
            inputSnapshot: z.ZodObject<{
                learningGoal: z.ZodString;
                personalNeed: z.ZodOptional<z.ZodString>;
                recentFriction: z.ZodOptional<z.ZodString>;
                interestAreas: z.ZodOptional<z.ZodArray<z.ZodString>>;
                currentLevel: z.ZodOptional<z.ZodEnum<{
                    BEGINNER: "BEGINNER";
                    FAMILIAR: "FAMILIAR";
                    NEW: "NEW";
                    UNSPECIFIED: "UNSPECIFIED";
                }>>;
                freeContext: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
            appliedFeedbackIds: z.ZodArray<z.ZodString>;
            candidates: z.ZodArray<z.ZodObject<{
                candidateId: z.ZodString;
                revision: z.ZodInt;
            }, z.core.$strict>>;
            generationRationale: z.ZodString;
            diversityCheck: z.ZodObject<{
                dimensionsReviewed: z.ZodArray<z.ZodEnum<{
                    CORE_INTERACTION: "CORE_INTERACTION";
                    DATA_SHAPE: "DATA_SHAPE";
                    PROBLEM_DOMAIN: "PROBLEM_DOMAIN";
                    TARGET_USER: "TARGET_USER";
                    USER_APPEAL: "USER_APPEAL";
                }>>;
                modeCollapseDetected: z.ZodBoolean;
                rationale: z.ZodString;
            }, z.core.$strict>;
            createdAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"AGENT">;
                role: z.ZodLiteral<"DISCOVERY">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>;
        candidates: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            summary: z.ZodString;
            targetUsers: z.ZodArray<z.ZodString>;
            coreInteraction: z.ZodString;
            usageMoment: z.ZodString;
            appeal: z.ZodString;
            personalNeedRelationship: z.ZodOptional<z.ZodString>;
            technologyNecessity: z.ZodString;
            coreConcepts: z.ZodArray<z.ZodString>;
            mvpFeatures: z.ZodArray<z.ZodString>;
            suggestedScope: z.ZodObject<{
                learnerFocus: z.ZodArray<z.ZodString>;
                agentSupport: z.ZodArray<z.ZodString>;
                excluded: z.ZodArray<z.ZodString>;
            }, z.core.$strict>;
            risks: z.ZodOptional<z.ZodArray<z.ZodString>>;
            generationTags: z.ZodArray<z.ZodEnum<{
                DIRECT: "DIRECT";
                DISCOVER: "DISCOVER";
                EXPAND: "EXPAND";
                UPGRADE: "UPGRADE";
            }>>;
            evaluation: z.ZodOptional<z.ZodArray<z.ZodObject<{
                criterion: z.ZodEnum<{
                    ADJACENT_COMPLEXITY: "ADJACENT_COMPLEXITY";
                    ADOPTION_FEASIBILITY: "ADOPTION_FEASIBILITY";
                    CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
                    DEPLOYABILITY: "DEPLOYABILITY";
                    DISTINCTIVENESS: "DISTINCTIVENESS";
                    LEARNER_FIT: "LEARNER_FIT";
                    PERSONAL_UTILITY: "PERSONAL_UTILITY";
                    SCOPE_FEASIBILITY: "SCOPE_FEASIBILITY";
                }>;
                assessment: z.ZodEnum<{
                    CONCERN: "CONCERN";
                    MIXED: "MIXED";
                    POSITIVE: "POSITIVE";
                }>;
                rationale: z.ZodString;
            }, z.core.$strict>>>;
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            discoverySessionId: z.ZodString;
            correlationId: z.ZodString;
            revision: z.ZodInt;
            parentRevisions: z.ZodArray<z.ZodObject<{
                candidateId: z.ZodString;
                revision: z.ZodInt;
            }, z.core.$strict>>;
            createdAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"AGENT">;
                role: z.ZodLiteral<"DISCOVERY">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>;
        feedback: z.ZodArray<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            discoverySessionId: z.ZodString;
            roundId: z.ZodString;
            correlationId: z.ZodString;
            intent: z.ZodEnum<{
                EXPAND: "EXPAND";
                MERGE: "MERGE";
                MORE: "MORE";
                PIN: "PIN";
                REGENERATE: "REGENERATE";
                REJECT: "REJECT";
                REVISE: "REVISE";
                SELECT: "SELECT";
                SHRINK: "SHRINK";
            }>;
            targets: z.ZodArray<z.ZodObject<{
                candidateId: z.ZodString;
                revision: z.ZodInt;
            }, z.core.$strict>>;
            message: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"USER">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>;
        learningSpec: z.ZodNullable<z.ZodObject<{
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
        }, z.core.$strict>>;
        previewRound: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            finalRoundId: z.ZodString;
            discoverySessionId: z.ZodString;
            correlationId: z.ZodString;
            inputSnapshot: z.ZodObject<{
                learningGoal: z.ZodString;
                personalNeed: z.ZodOptional<z.ZodString>;
                recentFriction: z.ZodOptional<z.ZodString>;
                interestAreas: z.ZodOptional<z.ZodArray<z.ZodString>>;
                currentLevel: z.ZodOptional<z.ZodEnum<{
                    BEGINNER: "BEGINNER";
                    FAMILIAR: "FAMILIAR";
                    NEW: "NEW";
                    UNSPECIFIED: "UNSPECIFIED";
                }>>;
                freeContext: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
            previews: z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                summary: z.ZodString;
                coreInteraction: z.ZodString;
                appeal: z.ZodString;
                technologyNecessity: z.ZodString;
                generationTags: z.ZodArray<z.ZodEnum<{
                    DIRECT: "DIRECT";
                    DISCOVER: "DISCOVER";
                    EXPAND: "EXPAND";
                    UPGRADE: "UPGRADE";
                }>>;
                candidateId: z.ZodString;
                position: z.ZodInt;
            }, z.core.$strict>>;
            generationRationale: z.ZodString;
            createdAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"AGENT">;
                role: z.ZodLiteral<"DISCOVERY">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>>;
        candidateEnrichments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            previewRoundId: z.ZodString;
            discoverySessionId: z.ZodString;
            correlationId: z.ZodString;
            candidate: z.ZodObject<{
                title: z.ZodString;
                summary: z.ZodString;
                targetUsers: z.ZodArray<z.ZodString>;
                coreInteraction: z.ZodString;
                usageMoment: z.ZodString;
                appeal: z.ZodString;
                personalNeedRelationship: z.ZodOptional<z.ZodString>;
                technologyNecessity: z.ZodString;
                coreConcepts: z.ZodArray<z.ZodString>;
                mvpFeatures: z.ZodArray<z.ZodString>;
                suggestedScope: z.ZodObject<{
                    learnerFocus: z.ZodArray<z.ZodString>;
                    agentSupport: z.ZodArray<z.ZodString>;
                    excluded: z.ZodArray<z.ZodString>;
                }, z.core.$strict>;
                risks: z.ZodOptional<z.ZodArray<z.ZodString>>;
                generationTags: z.ZodArray<z.ZodEnum<{
                    DIRECT: "DIRECT";
                    DISCOVER: "DISCOVER";
                    EXPAND: "EXPAND";
                    UPGRADE: "UPGRADE";
                }>>;
                evaluation: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    criterion: z.ZodEnum<{
                        ADJACENT_COMPLEXITY: "ADJACENT_COMPLEXITY";
                        ADOPTION_FEASIBILITY: "ADOPTION_FEASIBILITY";
                        CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
                        DEPLOYABILITY: "DEPLOYABILITY";
                        DISTINCTIVENESS: "DISTINCTIVENESS";
                        LEARNER_FIT: "LEARNER_FIT";
                        PERSONAL_UTILITY: "PERSONAL_UTILITY";
                        SCOPE_FEASIBILITY: "SCOPE_FEASIBILITY";
                    }>;
                    assessment: z.ZodEnum<{
                        CONCERN: "CONCERN";
                        MIXED: "MIXED";
                        POSITIVE: "POSITIVE";
                    }>;
                    rationale: z.ZodString;
                }, z.core.$strict>>>;
                schemaVersion: z.ZodLiteral<1>;
                id: z.ZodString;
                discoverySessionId: z.ZodString;
                correlationId: z.ZodString;
                revision: z.ZodInt;
                parentRevisions: z.ZodArray<z.ZodObject<{
                    candidateId: z.ZodString;
                    revision: z.ZodInt;
                }, z.core.$strict>>;
                createdAt: z.ZodISODateTime;
                source: z.ZodObject<{
                    kind: z.ZodLiteral<"AGENT">;
                    role: z.ZodLiteral<"DISCOVERY">;
                }, z.core.$strict>;
                redactionStatus: z.ZodEnum<{
                    NOT_REQUIRED: "NOT_REQUIRED";
                    REDACTED: "REDACTED";
                    VERIFIED_REDACTED: "VERIFIED_REDACTED";
                }>;
            }, z.core.$strict>;
            createdAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"AGENT">;
                role: z.ZodLiteral<"DISCOVERY">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>>;
        relevantLedgerEntries: z.ZodArray<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            concept: z.ZodObject<{
                schemaVersion: z.ZodLiteral<1>;
                id: z.ZodString;
                canonicalName: z.ZodString;
                description: z.ZodString;
                revision: z.ZodInt;
                createdAt: z.ZodISODateTime;
                updatedAt: z.ZodISODateTime;
                source: z.ZodObject<{
                    kind: z.ZodLiteral<"CORE">;
                }, z.core.$strict>;
            }, z.core.$strict>;
            acceptedAliases: z.ZodArray<z.ZodString>;
            state: z.ZodObject<{
                conceptId: z.ZodString;
                state: z.ZodEnum<{
                    DEMONSTRATED: "DEMONSTRATED";
                    EXPLAINED: "EXPLAINED";
                    OBSERVED: "OBSERVED";
                    TRANSFERRED: "TRANSFERRED";
                }>;
                acceptedEvidenceIds: z.ZodArray<z.ZodString>;
                reducerVersion: z.ZodString;
                revision: z.ZodInt;
                updatedAt: z.ZodISODateTime;
            }, z.core.$strict>;
            openIssues: z.ZodArray<z.ZodObject<{
                schemaVersion: z.ZodLiteral<1>;
                id: z.ZodString;
                conceptId: z.ZodString;
                projectId: z.ZodString;
                openedByEvidenceId: z.ZodString;
                status: z.ZodEnum<{
                    OPEN: "OPEN";
                    RESOLVED: "RESOLVED";
                }>;
                summary: z.ZodString;
                supportingEvidenceIds: z.ZodArray<z.ZodString>;
                resolvedByEvidenceId: z.ZodOptional<z.ZodString>;
                openedAt: z.ZodISODateTime;
                resolvedAt: z.ZodOptional<z.ZodISODateTime>;
                source: z.ZodObject<{
                    kind: z.ZodLiteral<"CORE">;
                }, z.core.$strict>;
            }, z.core.$strict>>;
            relatedProjectIds: z.ZodArray<z.ZodString>;
            relatedTaskIds: z.ZodArray<z.ZodString>;
            revision: z.ZodInt;
            updatedAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"CORE">;
            }, z.core.$strict>;
        }, z.core.$strict>>;
        personalization: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            projectId: z.ZodString;
            correlationId: z.ZodString;
            target: z.ZodDiscriminatedUnion<[z.ZodObject<{
                kind: z.ZodLiteral<"DISCOVERY_SESSION">;
                discoverySessionId: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                kind: z.ZodLiteral<"HELPER_TURN">;
                taskId: z.ZodString;
                decisionId: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>], "kind">;
            mode: z.ZodEnum<{
                EVIDENCE_AWARE: "EVIDENCE_AWARE";
                NO_RELEVANT_EVIDENCE: "NO_RELEVANT_EVIDENCE";
            }>;
            basis: z.ZodArray<z.ZodObject<{
                conceptId: z.ZodString;
                conceptName: z.ZodString;
                ledgerRevision: z.ZodInt;
                state: z.ZodEnum<{
                    DEMONSTRATED: "DEMONSTRATED";
                    EXPLAINED: "EXPLAINED";
                    OBSERVED: "OBSERVED";
                    TRANSFERRED: "TRANSFERRED";
                }>;
                evidenceIds: z.ZodArray<z.ZodString>;
                episodeIds: z.ZodArray<z.ZodString>;
                sourceProjectIds: z.ZodArray<z.ZodString>;
                sourceProjectTitles: z.ZodArray<z.ZodString>;
                openIssueIds: z.ZodArray<z.ZodString>;
                purpose: z.ZodEnum<{
                    DISCOVERY_TIE_BREAK: "DISCOVERY_TIE_BREAK";
                    HELPER_EXPLANATION_START: "HELPER_EXPLANATION_START";
                    HELPER_PAST_EXPERIENCE_CONNECTION: "HELPER_PAST_EXPERIENCE_CONNECTION";
                    HELPER_TASK_USER_EVIDENCE_CONNECTION: "HELPER_TASK_USER_EVIDENCE_CONNECTION";
                }>;
                redactedEvidenceExcerpt: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            fallbackReason: z.ZodOptional<z.ZodEnum<{
                NO_LEDGER: "NO_LEDGER";
                NO_PRIOR_PROJECT_EVIDENCE: "NO_PRIOR_PROJECT_EVIDENCE";
                NO_RELEVANT_CONCEPT: "NO_RELEVANT_CONCEPT";
            }>>;
            createdAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"CORE">;
            }, z.core.$strict>;
            redactionStatus: z.ZodLiteral<"VERIFIED_REDACTED">;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    selectedCandidate: z.ZodNullable<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        targetUsers: z.ZodArray<z.ZodString>;
        coreInteraction: z.ZodString;
        usageMoment: z.ZodString;
        appeal: z.ZodString;
        personalNeedRelationship: z.ZodOptional<z.ZodString>;
        technologyNecessity: z.ZodString;
        coreConcepts: z.ZodArray<z.ZodString>;
        mvpFeatures: z.ZodArray<z.ZodString>;
        suggestedScope: z.ZodObject<{
            learnerFocus: z.ZodArray<z.ZodString>;
            agentSupport: z.ZodArray<z.ZodString>;
            excluded: z.ZodArray<z.ZodString>;
        }, z.core.$strict>;
        risks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        generationTags: z.ZodArray<z.ZodEnum<{
            DIRECT: "DIRECT";
            DISCOVER: "DISCOVER";
            EXPAND: "EXPAND";
            UPGRADE: "UPGRADE";
        }>>;
        evaluation: z.ZodOptional<z.ZodArray<z.ZodObject<{
            criterion: z.ZodEnum<{
                ADJACENT_COMPLEXITY: "ADJACENT_COMPLEXITY";
                ADOPTION_FEASIBILITY: "ADOPTION_FEASIBILITY";
                CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
                DEPLOYABILITY: "DEPLOYABILITY";
                DISTINCTIVENESS: "DISTINCTIVENESS";
                LEARNER_FIT: "LEARNER_FIT";
                PERSONAL_UTILITY: "PERSONAL_UTILITY";
                SCOPE_FEASIBILITY: "SCOPE_FEASIBILITY";
            }>;
            assessment: z.ZodEnum<{
                CONCERN: "CONCERN";
                MIXED: "MIXED";
                POSITIVE: "POSITIVE";
            }>;
            rationale: z.ZodString;
        }, z.core.$strict>>>;
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        discoverySessionId: z.ZodString;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        parentRevisions: z.ZodArray<z.ZodObject<{
            candidateId: z.ZodString;
            revision: z.ZodInt;
        }, z.core.$strict>>;
        createdAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"AGENT">;
            role: z.ZodLiteral<"DISCOVERY">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    learningSpec: z.ZodNullable<z.ZodObject<{
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
    }, z.core.$strict>>;
    activeTask: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        learningSpecId: z.ZodString;
        learningSpecRevision: z.ZodInt;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        title: z.ZodString;
        productGoal: z.ZodString;
        requirements: z.ZodArray<z.ZodString>;
        acceptanceCriteria: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            description: z.ZodString;
        }, z.core.$strict>>;
        expectedConcepts: z.ZodArray<z.ZodString>;
        excludedWork: z.ZodArray<z.ZodString>;
        prerequisiteTaskIds: z.ZodArray<z.ZodString>;
        expectedDecisionCategories: z.ZodArray<z.ZodEnum<{
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
        }>>;
        finalUpgrade: z.ZodOptional<z.ZodObject<{
            sourceTaskId: z.ZodString;
            personalizationTraceId: z.ZodString;
            userGoal: z.ZodString;
        }, z.core.$strict>>;
        sequence: z.ZodInt;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            BLOCKED: "BLOCKED";
            CANCELLED: "CANCELLED";
            COMPLETED: "COMPLETED";
            FAILED: "FAILED";
            PENDING: "PENDING";
        }>;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"CORE">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    currentTask: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        learningSpecId: z.ZodString;
        learningSpecRevision: z.ZodInt;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        title: z.ZodString;
        productGoal: z.ZodString;
        requirements: z.ZodArray<z.ZodString>;
        acceptanceCriteria: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            description: z.ZodString;
        }, z.core.$strict>>;
        expectedConcepts: z.ZodArray<z.ZodString>;
        excludedWork: z.ZodArray<z.ZodString>;
        prerequisiteTaskIds: z.ZodArray<z.ZodString>;
        expectedDecisionCategories: z.ZodArray<z.ZodEnum<{
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
        }>>;
        finalUpgrade: z.ZodOptional<z.ZodObject<{
            sourceTaskId: z.ZodString;
            personalizationTraceId: z.ZodString;
            userGoal: z.ZodString;
        }, z.core.$strict>>;
        sequence: z.ZodInt;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            BLOCKED: "BLOCKED";
            CANCELLED: "CANCELLED";
            COMPLETED: "COMPLETED";
            FAILED: "FAILED";
            PENDING: "PENDING";
        }>;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"CORE">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    liveContext: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        taskId: z.ZodString;
        correlationId: z.ZodString;
        contextVersion: z.ZodInt;
        expectedPreviousVersion: z.ZodInt;
        checkpoint: z.ZodEnum<{
            CONCEPT_INTRODUCED: "CONCEPT_INTRODUCED";
            DECISION_REQUIRED: "DECISION_REQUIRED";
            DIRECTION_CHANGED: "DIRECTION_CHANGED";
            PLAN_CHANGED_AFTER_ERROR: "PLAN_CHANGED_AFTER_ERROR";
            TASK_COMPLETED: "TASK_COMPLETED";
            TASK_STARTED: "TASK_STARTED";
            VALIDATION_STARTED: "VALIDATION_STARTED";
        }>;
        stage: z.ZodString;
        currentGoal: z.ZodString;
        recentChanges: z.ZodArray<z.ZodString>;
        activeDecisionIds: z.ZodArray<z.ZodString>;
        activeConceptNames: z.ZodArray<z.ZodString>;
        relatedFiles: z.ZodArray<z.ZodObject<{
            kind: z.ZodLiteral<"CODE">;
            path: z.ZodString;
            lineRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodInt;
                end: z.ZodInt;
            }, z.core.$strict>>;
            revisionRef: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        nextActions: z.ZodArray<z.ZodString>;
        blockingReason: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"AGENT">;
            role: z.ZodLiteral<"BUILDER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    pendingDecisions: z.ZodArray<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        taskId: z.ZodString;
        correlationId: z.ZodString;
        contextVersion: z.ZodInt;
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
        question: z.ZodString;
        reasonRequiredNow: z.ZodString;
        options: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            description: z.ZodString;
            impacts: z.ZodArray<z.ZodString>;
            tradeoffs: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        recommendedOptionId: z.ZodString;
        recommendationRationale: z.ZodString;
        relatedConceptNames: z.ZodArray<z.ZodString>;
        sourceReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        independentWorkCanContinue: z.ZodBoolean;
        requestedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"AGENT">;
            role: z.ZodLiteral<"BUILDER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    decisions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        request: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            projectId: z.ZodString;
            taskId: z.ZodString;
            correlationId: z.ZodString;
            contextVersion: z.ZodInt;
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
            question: z.ZodString;
            reasonRequiredNow: z.ZodString;
            options: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                description: z.ZodString;
                impacts: z.ZodArray<z.ZodString>;
                tradeoffs: z.ZodArray<z.ZodString>;
            }, z.core.$strict>>;
            recommendedOptionId: z.ZodString;
            recommendationRationale: z.ZodString;
            relatedConceptNames: z.ZodArray<z.ZodString>;
            sourceReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            independentWorkCanContinue: z.ZodBoolean;
            requestedAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"AGENT">;
                role: z.ZodLiteral<"BUILDER">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>;
        resolution: z.ZodNullable<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            decisionId: z.ZodString;
            projectId: z.ZodString;
            taskId: z.ZodString;
            correlationId: z.ZodString;
            expectedContextVersion: z.ZodInt;
            selectionKind: z.ZodEnum<{
                CUSTOM: "CUSTOM";
                OPTION: "OPTION";
                RECOMMENDATION: "RECOMMENDATION";
            }>;
            selectedOptionId: z.ZodOptional<z.ZodString>;
            customProposal: z.ZodOptional<z.ZodString>;
            rationale: z.ZodOptional<z.ZodString>;
            helperUsed: z.ZodBoolean;
            resolvedAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"USER">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>;
        application: z.ZodNullable<z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            decisionId: z.ZodString;
            resolutionId: z.ZodString;
            projectId: z.ZodString;
            taskId: z.ZodString;
            correlationId: z.ZodString;
            appliedResult: z.ZodString;
            sourceReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
            appliedAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"AGENT">;
                role: z.ZodLiteral<"BUILDER">;
            }, z.core.$strict>;
            redactionStatus: z.ZodEnum<{
                NOT_REQUIRED: "NOT_REQUIRED";
                REDACTED: "REDACTED";
                VERIFIED_REDACTED: "VERIFIED_REDACTED";
            }>;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
    completionReport: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        taskId: z.ZodString;
        correlationId: z.ZodString;
        expectedTaskRevision: z.ZodInt;
        implementedFeatures: z.ZodArray<z.ZodString>;
        acceptanceResults: z.ZodArray<z.ZodObject<{
            criterionKey: z.ZodString;
            status: z.ZodEnum<{
                FAILED: "FAILED";
                PASSED: "PASSED";
            }>;
            evidence: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        }, z.core.$strict>>;
        validationResults: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            status: z.ZodEnum<{
                FAILED: "FAILED";
                NOT_RUN: "NOT_RUN";
                PASSED: "PASSED";
            }>;
            summary: z.ZodString;
            reference: z.ZodOptional<z.ZodObject<{
                kind: z.ZodLiteral<"TEST_RESULT">;
                testResultId: z.ZodString;
                taskId: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        conceptUsage: z.ZodArray<z.ZodObject<{
            conceptName: z.ZodString;
            scope: z.ZodEnum<{
                AGENT_SUPPORT: "AGENT_SUPPORT";
                EXCLUDED: "EXCLUDED";
                LEARNER_FOCUS: "LEARNER_FOCUS";
            }>;
            importance: z.ZodEnum<{
                CORE: "CORE";
                SUPPORTING: "SUPPORTING";
            }>;
            usageReason: z.ZodString;
            codeReferences: z.ZodArray<z.ZodObject<{
                kind: z.ZodLiteral<"CODE">;
                path: z.ZodString;
                lineRange: z.ZodOptional<z.ZodObject<{
                    start: z.ZodInt;
                    end: z.ZodInt;
                }, z.core.$strict>>;
                revisionRef: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        appliedDecisionIds: z.ZodArray<z.ZodString>;
        codeReferences: z.ZodArray<z.ZodObject<{
            kind: z.ZodLiteral<"CODE">;
            path: z.ZodString;
            lineRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodInt;
                end: z.ZodInt;
            }, z.core.$strict>>;
            revisionRef: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        diffReferences: z.ZodArray<z.ZodObject<{
            kind: z.ZodLiteral<"DIFF">;
            diffId: z.ZodString;
            paths: z.ZodArray<z.ZodString>;
            revisionRef: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        specDeviations: z.ZodArray<z.ZodString>;
        remainingIssues: z.ZodArray<z.ZodString>;
        limitations: z.ZodArray<z.ZodString>;
        completedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"AGENT">;
            role: z.ZodLiteral<"BUILDER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>>;
    helperConversations: z.ZodArray<z.ZodObject<{
        conversationId: z.ZodString;
        episodeId: z.ZodString;
        taskId: z.ZodString;
        decisionId: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<{
            ANALYSIS_FAILED: "ANALYSIS_FAILED";
            ANALYZED: "ANALYZED";
            OPEN: "OPEN";
            PENDING_ANALYSIS: "PENDING_ANALYSIS";
        }>;
        startedAt: z.ZodISODateTime;
        endedAt: z.ZodOptional<z.ZodISODateTime>;
        redactedUserExcerpts: z.ZodArray<z.ZodString>;
        helperResponseSummaries: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type CrewAppSurface = z.infer<typeof crewAppSurfaceSchema>;
export type HelperConversationSummary = z.infer<typeof helperConversationSummarySchema>;
export type DecisionSessionItem = z.infer<typeof decisionSessionItemSchema>;
export type ProjectHistoryItem = z.infer<typeof projectHistoryItemSchema>;
export type ProjectHistory = z.infer<typeof projectHistorySchema>;
export type ProjectSessionSnapshot = z.infer<typeof projectSessionSnapshotSchema>;
