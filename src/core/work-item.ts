/**
 * Pure helper functions for Builder work-stream items.
 *
 * These functions implement the work-item collapse/expand rules and
 * failed-item marking described in design.md (Data Models: WorkStreamItem) and
 * the correctness properties:
 *   - Property 11: Work-item default-collapsed rule and toggle locality
 *   - Property 12: Failed work items are marked and retained
 *
 * All functions are pure: inputs are never mutated and new objects/arrays are
 * returned so the behavior is straightforward to property-test.
 *
 * Requirements: 4.4, 4.5, 4.6
 */

import type { WorkStreamItem, WorkItemStatus, WorkItemType } from "./types";

/**
 * The line-count threshold above which a work item is collapsed by default.
 * Output that exceeds 3 lines renders collapsed (Req 4.4).
 */
export const DEFAULT_COLLAPSE_LINE_THRESHOLD = 3;

/**
 * Decide the default `expanded` state for a work item based on its output
 * length. An item is collapsed by default (`expanded === false`) exactly when
 * its `lineCount` exceeds {@link DEFAULT_COLLAPSE_LINE_THRESHOLD}; otherwise it
 * is expanded by default (Req 4.4).
 *
 * @param lineCount Number of lines in the item's detail output.
 * @returns `true` when the item should default to expanded, `false` when it
 *   should default to collapsed.
 */
export function defaultExpanded(lineCount: number): boolean {
  return lineCount <= DEFAULT_COLLAPSE_LINE_THRESHOLD;
}

/** Fields required to construct a {@link WorkStreamItem} via {@link createWorkItem}. */
export interface CreateWorkItemInput {
  id: string;
  seq: number;
  itemType: WorkItemType;
  title: string;
  detail: string;
  lineCount: number;
  /** Optional initial status; defaults to `"running"`. */
  status?: WorkItemStatus;
}

/**
 * Construct a {@link WorkStreamItem}, setting `expanded` to `false` exactly
 * when `lineCount > 3` (collapsed by default for long output) and `true`
 * otherwise (Req 4.4).
 *
 * The returned object is freshly created; the input is not retained or
 * mutated.
 *
 * @param input The item fields; `status` defaults to `"running"`.
 * @returns A new {@link WorkStreamItem} with its default-collapsed rule applied.
 */
export function createWorkItem(input: CreateWorkItemInput): WorkStreamItem {
  return {
    id: input.id,
    seq: input.seq,
    itemType: input.itemType,
    title: input.title,
    detail: input.detail,
    lineCount: input.lineCount,
    status: input.status ?? "running",
    expanded: defaultExpanded(input.lineCount),
  };
}

/**
 * Return a new list in which only the work item matching `itemId` has its
 * `expanded` state flipped; every other item is returned unchanged by
 * reference (toggle locality, Req 4.5).
 *
 * The input array and its items are never mutated. If no item matches
 * `itemId`, an equivalent new array is returned with all items unchanged.
 *
 * @param items The current work items.
 * @param itemId The id of the item whose `expanded` state should be toggled.
 * @returns A new array reflecting the toggle.
 */
export function toggleWorkItemExpanded(
  items: readonly WorkStreamItem[],
  itemId: string,
): WorkStreamItem[] {
  return items.map((item) =>
    item.id === itemId ? { ...item, expanded: !item.expanded } : item,
  );
}

/**
 * Return a new list in which the work item matching `itemId` is marked with
 * `status: "failed"`; the item is retained in the list and every other item is
 * returned unchanged by reference (Req 4.6).
 *
 * The input array and its items are never mutated. If no item matches
 * `itemId`, an equivalent new array is returned with all items unchanged.
 *
 * @param items The current work items.
 * @param itemId The id of the item to mark as failed.
 * @returns A new array with the targeted item marked failed and retained.
 */
export function markWorkItemFailed(
  items: readonly WorkStreamItem[],
  itemId: string,
): WorkStreamItem[] {
  return items.map((item) =>
    item.id === itemId ? { ...item, status: "failed" } : item,
  );
}
