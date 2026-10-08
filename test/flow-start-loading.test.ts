import { describe, expect, it } from "vitest";
import { DiscoveryStartView, type FlowRenderCallbacks } from "../src/webview/flow/flow-render";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

const callbacks: FlowRenderCallbacks = {
  onStartDiscovery() {}, onToggleBasket() {}, onSubmitRefinement() {},
  onSelectCandidate() {}, onRefineSpec() {}, onConfirmSpec() {},
};

function snapshot(overrides: Partial<FlowSnapshot> = {}): FlowSnapshot {
  return {
    phase: "discovery_start", project: null, input: { learningGoal: "JWT로 로그인 만들어 보기" },
    previewRound: null, rounds: [], enrichedCandidates: [], basket: [], selectedCandidate: null,
    spec: null, preparedTask: null, discoveryInProgress: false, specInProgress: false, notice: null,
    flowSupport: { mode: "mock", experimental: false }, history: [], historyLoading: false,
    ...overrides,
  };
}

describe("Discovery start loading card (feedback 1)", () => {
  it("replaces the goal form with a loading card while candidates are found", () => {
    const dom = installFakeDom();
    try {
      const root = dom.createElement("div") as unknown as FakeElement;
      const view = new DiscoveryStartView(root as unknown as HTMLElement, callbacks);
      const byClass = (name: string) => root.queryAll((e) => e.className === name);
      view.render(snapshot());
      expect(byClass("flow-start-form")[0].hidden).toBe(false);
      expect(byClass("flow-start-loading")[0].hidden).toBe(true);

      view.render(snapshot({ discoveryInProgress: true }));
      expect(byClass("flow-start-form")[0].hidden).toBe(true);
      expect(byClass("flow-history")[0].hidden).toBe(true);
      expect(byClass("flow-start-loading")[0].hidden).toBe(false);
      expect(byClass("flow-start-loading-goal")[0].textContent).toBe("배우고 싶은 것: JWT로 로그인 만들어 보기");
      // The submit control lives inside the hidden form.
      const form = byClass("flow-start-form")[0];
      expect(form.queryAll((e) => e.className === "flow-start-submit")).toHaveLength(1);

      view.render(snapshot({ discoveryInProgress: false }));
      expect(byClass("flow-start-form")[0].hidden).toBe(false);
      expect(byClass("flow-start-loading")[0].hidden).toBe(true);
    } finally {
      dom.restore();
    }
  });
});
