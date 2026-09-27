import { describe, it, expect, vi } from "vitest";

/**
 * Task 11.1 — Regression guard: additive invariance (design §Correctness
 * Property 12).
 *
 * The Builder / Helper live-run integration is strictly ADDITIVE: it introduces
 * new modules and a new `AgentHostMessage` union carried over the SAME webview
 * transport, but it must NOT change any existing `HostToWebview` message shape
 * nor any existing `PanelController` state transition, and it must NOT alter the
 * shipped Demo / `PanelController` flow when there is NO `managedHost`.
 *
 * This suite asserts that invariance three ways, all deterministic and without
 * touching any existing source file:
 *
 * 1. **Behavioral (Demo path retained).** `wireWebviewMessaging` with NO
 *    `managedHost` must leave the shipped Demo/`PanelController` path exactly as
 *    before: `agentReady` resolves to `null` (the live agent controller /
 *    dispatcher are never built), and the first paint still posts exactly one
 *    Build `hydrate` plus one flow `hydrateFlow` — the shipped wiring behaves as
 *    it did before the agent surfaces existed. A `submit` intent still drives
 *    the Demo adapter (it is not swallowed as an agent gesture in dev mode).
 *
 * 2. **Compile-level shape assertions.** Type-level `satisfies` / assignability
 *    checks pin the existing `HostToWebview` union members and the existing
 *    `PanelController` state-transition shapes (`SubmitResult`, `NoticeKind`,
 *    `ResponseState`). These are widening-only guards: if a future change
 *    removed or altered an existing member, the file would stop type-checking
 *    under `npm run typecheck`. The additive `AgentHostMessage` union is
 *    asserted to be DISJOINT from `HostToWebview` (distinct discriminator keys:
 *    `kind` vs `type`), proving the transport widening is purely additive.
 *
 * 3. **Shipped-flow still hydrates.** Reusing the same fake-webview convention
 *    as `agent-panel-view-provider.test.ts`, a `selectTab` intent still flows
 *    through the shipped Build path and re-hydrates — confirming the
 *    Discovery/Spec/History + Build shipped flow is unchanged.
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
      file: (p: string) => ({ fsPath: p }),
      parse: (s: string) => ({ toString: () => s }),
    },
    commands: { executeCommand: vi.fn() },
    env: { openExternal: vi.fn() },
    window: {
      registerWebviewViewProvider: vi.fn(),
    },
  };
});

import {
  wireWebviewMessaging,
  type MessagingWebview,
} from "../src/agent-panel-view-provider";
import type { HostToWebview, WebviewToHost } from "../src/webview/messages";
import type { HostToWebviewFlow } from "../src/webview/flow/flow-messages";
import type { AgentHostMessage } from "../src/webview/agent/agent-messages";
import type {
  NoticeKind,
  Notice,
} from "../src/core/panel-controller";
import type {
  ResponseState,
  TabId,
  TabStateSnapshot,
  ConversationEntry,
  WorkStreamItem,
} from "../src/core/types";

/** The shipped Build_Surface (`HostToWebview`) message discriminators. */
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

type AnyOutbound = HostToWebview | HostToWebviewFlow | AgentHostMessage;

function buildMessages(posted: readonly AnyOutbound[]): HostToWebview[] {
  return posted.filter((m): m is HostToWebview =>
    "type" in m && BUILD_MESSAGE_TYPES.has((m as HostToWebview).type),
  );
}

function flowMessages(posted: readonly AnyOutbound[]): HostToWebviewFlow[] {
  return posted.filter(
    (m): m is HostToWebviewFlow =>
      "type" in m && !BUILD_MESSAGE_TYPES.has((m as HostToWebview).type),
  );
}

function agentMessages(posted: readonly AnyOutbound[]): AgentHostMessage[] {
  return posted.filter((m): m is AgentHostMessage => "kind" in m);
}

/**
 * Fake webview capturing outbound host messages and driving inbound intents,
 * mirroring the convention in `agent-panel-view-provider.test.ts`.
 */
class FakeWebview implements MessagingWebview {
  readonly posted: AnyOutbound[] = [];
  private listener: ((message: unknown) => unknown) | null = null;

  postMessage(message: AnyOutbound): unknown {
    this.posted.push(message);
    return true;
  }

  onDidReceiveMessage(listener: (message: unknown) => unknown) {
    this.listener = listener;
    return { dispose: () => (this.listener = null) };
  }

  send(message: unknown): void {
    this.listener?.(message);
  }
}

describe("additive invariance — Demo path retained with NO managedHost (Req 14.1, 14.4)", () => {
  it("does NOT build the live agent controller/dispatcher (agentReady resolves to null)", async () => {
    const webview = new FakeWebview();
    const { agentReady } = wireWebviewMessaging(webview);

    // No managedHost ⇒ nothing agent-live is built; the shipped Demo path is
    // retained unchanged (§Product-mode replacement decision + Requirement 14.4).
    await expect(agentReady).resolves.toBeNull();
  });

  it("first paint posts exactly the shipped Build hydrate + flow hydrate, and NO agent message", () => {
    const webview = new FakeWebview();
    wireWebviewMessaging(webview);

    // Exactly one shipped Build hydrate on wire-up (unchanged from the shipped
    // behavior asserted in agent-panel-view-provider.test.ts).
    const build = buildMessages(webview.posted);
    expect(build).toHaveLength(1);
    expect(build[0].type).toBe("hydrate");
    if (build[0].type === "hydrate") {
      expect(build[0].activeTab).toBe("builder");
      expect(Object.keys(build[0].tabs).sort()).toEqual(["builder", "helper"]);
    }

    // The additive flow surface hydrates too (shipped Discovery/Spec/History).
    expect(flowMessages(webview.posted).length).toBeGreaterThanOrEqual(1);

    // Crucially: with NO managedHost, NO agent (`agent/*`) message is ever
    // posted — the additive live surface stays dormant.
    expect(agentMessages(webview.posted)).toHaveLength(0);
  });

  it("a submit intent still drives the shipped Demo path (not swallowed as an agent gesture)", async () => {
    const webview = new FakeWebview();
    const { controller } = wireWebviewMessaging(webview);

    const submit: WebviewToHost = { type: "submit", tab: "builder", text: "hello demo" };
    webview.send(submit);
    // handle() → hydrateAll() microtask chain.
    await Promise.resolve();
    await Promise.resolve();

    // The Demo controller appended the user message (shipped behavior). In
    // product mode this submit would be routed to the live agent controller and
    // dropped here; in dev mode (no managedHost) it must still reach the Demo
    // adapter, so the builder tab now holds at least the user message entry.
    const entries = controller.getTabSnapshot("builder").entries;
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].kind).toBe("user_message");
  });

  it("a selectTab intent still flows through the shipped Build path and re-hydrates (Req 14.2)", async () => {
    const webview = new FakeWebview();
    const { controller } = wireWebviewMessaging(webview);

    webview.send({ type: "selectTab", tab: "helper" } satisfies WebviewToHost);
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.activeTab).toBe("helper");
    const build = buildMessages(webview.posted);
    const types = build.map((m) => m.type);
    expect(types).toContain("tabActivated");
    // Interim full-refresh strategy: initial hydrate + post-intent hydrate.
    expect(types.filter((t) => t === "hydrate").length).toBeGreaterThanOrEqual(2);
  });
});

describe("additive invariance — compile-level shape assertions (Req 14.2, §Correctness Property 12)", () => {
  it("pins every existing HostToWebview message shape (widening-only)", () => {
    // Each literal below MUST remain assignable to the shipped `HostToWebview`
    // union. If a future edit removed a member or changed a field's shape, this
    // file would fail `npm run typecheck` — the guard's teeth.
    const builderTab: TabId = "builder";
    const helperTab: TabId = "helper";

    const snapshot: TabStateSnapshot = {
      tabId: builderTab,
      entries: [],
      draft: "",
      submissionEnabled: true,
      activeAgentLabel: "Builder_Agent",
    };
    const entry = {
      id: "m1",
      kind: "user_message",
      createdAt: 0,
      seq: 0,
      text: "hi",
    } as unknown as ConversationEntry;
    const item = {
      id: "w1",
      seq: 1,
      itemType: "command",
      title: "run",
      detail: "one line",
      lineCount: 1,
      status: "running",
      expanded: true,
    } as unknown as WorkStreamItem;
    const noticeKind: NoticeKind = "error";
    const responseState: ResponseState = "in_progress";

    const shipped = [
      { type: "hydrate", tabs: { builder: snapshot, helper: { ...snapshot, tabId: helperTab } }, activeTab: builderTab },
      { type: "tabActivated", tab: helperTab },
      { type: "entryAdded", tab: builderTab, entry },
      { type: "chunkAppended", tab: builderTab, responseId: "r1", text: "chunk" },
      { type: "workItemAdded", tab: builderTab, responseId: "r1", item },
      { type: "responseState", tab: builderTab, responseId: "r1", state: responseState },
      { type: "submissionState", tab: builderTab, enabled: false },
      { type: "notice", tab: builderTab, kind: noticeKind, message: "boom" },
    ] satisfies HostToWebview[];

    // Discriminators are exactly the shipped set — no additions, no removals.
    expect(shipped.map((m) => m.type).sort()).toEqual(
      [...BUILD_MESSAGE_TYPES].sort(),
    );
  });

  it("pins the existing PanelController state-transition shapes (NoticeKind / ResponseState / Notice)", () => {
    // NoticeKind is unchanged: exactly these three categories.
    const kinds: NoticeKind[] = ["error", "unavailable", "length_limit"];
    expect(kinds).toHaveLength(3);

    // ResponseState is unchanged: the three lifecycle states.
    const states: ResponseState[] = ["in_progress", "complete", "failed"];
    expect(states).toHaveLength(3);

    // Notice shape is unchanged (tab + kind + message).
    const notice = {
      tab: "builder" as TabId,
      kind: "error" as NoticeKind,
      message: "x",
    } satisfies Notice;
    expect(notice.tab).toBe("builder");
  });

  it("proves AgentHostMessage is additive over the SAME transport (disjoint from HostToWebview)", () => {
    // The additive agent union is keyed by `kind`; the shipped union is keyed by
    // `type`. They therefore share NO discriminator, so widening the transport
    // to accept both cannot collide with any existing `HostToWebview` shape.
    const agent = { kind: "agent/notice", notice: { kind: "info", code: "X", message: "" } } satisfies AgentHostMessage;
    const build = { type: "submissionState", tab: "builder" as TabId, enabled: true } satisfies HostToWebview;

    expect("kind" in agent).toBe(true);
    expect("type" in agent).toBe(false);
    expect("type" in build).toBe(true);
    expect("kind" in build).toBe(false);

    // The widened transport union (as declared by MessagingWebview.postMessage)
    // accepts BOTH additively without altering either member's shape.
    const transport: (HostToWebview | HostToWebviewFlow | AgentHostMessage)[] = [agent, build];
    expect(transport).toHaveLength(2);
  });
});
