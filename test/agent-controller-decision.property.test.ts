import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentRunPort } from "../src/adapter/agent/agent-run-port";
import type {
  LocalRunInput,
  ProjectSessionSnapshot,
} from "../vendor/frontend-client";
import {
  FakeCoreClient,
  fakeLocalRun,
  fakeSnapshot,
} from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

/**
 * Property 2 — Decision resolution never resumes Builder (design §Correctness
 * Property 2; Requirements 4.2, 5.3).
 *
 * Statement: for EVERY `resolveDecision(...)` call — with ANY arbitrary
 * selection (OPTION / RECOMMENDATION / CUSTOM), rationale, and `helperUsed`
 * flag — the number of Builder `startRun` invocations attributable to it is
 * exactly ZERO. Resolving a Decision performs (at most) a single
 * `UI_RESOLVE_DECISION` `execute` and NEVER starts a Builder run. Builder
 * resumes ONLY via the explicit `resumeAfterDecision` path.
 *
 * The test drives the REAL {@link AgentSurfaceController} through the REAL
 * {@link ManagedAgentPort} over the deterministic {@link FakeCoreClient} /
 * {@link FakeNativeWorker} fakes (design "Testing Strategy" > Fakes) — no live
 * backend, process, or network. A spy wraps the port's `startBuilder` and the
 * fake client records every `startRun` input, so both the port-level and the
 * transport-level (kind === "BUILDER") Builder-start counts are asserted to be
 * zero across all iterations.
 */

const NUM_RUNS = 200;

const PROJECT_ID = "project_1";
const TASK_ID = "task_1";
const DECISION_ID = "decision_1";
const OPTION_A = "option_a";
const OPTION_B = "option_b";

/**
 * A snapshot with one pending Decision and a matching `liveContext`, so a valid
 * (OPTION / RECOMMENDATION) selection can pass `createDecisionResolutionRequest`
 * and reach the `UI_RESOLVE_DECISION` execute path. The fields set here are the
 * ones the SDK request builder actually reads (`pendingDecisions[].id`,
 * `.taskId`, `.options[].id`, `.recommendedOptionId`, and `liveContext.taskId`).
 */
function snapshotWithPendingDecision(): ProjectSessionSnapshot {
  return fakeSnapshot({
    liveContext: {
      schemaVersion: 1,
      id: "live_context_1",
      projectId: PROJECT_ID,
      taskId: TASK_ID,
      correlationId: "corr_ctx",
      contextVersion: 1,
      expectedPreviousVersion: 0,
      checkpoint: "DECISION_REQUIRED",
      stage: "deciding",
      currentGoal: "결정 필요",
      recentChanges: [],
      activeDecisionIds: [DECISION_ID],
      activeConceptNames: [],
      relatedFiles: [],
      nextActions: [],
      updatedAt: "2026-01-02T03:04:05.000Z",
      source: { kind: "AGENT", role: "BUILDER" },
      redactionStatus: "NOT_REQUIRED",
    },
    pendingDecisions: [
      {
        schemaVersion: 1,
        id: DECISION_ID,
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        correlationId: "corr_dec",
        contextVersion: 1,
        category: "PRODUCT_BEHAVIOR",
        question: "어떤 방식으로 진행할까요?",
        reasonRequiredNow: "필요",
        options: [
          {
            id: OPTION_A,
            label: "옵션 A",
            description: "설명 A",
            impacts: [],
            tradeoffs: [],
          },
          {
            id: OPTION_B,
            label: "옵션 B",
            description: "설명 B",
            impacts: [],
            tradeoffs: [],
          },
        ],
        recommendedOptionId: OPTION_A,
        recommendationRationale: "추천 이유",
        relatedConceptNames: [],
        sourceReferences: [],
        independentWorkCanContinue: false,
        requestedAt: "2026-01-02T03:04:05.000Z",
        source: { kind: "AGENT", role: "BUILDER" },
        redactionStatus: "NOT_REQUIRED",
      },
    ],
  });
}

/**
 * Build a controller whose port is a {@link ManagedAgentPort} with a
 * `startBuilder` spy. `startBuilderCount()` counts port-level Builder starts;
 * `client.startRunInputs` records every transport-level `startRun` so
 * kind === "BUILDER" invocations can be asserted independently.
 */
function buildHarness() {
  const client = new FakeCoreClient({
    restoreProjectResult: { resolve: snapshotWithPendingDecision() },
  });
  const worker = new FakeNativeWorker();
  const port: AgentRunPort = new ManagedAgentPort(client, worker);

  // Spy: count every port-level Builder start (design task 5.10 requirement).
  let startBuilderCount = 0;
  const originalStartBuilder = port.startBuilder.bind(port);
  port.startBuilder = (input) => {
    startBuilderCount += 1;
    return originalStartBuilder(input);
  };

  const globalState = new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID });
  const controller = new AgentSurfaceController({
    port: port as ManagedAgentPort,
    globalState,
    onChange: () => {},
    openFolder: async () => {},
    openExternal: async () => {},
  });

  /** Number of transport-level BUILDER `startRun` calls. */
  const builderStartRunCount = (): number =>
    client.startRunInputs.filter((r: LocalRunInput) => r.kind === "BUILDER")
      .length;

  return {
    controller,
    client,
    startBuilderCount: () => startBuilderCount,
    builderStartRunCount,
  };
}

// ---------- Generators ----------

/** An arbitrary decision selection (all three SDK shapes). */
const selectionArb = fc.oneof(
  fc.constantFrom(OPTION_A, OPTION_B, "missing_option").map((optionId) => ({
    kind: "OPTION" as const,
    optionId,
  })),
  fc.constant({ kind: "RECOMMENDATION" as const }),
  fc
    .string()
    .map((customProposal) => ({ kind: "CUSTOM" as const, customProposal })),
);

/** An arbitrary resolveDecision input (any selection / rationale / helperUsed). */
const resolveInputArb = fc.record({
  decisionId: fc.constantFrom(DECISION_ID, "unknown_decision"),
  selection: selectionArb,
  rationale: fc.option(fc.string(), { nil: undefined }),
  helperUsed: fc.boolean(),
});

// ---------- Property ----------

describe("Property 2: decision resolution never resumes Builder", () => {
  it("resolveDecision never triggers a Builder start for ANY selection / rationale", async () => {
    await fc.assert(
      fc.asyncProperty(resolveInputArb, async (input) => {
        const { controller, startBuilderCount, builderStartRunCount } =
          buildHarness();

        await controller.resolveDecision(input);

        // Core invariant (Property 2 / Requirement 5.3): resolving a Decision
        // NEVER starts a Builder run — neither at the port level nor at the
        // transport level (kind === "BUILDER").
        expect(startBuilderCount()).toBe(0);
        expect(builderStartRunCount()).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("a valid resolveDecision performs the UI_RESOLVE_DECISION execute but starts no Builder", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ kind: "OPTION" as const, optionId: OPTION_A }),
          fc.constant({ kind: "OPTION" as const, optionId: OPTION_B }),
          fc.constant({ kind: "RECOMMENDATION" as const }),
        ),
        fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
        fc.boolean(),
        async (selection, rationale, helperUsed) => {
          const { controller, client, startBuilderCount, builderStartRunCount } =
            buildHarness();

          await controller.resolveDecision({
            decisionId: DECISION_ID,
            selection,
            rationale,
            helperUsed,
          });

          // The resolution reaches Core exactly once via UI_RESOLVE_DECISION...
          expect(client.executeKinds).toContain("UI_RESOLVE_DECISION");
          // ...and still starts zero Builder runs (no auto-resume).
          expect(startBuilderCount()).toBe(0);
          expect(builderStartRunCount()).toBe(0);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("only the explicit resumeAfterDecision path starts a Builder run", async () => {
    const { controller, client, startBuilderCount, builderStartRunCount } =
      buildHarness();

    // Resolve first — must not start Builder.
    await controller.resolveDecision({
      decisionId: DECISION_ID,
      selection: { kind: "OPTION", optionId: OPTION_A },
      helperUsed: false,
    });
    expect(startBuilderCount()).toBe(0);
    expect(builderStartRunCount()).toBe(0);

    // The explicit resume IS the only path that starts a Builder run. Drive its
    // supervise loop to a clean terminal so the promise settles deterministically.
    const resume = controller.resumeAfterDecision();
    // resumeAfterDecision → startBuilder awaits prepareBuilder + startBuilder
    // before opening the watch, so yield microtasks until the watch is in-flight,
    // then settle it terminal so `resume` resolves.
    for (let i = 0; i < 20 && !client.isWatching; i += 1) {
      await Promise.resolve();
    }
    expect(client.isWatching).toBe(true);
    client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "PENDING" }));
    await resume;

    expect(startBuilderCount()).toBe(1);
    expect(builderStartRunCount()).toBe(1);
  });
});
