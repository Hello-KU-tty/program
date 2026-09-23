import { describe, it, expect, afterEach } from "vitest";

import { FlowHostWebviewHarness } from "./support/flow-host-webview-harness";

/**
 * Smoke test proving the shared flow test-support scaffolding
 * (FlowHostWebviewHarness + FakeClock + FakeIdSource + SpyFlowPorts) works
 * end-to-end: the flow shell hydrates, a startDiscovery intent drives the
 * controller through its port, and the spy records a well-formed enveloped
 * call while the surface advances to the workspace.
 */
describe("flow test-support scaffolding smoke", () => {
  let h: FlowHostWebviewHarness;
  afterEach(() => h?.dispose());

  it("hydrates the discovery_start surface, then a startDiscovery intent advances to the workspace with a recorded enveloped call", async () => {
    h = new FlowHostWebviewHarness();

    // Initial hydrate renders the discovery_start surface.
    expect(h.startSurfaceVisible()).toBe(true);

    // Drive a startDiscovery intent over the webview transport.
    h.client.postFlow({
      type: "startDiscovery",
      input: { learningGoal: "리액트로 할 일 앱 만들기" },
    });
    await h.settle();

    // The spy recorded a startDiscovery call with a well-formed envelope.
    const startCall = h.ports?.calls.find((c) => c.op === "startDiscovery");
    expect(startCall?.env.correlationId).toMatch(/^corr_/);
    expect(startCall?.env.idempotencyKey).toMatch(/^idem_/);

    // Preview round generated -> the workspace surface is now visible.
    expect(h.workspaceSurfaceVisible()).toBe(true);
  });
});
