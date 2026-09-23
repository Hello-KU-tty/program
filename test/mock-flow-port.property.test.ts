import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { MockDiscoveryPort } from "../src/adapter/flow/mock-flow-port";
import type {
  PortResult,
  RequestEnvelope,
} from "../src/adapter/flow/discovery-port";
import type {
  CandidateRevisionReference,
  DiscoveryFeedback,
  DiscoveryFeedbackIntent,
  DiscoveryInput,
  GenerationTag,
  LearningScopeCategory,
} from "../src/core/flow/flow-types";
import { FakeClock } from "./support/fake-clock";

/**
 * Property-based tests for the {@link MockDiscoveryPort} adapter.
 *
 * These validate the "Mock quality" correctness properties from
 * `.kiro/specs/discovery-spec-flow/design.md`:
 *   - Property 16: Mock preview rounds are well-formed and varied
 *   - Property 17: Mock enrichment and spec drafts are fully populated
 *   - Property 18: Mock feedback advances the round monotonically
 *   - Property 19: Mock output conforms to the core contract shape
 *
 * The mock schedules every op through an injectable {@link Clock} at a seeded
 * latency. Tests inject a {@link FakeClock}, kick the op (which arms a timer),
 * `advance` past the latency window to fire it, then await the resolved
 * `PortResult`. Latency is pinned to a fixed window so a single `advance` is
 * always sufficient regardless of the seed.
 *
 * NOTE on Property 19: this extension deliberately keeps LOCAL, shape-compatible
 * domain types (`src/core/flow/flow-types.ts`) rather than importing the
 * `core/packages/contracts` Zod schemas (see the flow-types module doc). There
 * is no Zod schema reachable from this package, so Property 19 asserts the
 * required/optional field contract directly against `flow-types.ts`: required
 * domain fields are present with the correct runtime types, and the
 * contract-optional envelope fields the mock DOES populate (`schemaVersion`,
 * `createdAt`, `updatedAt`) have the right types. This matches the property's
 * intent ("validates against the corresponding schema, allowing for optional
 * envelope fields") given the local-type design.
 */

const NUM_RUNS = 100;

/** A fixed latency window so one clock advance always resolves any op. */
const LATENCY = { minMs: 500, maxMs: 500 };
/** Advance comfortably past the (fixed) latency to fire the scheduled timer. */
const ADVANCE_MS = 1000;

/** Build a deterministic, valid RequestEnvelope. */
function envelope(expectedRevision = 1): RequestEnvelope {
  return {
    correlationId: "corr_test",
    idempotencyKey: "idem_test",
    expectedRevision,
  };
}

/** A minimal valid DiscoveryInput. */
const DISCOVERY_INPUT: DiscoveryInput = {
  learningGoal: "간단한 웹 앱을 만들며 기본기를 익히고 싶다",
  currentLevel: "BEGINNER",
};

/**
 * Drive a scheduled mock op to resolution against a FakeClock: kick the op
 * (arms the latency timer), advance the clock to fire it, then await the
 * resulting PortResult.
 */
async function resolveOp<T>(
  clock: FakeClock,
  start: () => Promise<PortResult<T>>,
): Promise<PortResult<T>> {
  const pending = start();
  clock.advance(ADVANCE_MS);
  return pending;
}

/** Construct a port bound to a fresh FakeClock with the fixed latency. */
function makePort(seed: number): { port: MockDiscoveryPort; clock: FakeClock } {
  const clock = new FakeClock();
  const port = new MockDiscoveryPort({ seed, clock, latency: LATENCY });
  return { port, clock };
}

const seedArb: fc.Arbitrary<number> = fc.integer();

const ALL_TAGS: readonly GenerationTag[] = ["DIRECT", "EXPAND", "DISCOVER", "UPGRADE"];
const SCOPE_CATEGORIES: readonly LearningScopeCategory[] = [
  "LEARNER_FOCUS",
  "AGENT_SUPPORT",
  "EXCLUDED",
];

/** Assert a value is a non-empty string. */
function expectNonEmptyString(v: unknown): void {
  expect(typeof v).toBe("string");
  expect((v as string).length).toBeGreaterThan(0);
}

/** Assert a value is a non-empty array of non-empty strings. */
function expectNonEmptyStringArray(v: unknown): void {
  expect(Array.isArray(v)).toBe(true);
  const arr = v as unknown[];
  expect(arr.length).toBeGreaterThan(0);
  for (const item of arr) {
    expectNonEmptyString(item);
  }
}

describe("MockDiscoveryPort properties", () => {
  // Feature: discovery-spec-flow, Property 16: Mock preview rounds are well-formed and varied.
  // For any seed, a MockDiscoveryPort preview round contains exactly 10 CandidatePreview
  // items whose position values are exactly 1 through 10, whose candidateIds are all unique,
  // each with 1-4 generationTags, and with more than one distinct title across the 10 cards.
  // Validates: Requirements 15.1, 15.2
  it("Property 16: preview rounds are well-formed and varied", async () => {
    await fc.assert(
      fc.asyncProperty(seedArb, async (seed) => {
        const { port, clock } = makePort(seed);

        const startRes = await resolveOp(clock, () =>
          port.startDiscovery({ projectId: "project_1", input: DISCOVERY_INPUT }, envelope()),
        );
        expect(startRes.ok).toBe(true);
        if (!startRes.ok) return;
        const session = startRes.value;

        const roundRes = await resolveOp(clock, () =>
          port.generatePreviewRound({ discoverySessionId: session.id }, envelope()),
        );
        expect(roundRes.ok).toBe(true);
        if (!roundRes.ok) return;
        const { previews } = roundRes.value;

        // Exactly 10 previews.
        expect(previews).toHaveLength(10);

        // Positions are exactly 1..10, each once.
        const positions = previews.map((p) => p.position).sort((a, b) => a - b);
        expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

        // Unique candidateIds.
        const ids = new Set(previews.map((p) => p.candidateId));
        expect(ids.size).toBe(10);

        for (const p of previews) {
          // 1..4 generation tags, all from the enum, no duplicates.
          expect(p.generationTags.length).toBeGreaterThanOrEqual(1);
          expect(p.generationTags.length).toBeLessThanOrEqual(4);
          expect(new Set(p.generationTags).size).toBe(p.generationTags.length);
          for (const tag of p.generationTags) {
            expect(ALL_TAGS).toContain(tag);
          }
          // Non-empty text fields.
          expectNonEmptyString(p.title);
          expectNonEmptyString(p.summary);
          expectNonEmptyString(p.coreInteraction);
          expectNonEmptyString(p.appeal);
        }

        // Variety: not all titles identical across the 10 cards.
        const distinctTitles = new Set(previews.map((p) => p.title));
        expect(distinctTitles.size).toBeGreaterThan(1);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 17: Mock enrichment and spec drafts are fully populated.
  // For any seed and candidate, a MockDiscoveryPort enrichment yields non-empty targetUsers,
  // coreConcepts, mvpFeatures, and every suggestedScope list is present; and a generated
  // LearningSpecRevision has status === "DRAFT", runtimeConstraint === "TYPESCRIPT", and
  // non-empty productPurpose, mvpFeatures, scope, and expectedDecisions.
  // Validates: Requirements 15.3, 15.4
  it("Property 17: enrichment and spec drafts are fully populated", async () => {
    await fc.assert(
      fc.asyncProperty(seedArb, fc.nat({ max: 1_000_000 }), async (seed, revBase) => {
        const { port, clock } = makePort(seed);
        const target: CandidateRevisionReference = {
          candidateId: "cand_probe",
          revision: (revBase % 5) + 1,
        };

        const enrichRes = await resolveOp(clock, () =>
          port.enrichCandidate(
            { discoverySessionId: "discovery_session_1", target },
            envelope(),
          ),
        );
        expect(enrichRes.ok).toBe(true);
        if (!enrichRes.ok) return;
        const enriched = enrichRes.value;

        expectNonEmptyStringArray(enriched.targetUsers);
        expectNonEmptyStringArray(enriched.coreConcepts);
        expectNonEmptyStringArray(enriched.mvpFeatures);
        // Every suggestedScope list is present and non-empty.
        expect(enriched.suggestedScope).toBeDefined();
        expectNonEmptyStringArray(enriched.suggestedScope.learnerFocus);
        expectNonEmptyStringArray(enriched.suggestedScope.agentSupport);
        expectNonEmptyStringArray(enriched.suggestedScope.excluded);

        const specRes = await resolveOp(clock, () =>
          port.generateSpecDraft(
            { projectId: "project_1", selectedCandidate: target },
            envelope(),
          ),
        );
        expect(specRes.ok).toBe(true);
        if (!specRes.ok) return;
        const spec = specRes.value;

        expect(spec.status).toBe("DRAFT");
        expect(spec.runtimeConstraint).toBe("TYPESCRIPT");
        expectNonEmptyString(spec.productPurpose);
        expectNonEmptyStringArray(spec.mvpFeatures);
        expect(spec.scope.length).toBeGreaterThan(0);
        expect(spec.expectedDecisions.length).toBeGreaterThan(0);

        // Scope covers all three LearningScopeCategory groups (Req 15.4).
        const categories = new Set(spec.scope.map((s) => s.category));
        for (const category of SCOPE_CATEGORIES) {
          expect(categories.has(category)).toBe(true);
        }
        // expectedDecisions are well-formed.
        for (const decision of spec.expectedDecisions) {
          expectNonEmptyString(decision.description);
          expectNonEmptyString(decision.whyUserInputMatters);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 18: Mock feedback advances the round monotonically.
  // For any seed and any submitted feedback with a known id, the MockDiscoveryPort-produced
  // CandidateRound has a roundIndex strictly greater than the prior round's roundIndex and an
  // appliedFeedbackIds list containing that feedback id.
  // Validates: Requirements 15.5
  it("Property 18: feedback advances the round monotonically", async () => {
    const intentArb: fc.Arbitrary<DiscoveryFeedbackIntent> = fc.constantFrom(
      "PIN",
      "REJECT",
      "MERGE",
      "REVISE",
      "SHRINK",
      "EXPAND",
      "REGENERATE",
      "MORE",
      "SELECT",
    );

    await fc.assert(
      fc.asyncProperty(
        seedArb,
        fc.array(intentArb, { minLength: 1, maxLength: 8 }),
        async (seed, intents) => {
          const { port, clock } = makePort(seed);

          // Open a session so the per-session round counter is seeded to 1.
          const startRes = await resolveOp(clock, () =>
            port.startDiscovery(
              { projectId: "project_1", input: DISCOVERY_INPUT },
              envelope(),
            ),
          );
          expect(startRes.ok).toBe(true);
          if (!startRes.ok) return;
          const sessionId = startRes.value.id;

          let priorRoundIndex = 1; // startDiscovery seeds the counter to 1.
          let feedbackCounter = 0;

          for (const intent of intents) {
            feedbackCounter += 1;
            const feedbackId = `feedback_${feedbackCounter}`;
            const feedback: DiscoveryFeedback = {
              id: feedbackId,
              intent,
              targets: [{ candidateId: "cand_probe", revision: 1 }],
            };

            const res = await resolveOp(clock, () =>
              port.submitFeedback({ discoverySessionId: sessionId, feedback }, envelope()),
            );
            expect(res.ok).toBe(true);
            if (!res.ok) return;
            const round = res.value;

            // roundIndex strictly greater than the prior round.
            expect(round.roundIndex).toBeGreaterThan(priorRoundIndex);
            // appliedFeedbackIds includes the submitted feedback id.
            expect(round.appliedFeedbackIds).toContain(feedbackId);

            priorRoundIndex = round.roundIndex;
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 19: Mock output conforms to the core contract shape.
  // For any seed, every PreviewRound, ProjectCandidateRevision, CandidateRound, and
  // LearningSpecRevision produced by the mock has the required domain fields present with the
  // correct types and the contract-optional envelope fields it populates typed correctly.
  // (This package uses local shape-compatible types, not the core Zod schema; see the file doc.)
  // Validates: Requirements 2.1, 2.4, 2.5, 2.7, 2.8, 2.10, 2.11, 15.1, 15.3, 15.4
  it("Property 19: mock output conforms to the core contract shape", async () => {
    await fc.assert(
      fc.asyncProperty(seedArb, async (seed) => {
        const { port, clock } = makePort(seed);

        // --- DiscoverySession (Req 2.1 envelope fields) ---
        const startRes = await resolveOp(clock, () =>
          port.startDiscovery({ projectId: "project_1", input: DISCOVERY_INPUT }, envelope()),
        );
        expect(startRes.ok).toBe(true);
        if (!startRes.ok) return;
        const session = startRes.value;
        expectNonEmptyString(session.id);
        expect(session.projectId).toBe("project_1");
        expect(typeof session.revision).toBe("number");
        expect(session.status).toBe("ACTIVE");
        // Optional envelope fields the mock DOES populate.
        expect(typeof session.schemaVersion).toBe("number");
        expect(typeof session.createdAt).toBe("number");
        expect(typeof session.updatedAt).toBe("number");

        // --- PreviewRound / CandidatePreview (Req 2.4, 2.5) ---
        const roundRes = await resolveOp(clock, () =>
          port.generatePreviewRound({ discoverySessionId: session.id }, envelope()),
        );
        expect(roundRes.ok).toBe(true);
        if (!roundRes.ok) return;
        const previewRound = roundRes.value;
        expect(previewRound.discoverySessionId).toBe(session.id);
        expectNonEmptyString(previewRound.generationRationale);
        expect(previewRound.previews).toHaveLength(10);
        for (const p of previewRound.previews) {
          expectNonEmptyString(p.candidateId);
          expect(typeof p.position).toBe("number");
          expectNonEmptyString(p.title);
          expectNonEmptyString(p.summary);
          expectNonEmptyString(p.coreInteraction);
          expectNonEmptyString(p.appeal);
          expectNonEmptyString(p.technologyNecessity);
          expect(Array.isArray(p.generationTags)).toBe(true);
          expect(p.generationTags.length).toBeGreaterThanOrEqual(1);
        }

        // --- ProjectCandidateRevision (Req 2.7) ---
        const target: CandidateRevisionReference = {
          candidateId: previewRound.previews[0].candidateId,
          revision: 1,
        };
        const enrichRes = await resolveOp(clock, () =>
          port.enrichCandidate(
            { discoverySessionId: session.id, target },
            envelope(),
          ),
        );
        expect(enrichRes.ok).toBe(true);
        if (!enrichRes.ok) return;
        const enriched = enrichRes.value;
        expect(enriched.candidateId).toBe(target.candidateId);
        expect(typeof enriched.revision).toBe("number");
        expect(Array.isArray(enriched.parentRevisions)).toBe(true);
        expectNonEmptyString(enriched.title);
        expectNonEmptyString(enriched.summary);
        expectNonEmptyString(enriched.coreInteraction);
        expectNonEmptyString(enriched.usageMoment);
        expectNonEmptyString(enriched.appeal);
        expectNonEmptyString(enriched.technologyNecessity);
        expectNonEmptyStringArray(enriched.targetUsers);
        expectNonEmptyStringArray(enriched.coreConcepts);
        expectNonEmptyStringArray(enriched.mvpFeatures);
        expect(enriched.generationTags.length).toBeGreaterThanOrEqual(1);
        expect(typeof enriched.schemaVersion).toBe("number");
        expect(typeof enriched.createdAt).toBe("number");

        // --- CandidateRound (Req 2.8) ---
        const feedback: DiscoveryFeedback = {
          id: "feedback_1",
          intent: "MORE",
          targets: [target],
        };
        const feedbackRes = await resolveOp(clock, () =>
          port.submitFeedback({ discoverySessionId: session.id, feedback }, envelope()),
        );
        expect(feedbackRes.ok).toBe(true);
        if (!feedbackRes.ok) return;
        const candidateRound = feedbackRes.value;
        expect(typeof candidateRound.roundIndex).toBe("number");
        expect(Array.isArray(candidateRound.candidates)).toBe(true);
        expect(candidateRound.candidates.length).toBeGreaterThan(0);
        for (const c of candidateRound.candidates) {
          expectNonEmptyString(c.candidateId);
          expect(typeof c.revision).toBe("number");
        }
        expectNonEmptyString(candidateRound.generationRationale);
        expect(candidateRound.appliedFeedbackIds).toContain("feedback_1");

        // --- LearningSpecRevision (Req 2.10, 2.11) ---
        const specRes = await resolveOp(clock, () =>
          port.generateSpecDraft(
            { projectId: "project_1", selectedCandidate: target },
            envelope(),
          ),
        );
        expect(specRes.ok).toBe(true);
        if (!specRes.ok) return;
        const spec = specRes.value;
        expectNonEmptyString(spec.id);
        expect(typeof spec.revision).toBe("number");
        expect(spec.status).toBe("DRAFT");
        expect(spec.selectedCandidate.candidateId).toBe(target.candidateId);
        expectNonEmptyString(spec.productPurpose);
        expectNonEmptyStringArray(spec.targetUsers);
        expectNonEmptyString(spec.primaryUsageMoment);
        expectNonEmptyString(spec.successMoment);
        expectNonEmptyStringArray(spec.mvpFeatures);
        expect(spec.runtimeConstraint).toBe("TYPESCRIPT");
        expectNonEmptyStringArray(spec.deploymentConstraints);
        expect(spec.scope.length).toBeGreaterThan(0);
        for (const entry of spec.scope) {
          expect(SCOPE_CATEGORIES).toContain(entry.category);
          expectNonEmptyString(entry.title);
          expectNonEmptyString(entry.rationale);
          expect(Array.isArray(entry.conceptNames)).toBe(true);
        }
        expect(spec.expectedDecisions.length).toBeGreaterThan(0);
        expect(typeof spec.schemaVersion).toBe("number");
        expect(typeof spec.createdAt).toBe("number");
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
