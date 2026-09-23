import { type DiscoveryInput, type LocalConnection, type LocalRun, type LocalRunEvent, type LocalRunInput, type LocalUiResponse, type UiRequest } from './contracts/index.js';
export * from './contracts/index.js';
export * from './program-adapter.js';
export declare function entityId(prefix: string): string;
export declare function uiMetadata(correlationId?: string): {
    schemaVersion: 1;
    correlationId: string;
    actor: {
        kind: 'UI';
    };
};
export declare class LocalClientError extends Error {
    readonly code: string;
    readonly status?: number | undefined;
    constructor(code: string, status?: number | undefined);
}
type Fetch = typeof globalThis.fetch;
/** Extension-host client. Credentials are private; never expose the connection object to Webview. */
export declare class LocalCoreClient {
    #private;
    constructor(connection: LocalConnection, options?: {
        fetch?: Fetch;
    });
    health(): Promise<{
        protocolVersion: number;
        backendInstanceId: string;
        agent?: string;
    }>;
    execute<K extends UiRequest['kind']>(request: Extract<UiRequest, {
        kind: K;
    }>): Promise<LocalUiResponse<K>>;
    listProjects(limit?: number): Promise<{
        schemaVersion: 1;
        correlationId: string;
        projects: {
            project: {
                schemaVersion: 1;
                id: string;
                correlationId: string;
                revision: number;
                title: string;
                learningGoal: string;
                status: "BUILDING" | "COMPLETED" | "DISCOVERY" | "SPEC_REVIEW";
                generatedWorkspacePath?: string | undefined;
                createdAt: string;
                updatedAt: string;
                source: {
                    kind: "USER";
                } | {
                    kind: "AGENT";
                    role: "BUILDER" | "DISCOVERY" | "EVIDENCE_ANALYST" | "HELPER";
                } | {
                    kind: "CORE";
                } | {
                    kind: "UI";
                } | {
                    kind: "KIRO_ADAPTER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            };
            suggestedSurface: "BUILD" | "DISCOVERY" | "SPEC";
            activeTask: {
                schemaVersion: 1;
                id: string;
                projectId: string;
                learningSpecId: string;
                learningSpecRevision: number;
                correlationId: string;
                revision: number;
                title: string;
                productGoal: string;
                requirements: string[];
                acceptanceCriteria: {
                    key: string;
                    description: string;
                }[];
                expectedConcepts: string[];
                excludedWork: string[];
                prerequisiteTaskIds: string[];
                expectedDecisionCategories: ("API_CONTRACT" | "ARCHITECTURE" | "AUTHENTICATION" | "AUTHORIZATION" | "COST_DEPLOYMENT" | "DATA_MODEL" | "LEARNING_CONCEPT" | "PRODUCT_BEHAVIOR" | "RETENTION_DELETION" | "SECURITY_PRIVACY")[];
                finalUpgrade?: {
                    sourceTaskId: string;
                    personalizationTraceId: string;
                    userGoal: string;
                } | undefined;
                sequence: number;
                status: "ACTIVE" | "BLOCKED" | "CANCELLED" | "COMPLETED" | "FAILED" | "PENDING";
                createdAt: string;
                updatedAt: string;
                source: {
                    kind: "CORE";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            } | null;
            pendingDecisionCount: number;
            currentContextVersion: number | null;
            helperConversationCount: number;
        }[];
    }>;
    restoreProject(projectId: string): Promise<{
        schemaVersion: 1;
        correlationId: string;
        project: {
            schemaVersion: 1;
            id: string;
            correlationId: string;
            revision: number;
            title: string;
            learningGoal: string;
            status: "BUILDING" | "COMPLETED" | "DISCOVERY" | "SPEC_REVIEW";
            generatedWorkspacePath?: string | undefined;
            createdAt: string;
            updatedAt: string;
            source: {
                kind: "USER";
            } | {
                kind: "AGENT";
                role: "BUILDER" | "DISCOVERY" | "EVIDENCE_ANALYST" | "HELPER";
            } | {
                kind: "CORE";
            } | {
                kind: "UI";
            } | {
                kind: "KIRO_ADAPTER";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        };
        suggestedSurface: "BUILD" | "DISCOVERY" | "SPEC";
        discoverySession: {
            schemaVersion: 1;
            id: string;
            projectId: string;
            correlationId: string;
            revision: number;
            input: {
                learningGoal: string;
                personalNeed?: string | undefined;
                recentFriction?: string | undefined;
                interestAreas?: string[] | undefined;
                currentLevel?: "BEGINNER" | "FAMILIAR" | "NEW" | "UNSPECIFIED" | undefined;
                freeContext?: string | undefined;
            };
            status: "ABANDONED" | "ACTIVE" | "SELECTED";
            openedAt: string;
            updatedAt: string;
            closedAt?: string | undefined;
            source: {
                kind: "USER";
            } | {
                kind: "AGENT";
                role: "BUILDER" | "DISCOVERY" | "EVIDENCE_ANALYST" | "HELPER";
            } | {
                kind: "CORE";
            } | {
                kind: "UI";
            } | {
                kind: "KIRO_ADAPTER";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        } | null;
        discoveryContext: {
            schemaVersion: 1;
            correlationId: string;
            project: {
                schemaVersion: 1;
                id: string;
                correlationId: string;
                revision: number;
                title: string;
                learningGoal: string;
                status: "BUILDING" | "COMPLETED" | "DISCOVERY" | "SPEC_REVIEW";
                generatedWorkspacePath?: string | undefined;
                createdAt: string;
                updatedAt: string;
                source: {
                    kind: "USER";
                } | {
                    kind: "AGENT";
                    role: "BUILDER" | "DISCOVERY" | "EVIDENCE_ANALYST" | "HELPER";
                } | {
                    kind: "CORE";
                } | {
                    kind: "UI";
                } | {
                    kind: "KIRO_ADAPTER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            };
            session: {
                schemaVersion: 1;
                id: string;
                projectId: string;
                correlationId: string;
                revision: number;
                input: {
                    learningGoal: string;
                    personalNeed?: string | undefined;
                    recentFriction?: string | undefined;
                    interestAreas?: string[] | undefined;
                    currentLevel?: "BEGINNER" | "FAMILIAR" | "NEW" | "UNSPECIFIED" | undefined;
                    freeContext?: string | undefined;
                };
                status: "ABANDONED" | "ACTIVE" | "SELECTED";
                openedAt: string;
                updatedAt: string;
                closedAt?: string | undefined;
                source: {
                    kind: "USER";
                } | {
                    kind: "AGENT";
                    role: "BUILDER" | "DISCOVERY" | "EVIDENCE_ANALYST" | "HELPER";
                } | {
                    kind: "CORE";
                } | {
                    kind: "UI";
                } | {
                    kind: "KIRO_ADAPTER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            };
            rounds: {
                schemaVersion: 1;
                id: string;
                discoverySessionId: string;
                correlationId: string;
                roundIndex: number;
                inputSnapshot: {
                    learningGoal: string;
                    personalNeed?: string | undefined;
                    recentFriction?: string | undefined;
                    interestAreas?: string[] | undefined;
                    currentLevel?: "BEGINNER" | "FAMILIAR" | "NEW" | "UNSPECIFIED" | undefined;
                    freeContext?: string | undefined;
                };
                appliedFeedbackIds: string[];
                candidates: {
                    candidateId: string;
                    revision: number;
                }[];
                generationRationale: string;
                diversityCheck: {
                    dimensionsReviewed: ("CORE_INTERACTION" | "DATA_SHAPE" | "PROBLEM_DOMAIN" | "TARGET_USER" | "USER_APPEAL")[];
                    modeCollapseDetected: boolean;
                    rationale: string;
                };
                createdAt: string;
                source: {
                    kind: "AGENT";
                    role: "DISCOVERY";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            }[];
            candidates: {
                title: string;
                summary: string;
                targetUsers: string[];
                coreInteraction: string;
                usageMoment: string;
                appeal: string;
                personalNeedRelationship?: string | undefined;
                technologyNecessity: string;
                coreConcepts: string[];
                mvpFeatures: string[];
                suggestedScope: {
                    learnerFocus: string[];
                    agentSupport: string[];
                    excluded: string[];
                };
                risks?: string[] | undefined;
                generationTags: ("DIRECT" | "DISCOVER" | "EXPAND" | "UPGRADE")[];
                evaluation?: {
                    criterion: "ADJACENT_COMPLEXITY" | "ADOPTION_FEASIBILITY" | "CONCEPT_NECESSITY" | "DEPLOYABILITY" | "DISTINCTIVENESS" | "LEARNER_FIT" | "PERSONAL_UTILITY" | "SCOPE_FEASIBILITY";
                    assessment: "CONCERN" | "MIXED" | "POSITIVE";
                    rationale: string;
                }[] | undefined;
                schemaVersion: 1;
                id: string;
                discoverySessionId: string;
                correlationId: string;
                revision: number;
                parentRevisions: {
                    candidateId: string;
                    revision: number;
                }[];
                createdAt: string;
                source: {
                    kind: "AGENT";
                    role: "DISCOVERY";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            }[];
            feedback: {
                schemaVersion: 1;
                id: string;
                discoverySessionId: string;
                roundId: string;
                correlationId: string;
                intent: "EXPAND" | "MERGE" | "MORE" | "PIN" | "REGENERATE" | "REJECT" | "REVISE" | "SELECT" | "SHRINK";
                targets: {
                    candidateId: string;
                    revision: number;
                }[];
                message?: string | undefined;
                createdAt: string;
                source: {
                    kind: "USER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            }[];
            learningSpec: {
                productPurpose: string;
                targetUsers: string[];
                primaryUsageMoment: string;
                successMoment: string;
                mvpFeatures: string[];
                scope: {
                    category: "AGENT_SUPPORT" | "EXCLUDED" | "LEARNER_FOCUS";
                    title: string;
                    rationale: string;
                    conceptNames: string[];
                }[];
                expectedDecisions: {
                    category: "API_CONTRACT" | "ARCHITECTURE" | "AUTHENTICATION" | "AUTHORIZATION" | "COST_DEPLOYMENT" | "DATA_MODEL" | "LEARNING_CONCEPT" | "PRODUCT_BEHAVIOR" | "RETENTION_DELETION" | "SECURITY_PRIVACY";
                    description: string;
                    whyUserInputMatters: string;
                }[];
                runtimeConstraint: "TYPESCRIPT";
                deploymentConstraints: string[];
                schemaVersion: 1;
                id: string;
                projectId: string;
                correlationId: string;
                revision: number;
                parentRevision?: number | undefined;
                selectedCandidate: {
                    candidateId: string;
                    revision: number;
                };
                status: "CONFIRMED" | "DRAFT" | "SUPERSEDED";
                confirmation?: {
                    confirmedAt: string;
                    confirmedBy: {
                        kind: "USER";
                    };
                } | undefined;
                createdAt: string;
                updatedAt: string;
                source: {
                    kind: "USER";
                } | {
                    kind: "AGENT";
                    role: "BUILDER" | "DISCOVERY" | "EVIDENCE_ANALYST" | "HELPER";
                } | {
                    kind: "CORE";
                } | {
                    kind: "UI";
                } | {
                    kind: "KIRO_ADAPTER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            } | null;
            previewRound: {
                schemaVersion: 1;
                id: string;
                finalRoundId: string;
                discoverySessionId: string;
                correlationId: string;
                inputSnapshot: {
                    learningGoal: string;
                    personalNeed?: string | undefined;
                    recentFriction?: string | undefined;
                    interestAreas?: string[] | undefined;
                    currentLevel?: "BEGINNER" | "FAMILIAR" | "NEW" | "UNSPECIFIED" | undefined;
                    freeContext?: string | undefined;
                };
                previews: {
                    title: string;
                    summary: string;
                    coreInteraction: string;
                    appeal: string;
                    technologyNecessity: string;
                    generationTags: ("DIRECT" | "DISCOVER" | "EXPAND" | "UPGRADE")[];
                    candidateId: string;
                    position: number;
                }[];
                generationRationale: string;
                createdAt: string;
                source: {
                    kind: "AGENT";
                    role: "DISCOVERY";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            } | null;
            candidateEnrichments: {
                schemaVersion: 1;
                previewRoundId: string;
                discoverySessionId: string;
                correlationId: string;
                candidate: {
                    title: string;
                    summary: string;
                    targetUsers: string[];
                    coreInteraction: string;
                    usageMoment: string;
                    appeal: string;
                    personalNeedRelationship?: string | undefined;
                    technologyNecessity: string;
                    coreConcepts: string[];
                    mvpFeatures: string[];
                    suggestedScope: {
                        learnerFocus: string[];
                        agentSupport: string[];
                        excluded: string[];
                    };
                    risks?: string[] | undefined;
                    generationTags: ("DIRECT" | "DISCOVER" | "EXPAND" | "UPGRADE")[];
                    evaluation?: {
                        criterion: "ADJACENT_COMPLEXITY" | "ADOPTION_FEASIBILITY" | "CONCEPT_NECESSITY" | "DEPLOYABILITY" | "DISTINCTIVENESS" | "LEARNER_FIT" | "PERSONAL_UTILITY" | "SCOPE_FEASIBILITY";
                        assessment: "CONCERN" | "MIXED" | "POSITIVE";
                        rationale: string;
                    }[] | undefined;
                    schemaVersion: 1;
                    id: string;
                    discoverySessionId: string;
                    correlationId: string;
                    revision: number;
                    parentRevisions: {
                        candidateId: string;
                        revision: number;
                    }[];
                    createdAt: string;
                    source: {
                        kind: "AGENT";
                        role: "DISCOVERY";
                    };
                    redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
                };
                createdAt: string;
                source: {
                    kind: "AGENT";
                    role: "DISCOVERY";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            }[];
            relevantLedgerEntries: {
                schemaVersion: 1;
                id: string;
                concept: {
                    schemaVersion: 1;
                    id: string;
                    canonicalName: string;
                    description: string;
                    revision: number;
                    createdAt: string;
                    updatedAt: string;
                    source: {
                        kind: "CORE";
                    };
                };
                acceptedAliases: string[];
                state: {
                    conceptId: string;
                    state: "DEMONSTRATED" | "EXPLAINED" | "OBSERVED" | "TRANSFERRED";
                    acceptedEvidenceIds: string[];
                    reducerVersion: string;
                    revision: number;
                    updatedAt: string;
                };
                openIssues: {
                    schemaVersion: 1;
                    id: string;
                    conceptId: string;
                    projectId: string;
                    openedByEvidenceId: string;
                    status: "OPEN" | "RESOLVED";
                    summary: string;
                    supportingEvidenceIds: string[];
                    resolvedByEvidenceId?: string | undefined;
                    openedAt: string;
                    resolvedAt?: string | undefined;
                    source: {
                        kind: "CORE";
                    };
                }[];
                relatedProjectIds: string[];
                relatedTaskIds: string[];
                revision: number;
                updatedAt: string;
                source: {
                    kind: "CORE";
                };
            }[];
            personalization: {
                schemaVersion: 1;
                id: string;
                projectId: string;
                correlationId: string;
                target: {
                    kind: "DISCOVERY_SESSION";
                    discoverySessionId: string;
                } | {
                    kind: "HELPER_TURN";
                    taskId: string;
                    decisionId?: string | undefined;
                };
                mode: "EVIDENCE_AWARE" | "NO_RELEVANT_EVIDENCE";
                basis: {
                    conceptId: string;
                    conceptName: string;
                    ledgerRevision: number;
                    state: "DEMONSTRATED" | "EXPLAINED" | "OBSERVED" | "TRANSFERRED";
                    evidenceIds: string[];
                    episodeIds: string[];
                    sourceProjectIds: string[];
                    sourceProjectTitles: string[];
                    openIssueIds: string[];
                    purpose: "DISCOVERY_TIE_BREAK" | "HELPER_EXPLANATION_START" | "HELPER_PAST_EXPERIENCE_CONNECTION" | "HELPER_TASK_USER_EVIDENCE_CONNECTION";
                    redactedEvidenceExcerpt?: string | undefined;
                }[];
                fallbackReason?: "NO_LEDGER" | "NO_PRIOR_PROJECT_EVIDENCE" | "NO_RELEVANT_CONCEPT" | undefined;
                createdAt: string;
                source: {
                    kind: "CORE";
                };
                redactionStatus: "VERIFIED_REDACTED";
            };
        } | null;
        selectedCandidate: {
            title: string;
            summary: string;
            targetUsers: string[];
            coreInteraction: string;
            usageMoment: string;
            appeal: string;
            personalNeedRelationship?: string | undefined;
            technologyNecessity: string;
            coreConcepts: string[];
            mvpFeatures: string[];
            suggestedScope: {
                learnerFocus: string[];
                agentSupport: string[];
                excluded: string[];
            };
            risks?: string[] | undefined;
            generationTags: ("DIRECT" | "DISCOVER" | "EXPAND" | "UPGRADE")[];
            evaluation?: {
                criterion: "ADJACENT_COMPLEXITY" | "ADOPTION_FEASIBILITY" | "CONCEPT_NECESSITY" | "DEPLOYABILITY" | "DISTINCTIVENESS" | "LEARNER_FIT" | "PERSONAL_UTILITY" | "SCOPE_FEASIBILITY";
                assessment: "CONCERN" | "MIXED" | "POSITIVE";
                rationale: string;
            }[] | undefined;
            schemaVersion: 1;
            id: string;
            discoverySessionId: string;
            correlationId: string;
            revision: number;
            parentRevisions: {
                candidateId: string;
                revision: number;
            }[];
            createdAt: string;
            source: {
                kind: "AGENT";
                role: "DISCOVERY";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        } | null;
        learningSpec: {
            productPurpose: string;
            targetUsers: string[];
            primaryUsageMoment: string;
            successMoment: string;
            mvpFeatures: string[];
            scope: {
                category: "AGENT_SUPPORT" | "EXCLUDED" | "LEARNER_FOCUS";
                title: string;
                rationale: string;
                conceptNames: string[];
            }[];
            expectedDecisions: {
                category: "API_CONTRACT" | "ARCHITECTURE" | "AUTHENTICATION" | "AUTHORIZATION" | "COST_DEPLOYMENT" | "DATA_MODEL" | "LEARNING_CONCEPT" | "PRODUCT_BEHAVIOR" | "RETENTION_DELETION" | "SECURITY_PRIVACY";
                description: string;
                whyUserInputMatters: string;
            }[];
            runtimeConstraint: "TYPESCRIPT";
            deploymentConstraints: string[];
            schemaVersion: 1;
            id: string;
            projectId: string;
            correlationId: string;
            revision: number;
            parentRevision?: number | undefined;
            selectedCandidate: {
                candidateId: string;
                revision: number;
            };
            status: "CONFIRMED" | "DRAFT" | "SUPERSEDED";
            confirmation?: {
                confirmedAt: string;
                confirmedBy: {
                    kind: "USER";
                };
            } | undefined;
            createdAt: string;
            updatedAt: string;
            source: {
                kind: "USER";
            } | {
                kind: "AGENT";
                role: "BUILDER" | "DISCOVERY" | "EVIDENCE_ANALYST" | "HELPER";
            } | {
                kind: "CORE";
            } | {
                kind: "UI";
            } | {
                kind: "KIRO_ADAPTER";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        } | null;
        activeTask: {
            schemaVersion: 1;
            id: string;
            projectId: string;
            learningSpecId: string;
            learningSpecRevision: number;
            correlationId: string;
            revision: number;
            title: string;
            productGoal: string;
            requirements: string[];
            acceptanceCriteria: {
                key: string;
                description: string;
            }[];
            expectedConcepts: string[];
            excludedWork: string[];
            prerequisiteTaskIds: string[];
            expectedDecisionCategories: ("API_CONTRACT" | "ARCHITECTURE" | "AUTHENTICATION" | "AUTHORIZATION" | "COST_DEPLOYMENT" | "DATA_MODEL" | "LEARNING_CONCEPT" | "PRODUCT_BEHAVIOR" | "RETENTION_DELETION" | "SECURITY_PRIVACY")[];
            finalUpgrade?: {
                sourceTaskId: string;
                personalizationTraceId: string;
                userGoal: string;
            } | undefined;
            sequence: number;
            status: "ACTIVE" | "BLOCKED" | "CANCELLED" | "COMPLETED" | "FAILED" | "PENDING";
            createdAt: string;
            updatedAt: string;
            source: {
                kind: "CORE";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        } | null;
        currentTask: {
            schemaVersion: 1;
            id: string;
            projectId: string;
            learningSpecId: string;
            learningSpecRevision: number;
            correlationId: string;
            revision: number;
            title: string;
            productGoal: string;
            requirements: string[];
            acceptanceCriteria: {
                key: string;
                description: string;
            }[];
            expectedConcepts: string[];
            excludedWork: string[];
            prerequisiteTaskIds: string[];
            expectedDecisionCategories: ("API_CONTRACT" | "ARCHITECTURE" | "AUTHENTICATION" | "AUTHORIZATION" | "COST_DEPLOYMENT" | "DATA_MODEL" | "LEARNING_CONCEPT" | "PRODUCT_BEHAVIOR" | "RETENTION_DELETION" | "SECURITY_PRIVACY")[];
            finalUpgrade?: {
                sourceTaskId: string;
                personalizationTraceId: string;
                userGoal: string;
            } | undefined;
            sequence: number;
            status: "ACTIVE" | "BLOCKED" | "CANCELLED" | "COMPLETED" | "FAILED" | "PENDING";
            createdAt: string;
            updatedAt: string;
            source: {
                kind: "CORE";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        } | null;
        liveContext: {
            schemaVersion: 1;
            id: string;
            projectId: string;
            taskId: string;
            correlationId: string;
            contextVersion: number;
            expectedPreviousVersion: number;
            checkpoint: "CONCEPT_INTRODUCED" | "DECISION_REQUIRED" | "DIRECTION_CHANGED" | "PLAN_CHANGED_AFTER_ERROR" | "TASK_COMPLETED" | "TASK_STARTED" | "VALIDATION_STARTED";
            stage: string;
            currentGoal: string;
            recentChanges: string[];
            activeDecisionIds: string[];
            activeConceptNames: string[];
            relatedFiles: {
                kind: "CODE";
                path: string;
                lineRange?: {
                    start: number;
                    end: number;
                } | undefined;
                revisionRef?: string | undefined;
            }[];
            nextActions: string[];
            blockingReason?: string | undefined;
            updatedAt: string;
            source: {
                kind: "AGENT";
                role: "BUILDER";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        } | null;
        pendingDecisions: {
            schemaVersion: 1;
            id: string;
            projectId: string;
            taskId: string;
            correlationId: string;
            contextVersion: number;
            category: "API_CONTRACT" | "ARCHITECTURE" | "AUTHENTICATION" | "AUTHORIZATION" | "COST_DEPLOYMENT" | "DATA_MODEL" | "LEARNING_CONCEPT" | "PRODUCT_BEHAVIOR" | "RETENTION_DELETION" | "SECURITY_PRIVACY";
            question: string;
            reasonRequiredNow: string;
            options: {
                id: string;
                label: string;
                description: string;
                impacts: string[];
                tradeoffs: string[];
            }[];
            recommendedOptionId: string;
            recommendationRationale: string;
            relatedConceptNames: string[];
            sourceReferences: ({
                kind: "CODE";
                path: string;
                lineRange?: {
                    start: number;
                    end: number;
                } | undefined;
                revisionRef?: string | undefined;
            } | {
                kind: "DIFF";
                diffId: string;
                paths: string[];
                revisionRef?: string | undefined;
            } | {
                kind: "TEST_RESULT";
                testResultId: string;
                taskId: string;
            } | {
                kind: "TOOL_CALL";
                toolCallId: string;
                toolName: string;
            } | {
                kind: "USER_MESSAGE";
                conversationId: string;
                messageId: string;
            } | {
                kind: "USER_DECISION";
                decisionId: string;
            } | {
                kind: "USER_ACTION";
                eventId: string;
            } | {
                kind: "AGENT_MESSAGE";
                conversationId: string;
                messageId: string;
            } | {
                kind: "EVENT";
                eventId: string;
            })[];
            independentWorkCanContinue: boolean;
            requestedAt: string;
            source: {
                kind: "AGENT";
                role: "BUILDER";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        }[];
        decisions: {
            request: {
                schemaVersion: 1;
                id: string;
                projectId: string;
                taskId: string;
                correlationId: string;
                contextVersion: number;
                category: "API_CONTRACT" | "ARCHITECTURE" | "AUTHENTICATION" | "AUTHORIZATION" | "COST_DEPLOYMENT" | "DATA_MODEL" | "LEARNING_CONCEPT" | "PRODUCT_BEHAVIOR" | "RETENTION_DELETION" | "SECURITY_PRIVACY";
                question: string;
                reasonRequiredNow: string;
                options: {
                    id: string;
                    label: string;
                    description: string;
                    impacts: string[];
                    tradeoffs: string[];
                }[];
                recommendedOptionId: string;
                recommendationRationale: string;
                relatedConceptNames: string[];
                sourceReferences: ({
                    kind: "CODE";
                    path: string;
                    lineRange?: {
                        start: number;
                        end: number;
                    } | undefined;
                    revisionRef?: string | undefined;
                } | {
                    kind: "DIFF";
                    diffId: string;
                    paths: string[];
                    revisionRef?: string | undefined;
                } | {
                    kind: "TEST_RESULT";
                    testResultId: string;
                    taskId: string;
                } | {
                    kind: "TOOL_CALL";
                    toolCallId: string;
                    toolName: string;
                } | {
                    kind: "USER_MESSAGE";
                    conversationId: string;
                    messageId: string;
                } | {
                    kind: "USER_DECISION";
                    decisionId: string;
                } | {
                    kind: "USER_ACTION";
                    eventId: string;
                } | {
                    kind: "AGENT_MESSAGE";
                    conversationId: string;
                    messageId: string;
                } | {
                    kind: "EVENT";
                    eventId: string;
                })[];
                independentWorkCanContinue: boolean;
                requestedAt: string;
                source: {
                    kind: "AGENT";
                    role: "BUILDER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            };
            resolution: {
                schemaVersion: 1;
                id: string;
                decisionId: string;
                projectId: string;
                taskId: string;
                correlationId: string;
                expectedContextVersion: number;
                selectionKind: "CUSTOM" | "OPTION" | "RECOMMENDATION";
                selectedOptionId?: string | undefined;
                customProposal?: string | undefined;
                rationale?: string | undefined;
                helperUsed: boolean;
                resolvedAt: string;
                source: {
                    kind: "USER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            } | null;
            application: {
                schemaVersion: 1;
                id: string;
                decisionId: string;
                resolutionId: string;
                projectId: string;
                taskId: string;
                correlationId: string;
                appliedResult: string;
                sourceReferences: ({
                    kind: "CODE";
                    path: string;
                    lineRange?: {
                        start: number;
                        end: number;
                    } | undefined;
                    revisionRef?: string | undefined;
                } | {
                    kind: "DIFF";
                    diffId: string;
                    paths: string[];
                    revisionRef?: string | undefined;
                } | {
                    kind: "TEST_RESULT";
                    testResultId: string;
                    taskId: string;
                } | {
                    kind: "TOOL_CALL";
                    toolCallId: string;
                    toolName: string;
                } | {
                    kind: "USER_MESSAGE";
                    conversationId: string;
                    messageId: string;
                } | {
                    kind: "USER_DECISION";
                    decisionId: string;
                } | {
                    kind: "USER_ACTION";
                    eventId: string;
                } | {
                    kind: "AGENT_MESSAGE";
                    conversationId: string;
                    messageId: string;
                } | {
                    kind: "EVENT";
                    eventId: string;
                })[];
                appliedAt: string;
                source: {
                    kind: "AGENT";
                    role: "BUILDER";
                };
                redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
            } | null;
        }[];
        completionReport: {
            schemaVersion: 1;
            id: string;
            projectId: string;
            taskId: string;
            correlationId: string;
            expectedTaskRevision: number;
            implementedFeatures: string[];
            acceptanceResults: {
                criterionKey: string;
                status: "FAILED" | "PASSED";
                evidence: ({
                    kind: "CODE";
                    path: string;
                    lineRange?: {
                        start: number;
                        end: number;
                    } | undefined;
                    revisionRef?: string | undefined;
                } | {
                    kind: "DIFF";
                    diffId: string;
                    paths: string[];
                    revisionRef?: string | undefined;
                } | {
                    kind: "TEST_RESULT";
                    testResultId: string;
                    taskId: string;
                } | {
                    kind: "TOOL_CALL";
                    toolCallId: string;
                    toolName: string;
                } | {
                    kind: "USER_MESSAGE";
                    conversationId: string;
                    messageId: string;
                } | {
                    kind: "USER_DECISION";
                    decisionId: string;
                } | {
                    kind: "USER_ACTION";
                    eventId: string;
                } | {
                    kind: "AGENT_MESSAGE";
                    conversationId: string;
                    messageId: string;
                } | {
                    kind: "EVENT";
                    eventId: string;
                })[];
            }[];
            validationResults: {
                name: string;
                status: "FAILED" | "NOT_RUN" | "PASSED";
                summary: string;
                reference?: {
                    kind: "TEST_RESULT";
                    testResultId: string;
                    taskId: string;
                } | undefined;
            }[];
            conceptUsage: {
                conceptName: string;
                scope: "AGENT_SUPPORT" | "EXCLUDED" | "LEARNER_FOCUS";
                importance: "CORE" | "SUPPORTING";
                usageReason: string;
                codeReferences: {
                    kind: "CODE";
                    path: string;
                    lineRange?: {
                        start: number;
                        end: number;
                    } | undefined;
                    revisionRef?: string | undefined;
                }[];
            }[];
            appliedDecisionIds: string[];
            codeReferences: {
                kind: "CODE";
                path: string;
                lineRange?: {
                    start: number;
                    end: number;
                } | undefined;
                revisionRef?: string | undefined;
            }[];
            diffReferences: {
                kind: "DIFF";
                diffId: string;
                paths: string[];
                revisionRef?: string | undefined;
            }[];
            specDeviations: string[];
            remainingIssues: string[];
            limitations: string[];
            completedAt: string;
            source: {
                kind: "AGENT";
                role: "BUILDER";
            };
            redactionStatus: "NOT_REQUIRED" | "REDACTED" | "VERIFIED_REDACTED";
        } | null;
        helperConversations: {
            conversationId: string;
            episodeId: string;
            taskId: string;
            decisionId?: string | undefined;
            status: "ANALYSIS_FAILED" | "ANALYZED" | "OPEN" | "PENDING_ANALYSIS";
            startedAt: string;
            endedAt?: string | undefined;
            redactedUserExcerpts: string[];
            helperResponseSummaries: string[];
        }[];
    }>;
    startDiscovery(input: DiscoveryInput, options?: {
        enrichAfterPreview?: boolean;
    }): Promise<{
        projectId: string;
        run: {
            protocolVersion: 1;
            backendInstanceId: string;
            id: string;
            projectId: string;
            kind: "BUILDER" | "DISCOVERY" | "HELPER";
            phase: string;
            status: "ACCEPTED" | "CANCELLED" | "FAILED" | "RUNNING" | "SUCCEEDED";
            outcome: "DURABLE_RESULT" | "HELPER_RECORDED" | "NONE" | "PENDING" | "TURN_ENDED";
            createdAt: string;
            updatedAt: string;
            errorCode: string | null;
            lastSequence: number;
            retainedFromSequence: number;
        };
    }>;
    startRun(request: LocalRunInput): Promise<LocalRun>;
    getRun(id: string): Promise<LocalRun>;
    listRuns(projectId: string): Promise<LocalRun[]>;
    cancelRun(id: string): Promise<LocalRun>;
    watchRun(id: string, onEvent: (event: LocalRunEvent) => void, options?: {
        signal?: AbortSignal;
        after?: number;
        onRun?: (run: LocalRun) => void;
    }): Promise<LocalRun>;
}
