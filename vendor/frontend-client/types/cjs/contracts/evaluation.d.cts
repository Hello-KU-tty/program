import { z } from 'zod';
export declare const contractDomainSchema: z.ZodEnum<{
    ACTIVITY: "ACTIVITY";
    AUDIT: "AUDIT";
    BUILD: "BUILD";
    CONCEPT_LEDGER: "CONCEPT_LEDGER";
    DECISION: "DECISION";
    DISCOVERY: "DISCOVERY";
    EPISODE: "EPISODE";
    EVALUATION: "EVALUATION";
    EVIDENCE: "EVIDENCE";
    LEARNING_SPEC: "LEARNING_SPEC";
}>;
export declare const evaluationDimensionSchema: z.ZodEnum<{
    CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
    CONTEXT_COMPLETENESS: "CONTEXT_COMPLETENESS";
    CONTRACT_INTEGRITY: "CONTRACT_INTEGRITY";
    DECISION_NECESSITY: "DECISION_NECESSITY";
    DISCOVERY_DIVERSITY: "DISCOVERY_DIVERSITY";
    EVIDENCE_QUALITY: "EVIDENCE_QUALITY";
    REDACTION: "REDACTION";
    SPEC_SCOPE: "SPEC_SCOPE";
}>;
export declare const evaluationReviewModeSchema: z.ZodEnum<{
    AUTOMATED: "AUTOMATED";
    HUMAN: "HUMAN";
}>;
export declare const evaluationCriterionStatusSchema: z.ZodEnum<{
    ERROR: "ERROR";
    FAILED: "FAILED";
    NEEDS_REVIEW: "NEEDS_REVIEW";
    PASSED: "PASSED";
}>;
export declare const evaluationCriterionSchema: z.ZodObject<{
    key: z.ZodString;
    dimension: z.ZodEnum<{
        CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
        CONTEXT_COMPLETENESS: "CONTEXT_COMPLETENESS";
        CONTRACT_INTEGRITY: "CONTRACT_INTEGRITY";
        DECISION_NECESSITY: "DECISION_NECESSITY";
        DISCOVERY_DIVERSITY: "DISCOVERY_DIVERSITY";
        EVIDENCE_QUALITY: "EVIDENCE_QUALITY";
        REDACTION: "REDACTION";
        SPEC_SCOPE: "SPEC_SCOPE";
    }>;
    reviewMode: z.ZodEnum<{
        AUTOMATED: "AUTOMATED";
        HUMAN: "HUMAN";
    }>;
    description: z.ZodString;
    successDefinition: z.ZodString;
}, z.core.$strict>;
export declare const evaluationFixtureSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    kind: z.ZodEnum<{
        CANDIDATE_MODE_COLLAPSE: "CANDIDATE_MODE_COLLAPSE";
        DECISION_QUALITY: "DECISION_QUALITY";
        FALSE_MASTERY: "FALSE_MASTERY";
        FALSE_MISCONCEPTION: "FALSE_MISCONCEPTION";
        GOLDEN_PATH: "GOLDEN_PATH";
        REDACTION: "REDACTION";
        SPEC_SCOPE: "SPEC_SCOPE";
        STALE_CONTEXT: "STALE_CONTEXT";
        UNSEEN_DISCOVERY: "UNSEEN_DISCOVERY";
    }>;
    inputPath: z.ZodString;
    calibrationSubjectPath: z.ZodOptional<z.ZodString>;
    calibrationReviewPath: z.ZodOptional<z.ZodString>;
    expectedContractDomains: z.ZodArray<z.ZodEnum<{
        ACTIVITY: "ACTIVITY";
        AUDIT: "AUDIT";
        BUILD: "BUILD";
        CONCEPT_LEDGER: "CONCEPT_LEDGER";
        DECISION: "DECISION";
        DISCOVERY: "DISCOVERY";
        EPISODE: "EPISODE";
        EVALUATION: "EVALUATION";
        EVIDENCE: "EVIDENCE";
        LEARNING_SPEC: "LEARNING_SPEC";
    }>>;
    criteria: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        dimension: z.ZodEnum<{
            CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
            CONTEXT_COMPLETENESS: "CONTEXT_COMPLETENESS";
            CONTRACT_INTEGRITY: "CONTRACT_INTEGRITY";
            DECISION_NECESSITY: "DECISION_NECESSITY";
            DISCOVERY_DIVERSITY: "DISCOVERY_DIVERSITY";
            EVIDENCE_QUALITY: "EVIDENCE_QUALITY";
            REDACTION: "REDACTION";
            SPEC_SCOPE: "SPEC_SCOPE";
        }>;
        reviewMode: z.ZodEnum<{
            AUTOMATED: "AUTOMATED";
            HUMAN: "HUMAN";
        }>;
        description: z.ZodString;
        successDefinition: z.ZodString;
    }, z.core.$strict>>;
    scenarioTags: z.ZodArray<z.ZodString>;
    fixtureVersion: z.ZodString;
    containsPersonalData: z.ZodLiteral<false>;
    redactionStatus: z.ZodLiteral<"VERIFIED_REDACTED">;
}, z.core.$strict>;
export declare const evaluationMetricSchema: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodNumber;
    unit: z.ZodEnum<{
        COUNT: "COUNT";
        MILLISECONDS: "MILLISECONDS";
        RATIO: "RATIO";
        TOKENS: "TOKENS";
    }>;
    interpretation: z.ZodString;
}, z.core.$strict>;
export declare const evaluationCriterionResultSchema: z.ZodObject<{
    criterionKey: z.ZodString;
    dimension: z.ZodEnum<{
        CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
        CONTEXT_COMPLETENESS: "CONTEXT_COMPLETENESS";
        CONTRACT_INTEGRITY: "CONTRACT_INTEGRITY";
        DECISION_NECESSITY: "DECISION_NECESSITY";
        DISCOVERY_DIVERSITY: "DISCOVERY_DIVERSITY";
        EVIDENCE_QUALITY: "EVIDENCE_QUALITY";
        REDACTION: "REDACTION";
        SPEC_SCOPE: "SPEC_SCOPE";
    }>;
    reviewMode: z.ZodEnum<{
        AUTOMATED: "AUTOMATED";
        HUMAN: "HUMAN";
    }>;
    status: z.ZodEnum<{
        ERROR: "ERROR";
        FAILED: "FAILED";
        NEEDS_REVIEW: "NEEDS_REVIEW";
        PASSED: "PASSED";
    }>;
    explanation: z.ZodString;
    evidenceReferences: z.ZodArray<z.ZodString>;
    metrics: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodNumber;
        unit: z.ZodEnum<{
            COUNT: "COUNT";
            MILLISECONDS: "MILLISECONDS";
            RATIO: "RATIO";
            TOKENS: "TOKENS";
        }>;
        interpretation: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const evaluationCaseResultSchema: z.ZodObject<{
    fixtureId: z.ZodString;
    fixtureVersion: z.ZodString;
    status: z.ZodEnum<{
        ERROR: "ERROR";
        FAILED: "FAILED";
        NEEDS_REVIEW: "NEEDS_REVIEW";
        PASSED: "PASSED";
    }>;
    criterionResults: z.ZodArray<z.ZodObject<{
        criterionKey: z.ZodString;
        dimension: z.ZodEnum<{
            CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
            CONTEXT_COMPLETENESS: "CONTEXT_COMPLETENESS";
            CONTRACT_INTEGRITY: "CONTRACT_INTEGRITY";
            DECISION_NECESSITY: "DECISION_NECESSITY";
            DISCOVERY_DIVERSITY: "DISCOVERY_DIVERSITY";
            EVIDENCE_QUALITY: "EVIDENCE_QUALITY";
            REDACTION: "REDACTION";
            SPEC_SCOPE: "SPEC_SCOPE";
        }>;
        reviewMode: z.ZodEnum<{
            AUTOMATED: "AUTOMATED";
            HUMAN: "HUMAN";
        }>;
        status: z.ZodEnum<{
            ERROR: "ERROR";
            FAILED: "FAILED";
            NEEDS_REVIEW: "NEEDS_REVIEW";
            PASSED: "PASSED";
        }>;
        explanation: z.ZodString;
        evidenceReferences: z.ZodArray<z.ZodString>;
        metrics: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodNumber;
            unit: z.ZodEnum<{
                COUNT: "COUNT";
                MILLISECONDS: "MILLISECONDS";
                RATIO: "RATIO";
                TOKENS: "TOKENS";
            }>;
            interpretation: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    metrics: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodNumber;
        unit: z.ZodEnum<{
            COUNT: "COUNT";
            MILLISECONDS: "MILLISECONDS";
            RATIO: "RATIO";
            TOKENS: "TOKENS";
        }>;
        interpretation: z.ZodString;
    }, z.core.$strict>>;
    notes: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const evaluationRunSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    correlationId: z.ZodString;
    revision: z.ZodInt;
    evaluatorVersion: z.ZodString;
    systemUnderTestVersion: z.ZodString;
    fixtureIds: z.ZodArray<z.ZodString>;
    status: z.ZodEnum<{
        COMPLETED: "COMPLETED";
        FAILED: "FAILED";
        NEEDS_REVIEW: "NEEDS_REVIEW";
        PENDING: "PENDING";
        RUNNING: "RUNNING";
    }>;
    startedAt: z.ZodISODateTime;
    completedAt: z.ZodOptional<z.ZodISODateTime>;
    results: z.ZodArray<z.ZodObject<{
        fixtureId: z.ZodString;
        fixtureVersion: z.ZodString;
        status: z.ZodEnum<{
            ERROR: "ERROR";
            FAILED: "FAILED";
            NEEDS_REVIEW: "NEEDS_REVIEW";
            PASSED: "PASSED";
        }>;
        criterionResults: z.ZodArray<z.ZodObject<{
            criterionKey: z.ZodString;
            dimension: z.ZodEnum<{
                CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
                CONTEXT_COMPLETENESS: "CONTEXT_COMPLETENESS";
                CONTRACT_INTEGRITY: "CONTRACT_INTEGRITY";
                DECISION_NECESSITY: "DECISION_NECESSITY";
                DISCOVERY_DIVERSITY: "DISCOVERY_DIVERSITY";
                EVIDENCE_QUALITY: "EVIDENCE_QUALITY";
                REDACTION: "REDACTION";
                SPEC_SCOPE: "SPEC_SCOPE";
            }>;
            reviewMode: z.ZodEnum<{
                AUTOMATED: "AUTOMATED";
                HUMAN: "HUMAN";
            }>;
            status: z.ZodEnum<{
                ERROR: "ERROR";
                FAILED: "FAILED";
                NEEDS_REVIEW: "NEEDS_REVIEW";
                PASSED: "PASSED";
            }>;
            explanation: z.ZodString;
            evidenceReferences: z.ZodArray<z.ZodString>;
            metrics: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodNumber;
                unit: z.ZodEnum<{
                    COUNT: "COUNT";
                    MILLISECONDS: "MILLISECONDS";
                    RATIO: "RATIO";
                    TOKENS: "TOKENS";
                }>;
                interpretation: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        metrics: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodNumber;
            unit: z.ZodEnum<{
                COUNT: "COUNT";
                MILLISECONDS: "MILLISECONDS";
                RATIO: "RATIO";
                TOKENS: "TOKENS";
            }>;
            interpretation: z.ZodString;
        }, z.core.$strict>>;
        notes: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    redactionStatus: z.ZodLiteral<"VERIFIED_REDACTED">;
}, z.core.$strict>;
export declare const baselineResultSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    evaluationRunId: z.ZodString;
    correlationId: z.ZodString;
    kind: z.ZodEnum<{
        ABLATION: "ABLATION";
        CALIBRATION: "CALIBRATION";
        GENERIC_KIRO: "GENERIC_KIRO";
        SIMPLE_MEMORY: "SIMPLE_MEMORY";
    }>;
    baselineName: z.ZodString;
    baselineVersion: z.ZodString;
    results: z.ZodArray<z.ZodObject<{
        fixtureId: z.ZodString;
        fixtureVersion: z.ZodString;
        status: z.ZodEnum<{
            ERROR: "ERROR";
            FAILED: "FAILED";
            NEEDS_REVIEW: "NEEDS_REVIEW";
            PASSED: "PASSED";
        }>;
        criterionResults: z.ZodArray<z.ZodObject<{
            criterionKey: z.ZodString;
            dimension: z.ZodEnum<{
                CONCEPT_NECESSITY: "CONCEPT_NECESSITY";
                CONTEXT_COMPLETENESS: "CONTEXT_COMPLETENESS";
                CONTRACT_INTEGRITY: "CONTRACT_INTEGRITY";
                DECISION_NECESSITY: "DECISION_NECESSITY";
                DISCOVERY_DIVERSITY: "DISCOVERY_DIVERSITY";
                EVIDENCE_QUALITY: "EVIDENCE_QUALITY";
                REDACTION: "REDACTION";
                SPEC_SCOPE: "SPEC_SCOPE";
            }>;
            reviewMode: z.ZodEnum<{
                AUTOMATED: "AUTOMATED";
                HUMAN: "HUMAN";
            }>;
            status: z.ZodEnum<{
                ERROR: "ERROR";
                FAILED: "FAILED";
                NEEDS_REVIEW: "NEEDS_REVIEW";
                PASSED: "PASSED";
            }>;
            explanation: z.ZodString;
            evidenceReferences: z.ZodArray<z.ZodString>;
            metrics: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodNumber;
                unit: z.ZodEnum<{
                    COUNT: "COUNT";
                    MILLISECONDS: "MILLISECONDS";
                    RATIO: "RATIO";
                    TOKENS: "TOKENS";
                }>;
                interpretation: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        metrics: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodNumber;
            unit: z.ZodEnum<{
                COUNT: "COUNT";
                MILLISECONDS: "MILLISECONDS";
                RATIO: "RATIO";
                TOKENS: "TOKENS";
            }>;
            interpretation: z.ZodString;
        }, z.core.$strict>>;
        notes: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    recordedAt: z.ZodISODateTime;
    redactionStatus: z.ZodLiteral<"VERIFIED_REDACTED">;
}, z.core.$strict>;
export type ContractDomain = z.infer<typeof contractDomainSchema>;
export type EvaluationDimension = z.infer<typeof evaluationDimensionSchema>;
export type EvaluationReviewMode = z.infer<typeof evaluationReviewModeSchema>;
export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;
export type EvaluationFixture = z.infer<typeof evaluationFixtureSchema>;
export type EvaluationMetric = z.infer<typeof evaluationMetricSchema>;
export type EvaluationCriterionResult = z.infer<typeof evaluationCriterionResultSchema>;
export type EvaluationCaseResult = z.infer<typeof evaluationCaseResultSchema>;
export type EvaluationRun = z.infer<typeof evaluationRunSchema>;
export type BaselineResult = z.infer<typeof baselineResultSchema>;
