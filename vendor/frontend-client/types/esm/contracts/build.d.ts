import { z } from 'zod';
export declare const builderTaskStatusSchema: z.ZodEnum<{
    ACTIVE: "ACTIVE";
    BLOCKED: "BLOCKED";
    CANCELLED: "CANCELLED";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
    PENDING: "PENDING";
}>;
export declare const acceptanceCriterionSchema: z.ZodObject<{
    key: z.ZodString;
    description: z.ZodString;
}, z.core.$strict>;
export declare const builderTaskSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const buildCheckpointSchema: z.ZodEnum<{
    CONCEPT_INTRODUCED: "CONCEPT_INTRODUCED";
    DECISION_REQUIRED: "DECISION_REQUIRED";
    DIRECTION_CHANGED: "DIRECTION_CHANGED";
    PLAN_CHANGED_AFTER_ERROR: "PLAN_CHANGED_AFTER_ERROR";
    TASK_COMPLETED: "TASK_COMPLETED";
    TASK_STARTED: "TASK_STARTED";
    VALIDATION_STARTED: "VALIDATION_STARTED";
}>;
export declare const liveProjectContextSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const contextRefreshRequestStatusSchema: z.ZodEnum<{
    FULFILLED: "FULFILLED";
    PENDING: "PENDING";
}>;
export declare const contextRefreshRequestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    correlationId: z.ZodString;
    revision: z.ZodInt;
    observedContextVersion: z.ZodOptional<z.ZodInt>;
    reason: z.ZodString;
    status: z.ZodEnum<{
        FULFILLED: "FULFILLED";
        PENDING: "PENDING";
    }>;
    requestedAt: z.ZodISODateTime;
    fulfilledAt: z.ZodOptional<z.ZodISODateTime>;
    fulfilledByContextVersion: z.ZodOptional<z.ZodInt>;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"HELPER">;
    }, z.core.$strict>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export declare const builderUpdateLiveContextToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
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
}, z.core.$strict>;
export declare const decisionOptionSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    description: z.ZodString;
    impacts: z.ZodArray<z.ZodString>;
    tradeoffs: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const decisionOptionDraftSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    description: z.ZodString;
    impacts: z.ZodArray<z.ZodString>;
    tradeoffs: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const decisionRequestDraftSchema: z.ZodObject<{
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
        key: z.ZodString;
        label: z.ZodString;
        description: z.ZodString;
        impacts: z.ZodArray<z.ZodString>;
        tradeoffs: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    recommendedOptionKey: z.ZodString;
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
}, z.core.$strict>;
export declare const decisionContextDraftSchema: z.ZodObject<{
    stage: z.ZodString;
    currentGoal: z.ZodString;
    recentChanges: z.ZodArray<z.ZodString>;
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
}, z.core.$strict>;
export declare const builderRequestDecisionToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedTaskRevision: z.ZodInt;
    expectedContextVersion: z.ZodInt;
    decision: z.ZodObject<{
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
            key: z.ZodString;
            label: z.ZodString;
            description: z.ZodString;
            impacts: z.ZodArray<z.ZodString>;
            tradeoffs: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        recommendedOptionKey: z.ZodString;
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
    }, z.core.$strict>;
    context: z.ZodObject<{
        stage: z.ZodString;
        currentGoal: z.ZodString;
        recentChanges: z.ZodArray<z.ZodString>;
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
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const decisionRequestSchema: z.ZodObject<{
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
export declare const decisionResolutionSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const decisionApplicationSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const builderApplyDecisionToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedTaskRevision: z.ZodInt;
    expectedContextVersion: z.ZodInt;
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
    context: z.ZodObject<{
        stage: z.ZodString;
        currentGoal: z.ZodString;
        recentChanges: z.ZodArray<z.ZodString>;
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
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const validationResultSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const conceptUsageReportSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const taskCompletionReportSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const builderCompleteTaskToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedTaskRevision: z.ZodInt;
    report: z.ZodObject<{
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
    }, z.core.$strict>;
}, z.core.$strict>;
export type BuilderTask = z.infer<typeof builderTaskSchema>;
export type LiveProjectContext = z.infer<typeof liveProjectContextSchema>;
export type ContextRefreshRequest = z.infer<typeof contextRefreshRequestSchema>;
export type DecisionOption = z.infer<typeof decisionOptionSchema>;
export type DecisionOptionDraft = z.infer<typeof decisionOptionDraftSchema>;
export type DecisionRequestDraft = z.infer<typeof decisionRequestDraftSchema>;
export type DecisionRequest = z.infer<typeof decisionRequestSchema>;
export type DecisionResolution = z.infer<typeof decisionResolutionSchema>;
export type DecisionApplication = z.infer<typeof decisionApplicationSchema>;
export type TaskCompletionReport = z.infer<typeof taskCompletionReportSchema>;
export type BuilderUpdateLiveContextToolInput = z.infer<typeof builderUpdateLiveContextToolInputSchema>;
export type BuilderRequestDecisionToolInput = z.infer<typeof builderRequestDecisionToolInputSchema>;
export type BuilderApplyDecisionToolInput = z.infer<typeof builderApplyDecisionToolInputSchema>;
export type BuilderCompleteTaskToolInput = z.infer<typeof builderCompleteTaskToolInputSchema>;
