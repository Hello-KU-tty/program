import { describe, it, expect } from "vitest";

import { MockDiscoveryPort } from "../src/adapter/flow/mock-flow-port";
import type { DiscoveryPort, SpecPort } from "../src/adapter/flow/discovery-port";
import { FakeClock } from "./support/fake-clock";

/**
 * Example test for task 3.2: the MockDiscoveryPort satisfies BOTH the
 * DiscoveryPort and SpecPort interfaces (Req 1.1, 1.2).
 *
 * The compile-time assignability assertions (`const d: DiscoveryPort = mock`)
 * are the primary guarantee — they are checked by `npm run typecheck`. The
 * runtime smoke checks confirm a constructed mock (driven by a FakeClock so no
 * real timers are used) exposes each declared method.
 */

describe("MockDiscoveryPort satisfies both port interfaces (task 3.2)", () => {
  it("is assignable to DiscoveryPort and SpecPort (compile-time, Req 1.1/1.2)", () => {
    const mock = new MockDiscoveryPort({ clock: new FakeClock() });
    // Compile-time assignability: fails typecheck if the class drifts from
    // either interface.
    const d: DiscoveryPort = mock;
    const s: SpecPort = mock;
    expect(d).toBe(mock);
    expect(s).toBe(mock);
  });

  it("exposes every DiscoveryPort method (Req 1.1)", () => {
    const mock = new MockDiscoveryPort({ clock: new FakeClock() });
    const d: DiscoveryPort = mock;
    expect(typeof d.startDiscovery).toBe("function");
    expect(typeof d.generatePreviewRound).toBe("function");
    expect(typeof d.enrichCandidate).toBe("function");
    expect(typeof d.submitFeedback).toBe("function");
  });

  it("exposes every SpecPort method (Req 1.2)", () => {
    const mock = new MockDiscoveryPort({ clock: new FakeClock() });
    const s: SpecPort = mock;
    expect(typeof s.generateSpecDraft).toBe("function");
    expect(typeof s.refineSpec).toBe("function");
    expect(typeof s.confirmSpec).toBe("function");
    expect(typeof s.prepareBuilderTask).toBe("function");
  });

  it("a single instance serves as both ports (one object, both halves)", () => {
    const mock = new MockDiscoveryPort({ clock: new FakeClock() });
    const d: DiscoveryPort = mock;
    const s: SpecPort = mock;
    // The DiscoveryPort and SpecPort references are the same underlying object.
    expect(d).toBe(s);
  });
});
