import { z } from 'zod';
export declare const conceptStateSchema: z.ZodEnum<{
    DEMONSTRATED: "DEMONSTRATED";
    EXPLAINED: "EXPLAINED";
    OBSERVED: "OBSERVED";
    TRANSFERRED: "TRANSFERRED";
}>;
export declare const userUnderstandingStateSchema: z.ZodEnum<{
    DEMONSTRATED: "DEMONSTRATED";
    EXPLAINED: "EXPLAINED";
    TRANSFERRED: "TRANSFERRED";
}>;
export declare const evidenceSignalSchema: z.ZodEnum<{
    APPLICATION: "APPLICATION";
    CONTRADICTION: "CONTRADICTION";
    JUSTIFIED_DECISION: "JUSTIFIED_DECISION";
    PREDICTION: "PREDICTION";
    QUESTION: "QUESTION";
    REPHRASE: "REPHRASE";
    TRANSFER: "TRANSFER";
}>;
export declare const evidenceStrengthSchema: z.ZodEnum<{
    MEDIUM: "MEDIUM";
    NONE: "NONE";
    STRONG: "STRONG";
    WEAK: "WEAK";
}>;
export declare const promptDependenceSchema: z.ZodEnum<{
    DIRECTLY_LED: "DIRECTLY_LED";
    INDEPENDENT: "INDEPENDENT";
    LIGHT_HINT: "LIGHT_HINT";
}>;
export declare const canonicalConceptSchema: z.ZodObject<{
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
export declare const conceptAliasProposalSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    correlationId: z.ZodString;
    proposedAlias: z.ZodString;
    canonicalConceptId: z.ZodOptional<z.ZodString>;
    rationale: z.ZodString;
    uncertainty: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        ACCEPTED: "ACCEPTED";
        PENDING: "PENDING";
        REJECTED: "REJECTED";
    }>;
    proposedAt: z.ZodISODateTime;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const misconceptionProposalSchema: z.ZodObject<{
    action: z.ZodEnum<{
        NONE: "NONE";
        OPEN: "OPEN";
        RESOLVE: "RESOLVE";
    }>;
    issueId: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const evidenceProposalSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodString;
    correlationId: z.ZodString;
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
    proposedAt: z.ZodISODateTime;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export declare const evidenceProposalDraftSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const analystSemanticResultSchema: z.ZodObject<{
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
export declare const evidenceProposalBatchSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    episodeId: z.ZodString;
    correlationId: z.ZodString;
    episodeRevision: z.ZodInt;
    proposals: z.ZodArray<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        taskId: z.ZodOptional<z.ZodString>;
        episodeId: z.ZodString;
        correlationId: z.ZodString;
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
        proposedAt: z.ZodISODateTime;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"AGENT">;
            role: z.ZodLiteral<"EVIDENCE_ANALYST">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    noEvidenceReason: z.ZodOptional<z.ZodString>;
    submittedAt: z.ZodISODateTime;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const evidenceDecisionSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    evidenceProposalId: z.ZodString;
    correlationId: z.ZodString;
    outcome: z.ZodEnum<{
        ACCEPTED: "ACCEPTED";
        REJECTED: "REJECTED";
    }>;
    reasonCode: z.ZodEnum<{
        AGENT_AUTHORED_SOURCE: "AGENT_AUTHORED_SOURCE";
        DUPLICATE_PROPOSAL: "DUPLICATE_PROPOSAL";
        INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE";
        INVALID_REFERENCE: "INVALID_REFERENCE";
        INVALID_SCHEMA: "INVALID_SCHEMA";
        INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION";
        MISCONCEPTION_ISSUE_NOT_FOUND: "MISCONCEPTION_ISSUE_NOT_FOUND";
        OVERSTATED_MAXIMUM_STATE: "OVERSTATED_MAXIMUM_STATE";
        STALE_EPISODE_REVISION: "STALE_EPISODE_REVISION";
        VALID_USER_EVIDENCE: "VALID_USER_EVIDENCE";
    }>;
    explanation: z.ZodString;
    decidedAt: z.ZodISODateTime;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"CORE">;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const acceptedEvidenceSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    kind: z.ZodLiteral<"USER_UNDERSTANDING">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodString;
    conceptId: z.ZodString;
    correlationId: z.ZodString;
    evidenceProposalId: z.ZodString;
    evidenceDecisionId: z.ZodString;
    signal: z.ZodEnum<{
        APPLICATION: "APPLICATION";
        JUSTIFIED_DECISION: "JUSTIFIED_DECISION";
        PREDICTION: "PREDICTION";
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
    supportsState: z.ZodEnum<{
        DEMONSTRATED: "DEMONSTRATED";
        EXPLAINED: "EXPLAINED";
        TRANSFERRED: "TRANSFERRED";
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
    acceptedAt: z.ZodISODateTime;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"CORE">;
    }, z.core.$strict>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    kind: z.ZodLiteral<"MISCONCEPTION_SIGNAL">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodString;
    conceptId: z.ZodString;
    correlationId: z.ZodString;
    evidenceProposalId: z.ZodString;
    evidenceDecisionId: z.ZodString;
    signal: z.ZodLiteral<"CONTRADICTION">;
    strength: z.ZodEnum<{
        MEDIUM: "MEDIUM";
        STRONG: "STRONG";
    }>;
    promptDependence: z.ZodEnum<{
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
    acceptedAt: z.ZodISODateTime;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"CORE">;
    }, z.core.$strict>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    kind: z.ZodLiteral<"CONCEPT_OBSERVATION">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodString;
    conceptId: z.ZodString;
    correlationId: z.ZodString;
    supportsState: z.ZodLiteral<"OBSERVED">;
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
    acceptedAt: z.ZodISODateTime;
    source: z.ZodObject<{
        kind: z.ZodLiteral<"CORE">;
    }, z.core.$strict>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>], "kind">;
export declare const misconceptionIssueSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const conceptStateSnapshotSchema: z.ZodObject<{
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
export declare const conceptLedgerEntrySchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const evidenceBatchApplicationResultSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    episodeId: z.ZodString;
    episodeRevision: z.ZodInt;
    correlationId: z.ZodString;
    outcomes: z.ZodArray<z.ZodObject<{
        proposalId: z.ZodString;
        decision: z.ZodObject<{
            schemaVersion: z.ZodLiteral<1>;
            id: z.ZodString;
            evidenceProposalId: z.ZodString;
            correlationId: z.ZodString;
            outcome: z.ZodEnum<{
                ACCEPTED: "ACCEPTED";
                REJECTED: "REJECTED";
            }>;
            reasonCode: z.ZodEnum<{
                AGENT_AUTHORED_SOURCE: "AGENT_AUTHORED_SOURCE";
                DUPLICATE_PROPOSAL: "DUPLICATE_PROPOSAL";
                INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE";
                INVALID_REFERENCE: "INVALID_REFERENCE";
                INVALID_SCHEMA: "INVALID_SCHEMA";
                INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION";
                MISCONCEPTION_ISSUE_NOT_FOUND: "MISCONCEPTION_ISSUE_NOT_FOUND";
                OVERSTATED_MAXIMUM_STATE: "OVERSTATED_MAXIMUM_STATE";
                STALE_EPISODE_REVISION: "STALE_EPISODE_REVISION";
                VALID_USER_EVIDENCE: "VALID_USER_EVIDENCE";
            }>;
            explanation: z.ZodString;
            decidedAt: z.ZodISODateTime;
            source: z.ZodObject<{
                kind: z.ZodLiteral<"CORE">;
            }, z.core.$strict>;
        }, z.core.$strict>;
        acceptedEvidenceId: z.ZodOptional<z.ZodString>;
        conceptId: z.ZodOptional<z.ZodString>;
        ledgerRevision: z.ZodOptional<z.ZodInt>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ConceptState = z.infer<typeof conceptStateSchema>;
export type EvidenceSignal = z.infer<typeof evidenceSignalSchema>;
export type EvidenceStrength = z.infer<typeof evidenceStrengthSchema>;
export type PromptDependence = z.infer<typeof promptDependenceSchema>;
export type CanonicalConcept = z.infer<typeof canonicalConceptSchema>;
export type ConceptAliasProposal = z.infer<typeof conceptAliasProposalSchema>;
export type EvidenceProposal = z.infer<typeof evidenceProposalSchema>;
export type EvidenceProposalDraft = z.infer<typeof evidenceProposalDraftSchema>;
export type AnalystSemanticResult = z.infer<typeof analystSemanticResultSchema>;
export type EvidenceProposalBatch = z.infer<typeof evidenceProposalBatchSchema>;
export type EvidenceDecision = z.infer<typeof evidenceDecisionSchema>;
export type AcceptedEvidence = z.infer<typeof acceptedEvidenceSchema>;
export type MisconceptionIssue = z.infer<typeof misconceptionIssueSchema>;
export type ConceptStateSnapshot = z.infer<typeof conceptStateSnapshotSchema>;
export type ConceptLedgerEntry = z.infer<typeof conceptLedgerEntrySchema>;
export type EvidenceBatchApplicationResult = z.infer<typeof evidenceBatchApplicationResultSchema>;
