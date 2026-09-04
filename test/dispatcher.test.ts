import { describe, it, expect } from "vitest";

import { PanelController, type Notice } from "../src/core/panel-controller";
import { WebviewDispatcher } from "../src/webview/dispatcher";
import { MockAdapter, type MockAdapterOptions } from "../src/adapter/mock-adapter";
import type { Clock, TimerId } from "../src/core/clock";
import type { HostToWebview } from "../src/webview/messages";
import type { AgentResponseEntry, UserMessageEntry } from "../src/core/types";

/**
 * Example-based unit tests for the host-side messaging dispatcher (task 11.2).
 *
 * These tests exercise {@link WebviewDispatcher} against a *real*
 * {@link PanelController} constructed with a {@link MockAdapter} and a
 * deterministic fake {@link Clock}. Emitted {@link HostToWebview} messages are
 * captured into an array via the injected `post` callback so each assertion can
 * verify that:
 *   - each controller state change maps to the correct HostToWebview message, and
 *   - each WebviewToHost intent maps to the correct controller call.
 *
 * Covers Req 1.4 (tabActivated on select), 1.5 (hydrate snapshots + draft),
 * 2.2 (submit routes to the agent + submissionState), and 4.5 (toggleWorkItem
 * is a view-local host no-op).
 */

/**
 * Minimal deterministic fake {@link Clock}. Timers are recorded but never
 * auto-fire; these tests drive emission explicitly so the start-timeout / stall
 * watchdog never fires on its own.
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
}

/**
 * Wires a controller + dispatcher pair with a capturing `post` sink, using the
 * documented `onNotice` closure pattern (design/dispatcher.ts): the controller
 * forwards every notice to the dispatcher, which posts it as a `notice`
 * message. Returns the pieces the tests assert against.
 */
function makeHarness(options?: {
  availability?: MockAdapterOptions["availability"];
}) {
  const clock = new FakeClock();
  const adapter = new MockAdapter(
    options?.availability ? { availability: options.availability } : {},
  );
  const posted: HostToWebview[] = [];
  const post = (message: HostToWebview): void => {
    posted.push(message);
  };

  // Documented closure pattern: the controller's onNotice sink is set at
  // construction, so it forwards through the (later-assigned) dispatcher.
  let dispatcher: WebviewDispatcher;
  const controller = new PanelController(adapter, {
    clock,
    onNotice: (notice: Notice) => dispatcher.forwardNotice(notice),
  });
  dispatcher = new WebviewDispatcher(controller, post);

  return { clock, adapter, controller, dispatcher, posted };
}

describe("WebviewDispatcher — outbound (controller state -> HostToWebview)", () => {
  it("hydrateAll posts a single hydrate with both tabs' snapshots and the active tab (Req 1.5)", () => {
    const { controller, dispatcher, posted } = makeHarness();

    // Put some distinguishing state on each tab so the snapshots are non-trivial.
    controller.getTabState("builder").appendUserMessage("hi builder");
    controller.getTabState("helper").setDraft("helper draft");
    controller.selectTab("helper");

    dispatcher.hydrateAll();

    expect(posted).toHaveLength(1);
    const msg = posted[0];
    expect(msg.type).toBe("hydrate");
    if (msg.type !== "hydrate") throw new Error("expected hydrate");

    // Both tabs present, active tab reflected.
    expect(msg.activeTab).toBe("helper");
    expect(msg.tabs.builder.tabId).toBe("builder");
    expect(msg.tabs.helper.tabId).toBe("helper");

    // Snapshots reflect the controller state.
    expect(
      msg.tabs.builder.entries.filter((e) => e.kind === "user_message"),
    ).toHaveLength(1);
    expect(msg.tabs.helper.draft).toBe("helper draft");
  });

  it("forwardNotice posts a notice message with the right tab/kind/message", () => {
    const { dispatcher, posted } = makeHarness();

    dispatcher.forwardNotice({
      tab: "helper",
      kind: "length_limit",
      message: "too long",
    });

    expect(posted).toHaveLength(1);
    expect(posted[0]).toEqual({
      type: "notice",
      tab: "helper",
      kind: "length_limit",
      message: "too long",
    });
  });

  it("onNotice sink forwards a controller Notice as a notice message", () => {
    const { dispatcher, posted } = makeHarness();

    dispatcher.onNotice({ tab: "builder", kind: "error", message: "boom" });

    expect(posted).toEqual([
      { type: "notice", tab: "builder", kind: "error", message: "boom" },
    ]);
  });

  it("emitTabActivated posts a tabActivated message for the given tab", () => {
    const { dispatcher, posted } = makeHarness();

    dispatcher.emitTabActivated("helper");

    expect(posted).toEqual([{ type: "tabActivated", tab: "helper" }]);
  });

  it("emitSubmissionState posts submissionState reflecting the tab's submissionEnabled", async () => {
    const { controller, dispatcher, adapter, posted } = makeHarness();

    // Fresh tab: no in-flight turn -> submission enabled.
    dispatcher.emitSubmissionState("builder");
    expect(posted[0]).toEqual({
      type: "submissionState",
      tab: "builder",
      enabled: true,
    });

    // Start a turn so the tab becomes locked (submission disabled).
    await controller.submit("builder", "do work");
    expect(adapter.startTurnCountByAgent.builder).toBe(1);

    dispatcher.emitSubmissionState("builder");
    expect(posted[1]).toEqual({
      type: "submissionState",
      tab: "builder",
      enabled: false,
    });
  });
});

describe("WebviewDispatcher — inbound (WebviewToHost intent -> controller call)", () => {
  it("selectTab calls controller.selectTab then posts tabActivated (Req 1.4)", async () => {
    const { controller, dispatcher, posted } = makeHarness();

    expect(controller.activeTab).toBe("builder");

    await dispatcher.handle({ type: "selectTab", tab: "helper" });

    // Controller state changed.
    expect(controller.activeTab).toBe("helper");
    // Correct outbound message emitted.
    expect(posted).toEqual([{ type: "tabActivated", tab: "helper" }]);
  });

  it("submit calls controller.submit (appends user message, invokes adapter once) then posts submissionState (Req 2.2)", async () => {
    const { controller, dispatcher, adapter, posted } = makeHarness();

    await dispatcher.handle({ type: "submit", tab: "builder", text: "build a widget" });

    // Controller appended exactly one user message for the valid text.
    const snap = controller.getTabSnapshot("builder");
    const userEntries = snap.entries.filter((e) => e.kind === "user_message");
    expect(userEntries).toHaveLength(1);
    expect((userEntries[0] as UserMessageEntry).text).toBe("build a widget");

    // Adapter startTurn invoked exactly once, routed to the builder agent (Req 2.2).
    expect(adapter.startTurnCountByAgent).toEqual({ builder: 1, helper: 0 });
    expect(adapter.invocations[0].agent).toBe("builder");

    // A submissionState patch was posted reflecting the now-locked tab.
    expect(posted).toEqual([
      { type: "submissionState", tab: "builder", enabled: false },
    ]);
  });

  it("submit routes to the helper agent when submitted from the helper tab (Req 2.2)", async () => {
    const { dispatcher, adapter, posted } = makeHarness();

    await dispatcher.handle({ type: "submit", tab: "helper", text: "explain this" });

    expect(adapter.startTurnCountByAgent).toEqual({ builder: 0, helper: 1 });
    expect(adapter.invocations[0].agent).toBe("helper");
    expect(posted).toEqual([
      { type: "submissionState", tab: "helper", enabled: false },
    ]);
  });

  it("draftChanged sets the tab's draft on the controller (Req 1.5)", async () => {
    const { controller, dispatcher, posted } = makeHarness();

    await dispatcher.handle({
      type: "draftChanged",
      tab: "builder",
      text: "unsent text",
    });

    // Draft is stored on the controller's tab state (verified via snapshot).
    expect(controller.getTabSnapshot("builder").draft).toBe("unsent text");
    // draftChanged is a pure host-state update with no outbound patch.
    expect(posted).toHaveLength(0);
  });

  it("toggleWorkItem is a view-local no-op: does not throw and does not mutate controller state (Req 4.5)", async () => {
    const { controller, dispatcher, posted } = makeHarness();

    // Establish a builder conversation with a response + work item so there is
    // real host state to (not) mutate.
    const builder = controller.getTabState("builder");
    const msgId = builder.appendUserMessage("build");
    const respId = builder.beginResponse(msgId);
    builder.appendWorkItem(respId, {
      id: "wi-1",
      seq: 0,
      itemType: "tool_call",
      title: "run tests",
      detail: "line1\nline2\nline3\nline4",
      lineCount: 4,
      status: "running",
      expanded: false,
    });

    const before = controller.getTabSnapshot("builder");

    await expect(
      dispatcher.handle({ type: "toggleWorkItem", tab: "builder", itemId: "wi-1" }),
    ).resolves.toBeUndefined();

    const after = controller.getTabSnapshot("builder");

    // Host conversation state is unchanged and no outbound message is posted.
    expect(after).toEqual(before);
    const afterResp = after.entries.find(
      (e) => e.kind === "agent_response",
    ) as AgentResponseEntry;
    expect(afterResp.workItems[0].expanded).toBe(false);
    expect(posted).toHaveLength(0);
  });
});

describe("WebviewDispatcher — onNotice wiring end-to-end (closure pattern)", () => {
  it("a length_limit notice-producing submit posts a notice HostToWebview with kind length_limit (Req 2.2/6.5)", async () => {
    const { dispatcher, adapter, posted } = makeHarness();

    // Over-limit text (>10,000 chars) -> controller emits a length_limit notice
    // via its onNotice sink, which the dispatcher forwards as a notice message.
    const overLimit = "x".repeat(10_001);
    await dispatcher.handle({ type: "submit", tab: "builder", text: overLimit });

    // No turn started for a rejected submission.
    expect(adapter.startTurnCountByAgent).toEqual({ builder: 0, helper: 0 });

    const notices = posted.filter((m) => m.type === "notice");
    expect(notices).toHaveLength(1);
    const notice = notices[0];
    if (notice.type !== "notice") throw new Error("expected notice");
    expect(notice.tab).toBe("builder");
    expect(notice.kind).toBe("length_limit");

    // The submit handler also posts a submissionState patch afterwards.
    expect(posted.some((m) => m.type === "submissionState")).toBe(true);
  });

  it("submitting while the agent is unavailable posts a notice with kind unavailable (Req 6.4)", async () => {
    const { dispatcher, adapter, posted } = makeHarness({
      availability: { default: false },
    });

    await dispatcher.handle({ type: "submit", tab: "helper", text: "are you there?" });

    // Unavailable agent: no turn started.
    expect(adapter.startTurnCountByAgent).toEqual({ builder: 0, helper: 0 });

    const notices = posted.filter((m) => m.type === "notice");
    expect(notices).toHaveLength(1);
    const notice = notices[0];
    if (notice.type !== "notice") throw new Error("expected notice");
    expect(notice.tab).toBe("helper");
    expect(notice.kind).toBe("unavailable");
  });
});
