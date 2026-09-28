import { afterEach, describe, expect, it } from "vitest";
import { FlowHostWebviewHarness } from "./support/flow-host-webview-harness";
import { validateFeedback } from "../src/core/flow/feedback-validation";
import type { DiscoveryFeedbackIntent } from "../src/core/flow/flow-types";

describe("Discovery optional input limits", () => {
  let h: FlowHostWebviewHarness;
  afterEach(() => h?.dispose());
  it.each([0, 1])("keeps an over-limit optional field %s, explains it and accepts the corrected boundary", async (index) => {
    h = new FlowHostWebviewHarness();
    const goal = h.byClass("flow-goal-input")[0];
    const optional = h.byClass("flow-optional-input")[index];
    const submit = h.byClass("flow-start-submit")[0];
    const notice = h.byClass("flow-length-indicator")[0];
    goal.value = "TypeScript input validation";
    goal.dispatchEvent("input");
    optional.value = "가".repeat(4001);
    optional.dispatchEvent("input");
    expect(submit.disabled).toBe(true);
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toContain("4000");
    submit.click();
    await h.controller.loadHistory();
    expect(h.ports?.calls.filter((call) => call.op === "startDiscovery")).toHaveLength(0);
    expect(optional.value).toHaveLength(4001);
    optional.value = "가".repeat(4000);
    optional.dispatchEvent("input");
    expect(submit.disabled).toBe(false);
    expect(notice.hidden).toBe(true);
    submit.click();
    await h.settle();
    expect(h.ports?.calls.filter((call) => call.op === "startDiscovery")).toHaveLength(1);
  });

  it("checks both optional fields, allows trimmed boundary and ignores blank optional input", () => {
    h = new FlowHostWebviewHarness();
    const goal = h.byClass("flow-goal-input")[0];
    goal.value = "TypeScript input validation";
    goal.dispatchEvent("input");
    const [need, friction] = h.byClass("flow-optional-input");
    need.value = " " + "가".repeat(4000) + " ";
    need.dispatchEvent("input");
    friction.value = " ".repeat(4001);
    friction.dispatchEvent("input");
    expect(h.byClass("flow-start-submit")[0].disabled).toBe(false);
    friction.value = "나".repeat(4001);
    friction.dispatchEvent("input");
    expect(h.byClass("flow-start-submit")[0].disabled).toBe(true);
  });
});

describe("Core feedback target bound", () => {
  it.each<DiscoveryFeedbackIntent>(["MERGE", "PIN", "REJECT", "REGENERATE"])("accepts 8 but rejects 9 unique %s targets", (intent) => {
    const targets = Array.from({ length: 9 }, (_, i) => ({ candidateId: `cand-${i + 1}`, revision: 1 }));
    expect(validateFeedback({ intent, targets: targets.slice(0, 8) }).ok).toBe(true);
    expect(validateFeedback({ intent, targets }).ok).toBe(false);
  });
});
