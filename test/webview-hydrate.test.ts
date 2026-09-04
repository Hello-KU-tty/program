import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import type { VsCodeApi } from "../src/webview/vscode-api";
import type { HostToWebview, WebviewToHost } from "../src/webview/messages";
import type {
  AgentResponseEntry,
  ConversationEntry,
  TabStateSnapshot,
  WorkStreamItem,
} from "../src/core/types";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

/**
 * Example-based unit tests for task 12.3 (hydrate / re-hydration handling in the
 * webview). These verify that a second `hydrate` fully REPLACES the prior
 * projection and DOM so that webview disposal/reveal restores state from the
 * host (Req 1.5), and that re-hydration faithfully reflects the snapshot's
 * active tab even when a stream landed in a non-active tab (Req 3.5).
 *
 * The webview owns no authoritative state; the host re-pushes `hydrate` on
 * reveal (wired by task 13.2). So re-hydration must:
 * - restore entries in order with no duplication,
 * - restore per-tab draft and submission state and the active tab,
 * - overwrite any local optimistic change (typed draft / toggled work item),
 * - clear any transient notice, and
 * - render a non-active tab's in-progress content while keeping the snapshot's
 *   active tab active.
 */

function snapshot(
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

function userEntry(id: string, seq: number, text: string): ConversationEntry {
  return { id, kind: "user_message", createdAt: seq, seq, text } as ConversationEntry;
}

function workItem(
  overrides: Partial<WorkStreamItem> & { id: string; seq: number },
): WorkStreamItem {
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

/** Captures posted intents and lets the test push host messages back. */
class CaptureApi implements VsCodeApi {
  readonly posted: WebviewToHost[] = [];
  postMessage(message: WebviewToHost): void {
    this.posted.push(message);
  }
}

describe("webview re-hydration (task 12.3)", () => {
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

  function conversationBodies(): string[] {
    return root
      .queryAll((e) => e.className === "entry-body")
      .map((b) => b.textContent);
  }

  function entryIds(): string[] {
    return root
      .queryAll((e) => typeof e.dataset.entryId === "string" && e.dataset.entryId.length > 0)
      .map((e) => e.dataset.entryId as string);
  }

  it("re-hydrate replaces entries without duplication and restores order (Req 1.5)", () => {
    const { client, store } = setup();

    // First hydrate: builder has one exchange.
    client.dispatch(
      hydrate(
        snapshot("builder", {
          entries: [userEntry("m1", 0, "first"), agentEntry("r1", 1, ["reply one"])],
        }),
        snapshot("helper"),
      ),
    );
    expect(entryIds()).toEqual(["m1", "r1"]);
    expect(conversationBodies()).toEqual(["first", "reply one"]);

    // Second hydrate (e.g. after webview reveal): a different, longer history.
    client.dispatch(
      hydrate(
        snapshot("builder", {
          entries: [
            userEntry("m2", 0, "alpha"),
            agentEntry("r2", 1, ["beta"]),
            userEntry("m3", 2, "gamma"),
          ],
        }),
        snapshot("helper"),
      ),
    );

    // The prior entries are fully replaced (no m1/r1 remnants, no duplication)
    // and the new entries render in order.
    expect(entryIds()).toEqual(["m2", "r2", "m3"]);
    expect(conversationBodies()).toEqual(["alpha", "beta", "gamma"]);

    // The projection matches too (single builder tab holds exactly 3 entries).
    expect(store.current?.tabs.builder.entries.map((e) => e.id)).toEqual([
      "m2",
      "r2",
      "m3",
    ]);
  });

  it("re-hydrate restores per-tab draft, submission state, and active tab (Req 1.5)", () => {
    const { client, store } = setup();

    client.dispatch(hydrate(snapshot("builder"), snapshot("helper"), "builder"));

    // Second hydrate carries drafts, a locked builder, and helper active.
    client.dispatch(
      hydrate(
        snapshot("builder", { draft: "builder draft", submissionEnabled: false }),
        snapshot("helper", { draft: "helper draft", submissionEnabled: true }),
        "helper",
      ),
    );

    const inputs = root.queryAll((e) => e.className === "message-input");
    // Inputs are created in tab order: [builder, helper].
    expect(inputs[0].value).toBe("builder draft");
    expect(inputs[1].value).toBe("helper draft");

    const sendButtons = root.queryAll((e) => e.className === "send-button");
    expect(sendButtons[0].disabled).toBe(true); // builder locked
    expect(sendButtons[1].disabled).toBe(false); // helper enabled

    // Active tab is helper: its panel is visible, builder's hidden.
    const panels = root.queryAll((e) => e.className === "tab-panel");
    const builderPanel = panels.find((p) => p.dataset.tab === "builder");
    const helperPanel = panels.find((p) => p.dataset.tab === "helper");
    expect(builderPanel?.hidden).toBe(true);
    expect(helperPanel?.hidden).toBe(false);

    // The active-agent label reflects the helper.
    const label = root.queryAll((e) => e.className === "active-agent-label")[0];
    expect(label.textContent).toBe("Helper_Agent");

    expect(store.current?.activeTab).toBe("helper");
  });

  it("re-hydrate overwrites a locally-typed draft with the authoritative snapshot (Req 1.5)", () => {
    const { api, client } = setup();

    client.dispatch(hydrate(snapshot("builder", { draft: "" }), snapshot("helper")));

    // User types locally (optimistic). This posts a draftChanged intent and
    // updates the local view model, but the host is authoritative.
    const builderInput = root.queryAll((e) => e.className === "message-input")[0];
    builderInput.value = "local unsent text";
    builderInput.dispatchEvent("input", {});
    expect(api.posted).toContainEqual({
      type: "draftChanged",
      tab: "builder",
      text: "local unsent text",
    });

    // A re-hydrate arrives with a different authoritative draft; it wins.
    client.dispatch(
      hydrate(snapshot("builder", { draft: "authoritative" }), snapshot("helper")),
    );

    const inputAfter = root.queryAll((e) => e.className === "message-input")[0];
    expect(inputAfter.value).toBe("authoritative");
  });

  it("re-hydrate resets a locally-toggled work item to the snapshot's expand state (Req 1.5)", () => {
    const { api, client } = setup();

    // A long work item, collapsed by default.
    client.dispatch(
      hydrate(
        snapshot("builder", {
          entries: [
            agentEntry("r1", 0, [""], [
              workItem({ id: "wa", seq: 1, lineCount: 5, detail: "a\nb\nc\nd\ne", expanded: false }),
            ]),
          ],
        }),
        snapshot("helper"),
      ),
    );

    // User expands it locally.
    root.queryAll((e) => e.className === "work-item-toggle")[0].click();
    expect(api.posted).toContainEqual({ type: "toggleWorkItem", tab: "builder", itemId: "wa" });
    let wa = root.queryAll((e) => e.dataset.itemId === "wa")[0];
    expect(wa.dataset.expanded).toBe("true");

    // Re-hydrate with the host's default (collapsed). View-local expand state
    // resets to the snapshot value (acceptable per design; host doesn't persist).
    client.dispatch(
      hydrate(
        snapshot("builder", {
          entries: [
            agentEntry("r1", 0, [""], [
              workItem({ id: "wa", seq: 1, lineCount: 5, detail: "a\nb\nc\nd\ne", expanded: false }),
            ]),
          ],
        }),
        snapshot("helper"),
      ),
    );

    wa = root.queryAll((e) => e.dataset.itemId === "wa")[0];
    expect(wa.dataset.expanded).toBe("false");
  });

  it("re-hydrate clears a prior transient notice (Req 1.5/6.5)", () => {
    const { client } = setup();

    client.dispatch(hydrate(snapshot("builder"), snapshot("helper")));

    // Host emits an unavailable notice for builder.
    client.dispatch({
      type: "notice",
      tab: "builder",
      kind: "unavailable",
      message: "Builder_Agent is unavailable.",
    });
    let indicator = root.queryAll((e) => e.dataset.noticeKind === "unavailable")[0];
    expect(indicator).toBeDefined();
    expect(indicator.hidden).toBe(false);

    // A re-hydrate carries no transient notice: it must be cleared from the DOM.
    client.dispatch(hydrate(snapshot("builder"), snapshot("helper")));

    const stillNoticed = root.queryAll((e) => e.dataset.noticeKind === "unavailable");
    expect(stillNoticed.length).toBe(0);
    const builderIndicator = root.queryAll((e) => e.className === "length-indicator")[0];
    expect(builderIndicator.hidden).toBe(true);
    expect(builderIndicator.textContent).toBe("");
  });

  it("renders an in-progress builder response while helper stays active, then a hydrate keeps helper active (Req 3.5)", () => {
    const { client, store } = setup();

    // Helper is active; a Builder turn is in-flight (in_progress) with partial
    // content and a work item. This mirrors a stream that landed in the
    // non-active Builder tab (Req 3.5: it must not switch the active tab).
    const builderInFlight = snapshot("builder", {
      submissionEnabled: false,
      entries: [
        userEntry("m1", 0, "build it"),
        agentEntry(
          "r1",
          1,
          ["partial "],
          [workItem({ id: "w1", seq: 2, title: "running tool" })],
          "in_progress",
        ),
      ],
    });
    client.dispatch(hydrate(builderInFlight, snapshot("helper"), "helper"));

    // Helper remains the active tab.
    expect(store.current?.activeTab).toBe("helper");
    const panels = root.queryAll((e) => e.className === "tab-panel");
    expect(panels.find((p) => p.dataset.tab === "helper")?.hidden).toBe(false);
    expect(panels.find((p) => p.dataset.tab === "builder")?.hidden).toBe(true);

    // Builder content is faithfully rendered even though it's the hidden tab:
    // its (hidden) panel holds the user message, partial reply, and work item.
    const builderPanel = panels.find((p) => p.dataset.tab === "builder") as FakeElement;
    const builderBodies = builderPanel
      .queryAll((e) => e.className === "entry-body")
      .map((b) => b.textContent);
    expect(builderBodies).toEqual(["build it", "partial "]);
    const builderItems = builderPanel.queryAll(
      (e) => typeof e.dataset.itemId === "string" && e.dataset.itemId.length > 0,
    );
    expect(builderItems.map((e) => e.dataset.itemId)).toEqual(["w1"]);

    // The builder tab shows the in-progress indicator (Req 3.4) in its panel.
    const builderProgress = builderPanel.queryAll((e) => e.className === "in-progress")[0];
    expect(builderProgress.hidden).toBe(false);

    // A subsequent hydrate that still marks helper active must keep helper
    // active — the webview faithfully reflects the snapshot's activeTab and does
    // not switch to builder just because builder content changed.
    client.dispatch(hydrate(builderInFlight, snapshot("helper"), "helper"));
    expect(store.current?.activeTab).toBe("helper");
    const panelsAfter = root.queryAll((e) => e.className === "tab-panel");
    expect(panelsAfter.find((p) => p.dataset.tab === "helper")?.hidden).toBe(false);
    expect(panelsAfter.find((p) => p.dataset.tab === "builder")?.hidden).toBe(true);
  });
});
