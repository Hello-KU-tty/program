import { z } from 'zod';
export declare const activityPayloadSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"TASK_STARTED">;
    taskId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"TASK_COMPLETED">;
    taskId: z.ZodString;
    completionReportId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"LIVE_CONTEXT_UPDATED">;
    taskId: z.ZodString;
    liveContextId: z.ZodString;
    contextVersion: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"USER_MESSAGE">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
    redactedExcerpt: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"HELPER_RESPONSE">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
    summary: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"DECISION_REQUESTED">;
    decisionId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"DECISION_RESOLVED">;
    decisionId: z.ZodString;
    resolutionId: z.ZodString;
    rationaleProvided: z.ZodBoolean;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"CONCEPT_REPORTED">;
    taskId: z.ZodString;
    conceptNames: z.ZodArray<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"VALIDATION_RESULT">;
    taskId: z.ZodString;
    result: z.ZodEnum<{
        FAILED: "FAILED";
        PASSED: "PASSED";
    }>;
    reference: z.ZodObject<{
        kind: z.ZodLiteral<"TEST_RESULT">;
        testResultId: z.ZodString;
        taskId: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
export declare const activityEventSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    correlationId: z.ZodString;
    sequence: z.ZodInt;
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
    occurredAt: z.ZodISODateTime;
    payload: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"TASK_STARTED">;
        taskId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"TASK_COMPLETED">;
        taskId: z.ZodString;
        completionReportId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"LIVE_CONTEXT_UPDATED">;
        taskId: z.ZodString;
        liveContextId: z.ZodString;
        contextVersion: z.ZodInt;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"USER_MESSAGE">;
        conversationId: z.ZodString;
        messageId: z.ZodString;
        redactedExcerpt: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"HELPER_RESPONSE">;
        conversationId: z.ZodString;
        messageId: z.ZodString;
        summary: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"DECISION_REQUESTED">;
        decisionId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"DECISION_RESOLVED">;
        decisionId: z.ZodString;
        resolutionId: z.ZodString;
        rationaleProvided: z.ZodBoolean;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"CONCEPT_REPORTED">;
        taskId: z.ZodString;
        conceptNames: z.ZodArray<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodLiteral<"VALIDATION_RESULT">;
        taskId: z.ZodString;
        result: z.ZodEnum<{
            FAILED: "FAILED";
            PASSED: "PASSED";
        }>;
        reference: z.ZodObject<{
            kind: z.ZodLiteral<"TEST_RESULT">;
            testResultId: z.ZodString;
            taskId: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>], "type">;
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
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export declare const episodeTypeSchema: z.ZodEnum<{
    BUILD_TASK: "BUILD_TASK";
    DECISION: "DECISION";
    FINAL_UPGRADE: "FINAL_UPGRADE";
    HELPER_CONVERSATION: "HELPER_CONVERSATION";
}>;
export declare const episodeStatusSchema: z.ZodEnum<{
    ANALYSIS_FAILED: "ANALYSIS_FAILED";
    ANALYZED: "ANALYZED";
    OPEN: "OPEN";
    PENDING_ANALYSIS: "PENDING_ANALYSIS";
}>;
export declare const episodeSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    correlationId: z.ZodString;
    revision: z.ZodInt;
    type: z.ZodEnum<{
        BUILD_TASK: "BUILD_TASK";
        DECISION: "DECISION";
        FINAL_UPGRADE: "FINAL_UPGRADE";
        HELPER_CONVERSATION: "HELPER_CONVERSATION";
    }>;
    status: z.ZodEnum<{
        ANALYSIS_FAILED: "ANALYSIS_FAILED";
        ANALYZED: "ANALYZED";
        OPEN: "OPEN";
        PENDING_ANALYSIS: "PENDING_ANALYSIS";
    }>;
    eventIds: z.ZodArray<z.ZodString>;
    conceptCandidates: z.ZodArray<z.ZodObject<{
        conceptId: z.ZodOptional<z.ZodString>;
        originalExpression: z.ZodString;
    }, z.core.$strict>>;
    contextReferences: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    }, z.core.$strict>], "kind">]>>;
    startedAt: z.ZodISODateTime;
    endedAt: z.ZodOptional<z.ZodISODateTime>;
    closeReason: z.ZodOptional<z.ZodString>;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"CORE">;
    }, z.core.$strict>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export type ActivityPayload = z.infer<typeof activityPayloadSchema>;
export type ActivityEvent = z.infer<typeof activityEventSchema>;
export type Episode = z.infer<typeof episodeSchema>;
