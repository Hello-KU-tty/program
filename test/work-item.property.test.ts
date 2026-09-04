import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  createWorkItem,
  defaultExpanded,
  toggleWorkItemExpanded,
  markWorkItemFailed,
  DEFAULT_COLLAPSE_LINE_THRESHOLD,
} from "../src/core/work-item";
import type {
  WorkStreamItem,
  WorkItemStatus,
  WorkItemType,
} from "../src/core/types";

/**
 * Property-based tests for the pure work-item helpers in
 * `src/core/work-item.ts`.
 *
 * These validate the correctness properties defined in design.md
 * ("Correctness Properties"):
 *   - Property 11: Work-item default-collapsed rule and toggle locality
 *   - Property 12: Failed work items are marked and retained
 *
 * The helpers are pure input/output logic, so they are exercised across many
 * generated inputs with `fast-check` at a minimum of 100 iterations each.
 */

const ITEM_TYPES: readonly WorkItemType[] = [
  "tool_call",
  "file_change",
  "command",
  "test",
];

const ITEM_STATUSES: readonly WorkItemStatus[] = [
  "running",
  "succeeded",
  "failed",
];

/** Arbitrary line counts, biased around the 3/4 collapse boundary. */
const lineCountArb: fc.Arbitrary<number> = fc.oneof(
  // Emphasize values around the boundary (0..6 covers <=3 and >3).
  fc.integer({ min: 0, max: 6 }),
  // Also explore larger outputs.
  fc.integer({ min: 0, max: 2000 }),
);

/** Arbitrary for the inputs accepted by {@link createWorkItem}. */
function createInputArb(id: string, seq: number) {
  return fc.record({
    id: fc.constant(id),
    seq: fc.constant(seq),
    itemType: fc.constantFrom(...ITEM_TYPES),
    title: fc.string(),
    detail: fc.string(),
    lineCount: lineCountArb,
    status: fc.constantFrom(...ITEM_STATUSES),
  });
}

/**
 * Build an arbitrary list of {@link WorkStreamItem}s with unique ids. Ids are
 * derived from a distinct set of indices so no two items collide, which is
 * required for meaningful toggle/mark-locality assertions (a duplicate id
 * would legitimately affect multiple items).
 */
const uniqueItemsArb: fc.Arbitrary<WorkStreamItem[]> = fc
  .uniqueArray(fc.integer({ min: 0, max: 100000 }), {
    minLength: 1,
    maxLength: 12,
  })
  .chain((ids) =>
    fc.tuple(
      ...ids.map((rawId, index) =>
        createInputArb(`item-${rawId}`, index).map((input) =>
          createWorkItem(input),
        ),
      ),
    ),
  )
  .map((items) => items as WorkStreamItem[]);

describe("work-item pure helpers - property tests", () => {
  // Feature: builder-helper-agent-panel, Property 11: Work-item default-collapsed rule and toggle locality. For any work-stream item, its default expanded state is collapsed exactly when its output exceeds 3 lines; and for any set of work items, toggling one item's expand/collapse state changes only that item's expanded state and preserves all others.
  // Validates: Requirements 4.4, 4.5
  it("Property 11: default-collapsed rule holds and toggle affects only the target item", () => {
    // Part A: default-collapsed rule. createWorkItem / defaultExpanded must
    // yield collapsed (expanded === false) exactly when lineCount > 3.
    const defaultRuleProp = fc.property(
      createInputArb("probe", 0),
      (input) => {
        const item = createWorkItem(input);
        const shouldBeExpanded = input.lineCount <= DEFAULT_COLLAPSE_LINE_THRESHOLD;

        // Boundary is exactly 3: <=3 expanded, >3 collapsed.
        expect(item.expanded).toBe(shouldBeExpanded);
        expect(item.expanded).toBe(!(input.lineCount > 3));
        // defaultExpanded is the single source of truth for the rule.
        expect(defaultExpanded(input.lineCount)).toBe(item.expanded);
      },
    );

    // Part B: toggle locality. Toggling a target flips only that item's
    // expanded flag; all other items are preserved (including expanded state).
    const toggleLocalityProp = fc.property(
      uniqueItemsArb,
      fc.nat(),
      (items, rawIndex) => {
        const targetIndex = rawIndex % items.length;
        const targetId = items[targetIndex].id;

        const result = toggleWorkItemExpanded(items, targetId);

        // Same length and same id order preserved.
        expect(result.length).toBe(items.length);
        expect(result.map((i) => i.id)).toEqual(items.map((i) => i.id));

        for (let i = 0; i < items.length; i++) {
          if (items[i].id === targetId) {
            // Only the target's expanded flag flips.
            expect(result[i].expanded).toBe(!items[i].expanded);
            // Every other field is unchanged.
            expect({ ...result[i], expanded: items[i].expanded }).toEqual(
              items[i],
            );
          } else {
            // Non-target items are completely unchanged.
            expect(result[i]).toEqual(items[i]);
          }
        }

        // The input array and items are not mutated.
        expect(items[targetIndex].id).toBe(targetId);
      },
    );

    fc.assert(defaultRuleProp, { numRuns: 100 });
    fc.assert(toggleLocalityProp, { numRuns: 100 });
  });

  // Feature: builder-helper-agent-panel, Property 12: Failed work items are marked and retained. For any reported tool call, command execution, or test run that fails, the corresponding work-stream item is marked with failure status and remains present in the Builder_Tab conversation.
  // Validates: Requirements 4.6
  it("Property 12: marking an item failed sets its status to failed and retains it, leaving others unchanged", () => {
    const prop = fc.property(uniqueItemsArb, fc.nat(), (items, rawIndex) => {
      const targetIndex = rawIndex % items.length;
      const targetId = items[targetIndex].id;

      const result = markWorkItemFailed(items, targetId);

      // The item is retained: same count, same id order, target still present.
      expect(result.length).toBe(items.length);
      expect(result.map((i) => i.id)).toEqual(items.map((i) => i.id));
      const targetAfter = result.find((i) => i.id === targetId);
      expect(targetAfter).toBeDefined();

      for (let i = 0; i < items.length; i++) {
        if (items[i].id === targetId) {
          // Target's status becomes "failed".
          expect(result[i].status).toBe("failed");
          expect(result[i].id).toBe(items[i].id);
          // Every other field is unchanged (only status may differ).
          expect({ ...result[i], status: items[i].status }).toEqual(items[i]);
        } else {
          // Other items unchanged in status and order.
          expect(result[i]).toEqual(items[i]);
        }
      }
    });

    fc.assert(prop, { numRuns: 100 });
  });
});
