import { describe, expect, it } from "vitest";
import { renderChatMessage } from "../src/webview/agent/chat-message";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

const leaves = (node: FakeElement): string => node.textContent + node.children.map(leaves).join("");

describe("safe chat formatting", () => {
  it("renders paragraphs, emphasis, headings, lists and code without interpreting HTML", () => {
    const dom = installFakeDom();
    try {
      const root = dom.createElement("div");
      renderChatMessage(root as unknown as HTMLElement, '# 선택\n\n**굵게**와 `state`\n\n- 첫 항목\n- 두 번째\n\n2. 다음\n\n```ts\nconst html = "<img src=x onerror=alert(1)>";\n```\n\n<script>alert(1)</script>\n[링크](javascript:alert(1))');
      expect(root.queryAll(e => e.tagName === "H3")).toHaveLength(1);
      expect(root.queryAll(e => e.tagName === "STRONG").map(leaves)).toEqual(["굵게"]);
      expect(root.queryAll(e => e.tagName === "LI").map(leaves)).toEqual(["첫 항목", "두 번째", "다음"]);
      expect(root.queryAll(e => e.tagName === "OL")[0].attributes.start).toBe("2");
      expect(root.queryAll(e => e.tagName === "PRE").map(leaves)).toEqual(['const html = "<img src=x onerror=alert(1)>";']);
      expect(root.queryAll(e => ["IMG", "SCRIPT", "A", "IFRAME"].includes(e.tagName))).toEqual([]);
      expect(leaves(root)).toContain('<script>alert(1)</script>');
    } finally { dom.restore(); }
  });

  it("keeps incomplete Markdown readable until subsequent chunks finish it", () => {
    const dom = installFakeDom();
    try {
      const root = dom.createElement("div");
      renderChatMessage(root as unknown as HTMLElement, "선택은 **HOLD");
      expect(leaves(root)).toBe("선택은 **HOLD");
      renderChatMessage(root as unknown as HTMLElement, "선택은 **HOLD**\n\n```ts\nconst x = 1;");
      expect(root.queryAll(e => e.tagName === "STRONG").map(leaves)).toEqual(["HOLD"]);
      expect(root.queryAll(e => e.tagName === "PRE").map(leaves)).toEqual(["const x = 1;"]);
    } finally { dom.restore(); }
  });
});
