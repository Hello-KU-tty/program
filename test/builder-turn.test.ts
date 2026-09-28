/**
 * Unit tests for the pure Builder-turn reducer and classification wrappers
 * (`src/core/agent/builder-turn.ts`), covering task 4.2.
 *
 * These exercise `reduceEvent` (TEXT append, TOOL upsert by `toolId` with
 * status transitions, null `toolId` synthetic keying, `PERMISSION_DENIED`
 * flag, `STATE` no-op) and `classifyTurn` (a `SUCCEEDED` run with a
 * non-`COMPLETED` task snapshot is NOT `TASK_COMPLETED`). Classification runs
 * through the REAL SDK `classifyBuilderTurn` via the deterministic contract
 * fixtures in `test/support/fake-core-client.ts` — no live backend.
 *
 * Requirements: 1.5, 2.1, 2.2, 2.3, 2.6.
 */
import { describe, expect, it } from "vitest";
import {
  classifyTurn,
  reduceEvent,
} from "../src/core/agent/builder-turn";
import {
  type BuilderTurnViewModel,
} from "../src/core/agent/agent-view-model";
import type { RunEventView } from "../vendor/frontend-client";
import { fakeLocalRun, fakeSnapshot } from "./support/fake-core-client";

/** An empty Builder turn view model in the RUNNING phase to fold events into. */
function emptyTurn(): BuilderTurnViewModel {
  return {
    phase: "RUNNING",
    taskId: "task_1",
    taskTitle: "습관 트래커 만들기",
    transcript: [],
    toolRows: [],
    completionReportId: null,
    errorCode: null,
    permissionDenied: false,
  };
}

/** Build a TOOL view with sensible defaults; override any field. */
function toolView(overrides: Partial<Extract<RunEventView, { kind: "TOOL" }>> = {}): RunEventView {
  return {
    kind: "TOOL",
    sequence: 1,
    toolId: "tool_a",
    tool: "write",
    status: "RUNNING",
    relativePath: "src/app.ts",
    command: null,
    exitCode: null,
    coreAction: null,
    errorCode: null,
    output: null,
    truncated: false,
    ...overrides,
  } as RunEventView;
}

describe("reduceEvent — TEXT", () => {
  it("appends a transcript line keyed by sequence and preserves order", () => {
    const first = reduceEvent(emptyTurn(), {
      kind: "TEXT",
      sequence: 3,
      text: "hello",
    });
    const second = reduceEvent(first, {
      kind: "TEXT",
      sequence: 4,
      text: "world",
    });

    expect(second.transcript).toEqual([
      { sequence: 3, text: "hello" },
      { sequence: 4, text: "world" },
    ]);
  });

  it("does not mutate the input view model (pure)", () => {
    const vm = emptyTurn();
    reduceEvent(vm, { kind: "TEXT", sequence: 1, text: "x" });
    expect(vm.transcript).toEqual([]);
  });
});

describe("reduceEvent — TOOL", () => {
  it("appends a row on first sighting of a toolId", () => {
    const vm = reduceEvent(emptyTurn(), toolView({ toolId: "tool_a", status: "RUNNING" }));

    expect(vm.toolRows).toHaveLength(1);
    expect(vm.toolRows[0]).toMatchObject({
      key: "tool_a",
      tool: "write",
      status: "RUNNING",
      relativePath: "src/app.ts",
    });
  });

  it("upserts by toolId: a repeated toolId transitions status in place (no duplicate row)", () => {
    const running = reduceEvent(emptyTurn(), toolView({ toolId: "tool_a", status: "RUNNING" }));
    const succeeded = reduceEvent(
      running,
      toolView({ toolId: "tool_a", sequence: 2, status: "SUCCEEDED" }),
    );

    expect(succeeded.toolRows).toHaveLength(1);
    expect(succeeded.toolRows[0].key).toBe("tool_a");
    expect(succeeded.toolRows[0].status).toBe("SUCCEEDED");
  });

  it("transitions RUNNING → FAILED in place for the same toolId", () => {
    const running = reduceEvent(emptyTurn(), toolView({ toolId: "tool_a", status: "RUNNING" }));
    const failed = reduceEvent(
      running,
      toolView({ toolId: "tool_a", sequence: 2, status: "FAILED" }),
    );

    expect(failed.toolRows).toHaveLength(1);
    expect(failed.toolRows[0].status).toBe("FAILED");
  });

  it("appends a separate row per distinct toolId", () => {
    const a = reduceEvent(emptyTurn(), toolView({ toolId: "tool_a", sequence: 1 }));
    const ab = reduceEvent(a, toolView({ toolId: "tool_b", sequence: 2 }));

    expect(ab.toolRows).toHaveLength(2);
    expect(ab.toolRows.map((r) => r.key)).toEqual(["tool_a", "tool_b"]);
  });

  it("uses the synthetic key `seq:<n>` when toolId is null", () => {
    const vm = reduceEvent(emptyTurn(), toolView({ toolId: null, sequence: 7 }));

    expect(vm.toolRows).toHaveLength(1);
    expect(vm.toolRows[0].key).toBe("seq:7");
  });

  it("treats distinct null-toolId events at different sequences as distinct rows", () => {
    const a = reduceEvent(emptyTurn(), toolView({ toolId: null, sequence: 7 }));
    const ab = reduceEvent(a, toolView({ toolId: null, sequence: 8 }));

    expect(ab.toolRows).toHaveLength(2);
    expect(ab.toolRows.map((r) => r.key)).toEqual(["seq:7", "seq:8"]);
  });

  it("upserts a null-toolId row keyed by the same synthetic key (same sequence)", () => {
    const running = reduceEvent(emptyTurn(), toolView({ toolId: null, sequence: 7, status: "RUNNING" }));
    const done = reduceEvent(
      running,
      toolView({ toolId: null, sequence: 7, status: "SUCCEEDED" }),
    );

    expect(done.toolRows).toHaveLength(1);
    expect(done.toolRows[0].key).toBe("seq:7");
    expect(done.toolRows[0].status).toBe("SUCCEEDED");
  });
});

describe("reduceEvent — PERMISSION_DENIED", () => {
  it("sets the permissionDenied flag", () => {
    const vm = reduceEvent(emptyTurn(), { kind: "PERMISSION_DENIED", sequence: 5 });
    expect(vm.permissionDenied).toBe(true);
  });
});

describe("reduceEvent — STATE", () => {
  it("is a no-op on the view model (no transcript, no tool rows)", () => {
    const before = emptyTurn();
    const after = reduceEvent(before, { kind: "STATE", sequence: 2, run: null });

    expect(after.transcript).toEqual([]);
    expect(after.toolRows).toEqual([]);
    expect(after.permissionDenied).toBe(false);
  });
});

describe("classifyTurn", () => {
  it("a SUCCEEDED run with a non-COMPLETED (ACTIVE) task snapshot is NOT TASK_COMPLETED", () => {
    const run = fakeLocalRun({ status: "SUCCEEDED" });
    // Default fixture: currentTask is ACTIVE and completionReport is null.
    const after = fakeSnapshot();

    const outcome = classifyTurn(run, after, "task_1");

    expect(outcome.kind).not.toBe("TASK_COMPLETED");
    expect(outcome.kind).toBe("TURN_ENDED_TASK_ACTIVE");
  });

  it("a SUCCEEDED run WITH a COMPLETED task + matching completion report IS TASK_COMPLETED", () => {
    const run = fakeLocalRun({ status: "SUCCEEDED" });
    const after = fakeSnapshot({
      currentTask: {
        schemaVersion: 1,
        id: "task_1",
        projectId: "project_1",
        revision: 1,
        title: "습관 트래커 만들기",
        status: "COMPLETED",
      },
      completionReport: {
        schemaVersion: 1,
        id: "report_1",
        taskId: "task_1",
      },
    });

    const outcome = classifyTurn(run, after, "task_1");

    expect(outcome.kind).toBe("TASK_COMPLETED");
    if (outcome.kind === "TASK_COMPLETED") {
      expect(outcome.completionReportId).toBe("report_1");
    }
  });
});

describe("reduceEvent — TOOL errorCode (B9)", () => {
  it("carries the safe per-tool code into the row", () => {
    const vm = reduceEvent(emptyTurn(), toolView({ tool: "read", status: "FAILED", errorCode: "NATIVE_FILE_NOT_FOUND" }));
    expect(vm.toolRows[0]).toMatchObject({ status: "FAILED", errorCode: "NATIVE_FILE_NOT_FOUND" });
  });
});
