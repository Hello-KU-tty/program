import { z } from 'zod';
export declare const discoveryGetContextQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_GET_CONTEXT">;
    projectId: z.ZodString;
    discoverySessionId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const builderGetTaskQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_GET_TASK">;
    projectId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strict>;
export declare const builderGetDecisionResultQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_GET_DECISION_RESULT">;
    projectId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodString;
}, z.core.$strict>;
export declare const helperGetContextQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"HELPER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"HELPER_GET_CONTEXT">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    question: z.ZodString;
    relatedConceptNames: z.ZodArray<z.ZodString>;
    observedContextVersion: z.ZodOptional<z.ZodInt>;
}, z.core.$strict>;
export declare const analystGetEpisodeContextQuerySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYST_GET_EPISODE_CONTEXT">;
    projectId: z.ZodString;
    episodeId: z.ZodString;
    expectedEpisodeRevision: z.ZodInt;
}, z.core.$strict>;
export declare const discoverySubmitCandidateRoundCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_ROUND">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    round: z.ZodObject<{
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
}, z.core.$strict>;
export declare const discoverySubmitCandidatePreviewsCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_PREVIEWS">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRound: z.ZodObject<{
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
}, z.core.$strict>;
export declare const discoverySubmitCandidateEnrichmentsCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_ENRICHMENTS">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRoundId: z.ZodString;
    batch: z.ZodEnum<{
        FIRST: "FIRST";
        SECOND: "SECOND";
        SELECTED: "SELECTED";
    }>;
    enrichments: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const discoverySubmitLearningSpecCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_LEARNING_SPEC">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    expectedSpecRevision: z.ZodInt;
    learningSpec: z.ZodObject<{
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
}, z.core.$strict>;
export declare const builderStartTaskCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_START_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    expectedTaskRevision: z.ZodInt;
}, z.core.$strict>;
export declare const builderUpdateLiveContextCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_UPDATE_LIVE_CONTEXT">;
    idempotencyKey: z.ZodString;
    context: z.ZodObject<{
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
}, z.core.$strict>;
export declare const builderRequestDecisionCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_REQUEST_DECISION">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
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
export declare const builderApplyDecisionCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_APPLY_DECISION">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodString;
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
export declare const builderCompleteTaskCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_COMPLETE_TASK">;
    idempotencyKey: z.ZodString;
    report: z.ZodObject<{
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
}, z.core.$strict>;
export declare const helperRequestContextRefreshCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"HELPER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"HELPER_REQUEST_CONTEXT_REFRESH">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    observedContextVersion: z.ZodOptional<z.ZodInt>;
    reason: z.ZodString;
}, z.core.$strict>;
export declare const analystSubmitEvidenceProposalsCommandSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYST_SUBMIT_EVIDENCE_PROPOSALS">;
    idempotencyKey: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    attempt: z.ZodInt;
    batch: z.ZodObject<{
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
}, z.core.$strict>;
export declare const discoveryAgentRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_GET_CONTEXT">;
    projectId: z.ZodString;
    discoverySessionId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_PREVIEWS">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRound: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_ENRICHMENTS">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRoundId: z.ZodString;
    batch: z.ZodEnum<{
        FIRST: "FIRST";
        SECOND: "SECOND";
        SELECTED: "SELECTED";
    }>;
    enrichments: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_ROUND">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    round: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_LEARNING_SPEC">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    expectedSpecRevision: z.ZodInt;
    learningSpec: z.ZodObject<{
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
}, z.core.$strict>], "kind">;
export declare const builderAgentRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_GET_TASK">;
    projectId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_GET_DECISION_RESULT">;
    projectId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_START_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    expectedTaskRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_UPDATE_LIVE_CONTEXT">;
    idempotencyKey: z.ZodString;
    context: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_REQUEST_DECISION">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_APPLY_DECISION">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodString;
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_COMPLETE_TASK">;
    idempotencyKey: z.ZodString;
    report: z.ZodObject<{
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
}, z.core.$strict>], "kind">;
export declare const helperAgentRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"HELPER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"HELPER_GET_CONTEXT">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    question: z.ZodString;
    relatedConceptNames: z.ZodArray<z.ZodString>;
    observedContextVersion: z.ZodOptional<z.ZodInt>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"HELPER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"HELPER_REQUEST_CONTEXT_REFRESH">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    observedContextVersion: z.ZodOptional<z.ZodInt>;
    reason: z.ZodString;
}, z.core.$strict>], "kind">;
export declare const evidenceAnalystRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYST_GET_EPISODE_CONTEXT">;
    projectId: z.ZodString;
    episodeId: z.ZodString;
    expectedEpisodeRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYST_SUBMIT_EVIDENCE_PROPOSALS">;
    idempotencyKey: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    attempt: z.ZodInt;
    batch: z.ZodObject<{
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
}, z.core.$strict>], "kind">;
export declare const agentRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_GET_CONTEXT">;
    projectId: z.ZodString;
    discoverySessionId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_PREVIEWS">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRound: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_ENRICHMENTS">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    previewRoundId: z.ZodString;
    batch: z.ZodEnum<{
        FIRST: "FIRST";
        SECOND: "SECOND";
        SELECTED: "SELECTED";
    }>;
    enrichments: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_CANDIDATE_ROUND">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    round: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"DISCOVERY">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"DISCOVERY_SUBMIT_LEARNING_SPEC">;
    idempotencyKey: z.ZodString;
    expectedSessionRevision: z.ZodInt;
    expectedSpecRevision: z.ZodInt;
    learningSpec: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_GET_TASK">;
    projectId: z.ZodString;
    taskId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_GET_DECISION_RESULT">;
    projectId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_START_TASK">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    expectedTaskRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_UPDATE_LIVE_CONTEXT">;
    idempotencyKey: z.ZodString;
    context: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_REQUEST_DECISION">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_APPLY_DECISION">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    decisionId: z.ZodString;
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"BUILDER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"BUILDER_COMPLETE_TASK">;
    idempotencyKey: z.ZodString;
    report: z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"HELPER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"HELPER_GET_CONTEXT">;
    projectId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodOptional<z.ZodString>;
    question: z.ZodString;
    relatedConceptNames: z.ZodArray<z.ZodString>;
    observedContextVersion: z.ZodOptional<z.ZodInt>;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"HELPER">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"HELPER_REQUEST_CONTEXT_REFRESH">;
    idempotencyKey: z.ZodString;
    projectId: z.ZodString;
    taskId: z.ZodString;
    observedContextVersion: z.ZodOptional<z.ZodInt>;
    reason: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYST_GET_EPISODE_CONTEXT">;
    projectId: z.ZodString;
    episodeId: z.ZodString;
    expectedEpisodeRevision: z.ZodInt;
}, z.core.$strict>, z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    actor: z.ZodObject<{
        kind: z.ZodLiteral<"AGENT">;
        role: z.ZodLiteral<"EVIDENCE_ANALYST">;
    }, z.core.$strict>;
    kind: z.ZodLiteral<"ANALYST_SUBMIT_EVIDENCE_PROPOSALS">;
    idempotencyKey: z.ZodString;
    analysisJobId: z.ZodString;
    expectedJobRevision: z.ZodInt;
    attempt: z.ZodInt;
    batch: z.ZodObject<{
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
}, z.core.$strict>], "kind">;
export declare const discoveryContextSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const builderTaskContextSchema: z.ZodObject<{
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
    learningSpec: z.ZodObject<{
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
    decisionRequests: z.ZodArray<z.ZodObject<{
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
    decisionResolutions: z.ZodArray<z.ZodObject<{
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
    decisionApplications: z.ZodArray<z.ZodObject<{
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
    pendingContextRefreshRequests: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const helperEpisodeSummarySchema: z.ZodObject<{
    episodeId: z.ZodString;
    type: z.ZodEnum<{
        BUILD_TASK: "BUILD_TASK";
        DECISION: "DECISION";
        FINAL_UPGRADE: "FINAL_UPGRADE";
        HELPER_CONVERSATION: "HELPER_CONVERSATION";
    }>;
    endedAt: z.ZodISODateTime;
    conceptNames: z.ZodArray<z.ZodString>;
    redactedUserExcerpts: z.ZodArray<z.ZodString>;
    helperResponseSummaries: z.ZodArray<z.ZodString>;
    contextReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strict>;
export declare const helperSourceExcerptSchema: z.ZodObject<{
    reference: z.ZodObject<{
        kind: z.ZodLiteral<"CODE">;
        path: z.ZodString;
        lineRange: z.ZodOptional<z.ZodObject<{
            start: z.ZodInt;
            end: z.ZodInt;
        }, z.core.$strict>>;
        revisionRef: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    redactedExcerpt: z.ZodString;
    truncated: z.ZodBoolean;
    redactionStatus: z.ZodLiteral<"VERIFIED_REDACTED">;
}, z.core.$strict>;
export declare const helperReferenceDetailSchema: z.ZodObject<{
    reference: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    availability: z.ZodEnum<{
        EXCERPT_INCLUDED: "EXCERPT_INCLUDED";
        REFERENCE_ONLY: "REFERENCE_ONLY";
        UNAVAILABLE: "UNAVAILABLE";
    }>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const helperContextSchema: z.ZodObject<{
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
    learningSpec: z.ZodObject<{
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
    activeDecisions: z.ZodArray<z.ZodObject<{
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
    focusedDecision: z.ZodNullable<z.ZodObject<{
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
    recentEpisodes: z.ZodArray<z.ZodObject<{
        episodeId: z.ZodString;
        type: z.ZodEnum<{
            BUILD_TASK: "BUILD_TASK";
            DECISION: "DECISION";
            FINAL_UPGRADE: "FINAL_UPGRADE";
            HELPER_CONVERSATION: "HELPER_CONVERSATION";
        }>;
        endedAt: z.ZodISODateTime;
        conceptNames: z.ZodArray<z.ZodString>;
        redactedUserExcerpts: z.ZodArray<z.ZodString>;
        helperResponseSummaries: z.ZodArray<z.ZodString>;
        contextReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    contextReferences: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    referenceDetails: z.ZodArray<z.ZodObject<{
        reference: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
        availability: z.ZodEnum<{
            EXCERPT_INCLUDED: "EXCERPT_INCLUDED";
            REFERENCE_ONLY: "REFERENCE_ONLY";
            UNAVAILABLE: "UNAVAILABLE";
        }>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    sourceExcerpts: z.ZodArray<z.ZodObject<{
        reference: z.ZodObject<{
            kind: z.ZodLiteral<"CODE">;
            path: z.ZodString;
            lineRange: z.ZodOptional<z.ZodObject<{
                start: z.ZodInt;
                end: z.ZodInt;
            }, z.core.$strict>>;
            revisionRef: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        redactedExcerpt: z.ZodString;
        truncated: z.ZodBoolean;
        redactionStatus: z.ZodLiteral<"VERIFIED_REDACTED">;
    }, z.core.$strict>>;
    pendingContextRefreshRequests: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
    freshness: z.ZodObject<{
        currentContextVersion: z.ZodNullable<z.ZodInt>;
        observedContextVersion: z.ZodNullable<z.ZodInt>;
        status: z.ZodEnum<{
            CURRENT: "CURRENT";
            MISSING: "MISSING";
            STALE: "STALE";
        }>;
        stale: z.ZodBoolean;
        refreshRequired: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const episodeContextSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    episode: z.ZodObject<{
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
    events: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strict>>;
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
    analysisJob: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<1>;
        id: z.ZodString;
        projectId: z.ZodString;
        episodeId: z.ZodString;
        episodeRevision: z.ZodInt;
        correlationId: z.ZodString;
        revision: z.ZodInt;
        status: z.ZodEnum<{
            FAILED: "FAILED";
            PENDING: "PENDING";
            RUNNING: "RUNNING";
            SUCCEEDED: "SUCCEEDED";
        }>;
        attempt: z.ZodInt;
        maxAttempts: z.ZodLiteral<2>;
        timeoutMs: z.ZodLiteral<30000>;
        runtimeHandle: z.ZodOptional<z.ZodString>;
        deadlineAt: z.ZodOptional<z.ZodISODateTime>;
        lastFailure: z.ZodOptional<z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            retryable: z.ZodBoolean;
        }, z.core.$strict>>;
        resultSummary: z.ZodOptional<z.ZodObject<{
            proposalCount: z.ZodInt;
            acceptedCount: z.ZodInt;
            rejectedCount: z.ZodInt;
            noEvidenceReason: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        createdAt: z.ZodISODateTime;
        updatedAt: z.ZodISODateTime;
        startedAt: z.ZodOptional<z.ZodISODateTime>;
        completedAt: z.ZodOptional<z.ZodISODateTime>;
        source: z.ZodObject<{
            kind: z.ZodLiteral<"CORE">;
        }, z.core.$strict>;
        redactionStatus: z.ZodEnum<{
            NOT_REQUIRED: "NOT_REQUIRED";
            REDACTED: "REDACTED";
            VERIFIED_REDACTED: "VERIFIED_REDACTED";
        }>;
    }, z.core.$strict>>;
    decisionContext: z.ZodNullable<z.ZodObject<{
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
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const decisionResultSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
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
export declare const decisionCommandReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    accepted: z.ZodLiteral<true>;
    resourceRevision: z.ZodInt;
    decisionId: z.ZodString;
}, z.core.$strict>;
export declare const commandReceiptSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    correlationId: z.ZodString;
    accepted: z.ZodLiteral<true>;
    resourceRevision: z.ZodInt;
}, z.core.$strict>;
export type AgentRequest = z.infer<typeof agentRequestSchema>;
export type DiscoveryAgentRequest = z.infer<typeof discoveryAgentRequestSchema>;
export type BuilderAgentRequest = z.infer<typeof builderAgentRequestSchema>;
export type HelperAgentRequest = z.infer<typeof helperAgentRequestSchema>;
export type EvidenceAnalystRequest = z.infer<typeof evidenceAnalystRequestSchema>;
export type DiscoveryContext = z.infer<typeof discoveryContextSchema>;
export type BuilderTaskContext = z.infer<typeof builderTaskContextSchema>;
export type HelperContext = z.infer<typeof helperContextSchema>;
export type HelperEpisodeSummary = z.infer<typeof helperEpisodeSummarySchema>;
export type HelperSourceExcerpt = z.infer<typeof helperSourceExcerptSchema>;
export type HelperReferenceDetail = z.infer<typeof helperReferenceDetailSchema>;
export type EpisodeContext = z.infer<typeof episodeContextSchema>;
export type DecisionResult = z.infer<typeof decisionResultSchema>;
export type DecisionCommandReceipt = z.infer<typeof decisionCommandReceiptSchema>;
export type CommandReceipt = z.infer<typeof commandReceiptSchema>;
