import { z } from 'zod';
export declare const uiStartDiscoveryCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_START_DISCOVERY">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
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
}, z.core.$strict>;
export declare const uiRecordDiscoveryFeedbackCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_DISCOVERY_FEEDBACK">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    feedback: z.ZodObject<{
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
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const uiConfirmLearningSpecCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_CONFIRM_LEARNING_SPEC">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    learningSpecId: z.ZodString;
    expectedSpecRevision: z.ZodInt;
}, z.core.$strict>;
export declare const uiPrepareBuilderTaskCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_BUILDER_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    learningSpecId: z.ZodString;
    expectedSpecRevision: z.ZodInt;
}, z.core.$strict>;
export declare const uiPrepareFinalUpgradeTaskCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_FINAL_UPGRADE_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    sourceTaskId: z.ZodString;
    expectedSourceTaskRevision: z.ZodInt;
    personalizationTraceId: z.ZodString;
    userGoal: z.ZodString;
}, z.core.$strict>;
export declare const uiPrepareFollowUpTaskCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_FOLLOW_UP_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    sourceTaskId: z.ZodString;
    expectedSourceTaskRevision: z.ZodInt;
    userGoal: z.ZodString;
}, z.core.$strict>;
export declare const uiUpdateLearningSpecCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_UPDATE_LEARNING_SPEC">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    learningSpecId: z.ZodString;
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
export declare const uiReturnToDiscoveryCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RETURN_TO_DISCOVERY">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    expectedSpecRevision: z.ZodInt;
    input: z.ZodOptional<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const uiResolveDecisionCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RESOLVE_DECISION">;
    idempotencyKey: z.ZodString;
    resolution: z.ZodObject<{
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
        chatSource: z.ZodOptional<z.ZodObject<{
            mappedBy: z.ZodLiteral<"BUILDER">;
            userMessageIds: z.ZodArray<z.ZodString>;
            linkedMessages: z.ZodOptional<z.ZodArray<z.ZodObject<{
                conversationId: z.ZodString;
                messageId: z.ZodString;
                tab: z.ZodEnum<{
                    BUILDER: "BUILDER";
                    HELPER: "HELPER";
                }>;
                timing: z.ZodEnum<{
                    AFTER_REQUEST: "AFTER_REQUEST";
                    BEFORE_REQUEST: "BEFORE_REQUEST";
                }>;
            }, z.core.$strict>>>;
            builderSummary: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        resolvedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"USER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const uiOpenHelperQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_OPEN_HELPER">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    question: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const uiPrepareBuilderSessionQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_BUILDER_SESSION">;
    purpose: z.ZodOptional<z.ZodEnum<{
        AGENT_SESSION: "AGENT_SESSION";
        WORKSPACE_VIEW: "WORKSPACE_VIEW";
    }>>;
    projectId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strict>;
export declare const uiListProjectsQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_LIST_PROJECTS">;
    limit: z.ZodInt;
}, z.core.$strict>;
export declare const uiRestoreProjectSessionQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RESTORE_PROJECT_SESSION">;
    projectId: z.ZodString;
    helperConversationLimit: z.ZodInt;
}, z.core.$strict>;
export declare const uiPrepareDiscoveryAgentContextQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_DISCOVERY_AGENT_CONTEXT">;
    projectId: z.ZodString;
    helperConversationLimit: z.ZodInt;
}, z.core.$strict>;
export declare const uiRecordHelperExchangeCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_HELPER_EXCHANGE">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    userMessage: z.ZodString;
    helperResponseSummary: z.ZodString;
    origin: z.ZodDefault<z.ZodEnum<{
        FREE_TEXT: "FREE_TEXT";
        QUICK_ACTION: "QUICK_ACTION";
    }>>;
    closeConversation: z.ZodBoolean;
}, z.core.$strict>;
/**
 * A message the learner typed into the host coding chat (for example Kiro), forwarded by the
 * user-side host adapter. Core stores it as user-authored Activity for later Evidence analysis.
 */
export declare const uiRecordChatMessageCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_CHAT_MESSAGE">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodString;
    message: z.ZodString;
}, z.core.$strict>;
/**
 * The Builder's reply at the end of a Kiro chat turn, read by the user-side hook runner from the
 * Kiro session record (K10). Core stores it as Agent-authored context, never as user Evidence.
 */
export declare const uiRecordBuilderChatTurnCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_BUILDER_CHAT_TURN">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodString;
    reply: z.ZodString;
}, z.core.$strict>;
export declare const uiRetryAnalysisCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RETRY_ANALYSIS">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
}, z.core.$strict>;
export declare const uiReadAnalysisJobsQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_ANALYSIS_JOBS">;
    projectId: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<{
        FAILED: "FAILED";
        PENDING: "PENDING";
        RUNNING: "RUNNING";
        SUCCEEDED: "SUCCEEDED";
    }>>;
    limit: z.ZodInt;
}, z.core.$strict>;
/** Next Move suggestions for the Project's latest finished Task (SPEC 5.8.1). */
export declare const uiReadNextMoveQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_NEXT_MOVE">;
    projectId: z.ZodString;
}, z.core.$strict>;
/** Starts a new attempt after both automatic attempts failed; the only Next Move button. */
export declare const uiRetryNextMoveCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RETRY_NEXT_MOVE">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
}, z.core.$strict>;
export declare const uiReadEvidenceTraceQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_EVIDENCE_TRACE">;
    projectId: z.ZodString;
    conceptId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
/** Learner-level guidance rendered from Core Concept State, for hosts to place in Agent context. */
export declare const uiReadLearnerProfileQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_LEARNER_PROFILE">;
    maxConcepts: z.ZodOptional<z.ZodInt>;
}, z.core.$strict>;
export declare const uiLaunchResultCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_LAUNCH_RESULT">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
}, z.core.$strict>;
export declare const generatedResultDescriptorSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    projectId: z.ZodString;
    workspacePath: z.ZodString;
    status: z.ZodLiteral<"READY">;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    projectId: z.ZodString;
    workspacePath: z.ZodString;
    status: z.ZodLiteral<"RUNNING">;
    url: z.ZodURL;
    reused: z.ZodBoolean;
}, z.core.$strict>], "status">;
export declare const builderSessionBindingDescriptorSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    workspaceDirectory: z.ZodString;
    status: z.ZodLiteral<"READY">;
}, z.core.$strict>;
export declare const preparedBuilderTaskDescriptorSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    projectId: z.ZodString;
    workspacePath: z.ZodString;
    task: z.ZodObject<{
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
        nextMove: z.ZodOptional<z.ZodObject<{
            nextMoveJobId: z.ZodString;
            number: z.ZodInt;
            title: z.ZodString;
            summary: z.ZodString;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"AGENT">;
                role: z.ZodLiteral<"DISCOVERY">;
            }, z.core.$strict>;
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
    }, z.core.$strict>;
    status: z.ZodLiteral<"READY">;
}, z.core.$strict>;
export declare const helperExchangeReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    conversationId: z.ZodString;
    episodeId: z.ZodString;
    episodeRevision: z.ZodInt;
    status: z.ZodEnum<{
        OPEN: "OPEN";
        PENDING_ANALYSIS: "PENDING_ANALYSIS";
    }>;
}, z.core.$strict>;
export declare const chatMessageReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    conversationId: z.ZodString;
    messageId: z.ZodString;
    eventId: z.ZodString;
    episode: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        revision: z.ZodInt;
        type: z.ZodEnum<{
            BUILD_TASK: "BUILD_TASK";
            DECISION: "DECISION";
            FINAL_UPGRADE: "FINAL_UPGRADE";
        }>;
        decisionId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const learnerProfileViewSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    profileVersion: z.ZodString;
    conceptIds: z.ZodArray<z.ZodString>;
    omittedCount: z.ZodInt;
    text: z.ZodString;
    digest: z.ZodString;
}, z.core.$strict>;
export declare const uiRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_START_DISCOVERY">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_DISCOVERY_FEEDBACK">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    feedback: z.ZodObject<{
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
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_UPDATE_LEARNING_SPEC">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    learningSpecId: z.ZodString;
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_CONFIRM_LEARNING_SPEC">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    learningSpecId: z.ZodString;
    expectedSpecRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_BUILDER_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    learningSpecId: z.ZodString;
    expectedSpecRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_FINAL_UPGRADE_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    sourceTaskId: z.ZodString;
    expectedSourceTaskRevision: z.ZodInt;
    personalizationTraceId: z.ZodString;
    userGoal: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_FOLLOW_UP_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    sourceTaskId: z.ZodString;
    expectedSourceTaskRevision: z.ZodInt;
    userGoal: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RETURN_TO_DISCOVERY">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    expectedSpecRevision: z.ZodInt;
    input: z.ZodOptional<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RESOLVE_DECISION">;
    idempotencyKey: z.ZodString;
    resolution: z.ZodObject<{
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
        chatSource: z.ZodOptional<z.ZodObject<{
            mappedBy: z.ZodLiteral<"BUILDER">;
            userMessageIds: z.ZodArray<z.ZodString>;
            linkedMessages: z.ZodOptional<z.ZodArray<z.ZodObject<{
                conversationId: z.ZodString;
                messageId: z.ZodString;
                tab: z.ZodEnum<{
                    BUILDER: "BUILDER";
                    HELPER: "HELPER";
                }>;
                timing: z.ZodEnum<{
                    AFTER_REQUEST: "AFTER_REQUEST";
                    BEFORE_REQUEST: "BEFORE_REQUEST";
                }>;
            }, z.core.$strict>>>;
            builderSummary: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        resolvedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"USER">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_LIST_PROJECTS">;
    limit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RESTORE_PROJECT_SESSION">;
    projectId: z.ZodString;
    helperConversationLimit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_DISCOVERY_AGENT_CONTEXT">;
    projectId: z.ZodString;
    helperConversationLimit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_OPEN_HELPER">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    question: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_PREPARE_BUILDER_SESSION">;
    purpose: z.ZodOptional<z.ZodEnum<{
        AGENT_SESSION: "AGENT_SESSION";
        WORKSPACE_VIEW: "WORKSPACE_VIEW";
    }>>;
    projectId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_HELPER_EXCHANGE">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    userMessage: z.ZodString;
    helperResponseSummary: z.ZodString;
    origin: z.ZodDefault<z.ZodEnum<{
        FREE_TEXT: "FREE_TEXT";
        QUICK_ACTION: "QUICK_ACTION";
    }>>;
    closeConversation: z.ZodBoolean;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_CHAT_MESSAGE">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodString;
    message: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RECORD_BUILDER_CHAT_TURN">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodString;
    reply: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RETRY_ANALYSIS">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_ANALYSIS_JOBS">;
    projectId: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<{
        FAILED: "FAILED";
        PENDING: "PENDING";
        RUNNING: "RUNNING";
        SUCCEEDED: "SUCCEEDED";
    }>>;
    limit: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_NEXT_MOVE">;
    projectId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_RETRY_NEXT_MOVE">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    nextMoveJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_EVIDENCE_TRACE">;
    projectId: z.ZodString;
    conceptId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_READ_LEARNER_PROFILE">;
    maxConcepts: z.ZodOptional<z.ZodInt>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"UI">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"UI_LAUNCH_RESULT">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
}, z.core.$strict>], "kind">;
export type UiRequest = z.infer<typeof uiRequestSchema>;
export type GeneratedResultDescriptor = z.infer<typeof generatedResultDescriptorSchema>;
export type PreparedBuilderTaskDescriptor = z.infer<typeof preparedBuilderTaskDescriptorSchema>;
export type HelperExchangeReceipt = z.infer<typeof helperExchangeReceiptSchema>;
export type ChatMessageReceipt = z.infer<typeof chatMessageReceiptSchema>;
export type LearnerProfileView = z.infer<typeof learnerProfileViewSchema>;
export type BuilderSessionBindingDescriptor = z.infer<typeof builderSessionBindingDescriptorSchema>;
