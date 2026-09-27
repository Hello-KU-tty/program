/**
 * Top-level surface arbitration once the live agent surface is active.
 *
 * In product mode the first `agent/hydrate` switches the panel into live agent
 * mode: during Discovery/Spec only the flow shell is visible (the agent shell
 * must not squeeze it), and during "building" the agent shell replaces the
 * Demo Build_Surface. Without any `agent/hydrate` the existing Build vs. flow
 * behavior is unchanged.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import type { VsCodeApi } from "../src/webview/vscode-api";
import { FlowController } from "../src/core/flow/flow-controller";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import { initialAgentViewModel } from "../src/core/agent/agent-view-model";
import { installFakeDom, type FakeElement } from "./support/fake-dom";
import { SpyFlowPorts } from "./support/spy-flow-ports";
import { FakeClock } from "./support/fake-clock";
import { FakeIdSource } from "./support/fake-id-source";

function discoverySnapshot(): FlowSnapshot {
  const clock = new FakeClock();
  return new FlowController(new SpyFlowPorts({ clock }), { clock, ids: new FakeIdSource() }).snapshot();
}

describe("agent shell surface arbitration", () => {
  let restore: () => void;
  let root: FakeElement;
  let client: WebviewClient;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");
    const api: VsCodeApi = { postMessage: () => {} };
    client = new WebviewClient(api);
    bootstrap(root as unknown as HTMLElement, client);
  });

  afterEach(() => restore());

  const shell = (className: string): FakeElement =>
    root.queryAll((e) => e.className === className)[0];

  it("keeps the agent shell hidden without any agent/hydrate", () => {
    client.dispatch({ type: "hydrateFlow", snapshot: { ...discoverySnapshot(), phase: "building" } });

    expect(shell("agent-shell").hidden).toBe(true);
    expect(shell("build-shell").hidden).toBe(false);
    expect(shell("flow-shell").hidden).toBe(true);
  });

  it("shows only the flow shell during discovery even after agent/hydrate", () => {
    const snapshot = discoverySnapshot();
    expect(snapshot.phase).toBe("discovery_start");
    client.dispatch({ type: "hydrateFlow", snapshot });
    client.dispatch({ kind: "agent/hydrate", vm: initialAgentViewModel() });

    expect(shell("flow-shell").hidden).toBe(false);
    expect(shell("agent-shell").hidden).toBe(true);
    expect(shell("build-shell").hidden).toBe(true);
  });

  it("replaces the Demo Build_Surface with the agent shell while building", () => {
    client.dispatch({ kind: "agent/hydrate", vm: initialAgentViewModel() });
    client.dispatch({ type: "hydrateFlow", snapshot: { ...discoverySnapshot(), phase: "building" } });

    expect(shell("agent-shell").hidden).toBe(false);
    expect(shell("build-shell").hidden).toBe(true);
    expect(shell("flow-shell").hidden).toBe(true);
  });
});
