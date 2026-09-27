import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property 8 — Tool-row keying is stable (design §Correctness Property 8;
 * Requirements 2.2, 2.3, 2.4).
 *
 * Statement: folding an arbitrary sequence of `TOOL` {@link RunEventView}s
 * through the pure {@link reduceEvent} yields exactly one row per distinct key,
 * where the key is `toolId` when present and the synthetic `seq:<sequence>`
 * when `toolId` is null. Concretely, for ALL sequences:
 *
 *  - Row count equals the number of DISTINCT keys (2.2): a repeated key upserts
 *    in place and never creates a duplicate row (2.3); distinct keys each get
 *    their own row (2.4).
 *  - The final status / fields of each row reflect the LAST event carrying that
 *    key (2.3 in-place status transition RUNNING → SUCCEEDED/FAILED/UNKNOWN).
 *  - Row ORDER is stable: rows appear in first-seen key order, and an upsert
 *    never moves a row.
 *  - `reduceEvent` is pure: the input view model is never mutated.
 *
 * These properties drive the REAL reducer (`src/core/agent/builder-turn.ts`)
 * with no backend, process, or network. Determinism is total — the fold is a
 * pure function of the generated event list; no timers or randomness beyond
 * fast-check's own seeded generation. One property → one test; each runs a
 * minimum of {@link NUM_RUNS} iterations.
 */

import { reduceEvent } from "../src/core/agent/builder-turn";
import type { BuilderTurnViewModel } from "../src/core/agent/agent-view-model";
import type { RunEventView } from "../vendor/frontend-client";

const NUM_RUNS = 300;

// ---------- Fixtures & helpers ----------

/** An empty Builder turn view model in RUNNING phase to fold events into. */
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

type ToolEvent = Extract<RunEventView, { kind: "TOOL" }>;

/** The key `reduceEvent` derives for a TOOL event (mirror of the reducer's rule). */
function keyOf(event: ToolEvent): string {
  return event.toolId ?? `seq:${event.sequence}`;
}

/** Fold an ordered list of TOOL events into a fresh empty turn. */
function fold(events: readonly ToolEvent[]): BuilderTurnViewModel {
  return events.reduce<BuilderTurnViewModel>(
    (vm, event) => reduceEvent(vm, event),
    emptyTurn(),
  );
}

// ---------- Generators ----------

const statusArb = fc.constantFrom<ToolEvent["status"]>(
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "UNKNOWN",
);

const toolNameArb = fc.constantFrom<string | null>(
  "read",
  "search",
  "write",
  "shell",
  "core",
  null,
);

/**
 * An arbitrary TOOL event. `toolId` is drawn from a SMALL alphabet (or null) so
 * that collisions and distinct keys both occur frequently across a sequence;
 * `sequence` is bounded so that null-`toolId` events can also collide on the
 * synthetic `seq:<n>` key. Every other field is shape-valid and independently
 * varied so an upsert can be observed to carry the last event's data.
 */
const toolEventArb: fc.Arbitrary<ToolEvent> = fc.record({
  kind: fc.constant<"TOOL">("TOOL"),
  sequence: fc.integer({ min: 0, max: 6 }),
  toolId: fc.option(fc.constantFrom("tool_a", "tool_b", "tool_c"), {
    nil: null,
  }),
  tool: toolNameArb,
  status: statusArb,
  relativePath: fc.option(
    fc.constantFrom("src/app.ts", "src/main.ts", "test/x.test.ts"),
    { nil: null },
  ),
  command: fc.option(fc.string({ maxLength: 12 }), { nil: null }),
  exitCode: fc.option(fc.integer({ min: 0, max: 255 }), { nil: null }),
  coreAction: fc.option(fc.constantFrom("PLAN", "APPLY"), { nil: null }),
  errorCode: fc.option(fc.constantFrom("E1", "E2"), { nil: null }),
  output: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  truncated: fc.boolean(),
}) as fc.Arbitrary<ToolEvent>;

/** A (possibly empty) sequence of TOOL events. */
const toolEventsArb = fc.array(toolEventArb, { minLength: 0, maxLength: 30 });

// ---------- Properties ----------

describe("Property 8: tool-row keying is stable", () => {
  it("produces exactly one row per distinct key (toolId ?? seq:<n>)", () => {
    fc.assert(
      fc.property(toolEventsArb, (events) => {
        const vm = fold(events);
        const distinctKeys = new Set(events.map(keyOf));
        expect(vm.toolRows).toHaveLength(distinctKeys.size);
        // Every produced row key is one of the distinct source keys, and each
        // appears exactly once (no duplicate rows for a repeated key — 2.3).
        const rowKeys = vm.toolRows.map((r) => r.key);
        expect(new Set(rowKeys).size).toBe(rowKeys.length);
        expect(new Set(rowKeys)).toEqual(distinctKeys);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("null-toolId events are keyed by the synthetic seq:<sequence> key", () => {
    fc.assert(
      fc.property(toolEventsArb, (events) => {
        const vm = fold(events);
        for (const event of events) {
          if (event.toolId === null) {
            const key = `seq:${event.sequence}`;
            expect(vm.toolRows.some((r) => r.key === key)).toBe(true);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("a repeated key upserts in place: final row reflects the LAST event for that key", () => {
    fc.assert(
      fc.property(toolEventsArb, (events) => {
        const vm = fold(events);
        // For each distinct key, the last event carrying it defines the row.
        const lastByKey = new Map<string, ToolEvent>();
        for (const event of events) {
          lastByKey.set(keyOf(event), event);
        }
        for (const row of vm.toolRows) {
          const last = lastByKey.get(row.key);
          expect(last).toBeDefined();
          if (!last) continue;
          expect(row.status).toBe(last.status);
          expect(row.tool).toBe(last.tool);
          expect(row.relativePath).toBe(last.relativePath);
          expect(row.command).toBe(last.command);
          expect(row.exitCode).toBe(last.exitCode);
          expect(row.coreAction).toBe(last.coreAction);
          expect(row.output).toBe(last.output);
          expect(row.truncated).toBe(last.truncated);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("row order is stable: rows follow first-seen key order and upserts never reorder", () => {
    fc.assert(
      fc.property(toolEventsArb, (events) => {
        const vm = fold(events);
        // The expected order is the order in which each key is first seen.
        const firstSeen: string[] = [];
        const seen = new Set<string>();
        for (const event of events) {
          const key = keyOf(event);
          if (!seen.has(key)) {
            seen.add(key);
            firstSeen.push(key);
          }
        }
        expect(vm.toolRows.map((r) => r.key)).toEqual(firstSeen);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("distinct keys never merge into a single row", () => {
    fc.assert(
      fc.property(toolEventsArb, (events) => {
        const vm = fold(events);
        const distinctKeys = new Set(events.map(keyOf));
        // Each distinct key is represented by its own row.
        for (const key of distinctKeys) {
          expect(vm.toolRows.filter((r) => r.key === key)).toHaveLength(1);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("reduceEvent is pure: folding never mutates the input view model", () => {
    fc.assert(
      fc.property(toolEventArb, (event) => {
        const before = emptyTurn();
        const snapshotRows = before.toolRows;
        reduceEvent(before, event);
        // The original references are untouched (no in-place mutation).
        expect(before.toolRows).toBe(snapshotRows);
        expect(before.toolRows).toHaveLength(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
