import { describe, it, expect, vi } from "vitest";

/**
 * Unit tests for the AgentPanelViewProvider wiring (task 13.2).
 *
 * `vscode` is an ambient module only present in the extension host, so it is
 * mocked here with the minimal surface the provider module references at load
 * and in the code paths under test (`Disposable`). The tests target the pure
 * wiring helper and the HTML shell builder — provider registration itself is a
 * one-liner over `vscode.window.registerWebviewViewProvider` exercised in
 * integration tests (task 16.2).
 */

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
      registerWebviewViewProvider: vi.fn(),
    },
  };
});

import {
  wireWebviewMessaging,
  buildWebviewHtml,
  type MessagingWebview,
} from "../src/agent-panel-view-provider";
import type { HostToWebview, WebviewToHost } from "../src/webview/messages";
import type { HostToWebviewFlow } from "../src/webview/flow/flow-messages";

/** The Build_Surface (HostToWebview) message discriminators. */
const BUILD_MESSAGE_TYPES: ReadonlySet<HostToWebview["type"]> = new Set([
  "hydrate",
  "tabActivated",
  "entryAdded",
  "chunkAppended",
  "workItemAdded",
  "responseState",
  "submissionState",
  "notice",
]);

/**
 * Filters captured messages down to the Build_Surface union. The wiring now
 * additively posts flow messages (`hydrateFlow`/`flowNotice`) over the same
 * channel (task 13.4); the Build_Surface assertions below scope to Build
 * messages so they continue to assert only the Build behavior they own.
 */
function buildMessages(
  posted: readonly (HostToWebview | HostToWebviewFlow)[],
): HostToWebview[] {
  return posted.filter((m): m is HostToWebview =>
    BUILD_MESSAGE_TYPES.has(m.type as HostToWebview["type"]),
  );
}

/**
 * Fake webview capturing outbound host messages and exposing a way to drive
 * inbound messages, mirroring the VS Code `Webview` message surface used by the
 * wiring helper.
 */
class FakeWebview implements MessagingWebview {
  readonly posted: (HostToWebview | HostToWebviewFlow)[] = [];
  private listener: ((message: unknown) => unknown) | null = null;

  postMessage(message: HostToWebview | HostToWebviewFlow): unknown {
    this.posted.push(message);
    return true;
  }

  onDidReceiveMessage(listener: (message: unknown) => unknown) {
    this.listener = listener;
    return { dispose: () => (this.listener = null) };
  }

  /** Simulate the webview posting an intent to the host. */
  send(message: unknown): void {
    this.listener?.(message);
  }
}

describe("wireWebviewMessaging", () => {
  it("posts an initial hydrate so the webview renders from host state on wire-up", () => {
    const webview = new FakeWebview();
    wireWebviewMessaging(webview);

    // Scope to Build_Surface messages: the wiring now additively posts a
    // `hydrateFlow` on init too (task 13.4), so assert exactly one Build hydrate.
    const build = buildMessages(webview.posted);
    expect(build).toHaveLength(1);
    const first = build[0];
    expect(first.type).toBe("hydrate");
    if (first.type === "hydrate") {
      expect(first.activeTab).toBe("builder");
      expect(Object.keys(first.tabs).sort()).toEqual(["builder", "helper"]);
    }
  });

  it("validates and forwards a selectTab intent to the controller, then re-hydrates", async () => {
    const webview = new FakeWebview();
    const { controller } = wireWebviewMessaging(webview);

    const intent: WebviewToHost = { type: "selectTab", tab: "helper" };
    webview.send(intent);
    // handle() is async; let the microtask chain (handle -> hydrateAll) settle.
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.activeTab).toBe("helper");
    // A tabActivated patch was posted by the dispatcher, then a full hydrate by
    // the interim refresh strategy. Scope to Build_Surface messages so the
    // additive flow hydrates (task 13.4) do not perturb these counts.
    const build = buildMessages(webview.posted);
    const types = build.map((m) => m.type);
    expect(types).toContain("tabActivated");
    expect(types.filter((t) => t === "hydrate").length).toBeGreaterThanOrEqual(2);
    const activated = build.find((m) => m.type === "tabActivated");
    expect(activated && activated.type === "tabActivated" && activated.tab).toBe(
      "helper",
    );
  });

  it("drops malformed/unknown inbound payloads without forwarding", async () => {
    const webview = new FakeWebview();
    const { controller } = wireWebviewMessaging(webview);

    // The wiring additively kicks off the async gated flow-port factory, which
    // fails closed to Mock on this (non-macOS/arm64) platform and then posts one
    // extra `hydrateFlow` when it swaps the ports + records the verdict. Let that
    // startup swap settle FIRST, then capture the baseline, so this test cleanly
    // asserts that MALFORMED INBOUND INPUT specifically produces no further posts
    // (the concern this test owns), independent of the one-time startup swap.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const postedAfterInit = webview.posted.length;

    webview.send({ type: "not-a-real-intent" });
    webview.send(null);
    webview.send(42);
    await Promise.resolve();

    // Active tab unchanged and nothing further posted.
    expect(controller.activeTab).toBe("builder");
    expect(webview.posted).toHaveLength(postedAfterInit);
  });
});

describe("buildWebviewHtml", () => {
  it("embeds the script uri, a CSP with the nonce, and the #app root", () => {
    const html = buildWebviewHtml(
      "vscode-webview://abc/dist/webview/main.js",
      "vscode-webview://abc",
      "TESTNONCE123",
    );

    expect(html).toContain('<div id="app"></div>');
    expect(html).toContain('src="vscode-webview://abc/dist/webview/main.js"');
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("script-src 'nonce-TESTNONCE123'");
    expect(html).toContain('nonce="TESTNONCE123"');
  });
});
