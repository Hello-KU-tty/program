import { z } from 'zod';
export declare const kiroChatProgressKindSchema: z.ZodEnum<{
    DIRECTION_CHANGE: "DIRECTION_CHANGE";
    ERROR_REPLAN: "ERROR_REPLAN";
    PLAN: "PLAN";
    TEST_START: "TEST_START";
}>;
export declare const kiroChatProgressNoteSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        DIRECTION_CHANGE: "DIRECTION_CHANGE";
        ERROR_REPLAN: "ERROR_REPLAN";
        PLAN: "PLAN";
        TEST_START: "TEST_START";
    }>;
    summary: z.ZodString;
    stage: z.ZodOptional<z.ZodString>;
    changes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nextSteps: z.ZodOptional<z.ZodArray<z.ZodString>>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nextMove: z.ZodOptional<z.ZodPreprocess<z.ZodInt>>;
}, z.core.$strict>;
export declare const kiroChatChoiceOptionSchema: z.ZodObject<{
    label: z.ZodString;
    description: z.ZodString;
    tradeoffs: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export declare const kiroChatAskChoiceSchema: z.ZodObject<{
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
    whyNow: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        description: z.ZodString;
        tradeoffs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>;
    recommended: z.ZodInt;
    recommendationReason: z.ZodString;
    blocksWork: z.ZodBoolean;
    blockingReason: z.ZodOptional<z.ZodString>;
    concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export declare const kiroChatSaveChoiceSchema: z.ZodObject<{
    decisionId: z.ZodOptional<z.ZodString>;
    choice: z.ZodUnion<readonly [z.ZodPreprocess<z.ZodInt>, z.ZodLiteral<"recommended">, z.ZodLiteral<"custom">]>;
    customSummary: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const kiroChatFinishTaskSchema: z.ZodObject<{
    implemented: z.ZodArray<z.ZodString>;
    acceptance: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        passed: z.ZodBoolean;
        changedByDecisionId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    checks: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        passed: z.ZodBoolean;
        summary: z.ZodString;
    }, z.core.$strict>>;
    decisionsApplied: z.ZodOptional<z.ZodArray<z.ZodObject<{
        decisionId: z.ZodString;
        how: z.ZodString;
    }, z.core.$strict>>>;
    concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        why: z.ZodString;
        files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>>;
    deviations: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remaining: z.ZodOptional<z.ZodArray<z.ZodString>>;
    limitations: z.ZodOptional<z.ZodArray<z.ZodString>>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export declare const kiroChatCheckProgressToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const kiroChatSaveProgressToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    kind: z.ZodEnum<{
        DIRECTION_CHANGE: "DIRECTION_CHANGE";
        ERROR_REPLAN: "ERROR_REPLAN";
        PLAN: "PLAN";
        TEST_START: "TEST_START";
    }>;
    summary: z.ZodString;
    stage: z.ZodOptional<z.ZodString>;
    changes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nextSteps: z.ZodOptional<z.ZodArray<z.ZodString>>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nextMove: z.ZodOptional<z.ZodPreprocess<z.ZodInt>>;
}, z.core.$strict>;
export declare const kiroChatAskChoiceToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
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
    whyNow: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        description: z.ZodString;
        tradeoffs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>;
    recommended: z.ZodInt;
    recommendationReason: z.ZodString;
    blocksWork: z.ZodBoolean;
    blockingReason: z.ZodOptional<z.ZodString>;
    concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export declare const kiroChatSaveChoiceToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    choice: z.ZodUnion<readonly [z.ZodPreprocess<z.ZodInt>, z.ZodLiteral<"recommended">, z.ZodLiteral<"custom">]>;
    customSummary: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const kiroChatFinishTaskToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    implemented: z.ZodArray<z.ZodString>;
    acceptance: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        passed: z.ZodBoolean;
        changedByDecisionId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    checks: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        passed: z.ZodBoolean;
        summary: z.ZodString;
    }, z.core.$strict>>;
    decisionsApplied: z.ZodOptional<z.ZodArray<z.ZodObject<{
        decisionId: z.ZodString;
        how: z.ZodString;
    }, z.core.$strict>>>;
    concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        why: z.ZodString;
        files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>>;
    deviations: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remaining: z.ZodOptional<z.ZodArray<z.ZodString>>;
    limitations: z.ZodOptional<z.ZodArray<z.ZodString>>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export declare const builderChatCheckProgressQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    kind: z.ZodLiteral<"BUILDER_CHAT_CHECK_PROGRESS">;
}, z.core.$strict>;
export declare const builderChatSaveProgressCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    kind: z.ZodLiteral<"BUILDER_CHAT_SAVE_PROGRESS">;
    idempotencyKey: z.ZodString;
    note: z.ZodObject<{
        kind: z.ZodEnum<{
            DIRECTION_CHANGE: "DIRECTION_CHANGE";
            ERROR_REPLAN: "ERROR_REPLAN";
            PLAN: "PLAN";
            TEST_START: "TEST_START";
        }>;
        summary: z.ZodString;
        stage: z.ZodOptional<z.ZodString>;
        changes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        nextSteps: z.ZodOptional<z.ZodArray<z.ZodString>>;
        files: z.ZodOptional<z.ZodArray<z.ZodString>>;
        concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
        nextMove: z.ZodOptional<z.ZodPreprocess<z.ZodInt>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const builderChatAskChoiceCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    kind: z.ZodLiteral<"BUILDER_CHAT_ASK_CHOICE">;
    idempotencyKey: z.ZodString;
    choice: z.ZodObject<{
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
        whyNow: z.ZodString;
        options: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            description: z.ZodString;
            tradeoffs: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>>;
        recommended: z.ZodInt;
        recommendationReason: z.ZodString;
        blocksWork: z.ZodBoolean;
        blockingReason: z.ZodOptional<z.ZodString>;
        concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
        files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const builderChatSaveChoiceCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    kind: z.ZodLiteral<"BUILDER_CHAT_SAVE_CHOICE">;
    idempotencyKey: z.ZodString;
    answer: z.ZodObject<{
        decisionId: z.ZodOptional<z.ZodString>;
        choice: z.ZodUnion<readonly [z.ZodPreprocess<z.ZodInt>, z.ZodLiteral<"recommended">, z.ZodLiteral<"custom">]>;
        customSummary: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const builderChatFinishTaskCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    projectId: z.ZodString;
    taskId: z.ZodString;
    kind: z.ZodLiteral<"BUILDER_CHAT_FINISH_TASK">;
    idempotencyKey: z.ZodString;
    report: z.ZodObject<{
        implemented: z.ZodArray<z.ZodString>;
        acceptance: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            passed: z.ZodBoolean;
            changedByDecisionId: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        checks: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            passed: z.ZodBoolean;
            summary: z.ZodString;
        }, z.core.$strict>>;
        decisionsApplied: z.ZodOptional<z.ZodArray<z.ZodObject<{
            decisionId: z.ZodString;
            how: z.ZodString;
        }, z.core.$strict>>>;
        concepts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            why: z.ZodString;
            files: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>>>;
        deviations: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remaining: z.ZodOptional<z.ZodArray<z.ZodString>>;
        limitations: z.ZodOptional<z.ZodArray<z.ZodString>>;
        files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const builderChatProgressSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    task: z.ZodObject<{
        title: z.ZodString;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            BLOCKED: "BLOCKED";
            CANCELLED: "CANCELLED";
            COMPLETED: "COMPLETED";
            FAILED: "FAILED";
            PENDING: "PENDING";
        }>;
    }, z.core.$strict>;
    acceptanceCriteria: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        description: z.ZodString;
    }, z.core.$strict>>;
    openChoices: z.ZodArray<z.ZodObject<{
        decisionId: z.ZodString;
        question: z.ZodString;
        state: z.ZodEnum<{
            CHOSEN: "CHOSEN";
            WAITING_FOR_LEARNER: "WAITING_FOR_LEARNER";
        }>;
        options: z.ZodArray<z.ZodObject<{
            number: z.ZodInt;
            label: z.ZodString;
        }, z.core.$strict>>;
        recommendedNumber: z.ZodInt;
        chosenNumber: z.ZodOptional<z.ZodInt>;
        chosenCustom: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    omittedOpenChoiceCount: z.ZodInt;
    lastNote: z.ZodOptional<z.ZodString>;
    nextMove: z.ZodOptional<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const builderChatSaveProgressReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    outcome: z.ZodEnum<{
        SAVED: "SAVED";
        UNCHANGED: "UNCHANGED";
    }>;
    contextVersion: z.ZodInt;
    followUpTask: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        acceptanceCriteria: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            description: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const builderChatAskChoiceReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    outcome: z.ZodEnum<{
        ALREADY_OPEN: "ALREADY_OPEN";
        ASKED: "ASKED";
    }>;
    decisionId: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        number: z.ZodInt;
        label: z.ZodString;
    }, z.core.$strict>>;
    recommendedNumber: z.ZodInt;
    followUpTask: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        acceptanceCriteria: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            description: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const builderChatSaveChoiceReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    outcome: z.ZodEnum<{
        CHANGED: "CHANGED";
        SAVED: "SAVED";
        UNCHANGED: "UNCHANGED";
    }>;
    decisionId: z.ZodString;
    chosen: z.ZodObject<{
        number: z.ZodOptional<z.ZodInt>;
        label: z.ZodString;
        custom: z.ZodBoolean;
    }, z.core.$strict>;
    linkedMessageCount: z.ZodInt;
}, z.core.$strict>;
export declare const builderChatFinishTaskReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    outcome: z.ZodEnum<{
        ALREADY_COMPLETED: "ALREADY_COMPLETED";
        COMPLETED: "COMPLETED";
    }>;
    taskRevision: z.ZodInt;
    ignoredConcepts: z.ZodArray<z.ZodString>;
    nextMove: z.ZodOptional<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export type KiroChatProgressNote = z.infer<typeof kiroChatProgressNoteSchema>;
export type KiroChatAskChoice = z.infer<typeof kiroChatAskChoiceSchema>;
export type KiroChatSaveChoice = z.infer<typeof kiroChatSaveChoiceSchema>;
export type KiroChatFinishTask = z.infer<typeof kiroChatFinishTaskSchema>;
export type BuilderChatProgress = z.infer<typeof builderChatProgressSchema>;
export type BuilderChatSaveProgressReceipt = z.infer<typeof builderChatSaveProgressReceiptSchema>;
export type BuilderChatAskChoiceReceipt = z.infer<typeof builderChatAskChoiceReceiptSchema>;
export type BuilderChatSaveChoiceReceipt = z.infer<typeof builderChatSaveChoiceReceiptSchema>;
export type BuilderChatFinishTaskReceipt = z.infer<typeof builderChatFinishTaskReceiptSchema>;
