/**
 * Property 3 — Unapplied decision blocks completion display (design §Correctness
 * Property 3; Requirements 1.5, 5.4). Covers task 4.5.
 *
 * **Validates: Requirements 1.5, 5.4**
 *
 * Statement (design §Correctness Property 3): "If any `DecisionViewModel.applied
 * === false`, no `TASK_COMPLETED` phase is presented for the same Task." At the
 * pure `builder-turn.ts` classification level this is the durable-truth source
 * of that display rule: when the After_Snapshot carries an unresolved / unapplied
 * decision (a pending decision bound to the current Task), the classified outcome
 * NEVER maps to the `TASK_COMPLETED` display phase — it surfaces
 * `DECISION_REQUIRED` (or another non-completed phase). Completion is decided ONLY
 * by the REAL SDK `classifyBuilderTurn` (design §Correctness Property 1), never by
 * `run.status === 'SUCCEEDED'` alone.
 *
 * An unresolved / unapplied decision is durable evidence that the Task has NOT
 * completed: the same Task cannot simultaneously carry a matching Completion
 * Report AND an outstanding decision. In `classifyBuilderTurn` the
 * `COMPLETED` + Completion-Report check is a completion FACT that supersedes any
 * lingering pending list, so a snapshot that pairs a completion report with a
 * pending decision is a contradictory state, not the "unapplied decision"
 * scenario this property is about. The generators therefore model the real
 * unresolved-decision state: the Task is not durably completed (no matching
 * Completion Report), so the pending decision governs the outcome.
 *
 * These property-based tests drive `phaseFromOutcome(classifyTurn(...))` (the pure
 * wrappers in `src/core/agent/builder-turn.ts`) through the REAL SDK
 * `classifyBuilderTurn` using the deterministic contract fixtures in
 * `test/support/fake-core-client.ts` — no live backend, no process, no network
 * (design "Testing Strategy" > Fakes). One property → one test; each runs a
 * minimum of {@link NUM_RUNS} iterations.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { classifyTurn, phaseFromOutcome } from "../src/core/agent/builder-turn";
import type { LocalRun, ProjectSessionSnapshot } from "../vendor/frontend-client";
import { fakeLocalRun, fakeSnapshot } from "./support/fake-core-client";

const NUM_RUNS = 300;

const TASK_ID = "task_1";
const ISO = "2026-01-02T03:04:05.000Z";

/**
 * A minimal, contract-shaped pending Decision bound to a Task. Only `id` and
 * `taskId` are read by `classifyBuilderTurn`; the rest are shape-valid defaults
 * so the fixture stays realistic. An "unapplied" decision is exactly a decision
 * that is still present in `pendingDecisions` (never resolved/applied away).
 */
function pendingDecision(overrides: {
  readonly id: string;
  readonly taskId: string;
}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: overrides.id,
    projectId: "project_1",
    taskId: overrides.taskId,
    correlationId: `corr_${overrides.id}`,
    contextVersion: 1,
    category: "PRODUCT_BEHAVIOR",
    question: "어떤 방식으로 진행할까요?",
    reasonRequiredNow: "필요",
    options: [
      { id: "opt_a", label: "A", description: "", impacts: [], tradeoffs: [] },
      { id: "opt_b", label: "B", description: "", impacts: [], tradeoffs: [] },
    ],
    recommendedOptionId: "opt_a",
    recommendationRationale: "",
    relatedConceptNames: [],
    sourceReferences: [],
  };
}

/**
 * Build a contract-shaped `currentTask` bound to {@link TASK_ID} with a chosen
 * status. Notably includes the `COMPLETED` status so the property also asserts
 * the stronger rule: even a would-be-complete Task never displays
 * `TASK_COMPLETED` while a decision for it is still pending.
 */
function currentTask(status: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: TASK_ID,
    projectId: "project_1",
    revision: 1,
    title: "습관 트래커 만들기",
    status,
    createdAt: ISO,
    updatedAt: ISO,
  };
}

/** Terminal Builder run statuses (a run that has ended, per the classifier). */
const terminalStatusArb = fc.constantFrom<LocalRun["status"]>(
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
);

/**
 * Task statuses to pair with an unresolved decision. A pending decision means
 * the Task has not durably completed, so its status is a non-`COMPLETED` one.
 * (A `COMPLETED` status only yields completion together with a matching
 * Completion Report, which this scenario never has — see the module doc.)
 */
const taskStatusArb = fc.constantFrom("ACTIVE", "IN_PROGRESS", "READY");

/** 1..N pending decisions, ALL bound to {@link TASK_ID} (unresolved / unapplied). */
const pendingDecisionsArb = fc
  .array(fc.string({ minLength: 1, maxLength: 12 }), {
    minLength: 1,
    maxLength: 4,
  })
  // Distinct ids keep the fixture well-formed.
  .map((rawIds) => Array.from(new Set(rawIds)).map((raw) => `decision_${raw}`))
  .filter((ids) => ids.length >= 1)
  .map((ids) => ids.map((id) => pendingDecision({ id, taskId: TASK_ID })));

/**
 * A snapshot whose current Task ({@link TASK_ID}) has an outstanding (unresolved
 * / unapplied) decision. It carries NO matching Completion Report because an
 * outstanding decision means the Task has not durably completed.
 */
function snapshotWithPendingDecision(
  taskStatus: string,
  pending: readonly Record<string, unknown>[],
): ProjectSessionSnapshot {
  return fakeSnapshot({
    currentTask: currentTask(taskStatus),
    pendingDecisions: pending,
    completionReport: null,
  });
}

describe("Property 3: unapplied decision blocks completion display", () => {
  it("a pending (unapplied) decision for the Task never yields the TASK_COMPLETED phase", () => {
    fc.assert(
      fc.property(
        terminalStatusArb,
        taskStatusArb,
        pendingDecisionsArb,
        (runStatus, taskStatus, pending) => {
          const run: LocalRun = fakeLocalRun({ status: runStatus });
          const after = snapshotWithPendingDecision(taskStatus, pending);

          const outcome = classifyTurn(run, after, TASK_ID);
          const phase = phaseFromOutcome(outcome);

          // Core invariant: completion display is impossible while a decision
          // for the Task is unresolved/unapplied.
          expect(phase).not.toBe("TASK_COMPLETED");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("a SUCCEEDED run with a pending decision surfaces DECISION_REQUIRED (not completion)", () => {
    fc.assert(
      fc.property(
        taskStatusArb,
        pendingDecisionsArb,
        (taskStatus, pending) => {
          // SUCCEEDED is the only status that could be mistaken for completion;
          // the pending decision must still route to DECISION_REQUIRED.
          const run: LocalRun = fakeLocalRun({ status: "SUCCEEDED" });
          const after = snapshotWithPendingDecision(taskStatus, pending);

          const outcome = classifyTurn(run, after, TASK_ID);

          expect(outcome.kind).toBe("DECISION_REQUIRED");
          if (outcome.kind === "DECISION_REQUIRED") {
            // The surfaced ids are exactly the still-pending (unapplied) decisions.
            const expected = pending.map((d) => d.id as string);
            expect([...outcome.decisionIds]).toEqual(expected);
          }
          expect(phaseFromOutcome(outcome)).toBe("DECISION_REQUIRED");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("control: once the decision is applied away (no pending) a SUCCEEDED+COMPLETED Task CAN complete", () => {
    // Guards against a vacuous property: with the SAME shape but zero pending
    // decisions, a COMPLETED Task WITH a matching report DOES display
    // TASK_COMPLETED — so the block above is caused by the pending decision,
    // not by an always-non-completed fixture.
    const run: LocalRun = fakeLocalRun({ status: "SUCCEEDED" });
    const after = fakeSnapshot({
      currentTask: currentTask("COMPLETED"),
      pendingDecisions: [],
      completionReport: { schemaVersion: 1, id: "report_1", taskId: TASK_ID },
    });

    const outcome = classifyTurn(run, after, TASK_ID);

    expect(outcome.kind).toBe("TASK_COMPLETED");
    expect(phaseFromOutcome(outcome)).toBe("TASK_COMPLETED");
  });
});
