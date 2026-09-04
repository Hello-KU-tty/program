import { describe, it, expect, beforeEach } from "vitest";

import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import type { VsCodeApi } from "../src/webview/vscode-api";
import type { HostToWebview, WebviewToHost } from "../src/webview/messages";
import type { TabStateSnapshot } from "../src/core/types";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

/**
 * Example-based unit tests for task 12.1 (webview UI: tabs, conversation view,
 * message input). The renderer is framework-free plain DOM, so these tests run
 * against a minimal in-file DOM stub (see test/support/fake-dom.ts) rather than
 * pulling in a jsdom dependency.
 *
 * Covers: exactly two tabs with correct labels (Req 1.2), active-agent label
 * (Req 5.5), draft restore on hydrate (Req 1.5), submit intent + optimistic
 * clear (Req 2.3), over-limit indication (Req 2.5), and lock disabling send
 * (Req 2.6).
 */

function emptySnapshot(
  tabId: "builder" | "helper",
  overrides: Partial<TabStateSnapshot> = {},
): TabStateSnapshot {
  return {
    tabId,
    entries: [],
    draft: "",
    submissionEnabled: true,
    activeAgentLabel: tabId === "builder" ? "Builder_Agent" : "Helper_Agent",
    ...overrides,
  };
}

function hydrate(
  builder: TabStateSnapshot,
  helper: TabStateSnapshot,
  activeTab: "builder" | "helper" = "builder",
): HostToWebview {
  return { type: "hydrate", tabs: { builder, helper }, activeTab };
}

/** Captures posted intents and lets the test push host messages back. */
class CaptureApi implements VsCodeApi {
  readonly posted: WebviewToHost[] = [];
  postMessage(message: WebviewToHost): void {
    this.posted.push(message);
  }
}

describe("webview UI (task 12.1)", () => {
  let restore: () => void;
  let root: FakeElement;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");
  });

  function setup() {
    const api = new CaptureApi();
    const client = new WebviewClient(api);
    const { store } = bootstrap(root as unknown as HTMLElement, client);
    return { api, client, store };
  }

  it("renders exactly two tabs labeled Builder and Helper (Req 1.2)", () => {
    const { client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));

    const tabButtons = root.queryAll((e) => e.className === "tab-button");
    expect(tabButtons.map((b) => b.textContent)).toEqual(["Builder", "Helper"]);

    try {
      restore();
    } finally {
      /* restore in afterEach-like manner */
    }
  });

  it("shows the active-agent label for the active tab (Req 5.5)", () => {
    const { client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper"), "helper"));
    const label = root.queryAll((e) => e.className === "active-agent-label")[0];
    expect(label.textContent).toBe("Helper_Agent");
    restore();
  });

  it("restores the unsent draft into the input on hydrate (Req 1.5)", () => {
    const { client } = setup();
    client.dispatch(
      hydrate(emptySnapshot("builder", { draft: "half typed" }), emptySnapshot("helper")),
    );
    const input = root.queryAll((e) => e.className === "message-input")[0];
    expect(input.value).toBe("half typed");
    restore();
  });

  it("posts a submit intent and clears the input optimistically (Req 2.2/2.3)", () => {
    const { api, client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));

    const input = root.queryAll((e) => e.className === "message-input")[0];
    input.value = "build me a thing";
    const send = root.queryAll((e) => e.className === "send-button")[0];
    send.click();

    expect(api.posted).toContainEqual({
      type: "submit",
      tab: "builder",
      text: "build me a thing",
    });
    expect(input.value).toBe("");
    restore();
  });

  it("does not submit empty/whitespace-only text (Req 2.4)", () => {
    const { api, client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));
    const input = root.queryAll((e) => e.className === "message-input")[0];
    input.value = "   \n  ";
    root.queryAll((e) => e.className === "send-button")[0].click();
    expect(api.posted.some((m) => m.type === "submit")).toBe(false);
    restore();
  });

  it("shows a length indication and does not submit over-limit text (Req 2.5)", () => {
    const { api, client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));
    const input = root.queryAll((e) => e.className === "message-input")[0];
    input.value = "x".repeat(10_001);
    root.queryAll((e) => e.className === "send-button")[0].click();

    expect(api.posted.some((m) => m.type === "submit")).toBe(false);
    const indicator = root.queryAll((e) => e.className === "length-indicator")[0];
    expect(indicator.hidden).toBe(false);
    expect(indicator.textContent).toContain("10000");
    // Text is retained (Req 2.5).
    expect(input.value.length).toBe(10_001);
    restore();
  });

  it("disables the send button while the tab is locked (Req 2.6)", () => {
    const { client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));
    const send = root.queryAll((e) => e.className === "send-button")[0];
    expect(send.disabled).toBe(false);

    client.dispatch({ type: "submissionState", tab: "builder", enabled: false });
    expect(send.disabled).toBe(true);
    restore();
  });

  it("renders user and agent entries in order and an in-progress indicator (Req 3.4)", () => {
    const { client } = setup();
    const builder = emptySnapshot("builder", {
      submissionEnabled: false,
      entries: [
        { id: "m1", kind: "user_message", createdAt: 1, seq: 0, text: "hi" } as never,
        {
          id: "r1",
          kind: "agent_response",
          createdAt: 2,
          seq: 1,
          forMessageId: "m1",
          chunks: ["Hel", "lo"],
          workItems: [],
          state: "in_progress",
        } as never,
      ],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    const bodies = root
      .queryAll((e) => e.className === "entry-body")
      .map((b) => b.textContent);
    expect(bodies).toEqual(["hi", "Hello"]);

    const progress = root.queryAll((e) => e.className === "in-progress")[0];
    expect(progress.hidden).toBe(false);
    restore();
  });
});

/**
 * Example-based unit tests for task 12.2 (conversation rendering for chunks,
 * work items, and notices).
 *
 * Covers: interleaved work-item + chunk ordering by seq (Req 3.6/4.2/4.3),
 * default-collapsed for >3 line items with a working toggle that affects only
 * that item (Req 4.4/4.5), failed work-item indication and retention (Req 4.6),
 * Helper tab renders no work items (Req 4.7/5.3), failed vs. complete response
 * styling (Req 6.3), and error/unavailability notice rendering that preserves
 * history (Req 6.5).
 */

import type {
  AgentResponseEntry,
  ConversationEntry,
  WorkStreamItem,
} from "../src/core/types";

function userEntry(id: string, seq: number, text: string): ConversationEntry {
  return { id, kind: "user_message", createdAt: seq, seq, text } as ConversationEntry;
}

function workItem(overrides: Partial<WorkStreamItem> & { id: string; seq: number }): WorkStreamItem {
  const lineCount = overrides.lineCount ?? 1;
  return {
    id: overrides.id,
    seq: overrides.seq,
    itemType: overrides.itemType ?? "command",
    title: overrides.title ?? `item-${overrides.id}`,
    detail: overrides.detail ?? "one line",
    lineCount,
    status: overrides.status ?? "running",
    expanded: overrides.expanded ?? lineCount <= 3,
  };
}

function agentEntry(
  id: string,
  seq: number,
  chunks: string[],
  workItems: WorkStreamItem[] = [],
  state: AgentResponseEntry["state"] = "complete",
): ConversationEntry {
  return {
    id,
    kind: "agent_response",
    createdAt: seq,
    seq,
    forMessageId: "m1",
    chunks,
    workItems,
    state,
  } as ConversationEntry;
}

describe("webview conversation rendering (task 12.2)", () => {
  let restore: () => void;
  let root: FakeElement;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");
  });

  function setup() {
    const api = new CaptureApi();
    const client = new WebviewClient(api);
    const { store } = bootstrap(root as unknown as HTMLElement, client);
    return { api, client, store };
  }

  it("renders work items in ascending seq order beneath the message text (Req 4.2/4.3)", () => {
    const { client } = setup();
    const builder = emptySnapshot("builder", {
      entries: [
        agentEntry("r1", 0, ["Working"], [
          workItem({ id: "w2", seq: 2, title: "second" }),
          workItem({ id: "w1", seq: 1, title: "first" }),
        ]),
      ],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    const titles = root
      .queryAll((e) => e.className === "work-item-title")
      .map((e) => e.textContent);
    expect(titles).toEqual(["first", "second"]);

    // The message body is still rendered as the concatenated chunks.
    const body = root.queryAll((e) => e.className === "entry-body")[0];
    expect(body.textContent).toBe("Working");
    restore();
  });

  it("collapses long (>3 line) work items by default and hides their detail (Req 4.4)", () => {
    const { client } = setup();
    const builder = emptySnapshot("builder", {
      entries: [
        agentEntry("r1", 0, [""], [
          workItem({ id: "wl", seq: 1, lineCount: 5, detail: "a\nb\nc\nd\ne", expanded: false }),
          workItem({ id: "ws", seq: 2, lineCount: 2, detail: "a\nb", expanded: true }),
        ]),
      ],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    const details = root.queryAll((e) => e.className === "work-item-detail");
    // Long item detail hidden; short item detail visible.
    expect(details[0].hidden).toBe(true);
    expect(details[1].hidden).toBe(false);

    // Only the long item offers a toggle control.
    const toggles = root.queryAll((e) => e.className === "work-item-toggle");
    expect(toggles.length).toBe(1);
    expect(toggles[0].textContent).toBe("Expand");
    restore();
  });

  it("toggle expands only the targeted item and posts a toggleWorkItem intent (Req 4.5)", () => {
    const { api, client } = setup();
    const builder = emptySnapshot("builder", {
      entries: [
        agentEntry("r1", 0, [""], [
          workItem({ id: "wa", seq: 1, lineCount: 5, detail: "a\nb\nc\nd\ne", expanded: false }),
          workItem({ id: "wb", seq: 2, lineCount: 5, detail: "1\n2\n3\n4\n5", expanded: false }),
        ]),
      ],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    // Toggle the first long item.
    const firstToggle = root.queryAll((e) => e.className === "work-item-toggle")[0];
    firstToggle.click();

    // Intent posted for the toggled item.
    expect(api.posted).toContainEqual({ type: "toggleWorkItem", tab: "builder", itemId: "wa" });

    // After re-render: wa expanded (detail visible), wb still collapsed.
    const items = root.queryAll((e) => typeof e.dataset.itemId === "string" && e.dataset.itemId.length > 0);
    const wa = items.find((e) => e.dataset.itemId === "wa");
    const wb = items.find((e) => e.dataset.itemId === "wb");
    expect(wa?.dataset.expanded).toBe("true");
    expect(wb?.dataset.expanded).toBe("false");
    restore();
  });

  it("marks failed work items with a failure indication and retains them (Req 4.6)", () => {
    const { client } = setup();
    const builder = emptySnapshot("builder", {
      entries: [
        agentEntry("r1", 0, [""], [
          workItem({ id: "wok", seq: 1, status: "succeeded" }),
          workItem({ id: "wfail", seq: 2, status: "failed" }),
        ]),
      ],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    const failedBadges = root.queryAll((e) => e.className === "work-item-failed-badge");
    expect(failedBadges.length).toBe(1);

    // Both items are retained in the conversation.
    const itemIds = root
      .queryAll((e) => typeof e.dataset.itemId === "string" && e.dataset.itemId.length > 0)
      .map((e) => e.dataset.itemId);
    expect(itemIds).toEqual(["wok", "wfail"]);
    restore();
  });

  it("never renders work items in the Helper tab (Req 4.7/5.3)", () => {
    const { client } = setup();
    // Even if a helper response somehow carried work items, the Helper path
    // must render none.
    const helper = emptySnapshot("helper", {
      entries: [
        agentEntry("r1", 0, ["explanation"], [workItem({ id: "wx", seq: 1 })]),
      ],
    });
    client.dispatch(hydrate(emptySnapshot("builder"), helper, "helper"));

    const items = root.queryAll(
      (e) => typeof e.dataset.itemId === "string" && e.dataset.itemId.length > 0,
    );
    expect(items.length).toBe(0);
    // But the chat text is still rendered.
    const body = root.queryAll((e) => e.className === "entry-body")[0];
    expect(body.textContent).toBe("explanation");
    restore();
  });

  it("visually distinguishes a failed response from a completed one (Req 6.3)", () => {
    const { client } = setup();
    const builder = emptySnapshot("builder", {
      entries: [
        agentEntry("rc", 0, ["done"], [], "complete"),
        userEntry("m2", 1, "again"),
        agentEntry("rf", 2, ["partial"], [], "failed"),
      ],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    const complete = root.queryAll((e) => e.dataset.entryId === "rc")[0];
    const failed = root.queryAll((e) => e.dataset.entryId === "rf")[0];
    expect(complete.dataset.state).toBe("complete");
    expect(failed.dataset.state).toBe("failed");
    expect(complete.className).toContain("entry-complete");
    expect(failed.className).toContain("entry-failed");

    // Failed response keeps its partial content and shows a failure marker.
    const failedBody = failed.queryAll((e) => e.className === "entry-body")[0];
    expect(failedBody.textContent).toBe("partial");
    expect(failed.queryAll((e) => e.className === "entry-failed").length).toBe(1);
    restore();
  });

  it("renders error/unavailability notices while preserving history (Req 6.5)", () => {
    const { client } = setup();
    const builder = emptySnapshot("builder", {
      entries: [userEntry("m1", 0, "hello"), agentEntry("r1", 1, ["hi"], [], "complete")],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    client.dispatch({
      type: "notice",
      tab: "builder",
      kind: "unavailable",
      message: "Builder_Agent is unavailable.",
    });

    const indicator = root.queryAll(
      (e) => e.dataset.noticeKind === "unavailable",
    )[0];
    expect(indicator).toBeDefined();
    expect(indicator.textContent).toContain("unavailable");

    // Prior conversation entries are unchanged (Req 6.5).
    const bodies = root.queryAll((e) => e.className === "entry-body").map((b) => b.textContent);
    expect(bodies).toEqual(["hello", "hi"]);
    restore();
  });
});
