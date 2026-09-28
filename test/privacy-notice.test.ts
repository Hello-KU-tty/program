import { describe, expect, it } from "vitest";
import { DiscoveryStartView, type FlowRenderCallbacks } from "../src/webview/flow/flow-render";
import { installFakeDom } from "./support/fake-dom";

describe("first-use collection notice", () => {
  it("discloses collection, local storage, model transfer and limitations before input", () => {
    const dom = installFakeDom();
    try {
      const root = dom.createElement("div");
      const callbacks: FlowRenderCallbacks = {
        onStartDiscovery() {}, onToggleBasket() {}, onSubmitRefinement() {},
        onSelectCandidate() {}, onRefineSpec() {}, onConfirmSpec() {},
      };
      new DiscoveryStartView(root as unknown as HTMLElement, callbacks);
      const elements = root.queryAll(() => true);
      const notices = elements.filter((el) => el.attributes["aria-label"] === "데이터 수집 및 저장 안내");
      expect(notices).toHaveLength(1);
      const notice = notices[0]!;
      expect(notice.hidden).toBe(false);
      expect(notice.attributes.role).toBe("note");
      for (const text of ["기본 활성화", "질문", "Decision", "data/vibe-helper.sqlite", "workspaces", "Kiro", "완벽하지", "초기화·내보내기"])
        expect(notice.textContent).toContain(text);
      expect(notice.textContent).not.toMatch(/\/Users\/|Bearer|완전히 익명/);
      const input = elements.find((el) => el.attributes["aria-label"] === "학습 목표")!;
      expect(elements.indexOf(notice)).toBeLessThan(elements.indexOf(input));
      expect(input.attributes["aria-describedby"]).toBe("flow-data-notice");
    } finally {
      dom.restore();
    }
  });
});
