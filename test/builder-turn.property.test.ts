import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  classifyTurn,
  phaseFromOutcome,
} from "../src/core/agent/builder-turn";
import type { LocalRun, ProjectSessionSnapshot } from "../vendor/frontend-client";
import { fakeLocalRun, fakeSnapshot } from "./support/fake-core-client";

/**
 * Property 1 — Completion requires classification (design §Correctness Property
 * 1; Requirements 1.5, 1.6).
 *
 * Statement (design §Correctness Property 1): a Builder turn is displayed as
 * `TASK_COMPLETED` if and only if `classifyBuilderTurn(run, after, taskId)`
 * returns outcome kind `TASK_COMPLETED`. In particular `run.status ===
 * 'SUCCEEDED'` ALONE never yields completion — completion requires the durable
 * After_Snapshot to carry a COMPLETED Task bound to `taskId` AND a Completion
 * Report whose `taskId` matches that Task (Requirement 1.6).
 *
 * The implementation under test is the REAL SDK `classifyBuilderTurn` wrapped by
 * `classifyTurn`, and the pure `phaseFromOutcome` mapping in
 * `src/core/agent/builder-turn.ts`. This test drives them through the
 * contract-shaped fixtures `fakeLocalRun` / `fakeSnapshot` from
 * `test/support/fake-core-client.ts` — no live backend, no process, no network.
 *
 * We generate a wide space of terminal `SUCCEEDED` BUILDER runs against
 * After_Snapshots whose durable completion conditions vary independently (task
 * status, task-id binding, presence and target of a completion report, pending
 * decisions). The oracle for "durably complete" is computed directly from the
 * generated snapshot and mirrors the SDK's documented rule, so the assertion is
 * an independent iff-check rather than a restatement of the implementation.
 */

const NUM_RUNS = 300;

/** The taskId the turn is bound to (matches the default fixture's task). */
const BOUND_TASK_ID = "task_1";

/**
 * The independently-generated durable pieces of an After_Snapshot that the
 * classifier inspects for a `SUCCEEDED` BUILDER run.
 */
interface SnapshotShape {
  /** Whether a `currentTask` is present at all. */
  readonly hasTask: boolean;
  /** The current task's id (only meaningful when {@link hasTask}). */
  readonly taskId: string;
  /** The current task's durable status. */
  readonly taskStatus: "ACTIVE" | "COMPLETED" | "BLOCKED";
  /** Whether a completion report is present. */
  readonly hasReport: boolean;
  /** The completion report's `taskId` (only meaningful when {@link hasReport}). */
  readonly reportTaskId: string;
  /** Pending-decision task ids bound to the snapshot. */
  readonly pendingDecisionTaskIds: readonly string[];
}

const snapshotShapeArb: fc.Arbitrary<SnapshotShape> = fc.record({
  hasTask: fc.boolean(),
  // Bias toward the bound id so the COMPLETED branch is exercised often, but
  // still generate mismatched ids to cover TASK_BINDING_CHANGED.
  taskId: fc.constantFrom(BOUND_TASK_ID, BOUND_TASK_ID, "task_other"),
  taskStatus: fc.constantFrom<"ACTIVE" | "COMPLETED" | "BLOCKED">(
    "ACTIVE",
    "COMPLETED",
    "BLOCKED",
  ),
  hasReport: fc.boolean(),
  reportTaskId: fc.constantFrom(BOUND_TASK_ID, BOUND_TASK_ID, "task_other"),
  pendingDecisionTaskIds: fc.array(
    fc.constantFrom(BOUND_TASK_ID, "task_other"),
    { maxLength: 3 },
  ),
});

/** Build a contract-shaped After_Snapshot from a generated {@link SnapshotShape}. */
function buildSnapshot(shape: SnapshotShape): ProjectSessionSnapshot {
  const currentTask = shape.hasTask
    ? {
        schemaVersion: 1,
        id: shape.taskId,
        projectId: "project_1",
        revision: 1,
        title: "습관 트래커 만들기",
        status: shape.taskStatus,
      }
    : null;
  const completionReport = shape.hasReport
    ? {
        schemaVersion: 1,
        id: "report_1",
        taskId: shape.reportTaskId,
      }
    : null;
  const pendingDecisions = shape.pendingDecisionTaskIds.map((taskId, i) => ({
    schemaVersion: 1,
    id: `decision_${i}`,
    taskId,
    projectId: "project_1",
  }));
  return fakeSnapshot({
    currentTask,
    completionReport,
    pendingDecisions,
  });
}

/**
 * Independent oracle: is this snapshot durably complete for the bound task?
 * Mirrors the SDK's documented rule (COMPLETED task bound to taskId AND a
 * completion report whose taskId matches that task) without reusing the
 * implementation.
 */
function isDurablyComplete(shape: SnapshotShape): boolean {
  return (
    shape.hasTask &&
    shape.taskId === BOUND_TASK_ID &&
    shape.taskStatus === "COMPLETED" &&
    shape.hasReport &&
    shape.reportTaskId === shape.taskId
  );
}

describe("Property 1: completion requires classification", () => {
  it("a SUCCEEDED run yields TASK_COMPLETED iff the After_Snapshot is durably complete", () => {
    fc.assert(
      fc.property(snapshotShapeArb, (shape) => {
        // A terminal, non-error, non-cancelled BUILDER run: SUCCEEDED alone.
        const run: LocalRun = fakeLocalRun({
          kind: "BUILDER",
          status: "SUCCEEDED",
          errorCode: null,
          projectId: "project_1",
        });
        const after = buildSnapshot(shape);

        const outcome = classifyTurn(run, after, BOUND_TASK_ID);
        const phase = phaseFromOutcome(outcome);

        const completedByClassify = outcome.kind === "TASK_COMPLETED";
        const completedByPhase = phase === "TASK_COMPLETED";

        // The display phase is TASK_COMPLETED exactly when the classifier says so.
        expect(completedByPhase).toBe(completedByClassify);

        // And the classifier says so exactly when the snapshot is durably complete.
        expect(completedByClassify).toBe(isDurablyComplete(shape));

        // Corollary (Requirement 1.5): SUCCEEDED status alone — without a
        // durably-complete snapshot — NEVER presents TASK_COMPLETED.
        if (!isDurablyComplete(shape)) {
          expect(phase).not.toBe("TASK_COMPLETED");
        }

        // When completion IS presented, it carries the report id (Requirement 1.6).
        if (outcome.kind === "TASK_COMPLETED") {
          expect(outcome.completionReportId).toBe("report_1");
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("NO SUCCEEDED-only snapshot with a non-COMPLETED task ever yields TASK_COMPLETED", () => {
    // Focused negative generator: task present, bound, but never COMPLETED.
    const nonCompletedArb: fc.Arbitrary<SnapshotShape> = fc.record({
      hasTask: fc.constant(true),
      taskId: fc.constant(BOUND_TASK_ID),
      taskStatus: fc.constantFrom<"ACTIVE" | "BLOCKED">("ACTIVE", "BLOCKED"),
      hasReport: fc.boolean(),
      reportTaskId: fc.constantFrom(BOUND_TASK_ID, "task_other"),
      pendingDecisionTaskIds: fc.array(
        fc.constantFrom(BOUND_TASK_ID, "task_other"),
        { maxLength: 3 },
      ),
    });

    fc.assert(
      fc.property(nonCompletedArb, (shape) => {
        const run: LocalRun = fakeLocalRun({
          kind: "BUILDER",
          status: "SUCCEEDED",
          errorCode: null,
          projectId: "project_1",
        });
        const after = buildSnapshot(shape);

        const phase = phaseFromOutcome(classifyTurn(run, after, BOUND_TASK_ID));

        expect(phase).not.toBe("TASK_COMPLETED");
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
