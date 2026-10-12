import { describe, expect, it } from "vitest";

import { estimateOperationMs, progressText } from "../src/core/flow/flow-progress";

describe("Discovery and Spec countdown (K17)", () => {
  it("estimates from measured runs, longest for 보완하기 from the first previews", () => {
    expect(estimateOperationMs("startDiscovery", { hasRounds: false })).toBe(30_000);
    expect(estimateOperationMs("submitFeedback", { hasRounds: false })).toBe(120_000);
    expect(estimateOperationMs("submitFeedback", { hasRounds: true })).toBe(45_000);
    expect(estimateOperationMs("refineSpec", { hasRounds: true })).toBe(45_000);
    expect(estimateOperationMs("somethingNew", { hasRounds: true })).toBe(30_000);
  });

  it("counts down by the second and never below zero", () => {
    const progress = { startedAt: 1_000, estimateMs: 120_000 };
    expect(progressText(progress, 1_000)).toBe("보통 2분 걸려요 · 약 2분 남았어요");
    expect(progressText(progress, 31_500)).toBe("보통 2분 걸려요 · 약 1분 30초 남았어요");
    expect(progressText(progress, 112_000)).toBe("보통 2분 걸려요 · 약 9초 남았어요");
    expect(progressText(progress, 121_000)).toBe("예상보다 조금 더 걸리고 있어요. 끝나면 바로 보여 드릴게요.");
    expect(progressText(null, 0)).toBe("");
  });
});
