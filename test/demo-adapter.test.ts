import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { DemoAdapter } from "../src/adapter/demo-adapter";
import type { AgentStreamEvent, StartTurnRequest } from "../src/adapter/agent-adapter";

/**
 * Light unit test for the runtime demo adapter (build/demo path, not a spec
 * task). Uses vitest fake timers so it runs instantly and deterministically
 * rather than waiting ~2s of real time.
 *
 * Asserts:
 *  - a Builder turn emits `started` first, `completed` last, and includes
 *    work_item / work_item_result events;
 *  - a Helper turn emits `started`/`completed` but NO work_item events;
 *  - cancel() stops any further events from firing.
 */

async function drainAll(): Promise<void> {
  // Advance well past the whole ~2s script.
  await vi.advanceTimersByTimeAsync(5000);
}

describe("DemoAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is always available", async () => {
    const adapter = new DemoAdapter();
    await expect(adapter.isAvailable("builder")).resolves.toBe(true);
    await expect(adapter.isAvailable("helper")).resolves.toBe(true);
  });

  it("streams started -> ... -> completed with work items for a builder turn", async () => {
    const adapter = new DemoAdapter();
    const events: AgentStreamEvent[] = [];
    const req: StartTurnRequest = {
      agent: "builder",
      text: "please build a thing",
      allowWorkStream: true,
    };

    await adapter.startTurn(req, (e) => events.push(e));
    await drainAll();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].kind).toBe("started");
    expect(events[events.length - 1].kind).toBe("completed");

    const workItems = events.filter((e) => e.kind === "work_item");
    const workResults = events.filter((e) => e.kind === "work_item_result");
    expect(workItems.length).toBeGreaterThan(0);
    expect(workResults.length).toBe(workItems.length);

    // Every result references a previously reported work item.
    const reportedIds = new Set(
      workItems.map((e) => (e.kind === "work_item" ? e.item.id : "")),
    );
    for (const r of workResults) {
      if (r.kind === "work_item_result") {
        expect(reportedIds.has(r.itemId)).toBe(true);
      }
    }

    // Exactly one terminal event, and it is `completed`.
    const terminal = events.filter(
      (e) => e.kind === "completed" || e.kind === "failed",
    );
    expect(terminal).toHaveLength(1);
  });

  it("emits no work_item events for a helper turn", async () => {
    const adapter = new DemoAdapter();
    const events: AgentStreamEvent[] = [];
    const req: StartTurnRequest = {
      agent: "helper",
      text: "hello",
      allowWorkStream: false,
    };

    await adapter.startTurn(req, (e) => events.push(e));
    await drainAll();

    expect(events[0].kind).toBe("started");
    expect(events[events.length - 1].kind).toBe("completed");
    expect(events.some((e) => e.kind === "work_item")).toBe(false);
    expect(events.some((e) => e.kind === "work_item_result")).toBe(false);
  });

  it("stops emitting further events after cancel()", async () => {
    const adapter = new DemoAdapter();
    const events: AgentStreamEvent[] = [];
    const req: StartTurnRequest = {
      agent: "builder",
      text: "cancel me",
      allowWorkStream: true,
    };

    const handle = await adapter.startTurn(req, (e) => events.push(e));

    // Let the turn start, then cancel before it completes.
    await vi.advanceTimersByTimeAsync(250);
    const countAtCancel = events.length;
    handle.cancel();

    await drainAll();

    // No events after cancel, and the turn never reached `completed`.
    expect(events.length).toBe(countAtCancel);
    expect(events.some((e) => e.kind === "completed")).toBe(false);
  });
});
