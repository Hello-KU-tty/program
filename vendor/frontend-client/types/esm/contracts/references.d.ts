import { z } from 'zod';
export declare const lineRangeSchema: z.ZodObject<{
    start: z.ZodInt;
    end: z.ZodInt;
}, z.core.$strict>;
export declare const codeReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"CODE">;
    path: z.ZodString;
    lineRange: z.ZodOptional<z.ZodObject<{
        start: z.ZodInt;
        end: z.ZodInt;
    }, z.core.$strict>>;
    revisionRef: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const diffReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"DIFF">;
    diffId: z.ZodString;
    paths: z.ZodArray<z.ZodString>;
    revisionRef: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const testResultReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"TEST_RESULT">;
    testResultId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strict>;
export declare const toolCallReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"TOOL_CALL">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
}, z.core.$strict>;
export declare const userMessageReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"USER_MESSAGE">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strict>;
export declare const userDecisionReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"USER_DECISION">;
    decisionId: z.ZodString;
}, z.core.$strict>;
export declare const userActionReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"USER_ACTION">;
    eventId: z.ZodString;
}, z.core.$strict>;
export declare const agentMessageReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"AGENT_MESSAGE">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strict>;
export declare const eventReferenceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"EVENT">;
    eventId: z.ZodString;
}, z.core.$strict>;
export declare const userEvidenceSourceReferenceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"USER_MESSAGE">;
    conversationId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"USER_DECISION">;
    decisionId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"USER_ACTION">;
    eventId: z.ZodString;
}, z.core.$strict>], "kind">;
export declare const contextualSourceReferenceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strict>], "kind">;
export type LineRange = z.infer<typeof lineRangeSchema>;
export type CodeReference = z.infer<typeof codeReferenceSchema>;
export type UserEvidenceSourceReference = z.infer<typeof userEvidenceSourceReferenceSchema>;
export type ContextualSourceReference = z.infer<typeof contextualSourceReferenceSchema>;
