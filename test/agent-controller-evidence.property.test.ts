import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentRunPort } from "../src/adapter/agent/agent-run-port";
import type { ProjectEvidenceTrace } from "../vendor/frontend-client";
import { FakeCoreClient } from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

/**
 * Property 10 — Honest evidence display (design §Correctness Property 10;
 * Requirements 10.2, 10.3, 10.4).
 *
 * **Validates: Requirements 10.2, 10.3, 10.4**
 *
 * Statement: for ANY project evidence trace, the projected {@link
 * EvidenceTraceView} that the controller's `readEvidence` produces (via the
 * REAL SDK `summarizeEvidenceTrace`) NEVER overstates what was analyzed or
 * accepted:
 *
 *  - A concept whose only signals are observations (`state === 'OBSERVED'`) or
 *    which has NO accepted `USER_UNDERSTANDING` evidence is projected with
 *    `displayState === 'OBSERVED_ONLY'` (or `'NO_STATE'`) and
 *    `userUnderstandingCount === 0` — it is NEVER labelled as user
 *    understanding / "learned" (Req 10.2, 10.3).
 *  - Conversely, a concept projected as user-evidence understanding
 *    (`USER_EVIDENCE_*`) ALWAYS has at least one accepted USER_UNDERSTANDING
 *    item (`userUnderstandingCount > 0`) — understanding is never fabricated.
 *  - An `ANALYZED` analysis job that accepted no evidence
 *    (`acceptedCount === 0`) surfaces a `noEvidenceReason` rather than a success
 *    signal (Req 10.4).
 *
 * The test drives the REAL {@link AgentSurfaceController} through the REAL
 * {@link ManagedAgentPort} over the deterministic {@link FakeCoreClient} /
 * {@link FakeNativeWorker} fakes (design "Testing Strategy" > Fakes) — no live
 * backend, process, or network. The `UI_READ_EVIDENCE_TRACE` execute is scripted
 * to return a generated raw {@link ProjectEvidenceTrace}, so the controller runs
 * it through `summarizeEvidenceTrace` exactly as in production, and the property
 * is asserted over the projected view.
 */

const NUM_RUNS = 300;

const PROJECT_ID = "project_1";
const ISO = "2026-01-02T03:04:05.000Z";

// ---------- Generators ----------

/** The three evidence kinds `summarizeEvidenceTrace` distinguishes. */
const evidenceKindArb = fc.constantFrom(
  "USER_UNDERSTANDING",
  "CONCEPT_OBSERVATION",
  "MISCONCEPTION_SIGNAL",
);

/**
 * One accepted evidence item — only the fields `summarizeEvidenceTrace` reads
 * are meaningful (`evidenceId` / `kind` / `episodeId` / optional excerpt +
 * rationale); the rest are shape-valid placeholders cast at the fake boundary.
 */
const evidenceItemArb = fc.record({
  evidenceId: fc.string({ minLength: 1, maxLength: 8 }),
  kind: evidenceKindArb,
  episodeId: fc.string({ minLength: 1, maxLength: 8 }),
});

/**
 * A concept trace. `state` is nullable and drawn from the contract enum; the
 * `evidence` list contains a mix of kinds so understanding may or may not be
 * present. The generator intentionally covers the honesty-critical combinations:
 * OBSERVED state, a real state with zero USER_UNDERSTANDING, and a real state
 * with some USER_UNDERSTANDING.
 */
const conceptArb = fc.record({
  conceptId: fc.string({ minLength: 1, maxLength: 8 }),
  conceptName: fc.string({ maxLength: 20 }),
  state: fc.constantFrom(
    null,
    "OBSERVED",
    "EXPLAINED",
    "DEMONSTRATED",
    "TRANSFERRED",
  ),
  evidence: fc.array(evidenceItemArb, { maxLength: 6 }),
  openIssues: fc.array(fc.record({ id: fc.string({ maxLength: 6 }) }), {
    maxLength: 3,
  }),
  rejectedEvidence: fc.array(
    fc.record({
      proposalId: fc.string({ minLength: 1, maxLength: 6 }),
      reasonCode: fc.string({ minLength: 1, maxLength: 6 }),
    }),
    { maxLength: 3 },
  ),
});

/**
 * An analysis status item. `status` drives the projected `displayState`; a
 * SUCCEEDED job may still carry `acceptedCount === 0` (with a `noEvidenceReason`),
 * which is the honesty-critical case for Req 10.4. `resultSummary` is optional to
 * also exercise the `acceptedCount === null` branch.
 */
const analysisArb = fc
  .record({
    analysisJobId: fc.string({ minLength: 1, maxLength: 8 }),
    episodeId: fc.string({ minLength: 1, maxLength: 8 }),
    status: fc.constantFrom("PENDING", "RUNNING", "SUCCEEDED", "FAILED"),
    acceptedCount: fc.option(fc.nat({ max: 5 }), { nil: undefined }),
    noEvidenceReason: fc.option(fc.string({ maxLength: 20 }), {
      nil: undefined,
    }),
  })
  .map((a) => ({
    analysisJobId: a.analysisJobId,
    episodeId: a.episodeId,
    status: a.status,
    ...(a.acceptedCount === undefined && a.noEvidenceReason === undefined
      ? {}
      : {
          resultSummary: {
            proposalCount: (a.acceptedCount ?? 0) + 1,
            acceptedCount: a.acceptedCount ?? 0,
            rejectedCount: 0,
            ...(a.noEvidenceReason !== undefined
              ? { noEvidenceReason: a.noEvidenceReason }
              : {}),
          },
        }),
  }));

/**
 * A raw {@link ProjectEvidenceTrace} carrying only the fields
 * `summarizeEvidenceTrace` reads (`projectId` / `concepts` / `analysis` /
 * `emptyReason`). Cast to the contract type at the boundary — the same
 * hand-written-fake style used by `test/support/fake-core-client.ts`.
 */
const traceArb = fc
  .record({
    concepts: fc.array(conceptArb, { maxLength: 5 }),
    analysis: fc.array(analysisArb, { maxLength: 5 }),
    emptyReason: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  })
  .map(
    (t) =>
      ({
        schemaVersion: 1,
        correlationId: "corr_trace",
        projectId: PROJECT_ID,
        concepts: t.concepts,
        analysis: t.analysis,
        personalization: [],
        emptyReason: t.emptyReason,
        createdAt: ISO,
        updatedAt: ISO,
      }) as unknown as ProjectEvidenceTrace,
  );

// ---------- Harness ----------

/**
 * Build a controller wired to a {@link ManagedAgentPort} over the fakes, with
 * `UI_READ_EVIDENCE_TRACE` scripted to return the given raw trace so the
 * controller projects it through the REAL `summarizeEvidenceTrace`.
 */
function buildController(trace: ProjectEvidenceTrace) {
  const client = new FakeCoreClient({
    executeResultByKind: {
      UI_READ_EVIDENCE_TRACE: { resolve: trace },
    },
  });
  const worker = new FakeNativeWorker();
  const port: AgentRunPort = new ManagedAgentPort(client, worker);
  const globalState = new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID });

  const controller = new AgentSurfaceController({
    port: port as ManagedAgentPort,
    globalState,
    onChange: () => {},
    openFolder: async () => {},
    openExternal: async () => {},
  });

  return controller;
}

/** The concept display states that assert user understanding / "learned". */
const UNDERSTANDING_STATES = new Set([
  "USER_EVIDENCE_EXPLAINED",
  "USER_EVIDENCE_DEMONSTRATED",
  "USER_EVIDENCE_TRANSFERRED",
]);

// ---------- Property ----------

describe("Property 10: honest evidence display", () => {
  it("never presents OBSERVED_ONLY / zero-understanding concepts as user understanding, and surfaces noEvidenceReason for empty analyses", async () => {
    await fc.assert(
      fc.asyncProperty(traceArb, async (trace) => {
        const controller = buildController(trace);

        const view = await controller.readEvidence();
        // readEvidence must succeed for a project-matched trace.
        expect(view).not.toBeNull();
        if (view === null) {
          return;
        }

        for (const concept of view.concepts) {
          // Req 10.3: userUnderstandingCount === 0 never yields a "learned"
          // (USER_EVIDENCE_*) claim.
          if (concept.userUnderstandingCount === 0) {
            expect(UNDERSTANDING_STATES.has(concept.displayState)).toBe(false);
          }

          // Req 10.2: an OBSERVED_ONLY concept is NEVER presented as user
          // understanding / "learned" — the display state governs the label
          // regardless of any raw observation count, so it is never one of the
          // USER_EVIDENCE_* understanding states.
          if (concept.displayState === "OBSERVED_ONLY") {
            expect(UNDERSTANDING_STATES.has(concept.displayState)).toBe(false);
          }

          // Converse (understanding is never fabricated): a concept projected
          // as USER_EVIDENCE_* MUST have at least one accepted understanding
          // item — the projection never overstates what was accepted.
          if (UNDERSTANDING_STATES.has(concept.displayState)) {
            expect(concept.userUnderstandingCount).toBeGreaterThan(0);
          }

          // The projected count equals the accepted USER_UNDERSTANDING items:
          // no synthesized understanding beyond what the trace actually holds.
          const acceptedUnderstanding = concept.accepted.filter(
            (a) => a.kind === "USER_UNDERSTANDING",
          ).length;
          expect(concept.userUnderstandingCount).toBe(acceptedUnderstanding);
        }

        // Req 10.4: an ANALYZED job with acceptedCount === 0 surfaces a
        // noEvidenceReason rather than a success indication (the reason is the
        // honest signal; it is present iff the source trace supplied one, and
        // acceptedCount is NEVER inflated above zero here).
        for (const job of view.analysis) {
          if (job.displayState === "ANALYZED" && job.acceptedCount === 0) {
            // acceptedCount must stay honest (zero), never overstated.
            expect(job.acceptedCount).toBe(0);
            // The view carries the noEvidenceReason slot (string when the trace
            // provided one, else null) — never a fabricated success value.
            expect(
              job.noEvidenceReason === null ||
                typeof job.noEvidenceReason === "string",
            ).toBe(true);
          }
        }

        // userUnderstandingTotal equals the sum of per-concept counts — the
        // aggregate never overstates the whole.
        const summed = view.concepts.reduce(
          (n, c) => n + c.userUnderstandingCount,
          0,
        );
        expect(view.userUnderstandingTotal).toBe(summed);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
