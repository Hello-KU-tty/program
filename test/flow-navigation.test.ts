/**
 * Project navigation in the webview and its message boundary.
 *
 * - The "← 처음으로" bar appears only once a project is open and posts the
 *   screen-only `goToStart` intent.
 * - Spec review offers "다른 주제로 돌아가기", which posts `returnToDiscovery`.
 * - Both intents are allowlisted with no extra fields.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import type { VsCodeApi } from "../src/webview/vscode-api";
import { parseWebviewToHostFlow } from "../src/webview/flow/flow-messages";
import { FlowController } from "../src/core/flow/flow-controller";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import { installFakeDom, type FakeElement } from "./support/fake-dom";
import { SpyFlowPorts } from "./support/spy-flow-ports";
import { FakeClock } from "./support/fake-clock";
import { FakeIdSource } from "./support/fake-id-source";

function emptySnapshot(): FlowSnapshot {
  const clock = new FakeClock();
  return new FlowController(new SpyFlowPorts({ clock }), { clock, ids: new FakeIdSource() }).snapshot();
}

function withProject(phase: FlowSnapshot["phase"], status: "DISCOVERY" | "SPEC_REVIEW" | "BUILDING"): FlowSnapshot {
  return {
    ...emptySnapshot(),
    phase,
    project: { id: "project_1", title: "습관 트래커", learningGoal: "습관 앱", status },
  } as FlowSnapshot;
}

describe("project navigation bar", () => {
  let restore: () => void;
  let root: FakeElement;
  let client: WebviewClient;
  let posted: unknown[];

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");
    posted = [];
    const api: VsCodeApi = { postMessage: (message: unknown) => { posted.push(message); } };
    client = new WebviewClient(api);
    bootstrap(root as unknown as HTMLElement, client);
  });

  afterEach(() => restore());

  const byClass = (className: string): FakeElement =>
    root.queryAll((e) => e.className === className)[0];

  it("stays hidden on the start form without a project", () => {
    client.dispatch({ type: "hydrateFlow", snapshot: emptySnapshot() });
    expect(byClass("panel-nav").hidden).toBe(true);
  });

  it.each([
    ["discovery_workspace", "DISCOVERY"],
    ["spec_review", "SPEC_REVIEW"],
    ["building", "BUILDING"],
  ] as const)("shows the project title and posts goToStart in %s", (phase, status) => {
    client.dispatch({ type: "hydrateFlow", snapshot: withProject(phase, status) });

    expect(byClass("panel-nav").hidden).toBe(false);
    expect(byClass("panel-nav-title").textContent).toBe("습관 트래커");
    byClass("panel-nav-home").click();
    expect(posted).toContainEqual({ type: "goToStart" });
  });

  it("offers 다른 주제로 돌아가기 on Spec review and posts returnToDiscovery", () => {
    client.dispatch({ type: "hydrateFlow", snapshot: withProject("spec_review", "SPEC_REVIEW") });

    const button = byClass("flow-spec-return");
    expect(button.hidden).toBe(false);
    expect(button.textContent).toBe("다른 주제로 돌아가기");
    button.click();
    expect(posted).toContainEqual({ type: "returnToDiscovery" });
  });
});

describe("navigation intents at the message boundary", () => {
  it("accepts the bare intents", () => {
    expect(parseWebviewToHostFlow({ type: "goToStart" })).toEqual({ type: "goToStart" });
    expect(parseWebviewToHostFlow({ type: "returnToDiscovery" })).toEqual({ type: "returnToDiscovery" });
  });

  it("rejects extra fields", () => {
    expect(parseWebviewToHostFlow({ type: "goToStart", projectId: "project_1" })).toBeNull();
    expect(parseWebviewToHostFlow({ type: "returnToDiscovery", kind: "builder/start" })).toBeNull();
  });
});
