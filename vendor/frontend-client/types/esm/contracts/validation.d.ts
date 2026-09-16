import { z } from 'zod';
import { type AgentRole } from './primitives.js';
export declare const contractValidationIssueSchema: z.ZodObject<{
    path: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodInt]>>;
    code: z.ZodString;
    message: z.ZodString;
}, z.core.$strict>;
export declare const contractErrorSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    kind: z.ZodLiteral<"CONTRACT_ERROR">;
    category: z.ZodEnum<{
        PERMISSION: "PERMISSION";
        VALIDATION: "VALIDATION";
    }>;
    code: z.ZodEnum<{
        AGENT_PERMISSION_MISMATCH: "AGENT_PERMISSION_MISMATCH";
        INVALID_PAYLOAD: "INVALID_PAYLOAD";
        UNEXPECTED_FIELD: "UNEXPECTED_FIELD";
        UNSUPPORTED_SCHEMA_VERSION: "UNSUPPORTED_SCHEMA_VERSION";
    }>;
    message: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    retryable: z.ZodLiteral<false>;
    issues: z.ZodArray<z.ZodObject<{
        path: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodInt]>>;
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const operationErrorCategorySchema: z.ZodEnum<{
    ANALYSIS: "ANALYSIS";
    EXTERNAL: "EXTERNAL";
    GENERATED_PROJECT: "GENERATED_PROJECT";
    PERMISSION: "PERMISSION";
    STALE_CONTEXT: "STALE_CONTEXT";
    STORAGE: "STORAGE";
    VALIDATION: "VALIDATION";
}>;
export declare const operationErrorSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    kind: z.ZodLiteral<"OPERATION_ERROR">;
    category: z.ZodEnum<{
        ANALYSIS: "ANALYSIS";
        EXTERNAL: "EXTERNAL";
        GENERATED_PROJECT: "GENERATED_PROJECT";
        PERMISSION: "PERMISSION";
        STALE_CONTEXT: "STALE_CONTEXT";
        STORAGE: "STORAGE";
        VALIDATION: "VALIDATION";
    }>;
    code: z.ZodString;
    disposition: z.ZodEnum<{
        PERMANENT: "PERMANENT";
        RETRYABLE: "RETRYABLE";
        USER_ACTION_REQUIRED: "USER_ACTION_REQUIRED";
    }>;
    message: z.ZodString;
    correlationId: z.ZodString;
    issues: z.ZodArray<z.ZodObject<{
        path: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodInt]>>;
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strict>>;
    redactionStatus: z.ZodEnum<{
        NOT_REQUIRED: "NOT_REQUIRED";
        REDACTED: "REDACTED";
        VERIFIED_REDACTED: "VERIFIED_REDACTED";
    }>;
}, z.core.$strict>;
export type ContractError = z.infer<typeof contractErrorSchema>;
export type OperationError = z.infer<typeof operationErrorSchema>;
export type ContractValidationResult<T> = {
    readonly success: true;
    readonly data: T;
} | {
    readonly success: false;
    readonly error: ContractError;
};
export declare function validateContract<TSchema extends z.ZodType>(schema: TSchema, input: unknown): ContractValidationResult<z.output<TSchema>>;
declare const requestSchemaByRole: {
    readonly DISCOVERY: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    readonly BUILDER: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    readonly HELPER: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
    readonly EVIDENCE_ANALYST: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
};
export declare function validateAgentRequest(authenticatedRole: AgentRole, input: unknown): ContractValidationResult<z.output<(typeof requestSchemaByRole)[typeof authenticatedRole]>>;
export {};
