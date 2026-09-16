import { z } from 'zod';
export declare const projectStatusSchema: z.ZodEnum<{
    BUILDING: "BUILDING";
    COMPLETED: "COMPLETED";
    DISCOVERY: "DISCOVERY";
    SPEC_REVIEW: "SPEC_REVIEW";
}>;
export declare const projectSchema: z.ZodObject<{
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
export declare const learnerLevelSchema: z.ZodEnum<{
    BEGINNER: "BEGINNER";
    FAMILIAR: "FAMILIAR";
    NEW: "NEW";
    UNSPECIFIED: "UNSPECIFIED";
}>;
export declare const discoveryInputSchema: z.ZodObject<{
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
export declare const discoverySessionStatusSchema: z.ZodEnum<{
    ABANDONED: "ABANDONED";
    ACTIVE: "ACTIVE";
    SELECTED: "SELECTED";
}>;
export declare const discoverySessionSchema: z.ZodObject<{
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
export declare const candidateGenerationTagSchema: z.ZodEnum<{
    DIRECT: "DIRECT";
    DISCOVER: "DISCOVER";
    EXPAND: "EXPAND";
    UPGRADE: "UPGRADE";
}>;
export declare const candidateEvaluationCriterionSchema: z.ZodEnum<{
    ADJACENT_COMPLEXITY: "ADJACENT_COMPLEXITY";
    ADOPTION_FEASIBILITY: "ADOPTION_FEASIBILITY";
    CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
    DEPLOYABILITY: "DEPLOYABILITY";
    DISTINCTIVENESS: "DISTINCTIVENESS";
    LEARNER_FIT: "LEARNER_FIT";
    PERSONAL_UTILITY: "PERSONAL_UTILITY";
    SCOPE_FEASIBILITY: "SCOPE_FEASIBILITY";
}>;
export declare const candidateEvaluationSchema: z.ZodArray<z.ZodObject<{
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
}, z.core.$strict>>;
export declare const candidateRevisionReferenceSchema: z.ZodObject<{
    candidateId: z.ZodString;
    revision: z.ZodInt;
}, z.core.$strict>;
export declare const candidateScopeSuggestionSchema: z.ZodObject<{
    learnerFocus: z.ZodArray<z.ZodString>;
    agentSupport: z.ZodArray<z.ZodString>;
    excluded: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const candidatePreviewDraftSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const candidatePreviewSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const candidatePreviewRoundSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const projectCandidateRevisionSchema: z.ZodObject<{
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
export declare const candidateDiversityCheckSchema: z.ZodObject<{
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
export declare const candidateDraftSchema: z.ZodObject<{
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
    lineage: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"NEW">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"REVISION">;
        candidateId: z.ZodString;
        revision: z.ZodInt;
        parentRevisions: z.ZodArray<z.ZodObject<{
            candidateId: z.ZodString;
            revision: z.ZodInt;
        }, z.core.$strict>>;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
export declare const discoverySubmitCandidateRoundToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    appliedFeedbackIds: z.ZodArray<z.ZodString>;
    carriedCandidates: z.ZodArray<z.ZodObject<{
        candidateId: z.ZodString;
        revision: z.ZodInt;
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
        lineage: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"NEW">;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"REVISION">;
            candidateId: z.ZodString;
            revision: z.ZodInt;
            parentRevisions: z.ZodArray<z.ZodObject<{
                candidateId: z.ZodString;
                revision: z.ZodInt;
            }, z.core.$strict>>;
        }, z.core.$strict>], "kind">;
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
}, z.core.$strict>;
export declare const discoverySubmitCandidateMergeToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
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
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const discoverySubmitCandidatePreviewsToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
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
    }, z.core.$strict>>;
    generationRationale: z.ZodString;
}, z.core.$strict>;
export declare const candidateEnrichmentBatchSchema: z.ZodEnum<{
    FIRST: "FIRST";
    SECOND: "SECOND";
    SELECTED: "SELECTED";
}>;
export declare const candidateEnrichmentDraftSchema: z.ZodObject<{
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
    candidateId: z.ZodString;
}, z.core.$strict>;
export declare const candidateEnrichmentSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const discoverySubmitCandidateEnrichmentsToolInputBaseSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRoundId: z.ZodString;
    batch: z.ZodEnum<{
        FIRST: "FIRST";
        SECOND: "SECOND";
        SELECTED: "SELECTED";
    }>;
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
        candidateId: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const discoverySubmitCandidateEnrichmentsToolInputSchema: z.ZodObject<{
    __tool_use_purpose: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    projectId: z.ZodString;
    discoverySessionId: z.ZodString;
    correlationId: z.ZodString;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRoundId: z.ZodString;
    batch: z.ZodEnum<{
        FIRST: "FIRST";
        SECOND: "SECOND";
        SELECTED: "SELECTED";
    }>;
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
        candidateId: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const candidateRoundSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const discoveryFeedbackIntentSchema: z.ZodEnum<{
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
export declare const discoveryFeedbackSchema: z.ZodObject<{
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
export type Project = z.infer<typeof projectSchema>;
export type DiscoveryInput = z.infer<typeof discoveryInputSchema>;
export type DiscoverySession = z.infer<typeof discoverySessionSchema>;
export type ProjectCandidateRevision = z.infer<typeof projectCandidateRevisionSchema>;
export type CandidateRound = z.infer<typeof candidateRoundSchema>;
export type DiscoveryFeedback = z.infer<typeof discoveryFeedbackSchema>;
export type CandidateRevisionReference = z.infer<typeof candidateRevisionReferenceSchema>;
export type CandidateDraft = z.infer<typeof candidateDraftSchema>;
export type CandidatePreview = z.infer<typeof candidatePreviewSchema>;
export type CandidatePreviewRound = z.infer<typeof candidatePreviewRoundSchema>;
export type CandidateEnrichment = z.infer<typeof candidateEnrichmentSchema>;
export type CandidateEnrichmentBatch = z.infer<typeof candidateEnrichmentBatchSchema>;
export type DiscoverySubmitCandidateRoundToolInput = z.infer<typeof discoverySubmitCandidateRoundToolInputSchema>;
