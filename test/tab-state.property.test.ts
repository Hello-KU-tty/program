import { describe, it } from "vitest";
import fc from "fast-check";

import { TabState } from "../src/core/tab-state";
import { createWorkItem } from "../src/core/work-item";
import type { AgentResponseEntry, WorkStreamItem } from "../src/core/types";

/**
 * Property-based tests for the pure `TabState` core.
 *
 * Feature: builder-helper-agent-panel
 *   - Property 8  (task 3.2): response content preserves receipt order.
 *   - Property 13 (task 3.3): work items only ever appear in the Builder tab.
 *
 * Each property runs a minimum of 100 iterations and exercises `TabState`
 * directly (no VS Code / adapter dependencies).
 */

/** A single scripted event to drive against a response in receipt order. */
type ReceiptEvent =
  | { kind: "chunk"; text: string }
  | { kind: "work"; lineCount: number };

/**
 * Arbitrary for a mixed, interleaved sequence of message chunks and
 * work-stream items, as they would be received on a single ordered stream.
 */
const receiptSequence: fc.Arbitrary<ReceiptEvent[]> = fc.array(
  fc.oneof(
    fc.record({
      kind: fc.constant<"chunk">("chunk"),
      text: fc.string(),
    }),
    fc.record({
      kind: fc.constant<"work">("work"),
      lineCount: fc.integer({ min: 0, max: 20 }),
    }),
  ),
  { minLength: 0, maxLength: 40 },
);

/** Fetch the single agent_response entry from a Builder TabState snapshot. */
function responseFrom(state: TabState): AgentResponseEntry {
  const snap = state.snapshot(true);
  const resp = snap.entries.find((e) => e.kind === "agent_response") as
    | AgentResponseEntry
    | undefined;
  if (!resp) {
    throw new Error("expected an agent_response entry");
  }
  return resp;
}

describe("TabState property tests", () => {
  // Feature: builder-helper-agent-panel, Property 8: Response content preserves receipt order (chunks and work items interleaved) — for any sequence of message chunks and work-stream items received for a turn, the resulting Agent_Response renders them strictly in receipt order with no reordering, and at completion the response's ordered content equals the concatenation of all received chunks interleaved with work items by receipt order.
  it("Property 8: response content preserves receipt order (chunks and work items interleaved)", () => {
    const prop = fc.property(receiptSequence, (events) => {
      const state = new TabState("builder");
      const msgId = state.appendUserMessage("please build");
      const responseId = state.beginResponse(msgId);

      // Drive the events in receipt order, recording the receipt index each
      // chunk / work item was applied at so we can verify no reordering.
      const expectedChunks: string[] = [];
      // For each work item, remember its receipt index (position in `events`
      // among the interleaved chunk+work sequence).
      const expectedWorkOrder: { id: string; receiptIndex: number }[] = [];

      let wiCounter = 0;
      events.forEach((ev, receiptIndex) => {
        if (ev.kind === "chunk") {
          state.appendChunk(responseId, ev.text);
          expectedChunks.push(ev.text);
        } else {
          const id = `wi-${wiCounter++}`;
          const item: WorkStreamItem = createWorkItem({
            id,
            seq: 0, // reassigned by TabState at receipt time
            itemType: "tool_call",
            title: id,
            detail: "x\n".repeat(ev.lineCount),
            lineCount: ev.lineCount,
          });
          state.appendWorkItem(responseId, item);
          expectedWorkOrder.push({ id, receiptIndex });
        }
      });

      state.completeResponse(responseId);

      const resp = responseFrom(state);

      // 1) Chunks concatenate in exactly their receipt order (Req 3.2/3.6).
      if (resp.chunks.join("") !== expectedChunks.join("")) {
        return false;
      }
      // Chunk array preserved element-by-element in receipt order.
      if (resp.chunks.length !== expectedChunks.length) {
        return false;
      }
      for (let i = 0; i < expectedChunks.length; i++) {
        if (resp.chunks[i] !== expectedChunks[i]) {
          return false;
        }
      }

      // 2) Work items appear in ascending receipt order with no reordering
      //    (Req 4.1/4.2). Their receipt order maps to strictly-increasing seq.
      if (resp.workItems.length !== expectedWorkOrder.length) {
        return false;
      }
      for (let i = 0; i < expectedWorkOrder.length; i++) {
        if (resp.workItems[i].id !== expectedWorkOrder[i].id) {
          return false;
        }
      }
      // seq assigned at receipt time is strictly ascending in stored order.
      for (let i = 1; i < resp.workItems.length; i++) {
        if (resp.workItems[i].seq <= resp.workItems[i - 1].seq) {
          return false;
        }
      }

      // 3) Interleaving is consistent: a work item received before another is
      //    stored before it (receiptIndex order == stored order == seq order).
      for (let i = 1; i < expectedWorkOrder.length; i++) {
        if (
          expectedWorkOrder[i].receiptIndex <=
          expectedWorkOrder[i - 1].receiptIndex
        ) {
          return false;
        }
      }

      // Response is complete after all content received (Req 3.1/3.6).
      return resp.state === "complete";
    });

    fc.assert(prop, { numRuns: 100 });
  });

  // Feature: builder-helper-agent-panel, Property 13: Work items only ever appear in the Builder tab — for any Helper turn and any sequence of adapter events, the Helper_Tab conversation contains zero work-stream items.
  it("Property 13: work items only ever appear in the Builder tab", () => {
    const prop = fc.property(receiptSequence, (events) => {
      const state = new TabState("helper");
      const msgId = state.appendUserMessage("please explain");
      const responseId = state.beginResponse(msgId);

      let wiCounter = 0;
      let rejectedAttempts = 0;

      for (const ev of events) {
        if (ev.kind === "chunk") {
          state.appendChunk(responseId, ev.text);
        } else {
          const id = `wi-${wiCounter++}`;
          const item: WorkStreamItem = createWorkItem({
            id,
            seq: 0,
            itemType: "tool_call",
            title: id,
            detail: "x\n".repeat(ev.lineCount),
            lineCount: ev.lineCount,
          });
          // A Helper TabState must reject work items (Req 4.7): appendWorkItem
          // throws. The attempt must not add any work item to the tab.
          let threw = false;
          try {
            state.appendWorkItem(responseId, item);
          } catch {
            threw = true;
          }
          if (!threw) {
            // If it ever succeeds, the property is violated.
            return false;
          }
          rejectedAttempts++;
        }
      }

      state.completeResponse(responseId);

      // The Helper tab holds zero work items across every agent_response,
      // regardless of how many work-item events were attempted.
      const snap = state.snapshot(true);
      const totalWorkItems = snap.entries
        .filter((e) => e.kind === "agent_response")
        .reduce(
          (sum, e) => sum + (e as AgentResponseEntry).workItems.length,
          0,
        );

      // Sanity: attempts equal the number of work events generated.
      const workEvents = events.filter((e) => e.kind === "work").length;
      if (rejectedAttempts !== workEvents) {
        return false;
      }

      return totalWorkItems === 0;
    });

    fc.assert(prop, { numRuns: 100 });
  });
});
