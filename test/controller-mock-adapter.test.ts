import { describe, it, expect } from "vitest";

import { PanelController } from "../src/core/panel-controller";
import { MockAdapter } from "../src/adapter/mock-adapter";
import type { Clock, TimerId } from "../src/core/clock";
import type { AgentResponseEntry, WorkStreamItem } from "../src/core/types";

/**
 * End-to-end integration test (example-based) for task 9.3: a real
 * {@link PanelController} driving a {@link MockAdapter}'s scripted event stream
 * through the controller's `onEvent` wiring, asserting the resulting per-tab
 * state via `getTabSnapshot`.
 *
 * Covers: routing + allowWorkStream (Req 5.1/5.2, 4.7), started → response
 * entry (Req 3.1), chunk ordering (Req 3.2), work-item ordering on Builder /
 * absence on Helper (Req 4.1/4.7), and completion unlocking the tab (Req 3.3).
 */

/**
 * Minimal deterministic fake {@link Clock} for the test. Timers are recorded
 * but never auto-fire; the test drives the adapter's scripted events directly,
 * so the start-timeout/stall watchdog must not fire on their own. `advance`
 * fires any timers whose deadline has elapsed, in scheduling order.
 */
class FakeClock implements Clock {
  private current = 0;
  private nextId = 1;
  private timers = new Map<TimerId, { fireAt: number; cb: () => void }>();

  now(): number {
    return this.current;
  }

  setTimeout(cb: () => void, ms: number): TimerId {
    const id = this.nextId++ as TimerId;
    this.timers.set(id, { fireAt: this.current + ms, cb });
    return id;
  }

  clearTimeout(id: TimerId): void {
    this.timers.delete(id);
  }

  /** Advance time by `ms`, firing any now-due timers in scheduling order. */
  advance(ms: number): void {
    this.current += ms;
    const due = [...this.timers.entries()]
      .filter(([, t]) => t.fireAt <= this.current)
      .sort((a, b) => a[1].fireAt - b[1].fireAt);
    for (const [id, t] of due) {
      this.timers.delete(id);
      t.cb();
    }
  }

  /** Number of currently-armed timers (used to assert watchdog teardown). */
  get armedCount(): number {
    return this.timers.size;
  }
}

/** Build a WorkStreamItem; `seq` is reassigned by TabState at receipt. */
function workItem(id: string, title: string): WorkStreamItem {
  return {
    id,
    seq: 0,
    itemType: "tool_call",
    title,
    detail: "",
    lineCount: 1,
    status: "running",
    expanded: true,
  };
}

/** Find the single agent_response entry in a tab snapshot. */
function responseOf(controller: PanelController, tab: "builder" | "helper") {
  const snap = controller.getTabSnapshot(tab);
  const resp = snap.entries.find((e) => e.kind === "agent_response") as
    | AgentResponseEntry
    | undefined;
  return { snap, resp };
}

describe("PanelController + MockAdapter end-to-end", () => {
  it("drives a Builder turn: started -> chunks -> work_item -> completed", async () => {
    const clock = new FakeClock();
    const adapter = new MockAdapter();
    const controller = new PanelController(adapter, { clock });

    const result = await controller.submit("builder", "build me a thing");
    expect(result.status).toBe("accepted");

    // Routing (Req 5.1) + allowWorkStream=true for Builder (Req 4.7 capability).
    expect(adapter.startTurnCountByAgent).toEqual({ builder: 1, helper: 0 });
    const invocation = adapter.invocations[0];
    expect(invocation.agent).toBe("builder");
    expect(invocation.request.allowWorkStream).toBe(true);

    // While in flight, the tab is locked (Req 2.6).
    expect(controller.getTabSnapshot("builder").submissionEnabled).toBe(false);

    const turn = adapter.lastTurn!;

    // started -> exactly one agent_response entry exists (Req 3.1).
    turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
    {
      const { snap, resp } = responseOf(controller, "builder");
      expect(snap.entries.filter((e) => e.kind === "agent_response")).toHaveLength(1);
      expect(resp).toBeDefined();
      expect(resp!.state).toBe("in_progress");
    }

    // Chunks appended in order concatenate correctly (Req 3.2/3.6).
    turn.script({ kind: "message_chunk", text: "Hello" }).emitNext();
    turn.script({ kind: "message_chunk", text: ", " }).emitNext();
    turn.script({ kind: "message_chunk", text: "world" }).emitNext();

    // Work item lands on the Builder response in order (Req 4.1/4.2).
    turn.script({ kind: "work_item", item: workItem("wi-1", "run tests") }).emitNext();
    turn.script({ kind: "message_chunk", text: "!" }).emitNext();

    {
      const { resp } = responseOf(controller, "builder");
      expect(resp!.chunks.join("")).toBe("Hello, world!");
      expect(resp!.workItems.map((w) => w.title)).toEqual(["run tests"]);
    }

    // completed -> response complete and tab unlocked (Req 3.3).
    turn.script({ kind: "completed" }).emitNext();
    {
      const { snap, resp } = responseOf(controller, "builder");
      expect(resp!.state).toBe("complete");
      expect(snap.submissionEnabled).toBe(true);
    }

    // Watchdog torn down on completion — no dangling timers.
    expect(clock.armedCount).toBe(0);

    // No error notices were emitted on the happy path.
    expect(controller.notices).toHaveLength(0);
  });

  it("drives a Helper turn: allowWorkStream=false, no work items, routes to helper", async () => {
    const clock = new FakeClock();
    const adapter = new MockAdapter();
    const controller = new PanelController(adapter, { clock });

    const result = await controller.submit("helper", "explain this concept");
    expect(result.status).toBe("accepted");

    // Routing (Req 5.2) + allowWorkStream=false for Helper (Req 4.7).
    expect(adapter.startTurnCountByAgent).toEqual({ builder: 0, helper: 1 });
    const invocation = adapter.invocations[0];
    expect(invocation.agent).toBe("helper");
    expect(invocation.request.allowWorkStream).toBe(false);

    const turn = adapter.lastTurn!;
    turn.script({ kind: "started", turnId: turn.turnId }).emitNext();
    turn.script({ kind: "message_chunk", text: "A " }).emitNext();
    turn.script({ kind: "message_chunk", text: "concept." }).emitNext();
    turn.script({ kind: "completed" }).emitNext();

    const { snap, resp } = responseOf(controller, "helper");
    expect(resp!.chunks.join("")).toBe("A concept.");
    // Helper turns carry no work items (Req 4.7).
    expect(resp!.workItems).toHaveLength(0);
    expect(resp!.state).toBe("complete");
    expect(snap.submissionEnabled).toBe(true);
  });

  it("streams into the originating (builder) tab while helper is active without switching tabs (Req 3.5)", async () => {
    const clock = new FakeClock();
    const adapter = new MockAdapter();
    const controller = new PanelController(adapter, { clock });

    await controller.submit("builder", "background build");
    const turn = adapter.lastTurn!;
    turn.script({ kind: "started", turnId: turn.turnId }).emitNext();

    // Switch active tab to helper mid-stream.
    controller.selectTab("helper");
    turn.script({ kind: "message_chunk", text: "chunk-after-switch" }).emitNext();
    turn.script({ kind: "completed" }).emitNext();

    // Active tab unchanged; content landed on the builder tab.
    expect(controller.activeTab).toBe("helper");
    const { resp } = responseOf(controller, "builder");
    expect(resp!.chunks.join("")).toBe("chunk-after-switch");
    expect(resp!.state).toBe("complete");
    // Helper tab has no entries — it was never submitted.
    expect(controller.getTabSnapshot("helper").entries).toHaveLength(0);
  });
});
