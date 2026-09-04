import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import { PanelController } from "../src/core/panel-controller";
import { MockAdapter } from "../src/adapter/mock-adapter";
import type { VsCodeApi } from "../src/webview/vscode-api";
import type { HostToWebview, WebviewToHost } from "../src/webview/messages";
import type { TabStateSnapshot } from "../src/core/types";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

/**
 * Task 16.1 — Example-based unit tests.
 *
 * These assert concrete example states (deterministic facts, not
 * input-varying properties). They complement the property suite by pinning down
 * the structural/IDE-adjacent facts the design classifies as EXAMPLE:
 *
 *  - Fresh-panel initial state: Builder active, empty conversation, empty
 *    editable input (Req 1.3) — asserted both on a real {@link PanelController}
 *    and on the rendered panel.
 *  - Exactly two tabs labeled "Builder" and "Helper" (Req 1.2).
 *  - The Helper tab is chat-only: it exposes ONLY conversation, message-input,
 *    and send-button, and NO code-edit / shell / decision-confirmation controls
 *    and no work-item controls (Req 5.3).
 *  - The active-agent label matches the selected tab (Req 5.5).
 *  - Representative notices (length_limit / unavailable / error) render with the
 *    correct `data-notice-kind` and copy (Req 6.x error/unavailability copy).
 *
 * The renderer is framework-free plain DOM, so these tests run against the
 * shared in-file DOM stub (test/support/fake-dom.ts) rather than pulling in a
 * jsdom dependency. These are example (non-fast-check) tests by design.
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

// ---------------------------------------------------------------------------
// Fresh-panel initial state on the pure controller (Req 1.3)
// ---------------------------------------------------------------------------

describe("fresh PanelController initial state (Req 1.3)", () => {
  it("selects Builder as the active tab with zero entries and an empty draft", () => {
    const controller = new PanelController(new MockAdapter());

    // Builder is active on a freshly constructed panel (Req 1.3).
    expect(controller.activeTab).toBe("builder");

    const builder = controller.getTabSnapshot("builder");
    const helper = controller.getTabSnapshot("helper");

    // Both conversations start empty with an empty, editable (submission
    // enabled) input.
    expect(builder.entries).toEqual([]);
    expect(builder.draft).toBe("");
    expect(builder.submissionEnabled).toBe(true);

    expect(helper.entries).toEqual([]);
    expect(helper.draft).toBe("");
    expect(helper.submissionEnabled).toBe(true);
  });

  it("labels each tab's active agent (Req 5.5)", () => {
    const controller = new PanelController(new MockAdapter());
    expect(controller.getTabSnapshot("builder").activeAgentLabel).toBe("Builder_Agent");
    expect(controller.getTabSnapshot("helper").activeAgentLabel).toBe("Helper_Agent");
  });
});

// ---------------------------------------------------------------------------
// Rendered panel example facts (Req 1.2, 1.3, 5.3, 5.5)
// ---------------------------------------------------------------------------

describe("rendered panel example facts (task 16.1)", () => {
  let restore: () => void;
  let root: FakeElement;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");
  });

  afterEach(() => {
    restore();
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
    expect(tabButtons).toHaveLength(2);
    expect(tabButtons.map((b) => b.textContent)).toEqual(["Builder", "Helper"]);
  });

  it("first display shows Builder active with an empty conversation and empty input (Req 1.3)", () => {
    const { client } = setup();
    // A fresh panel hydrate: builder active, both tabs empty.
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper"), "builder"));

    // Builder panel visible, Helper hidden.
    const panels = root.queryAll((e) => e.className === "tab-panel");
    const builderPanel = panels.find((p) => p.dataset.tab === "builder");
    const helperPanel = panels.find((p) => p.dataset.tab === "helper");
    expect(builderPanel?.hidden).toBe(false);
    expect(helperPanel?.hidden).toBe(true);

    // No conversation entries in either panel.
    const bodies = root.queryAll((e) => e.className === "entry-body");
    expect(bodies).toHaveLength(0);

    // Both inputs are empty and editable (submission enabled).
    const inputs = root.queryAll((e) => e.className === "message-input");
    expect(inputs.map((i) => i.value)).toEqual(["", ""]);
    expect(inputs.every((i) => i.readOnly === false)).toBe(true);

    // The active-agent label names the Builder (Req 5.5).
    const label = root.queryAll((e) => e.className === "active-agent-label")[0];
    expect(label.textContent).toBe("Builder_Agent");
  });

  it("shows the active-agent label matching the selected tab (Req 5.5)", () => {
    const { client } = setup();

    // Builder selected → Builder_Agent.
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper"), "builder"));
    let label = root.queryAll((e) => e.className === "active-agent-label")[0];
    expect(label.textContent).toBe("Builder_Agent");

    // Switching the active tab to Helper updates the label to Helper_Agent.
    client.dispatch({ type: "tabActivated", tab: "helper" });
    label = root.queryAll((e) => e.className === "active-agent-label")[0];
    expect(label.textContent).toBe("Helper_Agent");
  });

  it("Helper tab is chat-only: only conversation, message-input, and send-button; no code-edit/shell/decision or work-item controls (Req 5.3)", () => {
    const { client } = setup();

    // Even if a helper response somehow carried a work item, the Helper path
    // renders none; and the Helper tab exposes no edit/shell/decision controls.
    const helper = emptySnapshot("helper", {
      entries: [
        {
          id: "r1",
          kind: "agent_response",
          createdAt: 1,
          seq: 1,
          forMessageId: "m1",
          chunks: ["an explanation"],
          workItems: [
            {
              id: "wx",
              seq: 2,
              itemType: "command",
              title: "should-not-render",
              detail: "nope",
              lineCount: 1,
              status: "running",
              expanded: true,
            },
          ],
          state: "complete",
        } as never,
      ],
    });
    client.dispatch(hydrate(emptySnapshot("builder"), helper, "helper"));

    const panels = root.queryAll((e) => e.className === "tab-panel");
    const helperPanel = panels.find((p) => p.dataset.tab === "helper") as FakeElement;

    // Chat-only surface present: conversation, message-input, send-button.
    expect(helperPanel.queryAll((e) => e.className === "conversation").length).toBe(1);
    expect(helperPanel.queryAll((e) => e.className === "message-input").length).toBe(1);
    expect(helperPanel.queryAll((e) => e.className === "send-button").length).toBe(1);

    // The chat text is still rendered.
    const body = helperPanel.queryAll((e) => e.className === "entry-body")[0];
    expect(body.textContent).toBe("an explanation");

    // NO work-stream items rendered in the Helper tab (Req 4.7/5.3).
    const workItems = helperPanel.queryAll(
      (e) => typeof e.dataset.itemId === "string" && e.dataset.itemId.length > 0,
    );
    expect(workItems).toHaveLength(0);

    // NO code-edit / shell / decision-confirmation controls of any kind. The
    // Helper panel must not contain a work-stream container, work-item toggles,
    // work-item type badges, failure badges, or any decision/approval controls.
    const forbiddenClasses = [
      "work-stream",
      "work-item",
      "work-item-toggle",
      "work-item-type",
      "work-item-title",
      "work-item-detail",
      "work-item-failed-badge",
      "decision",
      "decision-confirm",
      "shell",
      "shell-run",
      "code-edit",
      "approve-button",
      "reject-button",
    ];
    for (const cls of forbiddenClasses) {
      expect(
        helperPanel.queryAll((e) => e.className.split(" ").includes(cls)).length,
        `Helper tab should not render a "${cls}" control`,
      ).toBe(0);
    }

    // The only interactive controls in the Helper panel are the send button
    // (buttons) — no other <button> elements (e.g. toggles/approvals).
    const helperButtons = helperPanel.queryAll((e) => e.tagName === "BUTTON");
    expect(helperButtons).toHaveLength(1);
    expect(helperButtons[0].className).toBe("send-button");
  });
});

// ---------------------------------------------------------------------------
// Representative notices render with correct kind + copy (Req 6.x)
// ---------------------------------------------------------------------------

describe("representative notices render with correct kind and copy (task 16.1)", () => {
  let restore: () => void;
  let root: FakeElement;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");
  });

  afterEach(() => {
    restore();
  });

  function setup() {
    const api = new CaptureApi();
    const client = new WebviewClient(api);
    bootstrap(root as unknown as HTMLElement, client);
    return { api, client };
  }

  it("renders a length_limit notice with the length-limit copy and kind (Req 2.5)", () => {
    const { client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));

    client.dispatch({
      type: "notice",
      tab: "builder",
      kind: "length_limit",
      message: "Message exceeds the 10,000-character limit.",
    });

    const indicator = root.queryAll((e) => e.dataset.noticeKind === "length_limit")[0];
    expect(indicator).toBeDefined();
    expect(indicator.hidden).toBe(false);
    expect(indicator.textContent).toContain("10,000");
    expect(indicator.className).toContain("notice-length_limit");
  });

  it("renders an unavailable notice with the unavailability copy and kind (Req 6.4)", () => {
    const { client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));

    client.dispatch({
      type: "notice",
      tab: "builder",
      kind: "unavailable",
      message: "The Builder agent is currently unavailable. Your message was kept so you can resend it.",
    });

    const indicator = root.queryAll((e) => e.dataset.noticeKind === "unavailable")[0];
    expect(indicator).toBeDefined();
    expect(indicator.hidden).toBe(false);
    expect(indicator.textContent).toContain("unavailable");
    expect(indicator.className).toContain("notice-unavailable");
  });

  it("renders an error notice with the error copy and kind (Req 6.1/6.2)", () => {
    const { client } = setup();
    client.dispatch(hydrate(emptySnapshot("builder"), emptySnapshot("helper")));

    client.dispatch({
      type: "notice",
      tab: "helper",
      kind: "error",
      message: "The agent response failed. Any partial reply was kept.",
    });

    const indicator = root.queryAll((e) => e.dataset.noticeKind === "error")[0];
    expect(indicator).toBeDefined();
    expect(indicator.hidden).toBe(false);
    expect(indicator.textContent).toContain("failed");
    expect(indicator.className).toContain("notice-error");
  });

  it("preserves prior conversation history when a notice is shown (Req 6.5)", () => {
    const { client } = setup();
    const builder = emptySnapshot("builder", {
      entries: [
        { id: "m1", kind: "user_message", createdAt: 0, seq: 0, text: "hello" } as never,
        {
          id: "r1",
          kind: "agent_response",
          createdAt: 1,
          seq: 1,
          forMessageId: "m1",
          chunks: ["hi"],
          workItems: [],
          state: "complete",
        } as never,
      ],
    });
    client.dispatch(hydrate(builder, emptySnapshot("helper")));

    client.dispatch({
      type: "notice",
      tab: "builder",
      kind: "error",
      message: "Something failed.",
    });

    const bodies = root.queryAll((e) => e.className === "entry-body").map((b) => b.textContent);
    expect(bodies).toEqual(["hello", "hi"]);
  });
});
