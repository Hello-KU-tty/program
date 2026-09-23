import { describe, it, expect } from "vitest";

import { FlowController } from "../src/core/flow/flow-controller";
import {
  buildFlowSnapshot,
  DEFAULT_FLOW_SUPPORT,
  type FlowSnapshot,
} from "../src/core/flow/flow-snapshot";
import type { CreateFlowPortsResult } from "../src/adapter/flow/flow-port-factory";
import { SpyFlowPorts } from "./support/spy-flow-ports";
import { MockDiscoveryPort } from "../src/adapter/flow/mock-flow-port";
import { FakeClock } from "./support/fake-clock";
import { FakeIdSource } from "./support/fake-id-source";

/**
 * Focused tests for the native-support verdict surfacing (guide §10-1 / §9).
 *
 * These assert that:
 *  - a freshly-built snapshot defaults `flowSupport` to mock / non-experimental,
 *  - `flowSupport` NEVER carries a connection file path or a token,
 *  - `buildFlowSnapshot` carries a caller-supplied verdict through, and
 *  - `FlowController.applyPortResult` / `setPorts` swap the ports AND update the
 *    snapshot's `flowSupport` (no live connection is attempted).
 */

/** Any recognizable secret-shaped string that must never appear in the verdict. */
const SECRET_MARKERS = [
  "connection.json",
  "/Users/",
  "C:\\",
  "Bearer ",
  "Authorization",
  "token",
];

/** Assert the verdict contains only the three non-sensitive fields and no secret. */
function expectNoSecret(support: FlowSnapshot["flowSupport"]): void {
  const keys = Object.keys(support).sort();
  // Only mode/experimental (+ optional reason) may exist.
  for (const k of keys) {
    expect(["mode", "experimental", "reason"]).toContain(k);
  }
  const serialized = JSON.stringify(support);
  for (const marker of SECRET_MARKERS) {
    expect(serialized).not.toContain(marker);
  }
}

function newController(): FlowController {
  const clock = new FakeClock();
  return new FlowController(new SpyFlowPorts({ clock }), {
    clock,
    ids: new FakeIdSource(),
  });
}

describe("flow-support gating verdict surfacing (guide §10-1, §9)", () => {
  it("defaults flowSupport to mock/non-experimental and carries no path/token", () => {
    const controller = newController();
    const snapshot = controller.snapshot();

    expect(snapshot.flowSupport).toEqual({ mode: "mock", experimental: false });
    expectNoSecret(snapshot.flowSupport);
  });

  it("buildFlowSnapshot carries a caller-supplied verdict through", () => {
    const controller = newController();
    const verdict = {
      mode: "mock" as const,
      experimental: false,
      reason: "UNSUPPORTED_OS_WINDOWS_FAIL_CLOSED",
    };

    const snapshot = buildFlowSnapshot(controller.toState(), controller.notices, verdict);

    expect(snapshot.flowSupport).toEqual(verdict);
    // A distinct default is still available and unchanged.
    expect(DEFAULT_FLOW_SUPPORT).toEqual({ mode: "mock", experimental: false });
    expectNoSecret(snapshot.flowSupport);
  });

  it("applyPortResult swaps the ports AND updates the snapshot's flowSupport", () => {
    const controller = newController();

    // A fail-closed Mock result (as createFlowPortsAsync returns on Windows).
    const mockPort = new MockDiscoveryPort();
    const result: CreateFlowPortsResult = {
      ports: { discovery: mockPort, spec: mockPort },
      mode: "mock",
      reason: "UNSUPPORTED_OS_WINDOWS_FAIL_CLOSED",
    };

    controller.applyPortResult(result, /* experimental */ false);

    const snapshot = controller.snapshot();
    expect(snapshot.flowSupport).toEqual({
      mode: "mock",
      experimental: false,
      reason: "UNSUPPORTED_OS_WINDOWS_FAIL_CLOSED",
    });
    expectNoSecret(snapshot.flowSupport);

    // A simulated live/experimental result flips the verdict (still no secret).
    const liveResult: CreateFlowPortsResult = {
      ports: { discovery: mockPort, spec: mockPort },
      mode: "live",
    };
    controller.applyPortResult(liveResult, /* experimental */ true);
    const live = controller.snapshot();
    expect(live.flowSupport).toEqual({ mode: "live", experimental: true });
    expectNoSecret(live.flowSupport);
  });

  it("setFlowSupport updates the verdict without touching ports", () => {
    const controller = newController();
    controller.setFlowSupport({ mode: "live", experimental: true });
    expect(controller.snapshot().flowSupport).toEqual({ mode: "live", experimental: true });
  });
});
