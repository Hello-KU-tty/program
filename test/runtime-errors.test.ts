import { afterEach, describe, expect, it } from "vitest";
import { toPortError } from "../src/adapter/flow/local-core-port";
import { toAgentError } from "../src/adapter/agent/agent-error";
import { runtimeErrorMessage } from "../src/core/runtime-errors";
import { FlowHostWebviewHarness } from "./support/flow-host-webview-harness";
import type { HostToWebview } from "../src/webview/messages";

describe("safe runtime recovery guidance", () => {
  const cases = [
    ["NATIVE_QUOTA_EXCEEDED", "quota_exceeded", "사용량 한도"],
    ["NATIVE_CREDIT_OBSERVATION_REQUIRED", "credit_observation_required", "최신 계정 사용량"],
    ["NATIVE_AUTH_REQUIRED", "auth_required", "로그인"],
    ["NATIVE_ACCESS_DENIED", "access_denied", "권한"],
    ["NATIVE_MODEL_UNAVAILABLE", "model_unavailable", "모델"],
    ["NATIVE_RATE_LIMITED", "rate_limited", "잠시"],
    ["NATIVE_SERVICE_UNAVAILABLE", "service_unavailable", "서비스"],
    ["NATIVE_RPC_REJECTED", "unknown", "원인은 확인되지"],
    ["NATIVE_WORKSPACE_TRUST_REQUIRED", "trust_required", "Workspace Trust"],
    ["CORE_UPDATE_WAITING_FOR_OWNER_EXIT", "update_waiting", "정상적으로 닫은"],
    ["WORKSPACE_SWITCH_UNCONFIRMED", "workspace_switch_unconfirmed", "폴더 전환"],
  ];
  for (const [raw, code, text] of cases) {
    it(`${raw} is classified and explained without provider text`, () => {
      const input = { code: raw, message: "Bearer fixture-secret /Users/private/connection.json" };
      const flow = toPortError(input, "safe fallback");
      const agent = toAgentError(input);
      expect(flow.code).toBe(code);
      expect(agent.code).toBe(code);
      expect(runtimeErrorMessage(flow.message, "safe fallback")).toContain(text);
      expect(agent.message).toContain(text);
      expect(JSON.stringify([flow, agent])).not.toMatch(/Bearer|fixture-secret|\/Users\/|connection.json/);
    });
  }
  it("does not expose unknown provider errors or infer quota from their text", () => {
    for (const input of [new Error("quota exhausted: Bearer fixture-secret /Users/private"),
      { code: "BAD_GATEWAY", message: "Bearer fixture-secret /Users/private" },
      { code: "Bearer fixture-secret /Users/private" }, "Bearer fixture-secret /Users/private"]) {
      const rendered = JSON.stringify([toPortError(input, "safe fallback"), toAgentError(input)]);
      expect(rendered).not.toMatch(/Bearer|fixture-secret|\/Users\/|quota_exceeded/);
    }
    expect(runtimeErrorMessage("WORKSPACE_SWITCH_UNCONFIRMED", "fallback")).not.toContain("Trust");
  });
});

describe("flow notices reach the real webview wiring", () => {
  let h: FlowHostWebviewHarness;
  afterEach(() => h?.dispose());

  it("Trust-unavailable keeps typed drafts and blocks model actions but allows History", async () => {
    h = new FlowHostWebviewHarness();
    h.controller.setFlowSupport({ mode: "unavailable", experimental: false, reason: "NATIVE_WORKSPACE_TRUST_REQUIRED" });
    const input = h.byClass("flow-goal-input")[0];
    input.value = "TypeScript state transitions";
    input.dispatchEvent("input");
    expect(h.byClass("flow-start-submit")[0].disabled).toBe(true);
    expect(h.byClass("flow-history-refresh")[0].disabled).toBe(false);
    await h.controller.startDiscovery({ learningGoal: input.value });
    expect(h.ports?.calls.filter(c => c.op === "startDiscovery")).toHaveLength(0);
    expect(h.controller.getProject()).toBeNull();
  });

  it("a History or support refresh does not erase unsent input", async () => {
    h = new FlowHostWebviewHarness();
    const input = h.byClass("flow-goal-input")[0];
    input.value = "An unsent draft";
    input.dispatchEvent("input");
    await h.controller.loadHistory();
    expect(input.value).toBe("An unsent draft");
    h.controller.setFlowSupport({ mode: "live", experimental: true });
    expect(input.value).toBe("An unsent draft");
  });

  it("renders live and restored notices as text, and hides a cleared notice", () => {
    h = new FlowHostWebviewHarness();
    const notice = h.byClass("flow-notice agent-notice")[0];
    expect(notice.hidden).toBe(true);
    const message = "Kiro 사용량 한도 <script>fixture</script>";
    h.client.dispatch({ type: "flowNotice", kind: "error", surface: "discovery", message } as unknown as HostToWebview);
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe(message);
    expect(notice.children).toHaveLength(0);
    h.client.dispatch({ type: "hydrateFlow", snapshot: { ...h.controller.snapshot(),
      notice: { surface: "spec", kind: "error", message: "다시 로그인해 주세요." } } } as unknown as HostToWebview);
    expect(notice.textContent).toBe("다시 로그인해 주세요.");
    h.client.dispatch({ type: "hydrateFlow", snapshot: h.controller.snapshot() } as unknown as HostToWebview);
    expect(notice.hidden).toBe(true);
  });
});
