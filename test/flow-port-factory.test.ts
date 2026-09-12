import { describe, it, expect } from "vitest";

import { createFlowPorts } from "../src/adapter/flow/flow-port-factory";
import { MockDiscoveryPort } from "../src/adapter/flow/mock-flow-port";

/**
 * Smoke test for task 5.3: the default factory returns the MockDiscoveryPort
 * for BOTH the discovery and spec ports, with no network access (Req 1.5).
 *
 * `createFlowPorts()` constructs a single MockDiscoveryPort and returns it as
 * both `discovery` and `spec` (the single swap point). We assert both are
 * MockDiscoveryPort instances AND the same instance, matching the factory
 * implementation. No fetch/http is touched — the mock produces data offline.
 */

describe("createFlowPorts default (task 5.3)", () => {
  it("returns a MockDiscoveryPort for the discovery port (Req 1.5)", () => {
    const ports = createFlowPorts();
    expect(ports.discovery).toBeInstanceOf(MockDiscoveryPort);
  });

  it("returns a MockDiscoveryPort for the spec port (Req 1.5)", () => {
    const ports = createFlowPorts();
    expect(ports.spec).toBeInstanceOf(MockDiscoveryPort);
  });

  it("returns the SAME MockDiscoveryPort instance for both ports (single swap point)", () => {
    const ports = createFlowPorts();
    expect(ports.discovery).toBe(ports.spec);
  });

  it("accepts an optional seed without changing the returned type", () => {
    const ports = createFlowPorts({ seed: 42 });
    expect(ports.discovery).toBeInstanceOf(MockDiscoveryPort);
    expect(ports.spec).toBe(ports.discovery);
  });

  it("constructs without any network access (offline mock)", () => {
    // Guard: constructing the factory must not touch a global fetch. If any
    // test env exposes fetch, calling the factory should not invoke it.
    const g = globalThis as { fetch?: unknown };
    const originalFetch = g.fetch;
    let fetchCalls = 0;
    g.fetch = () => {
      fetchCalls += 1;
      throw new Error("network access is not allowed for the mock factory");
    };
    try {
      const ports = createFlowPorts();
      expect(ports.discovery).toBeInstanceOf(MockDiscoveryPort);
      expect(fetchCalls).toBe(0);
    } finally {
      g.fetch = originalFetch;
    }
  });
});
