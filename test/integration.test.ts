import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Task 16.2 - Integration-style tests for IDE contribution and the FUNCTIONAL
 * behavior behind each latency/rendering budget.
 *
 * ## Scope and an important caveat on latency budgets
 *
 * The design's latency budgets - activation within 3s (Req 1.1), tab activation
 * within 500ms (Req 1.4), streamed chunks within 200ms (Req 3.2), in-progress
 * indicator within 500ms (Req 3.4), work items within 500ms (Req 4.1) - are
 * ENVIRONMENTAL properties of the running VS Code extension host and its
 * webview renderer. They cannot be meaningfully asserted in-process: there is no
 * real extension host, no real webview event loop, and no real paint pipeline
 * here. A true budget check requires the @vscode/test-electron harness driving a
 * real Electron/VS Code instance.
 *
 * We deliberately DO NOT add @vscode/test-electron (heavy tooling, out of scope
 * for this task). Instead, for each budget we assert the FUNCTIONAL behavior the
 * budget wraps, driven deterministically in-process through the real seams:
 *
 *   - activation       -> PanelController/dispatcher wiring + provider registration
 *   - tab activation   -> selectTab + dispatcher + renderer swaps active/inactive
 *   - streamed chunks  -> MockAdapter events -> controller -> hydrate -> renderer,
 *                         in receipt order
 *   - in-progress ind. -> shown while a response streams, hidden after completion
 *   - work items       -> appear (in order) and long items collapse with a toggle
 *   - failed responses -> rendered visually distinct from completed
 *   - disposal/reveal  -> re-hydrate preserves conversation order and draft
 *
 * TRUE latency/electron-host verification of the millisecond budgets is a
 * documented FOLLOW-UP requiring @vscode/test-electron; these tests validate
 * that the behavior gated by each budget is correct.
 *
 * The webview renderer is framework-free plain DOM, exercised via the shared
 * in-file DOM stub (test/support/fake-dom.ts).
 */

// ---------------------------------------------------------------------------
// Minimal `vscode` mock - only the surface the extension module references.
// Kept intentionally small per task guidance.
// ---------------------------------------------------------------------------

vi.mock("vscode", () => {
  class Disposable {
    constructor(private readonly fn: () => void) {}
    dispose(): void {
      this.fn();
    }
  }
  return {
    Disposable,
    Uri: {
      joinPath: (...parts: unknown[]) => ({ parts }),
    },
    window: {
      // Records provider registrations so the activation test can assert wiring.
      registerWebviewViewProvider: vi.fn(
        (viewId: string, provider: unknown) =>
          new Disposable(() => {
            void viewId;
            void provider;
          }),
      ),
    },
  };
});

import * as vscode from "vscode";
import { activate, deactivate } from "../src/extension";
import { AGENT_PANEL_VIEW_ID } from "../src/agent-panel-view-provider";

import { PanelController } from "../src/core/panel-controller";
import { WebviewDispatcher } from "../src/webview/dispatcher";
import { MockAdapter } from "../src/adapter/mock-adapter";
import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import type { VsCodeApi } from "../src/webview/vscode-api";
import type { HostToWebview, WebviewToHost } from "../src/webview/messages";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

// ---------------------------------------------------------------------------
// Req 1.1 - activation wires the provider (functional behavior behind the 3s
// contribution budget).
// ---------------------------------------------------------------------------

describe("extension activation contributes the Agent_Panel (Req 1.1 wiring)", () => {
  beforeEach(() => {
    (vscode.window.registerWebviewViewProvider as ReturnType<typeof vi.fn>).mockClear();
  });

  it("registers the webview view provider and pushes a disposable into subscriptions", () => {
    const subscriptions: Array<{ dispose(): void }> = [];
    const context = {
      subscriptions,
      extensionUri: { fake: "uri" },
    } as unknown as vscode.ExtensionContext;

    activate(context);

    const register = vscode.window.registerWebviewViewProvider as ReturnType<typeof vi.fn>;
    expect(register).toHaveBeenCalledTimes(1);
    // The provider is registered against the right-side view id contributed in
    // package.json (viewsContainers.secondarySideBar -> views).
    expect(register.mock.calls[0][0]).toBe(AGENT_PANEL_VIEW_ID);

    // The registration disposable is tracked for cleanup (Req 1.1 lifecycle).
    expect(subscriptions).toHaveLength(1);
    expect(typeof subscriptions[0].dispose).toBe("function");

    // deactivate is a no-op (disposables handle cleanup) and must not throw.
    expect(() => deactivate()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// In-process host<->webview harness.
//
// Wires a real PanelController + WebviewDispatcher (host) to a real
// ViewModelStore + PanelRenderer (webview) via a WebviewClient, so an inbound
// intent flows host->controller->dispatcher(hydrate/patches)->webview->renderer,
// exactly like agent-panel-view-provider.wireWebviewMessaging does at runtime
// (including the interim full-refresh via hydrateAll after each handled intent).
// ---------------------------------------------------------------------------

class HostWebviewHarness {
  readonly controller: PanelController;
  readonly dispatcher: WebviewDispatcher;
  readonly adapter: MockAdapter;
  readonly root: FakeElement;
  readonly client: WebviewClient;
  private readonly restore: () => void;

  constructor(adapter = new MockAdapter()) {
    const dom = installFakeDom();
    this.restore = dom.restore;
    this.root = dom.createElement("div");
    this.adapter = adapter;

    // Webview side: a client whose `post` (webview->host intents) we feed into
    // the dispatcher, and whose `dispatch` (host->webview) is driven by the
    // dispatcher's `post` callback.
    let dispatcherRef: WebviewDispatcher;
    const api: VsCodeApi = {
      postMessage: (intent: WebviewToHost) => {
        void dispatcherRef.handle(intent).then(() => {
          dispatcherRef.hydrateAll();
        });
      },
    };
    this.client = new WebviewClient(api);
    bootstrap(this.root as unknown as HTMLElement, this.client);

    // Host side: controller + dispatcher; dispatcher posts host->webview
    // messages straight into the webview client's dispatch.
    this.controller = new PanelController(this.adapter, {
      onNotice: (notice) => this.dispatcher.forwardNotice(notice),
    });
    this.dispatcher = new WebviewDispatcher(this.controller, (message: HostToWebview) => {
      this.client.dispatch(message);
    });
    dispatcherRef = this.dispatcher;

    // First paint from host state (mirrors wireWebviewMessaging).
    this.dispatcher.hydrateAll();
  }

  /** Await microtasks so the async submit -> hydrate chain settles. */
  async settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  dispose(): void {
    this.restore();
  }

  // --- DOM query helpers scoped to a tab panel ---
  panel(tab: "builder" | "helper"): FakeElement {
    return this.root
      .queryAll((e) => e.className === "tab-panel")
      .find((p) => p.dataset.tab === tab) as FakeElement;
  }

  bodies(tab: "builder" | "helper"): string[] {
    return this.panel(tab)
      .queryAll((e) => e.className === "entry-body")
      .map((b) => b.textContent);
  }

  progressHidden(tab: "builder" | "helper"): boolean {
    return this.panel(tab).queryAll((e) => e.className === "in-progress")[0].hidden;
  }
}

// ---------------------------------------------------------------------------
// Req 1.4 - tab activation swaps active/inactive (functional behavior behind
// the 500ms budget).
// ---------------------------------------------------------------------------

describe("tab activation renders and swaps active/inactive (Req 1.4 behavior)", () => {
  let h: HostWebviewHarness;
  beforeEach(() => {
    h = new HostWebviewHarness();
  });
  afterEach(() => h.dispose());

  it("selecting Helper marks it active and marks Builder inactive", async () => {
    // Initially Builder active.
    expect(h.panel("builder").hidden).toBe(false);
    expect(h.panel("helper").hidden).toBe(true);

    // Webview posts a selectTab intent (as if the user clicked the Helper tab).
    h.client.post({ type: "selectTab", tab: "helper" });
    await h.settle();

    expect(h.controller.activeTab).toBe("helper");
    expect(h.panel("helper").hidden).toBe(false);
    expect(h.panel("builder").hidden).toBe(true);

    // Swap back to Builder.
    h.client.post({ type: "selectTab", tab: "builder" });
    await h.settle();
    expect(h.controller.activeTab).toBe("builder");
    expect(h.panel("builder").hidden).toBe(false);
    expect(h.panel("helper").hidden).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Req 3.2 / 3.4 - streamed chunks appear in receipt order and the in-progress
// indicator shows while streaming, hides after completion.
// ---------------------------------------------------------------------------

describe("streamed chunks and in-progress indicator (Req 3.2/3.4 behavior)", () => {
  let h: HostWebviewHarness;
  beforeEach(() => {
    h = new HostWebviewHarness();
  });
  afterEach(() => h.dispose());

  it("appends chunks in order and toggles the in-progress indicator around the stream", async () => {
    // Submit a Builder message.
    h.client.post({ type: "submit", tab: "builder", text: "build a thing" });
    await h.settle();

    const turn = h.adapter.lastTurn;
    expect(turn).toBeDefined();

    // started -> begins the response; in-progress indicator should be visible.
    turn!.script({ kind: "started", turnId: turn!.turnId });
    turn!.emitNext();
    h.dispatcher.hydrateAll();
    expect(h.progressHidden("builder")).toBe(false);

    // Two chunks arrive in order.
    turn!.script({ kind: "message_chunk", text: "Hel" });
    turn!.script({ kind: "message_chunk", text: "lo!" });
    turn!.emitNext();
    turn!.emitNext();
    h.dispatcher.hydrateAll();

    // The response body is the concatenation of chunks in receipt order.
    expect(h.bodies("builder")).toEqual(["build a thing", "Hello!"]);
    // Still streaming -> indicator visible.
    expect(h.progressHidden("builder")).toBe(false);

    // completed -> indicator hides and the response is complete.
    turn!.script({ kind: "completed" });
    turn!.emitNext();
    h.dispatcher.hydrateAll();
    expect(h.progressHidden("builder")).toBe(true);

    // The completed response shows the full ordered content (Req 3.6).
    expect(h.bodies("builder")).toEqual(["build a thing", "Hello!"]);

    // Submission is re-enabled after completion (Req 3.3).
    const send = h
      .panel("builder")
      .queryAll((e) => e.className === "send-button")[0];
    expect(send.disabled).toBe(false);
  });

  it("applies a Builder stream to the Builder tab while Helper stays active (Req 3.5 behavior)", async () => {
    // Start a Builder turn, then switch the active tab to Helper.
    h.client.post({ type: "submit", tab: "builder", text: "in background" });
    await h.settle();
    h.client.post({ type: "selectTab", tab: "helper" });
    await h.settle();
    expect(h.controller.activeTab).toBe("helper");

    // The Builder stream lands while Helper is active.
    const turn = h.adapter.lastTurn!;
    turn.scriptAll([
      { kind: "started", turnId: turn.turnId },
      { kind: "message_chunk", text: "working" },
      { kind: "completed" },
    ]);
    turn.emitAll();
    h.dispatcher.hydrateAll();

    // Active tab unchanged; Builder content applied to the (hidden) Builder tab.
    expect(h.controller.activeTab).toBe("helper");
    expect(h.panel("helper").hidden).toBe(false);
    expect(h.panel("builder").hidden).toBe(true);
    expect(h.bodies("builder")).toEqual(["in background", "working"]);
  });
});

// ---------------------------------------------------------------------------
// Req 4.1 / 4.4 - work items appear (in order) and long items render collapsed
// with a working toggle.
// ---------------------------------------------------------------------------

describe("work-stream items appear and long items collapse with a toggle (Req 4.1/4.4 behavior)", () => {
  let h: HostWebviewHarness;
  beforeEach(() => {
    h = new HostWebviewHarness();
  });
  afterEach(() => h.dispose());

  it("renders work items in receipt order; long items collapsed with a working toggle", async () => {
    h.client.post({ type: "submit", tab: "builder", text: "run tools" });
    await h.settle();

    const turn = h.adapter.lastTurn!;
    turn.scriptAll([
      { kind: "started", turnId: turn.turnId },
      {
        kind: "work_item",
        item: {
          id: "w1",
          seq: 0,
          itemType: "command",
          title: "first",
          detail: "one line",
          lineCount: 1,
          status: "running",
          expanded: true,
        },
      },
      {
        kind: "work_item",
        item: {
          id: "w2",
          seq: 0, // TabState reassigns seq at receipt time; receipt order wins.
          itemType: "test",
          title: "second-long",
          detail: "a\nb\nc\nd\ne",
          lineCount: 5,
          status: "running",
          expanded: false,
        },
      },
      { kind: "completed" },
    ]);
    turn.emitAll();
    h.dispatcher.hydrateAll();

    const builder = h.panel("builder");

    // Work items render in receipt (seq) order beneath the response.
    const titles = builder
      .queryAll((e) => e.className === "work-item-title")
      .map((e) => e.textContent);
    expect(titles).toEqual(["first", "second-long"]);

    // The long (>3 line) item is collapsed by default with its detail hidden
    // and offers a toggle; the short item does not offer a toggle.
    const toggles = builder.queryAll((e) => e.className === "work-item-toggle");
    expect(toggles).toHaveLength(1);
    expect(toggles[0].textContent).toBe("Expand");

    const w2 = builder.queryAll((e) => e.dataset.itemId === "w2")[0];
    expect(w2.dataset.expanded).toBe("false");
    const w2Detail = w2.queryAll((e) => e.className === "work-item-detail")[0];
    expect(w2Detail.hidden).toBe(true);

    // Toggling expands only that item (view-local; posts a toggleWorkItem
    // intent that the host treats as a no-op).
    toggles[0].click();
    const w2After = h.panel("builder").queryAll((e) => e.dataset.itemId === "w2")[0];
    expect(w2After.dataset.expanded).toBe("true");
    const w1After = h.panel("builder").queryAll((e) => e.dataset.itemId === "w1")[0];
    expect(w1After.dataset.expanded).toBe("true"); // unchanged short item
  });
});

// ---------------------------------------------------------------------------
// Req 6.3 - failed responses render visually distinct from completed ones.
// ---------------------------------------------------------------------------

describe("failed responses render visually distinct (Req 6.3 behavior)", () => {
  let h: HostWebviewHarness;
  beforeEach(() => {
    h = new HostWebviewHarness();
  });
  afterEach(() => h.dispose());

  it("a failed response is marked failed and keeps its partial content", async () => {
    h.client.post({ type: "submit", tab: "builder", text: "will fail" });
    await h.settle();

    const turn = h.adapter.lastTurn!;
    turn.scriptAll([
      { kind: "started", turnId: turn.turnId },
      { kind: "message_chunk", text: "partial" },
      { kind: "failed", error: { code: "stream_error", message: "boom" } },
    ]);
    turn.emitAll();
    h.dispatcher.hydrateAll();

    const builder = h.panel("builder");
    const responses = builder.queryAll((e) => e.dataset.state === "failed");
    expect(responses).toHaveLength(1);
    expect(responses[0].className).toContain("entry-failed");

    // Partial content retained (Req 6.2/6.5).
    const failedBody = responses[0].queryAll((e) => e.className === "entry-body")[0];
    expect(failedBody.textContent).toBe("partial");

    // A failure marker distinguishes it from a completed response.
    expect(responses[0].queryAll((e) => e.className === "entry-failed").length).toBe(1);

    // Submission re-enabled after failure (Req 3.7/6.2).
    const send = builder.queryAll((e) => e.className === "send-button")[0];
    expect(send.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Req 1.5 - webview disposal/re-reveal re-hydrates from host state, preserving
// conversation order and the unsent draft.
// ---------------------------------------------------------------------------

describe("disposal/re-reveal re-hydrates preserving order and draft (Req 1.5 behavior)", () => {
  let h: HostWebviewHarness;
  beforeEach(() => {
    h = new HostWebviewHarness();
  });
  afterEach(() => h.dispose());

  it("a full re-hydrate from host state restores conversation order and the draft", async () => {
    // Build a small Builder conversation.
    h.client.post({ type: "submit", tab: "builder", text: "first message" });
    await h.settle();
    const turn = h.adapter.lastTurn!;
    turn.scriptAll([
      { kind: "started", turnId: turn.turnId },
      { kind: "message_chunk", text: "a reply" },
      { kind: "completed" },
    ]);
    turn.emitAll();
    h.dispatcher.hydrateAll();

    // The user types an unsent draft in the Helper tab; the host records it.
    h.client.post({ type: "draftChanged", tab: "helper", text: "half-typed helper note" });
    await h.settle();

    // Baseline: builder conversation present, helper draft recorded on host.
    expect(h.bodies("builder")).toEqual(["first message", "a reply"]);
    expect(h.controller.getTabSnapshot("helper").draft).toBe("half-typed helper note");

    // Simulate webview disposal + reveal: a brand-new webview (fresh store +
    // renderer + client) is wired to the SAME host controller/dispatcher, and
    // the host pushes a fresh full hydrate (as onDidChangeVisibility does).
    const dom = installFakeDom();
    try {
      const newRoot = dom.createElement("div");
      const newClient = new WebviewClient({ postMessage: () => undefined });
      bootstrap(newRoot as unknown as HTMLElement, newClient);

      // Rewire a dispatcher's post to the NEW webview and re-hydrate.
      const rewired = new WebviewDispatcher(h.controller, (message: HostToWebview) => {
        newClient.dispatch(message);
      });
      rewired.hydrateAll();

      // The recreated webview restored the Builder conversation in order...
      const newBuilderPanel = newRoot
        .queryAll((e) => e.className === "tab-panel")
        .find((p) => p.dataset.tab === "builder") as FakeElement;
      const restoredBodies = newBuilderPanel
        .queryAll((e) => e.className === "entry-body")
        .map((b) => b.textContent);
      expect(restoredBodies).toEqual(["first message", "a reply"]);

      // ...and restored the unsent Helper draft from authoritative host state.
      const newHelperInput = newRoot
        .queryAll((e) => e.className === "tab-panel")
        .find((p) => p.dataset.tab === "helper")!
        .queryAll((e) => e.className === "message-input")[0];
      expect(newHelperInput.value).toBe("half-typed helper note");
    } finally {
      dom.restore();
    }
  });
});
