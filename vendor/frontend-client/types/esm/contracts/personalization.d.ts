import { z } from 'zod';
export declare const personalizationPurposeSchema: z.ZodEnum<{
    DISCOVERY_TIE_BREAK: "DISCOVERY_TIE_BREAK";
    HELPER_EXPLANATION_START: "HELPER_EXPLANATION_START";
    HELPER_PAST_EXPERIENCE_CONNECTION: "HELPER_PAST_EXPERIENCE_CONNECTION";
    HELPER_TASK_USER_EVIDENCE_CONNECTION: "HELPER_TASK_USER_EVIDENCE_CONNECTION";
}>;
export declare const personalizationBasisSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const personalizationFallbackReasonSchema: z.ZodEnum<{
    NO_LEDGER: "NO_LEDGER";
    NO_PRIOR_PROJECT_EVIDENCE: "NO_PRIOR_PROJECT_EVIDENCE";
    NO_RELEVANT_CONCEPT: "NO_RELEVANT_CONCEPT";
}>;
export declare const personalizationTraceSchema: z.ZodObject<{
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
export declare const evidenceTraceEvidenceItemSchema: z.ZodObject<{
    evidenceId: z.ZodString;
    kind: z.ZodEnum<{
        CONCEPT_OBSERVATION: "CONCEPT_OBSERVATION";
        MISCONCEPTION_SIGNAL: "MISCONCEPTION_SIGNAL";
        USER_UNDERSTANDING: "USER_UNDERSTANDING";
    }>;
    projectId: z.ZodString;
    projectTitle: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodString;
    episodeType: z.ZodEnum<{
        BUILD_TASK: "BUILD_TASK";
        DECISION: "DECISION";
        FINAL_UPGRADE: "FINAL_UPGRADE";
        HELPER_CONVERSATION: "HELPER_CONVERSATION";
    }>;
    episodeStatus: z.ZodEnum<{
        ANALYSIS_FAILED: "ANALYSIS_FAILED";
        ANALYZED: "ANALYZED";
        OPEN: "OPEN";
        PENDING_ANALYSIS: "PENDING_ANALYSIS";
    }>;
    episodeEndedAt: z.ZodOptional<z.ZodISODateTime>;
    acceptedAt: z.ZodISODateTime;
    supportsState: z.ZodOptional<z.ZodEnum<{
        DEMONSTRATED: "DEMONSTRATED";
        EXPLAINED: "EXPLAINED";
        OBSERVED: "OBSERVED";
        TRANSFERRED: "TRANSFERRED";
    }>>;
    signal: z.ZodOptional<z.ZodEnum<{
        APPLICATION: "APPLICATION";
        CONTRADICTION: "CONTRADICTION";
        JUSTIFIED_DECISION: "JUSTIFIED_DECISION";
        PREDICTION: "PREDICTION";
        QUESTION: "QUESTION";
        REPHRASE: "REPHRASE";
        TRANSFER: "TRANSFER";
    }>>;
    strength: z.ZodOptional<z.ZodEnum<{
        MEDIUM: "MEDIUM";
        NONE: "NONE";
        STRONG: "STRONG";
        WEAK: "WEAK";
    }>>;
    promptDependence: z.ZodOptional<z.ZodEnum<{
        DIRECTLY_LED: "DIRECTLY_LED";
        INDEPENDENT: "INDEPENDENT";
        LIGHT_HINT: "LIGHT_HINT";
    }>>;
    redactedEvidenceExcerpt: z.ZodOptional<z.ZodString>;
    rationale: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const rejectedEvidenceItemSchema: z.ZodObject<{
    proposalId: z.ZodString;
    evidenceDecisionId: z.ZodString;
    projectId: z.ZodString;
    projectTitle: z.ZodString;
    episodeId: z.ZodString;
    episodeType: z.ZodEnum<{
        BUILD_TASK: "BUILD_TASK";
        DECISION: "DECISION";
        FINAL_UPGRADE: "FINAL_UPGRADE";
        HELPER_CONVERSATION: "HELPER_CONVERSATION";
    }>;
    proposedConceptName: z.ZodString;
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
    redactedEvidenceExcerpt: z.ZodString;
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
}, z.core.$strict>;
export declare const conceptEvidenceTraceViewSchema: z.ZodObject<{
    conceptId: z.ZodString;
    conceptName: z.ZodString;
    description: z.ZodString;
    state: z.ZodNullable<z.ZodEnum<{
        DEMONSTRATED: "DEMONSTRATED";
        EXPLAINED: "EXPLAINED";
        OBSERVED: "OBSERVED";
        TRANSFERRED: "TRANSFERRED";
    }>>;
    stateRevision: z.ZodNullable<z.ZodInt>;
    reducerVersion: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodNullable<z.ZodISODateTime>;
    stateEvidenceIds: z.ZodArray<z.ZodString>;
    evidence: z.ZodArray<z.ZodObject<{
        evidenceId: z.ZodString;
        kind: z.ZodEnum<{
            CONCEPT_OBSERVATION: "CONCEPT_OBSERVATION";
            MISCONCEPTION_SIGNAL: "MISCONCEPTION_SIGNAL";
            USER_UNDERSTANDING: "USER_UNDERSTANDING";
        }>;
        projectId: z.ZodString;
        projectTitle: z.ZodString;
        taskId: z.ZodOptional<z.ZodString>;
        episodeId: z.ZodString;
        episodeType: z.ZodEnum<{
            BUILD_TASK: "BUILD_TASK";
            DECISION: "DECISION";
            FINAL_UPGRADE: "FINAL_UPGRADE";
            HELPER_CONVERSATION: "HELPER_CONVERSATION";
        }>;
        episodeStatus: z.ZodEnum<{
            ANALYSIS_FAILED: "ANALYSIS_FAILED";
            ANALYZED: "ANALYZED";
            OPEN: "OPEN";
            PENDING_ANALYSIS: "PENDING_ANALYSIS";
        }>;
        episodeEndedAt: z.ZodOptional<z.ZodISODateTime>;
        acceptedAt: z.ZodISODateTime;
        supportsState: z.ZodOptional<z.ZodEnum<{
            DEMONSTRATED: "DEMONSTRATED";
            EXPLAINED: "EXPLAINED";
            OBSERVED: "OBSERVED";
            TRANSFERRED: "TRANSFERRED";
        }>>;
        signal: z.ZodOptional<z.ZodEnum<{
            APPLICATION: "APPLICATION";
            CONTRADICTION: "CONTRADICTION";
            JUSTIFIED_DECISION: "JUSTIFIED_DECISION";
            PREDICTION: "PREDICTION";
            QUESTION: "QUESTION";
            REPHRASE: "REPHRASE";
            TRANSFER: "TRANSFER";
        }>>;
        strength: z.ZodOptional<z.ZodEnum<{
            MEDIUM: "MEDIUM";
            NONE: "NONE";
            STRONG: "STRONG";
            WEAK: "WEAK";
        }>>;
        promptDependence: z.ZodOptional<z.ZodEnum<{
            DIRECTLY_LED: "DIRECTLY_LED";
            INDEPENDENT: "INDEPENDENT";
            LIGHT_HINT: "LIGHT_HINT";
        }>>;
        redactedEvidenceExcerpt: z.ZodOptional<z.ZodString>;
        rationale: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    rejectedEvidence: z.ZodArray<z.ZodObject<{
        proposalId: z.ZodString;
        evidenceDecisionId: z.ZodString;
        projectId: z.ZodString;
        projectTitle: z.ZodString;
        episodeId: z.ZodString;
        episodeType: z.ZodEnum<{
            BUILD_TASK: "BUILD_TASK";
            DECISION: "DECISION";
            FINAL_UPGRADE: "FINAL_UPGRADE";
            HELPER_CONVERSATION: "HELPER_CONVERSATION";
        }>;
        proposedConceptName: z.ZodString;
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
        redactedEvidenceExcerpt: z.ZodString;
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
    }, z.core.$strict>>;
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
}, z.core.$strict>;
export declare const evidenceAnalysisStatusItemSchema: z.ZodObject<{
    analysisJobId: z.ZodString;
    episodeId: z.ZodString;
    status: z.ZodEnum<{
        FAILED: "FAILED";
        PENDING: "PENDING";
        RUNNING: "RUNNING";
        SUCCEEDED: "SUCCEEDED";
    }>;
    revision: z.ZodInt;
    resultSummary: z.ZodOptional<z.ZodObject<{
        proposalCount: z.ZodInt;
        acceptedCount: z.ZodInt;
        rejectedCount: z.ZodInt;
        noEvidenceReason: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    lastFailure: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strict>>;
    updatedAt: z.ZodISODateTime;
}, z.core.$strict>;
export declare const projectEvidenceTraceSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    projectId: z.ZodString;
    concepts: z.ZodArray<z.ZodObject<{
        conceptId: z.ZodString;
        conceptName: z.ZodString;
        description: z.ZodString;
        state: z.ZodNullable<z.ZodEnum<{
            DEMONSTRATED: "DEMONSTRATED";
            EXPLAINED: "EXPLAINED";
            OBSERVED: "OBSERVED";
            TRANSFERRED: "TRANSFERRED";
        }>>;
        stateRevision: z.ZodNullable<z.ZodInt>;
        reducerVersion: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodNullable<z.ZodISODateTime>;
        stateEvidenceIds: z.ZodArray<z.ZodString>;
        evidence: z.ZodArray<z.ZodObject<{
            evidenceId: z.ZodString;
            kind: z.ZodEnum<{
                CONCEPT_OBSERVATION: "CONCEPT_OBSERVATION";
                MISCONCEPTION_SIGNAL: "MISCONCEPTION_SIGNAL";
                USER_UNDERSTANDING: "USER_UNDERSTANDING";
            }>;
            projectId: z.ZodString;
            projectTitle: z.ZodString;
            taskId: z.ZodOptional<z.ZodString>;
            episodeId: z.ZodString;
            episodeType: z.ZodEnum<{
                BUILD_TASK: "BUILD_TASK";
                DECISION: "DECISION";
                FINAL_UPGRADE: "FINAL_UPGRADE";
                HELPER_CONVERSATION: "HELPER_CONVERSATION";
            }>;
            episodeStatus: z.ZodEnum<{
                ANALYSIS_FAILED: "ANALYSIS_FAILED";
                ANALYZED: "ANALYZED";
                OPEN: "OPEN";
                PENDING_ANALYSIS: "PENDING_ANALYSIS";
            }>;
            episodeEndedAt: z.ZodOptional<z.ZodISODateTime>;
            acceptedAt: z.ZodISODateTime;
            supportsState: z.ZodOptional<z.ZodEnum<{
                DEMONSTRATED: "DEMONSTRATED";
                EXPLAINED: "EXPLAINED";
                OBSERVED: "OBSERVED";
                TRANSFERRED: "TRANSFERRED";
            }>>;
            signal: z.ZodOptional<z.ZodEnum<{
                APPLICATION: "APPLICATION";
                CONTRADICTION: "CONTRADICTION";
                JUSTIFIED_DECISION: "JUSTIFIED_DECISION";
                PREDICTION: "PREDICTION";
                QUESTION: "QUESTION";
                REPHRASE: "REPHRASE";
                TRANSFER: "TRANSFER";
            }>>;
            strength: z.ZodOptional<z.ZodEnum<{
                MEDIUM: "MEDIUM";
                NONE: "NONE";
                STRONG: "STRONG";
                WEAK: "WEAK";
            }>>;
            promptDependence: z.ZodOptional<z.ZodEnum<{
                DIRECTLY_LED: "DIRECTLY_LED";
                INDEPENDENT: "INDEPENDENT";
                LIGHT_HINT: "LIGHT_HINT";
            }>>;
            redactedEvidenceExcerpt: z.ZodOptional<z.ZodString>;
            rationale: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        rejectedEvidence: z.ZodArray<z.ZodObject<{
            proposalId: z.ZodString;
            evidenceDecisionId: z.ZodString;
            projectId: z.ZodString;
            projectTitle: z.ZodString;
            episodeId: z.ZodString;
            episodeType: z.ZodEnum<{
                BUILD_TASK: "BUILD_TASK";
                DECISION: "DECISION";
                FINAL_UPGRADE: "FINAL_UPGRADE";
                HELPER_CONVERSATION: "HELPER_CONVERSATION";
            }>;
            proposedConceptName: z.ZodString;
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
            redactedEvidenceExcerpt: z.ZodString;
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
        }, z.core.$strict>>;
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
    }, z.core.$strict>>;
    analysis: z.ZodArray<z.ZodObject<{
        analysisJobId: z.ZodString;
        episodeId: z.ZodString;
        status: z.ZodEnum<{
            FAILED: "FAILED";
            PENDING: "PENDING";
            RUNNING: "RUNNING";
            SUCCEEDED: "SUCCEEDED";
        }>;
        revision: z.ZodInt;
        resultSummary: z.ZodOptional<z.ZodObject<{
            proposalCount: z.ZodInt;
            acceptedCount: z.ZodInt;
            rejectedCount: z.ZodInt;
            noEvidenceReason: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        lastFailure: z.ZodOptional<z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            retryable: z.ZodBoolean;
        }, z.core.$strict>>;
        updatedAt: z.ZodISODateTime;
    }, z.core.$strict>>;
    personalization: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
    emptyReason: z.ZodOptional<z.ZodString>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export type PersonalizationPurpose = z.infer<typeof personalizationPurposeSchema>;
export type PersonalizationBasis = z.infer<typeof personalizationBasisSchema>;
export type PersonalizationFallbackReason = z.infer<typeof personalizationFallbackReasonSchema>;
export type PersonalizationTrace = z.infer<typeof personalizationTraceSchema>;
export type EvidenceTraceEvidenceItem = z.infer<typeof evidenceTraceEvidenceItemSchema>;
export type RejectedEvidenceItem = z.infer<typeof rejectedEvidenceItemSchema>;
export type ConceptEvidenceTraceView = z.infer<typeof conceptEvidenceTraceViewSchema>;
export type EvidenceAnalysisStatusItem = z.infer<typeof evidenceAnalysisStatusItemSchema>;
export type ProjectEvidenceTrace = z.infer<typeof projectEvidenceTraceSchema>;
