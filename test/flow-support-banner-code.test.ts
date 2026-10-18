import { describe, expect, it } from "vitest";
import { DiscoveryStartView, type FlowRenderCallbacks } from "../src/webview/flow/flow-render";
import type { FlowSnapshot, FlowSupport } from "../src/core/flow/flow-snapshot";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

const callbacks: FlowRenderCallbacks = {
  onStartDiscovery() {}, onToggleBasket() {}, onSubmitRefinement() {},
  onSelectCandidate() {}, onRefineSpec() {}, onConfirmSpec() {},
};

function snapshot(flowSupport: FlowSupport): FlowSnapshot {
  return {
    phase: "discovery_start", project: null, input: { learningGoal: "" },
    previewRound: null, rounds: [], enrichedCandidates: [], basket: [], selectedCandidate: null,
    spec: null, preparedTask: null, discoveryInProgress: false, specInProgress: false, notice: null,
    flowSupport, history: [], historyLoading: false,
  };
}

function bannerFor(reason: string | undefined): string {
  const dom = installFakeDom();
  try {
    const root = dom.createElement("div") as unknown as FakeElement;
    const view = new DiscoveryStartView(root as unknown as HTMLElement, callbacks);
    view.render(snapshot({ mode: "unavailable", experimental: false, ...(reason ? { reason } : {}) }));
    return root.queryAll((e) => e.className === "flow-support-banner")[0].textContent ?? "";
  } finally {
    dom.restore();
  }
}

describe("start screen banner when Core is not usable", () => {
  it("names an unknown code so one failure can be told from another", () => {
    expect(bannerFor("PRIVATE_DIRECTORY_UNSAFE")).toBe(
      "Core에 연결할 수 없어요 (PRIVATE_DIRECTORY_UNSAFE). 명령 팔레트에서 ‘Vibe Helper: Retry Core Connection’을 실행해 주세요.",
    );
  });

  it("says Core is getting ready while the host is still starting it", () => {
    for (const phase of ["CORE_PREPARING", "PREPARING_RUNTIME", "CONNECTING_CORE", "RECOVERING_CORE"]) {
      expect(bannerFor(phase)).toBe("Core 연결을 준비하고 있어요.");
    }
    expect(bannerFor(undefined)).toBe("Core 연결을 준비하고 있어요.");
  });

  it("never shows a reason that is not a plain code", () => {
    const text = bannerFor("C:\\Users\\someone\\secret path");
    expect(text).toBe("Core에 연결할 수 없어요. 명령 팔레트에서 ‘Vibe Helper: Retry Core Connection’을 실행해 주세요.");
  });

  it("keeps the specific guidance for codes it knows", () => {
    expect(bannerFor("KIRO_CLI_LOGIN_REQUIRED")).not.toContain("Core에 연결할 수 없어요");
  });
});
