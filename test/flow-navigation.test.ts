/**
 * Project navigation in the webview and its message boundary.
 *
 * - The "← 처음으로" bar appears only once a project is open and posts the
 *   screen-only `goToStart` intent.
 * - Spec review offers "다른 주제로 돌아가기", which posts `returnToDiscovery`.
 * - Both intents are allowlisted with no extra fields.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import type { VsCodeApi } from "../src/webview/vscode-api";
import { parseWebviewToHostFlow } from "../src/webview/flow/flow-messages";
import { FlowController } from "../src/core/flow/flow-controller";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import { installFakeDom, type FakeElement } from "./support/fake-dom";
import { SpyFlowPorts } from "./support/spy-flow-ports";
import { FakeClock } from "./support/fake-clock";
import { FakeIdSource } from "./support/fake-id-source";

function emptySnapshot(): FlowSnapshot {
  const clock = new FakeClock();
  return new FlowController(new SpyFlowPorts({ clock }), { clock, ids: new FakeIdSource() }).snapshot();
}

function withProject(phase: FlowSnapshot["phase"], status: "DISCOVERY" | "SPEC_REVIEW" | "BUILDING"): FlowSnapshot {
  return {
    ...emptySnapshot(),
    phase,
    project: { id: "project_1", title: "습관 트래커", learningGoal: "습관 앱", status },
  } as FlowSnapshot;
}

describe("project navigation bar", () => {
  let restore: () => void;
  let root: FakeElement;
  let client: WebviewClient;
  let posted: unknown[];

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");
    posted = [];
    const api: VsCodeApi = { postMessage: (message: unknown) => { posted.push(message); } };
    client = new WebviewClient(api);
    bootstrap(root as unknown as HTMLElement, client);
  });

  afterEach(() => restore());

  const byClass = (className: string): FakeElement =>
    root.queryAll((e) => e.className === className)[0];

  it("stays hidden on the start form without a project", () => {
    client.dispatch({ type: "hydrateFlow", snapshot: emptySnapshot() });
    expect(byClass("panel-nav").hidden).toBe(true);
  });

  it.each([
    ["discovery_workspace", "DISCOVERY"],
    ["spec_review", "SPEC_REVIEW"],
    ["building", "BUILDING"],
  ] as const)("shows the project title and posts goToStart in %s", (phase, status) => {
    client.dispatch({ type: "hydrateFlow", snapshot: withProject(phase, status) });

    expect(byClass("panel-nav").hidden).toBe(false);
    expect(byClass("panel-nav-title").textContent).toBe("습관 트래커");
    byClass("panel-nav-home").click();
    expect(posted).toContainEqual({ type: "goToStart" });
  });

  it("offers 다른 주제로 돌아가기 on Spec review and posts returnToDiscovery", () => {
    client.dispatch({ type: "hydrateFlow", snapshot: withProject("spec_review", "SPEC_REVIEW") });

    const button = byClass("flow-spec-return");
    expect(button.hidden).toBe(false);
    expect(button.textContent).toBe("다른 주제로 돌아가기");
    button.click();
    expect(posted).toContainEqual({ type: "returnToDiscovery" });
  });

  it("shows saved candidates alongside retained input and an explicit new-candidate action", () => {
    const selected = { candidateId: "candidate_1", revision: 1 };
    const snapshot: FlowSnapshot = { ...withProject("discovery_workspace", "SPEC_REVIEW"),
      reviewingDiscovery: true, input: { learningGoal: "저장된 목표" }, selectedCandidate: selected,
      previewRound: { discoverySessionId: "session_1", generationRationale: "저장된 후보", previews: [
        { candidateId: selected.candidateId, position: 1, title: "저장된 프로젝트", summary: "요약", appeal: "이유", coreInteraction: "경험", technologyNecessity: "기술", generationTags: ["DIRECT"] },
      ] } };
    client.dispatch({ type: "hydrateFlow", snapshot });
    expect(byClass("flow-start-submit").textContent).toBe("새 후보 받기");
    expect(byClass("flow-candidate-title").textContent).toBe("저장된 프로젝트");
    const specButton = root.queryAll(e => e.textContent === "현재 스펙 다시 보기")[0];
    expect(specButton.disabled).toBe(false);
    specButton.click();
    expect(posted).toContainEqual({ type: "selectCandidate", target: selected });
    expect(posted.some((item: any) => item.type === "startDiscovery")).toBe(false);
    byClass("flow-start-submit").click();
    expect(posted).toContainEqual(expect.objectContaining({ type: "startDiscovery", input: expect.objectContaining({ learningGoal: "저장된 목표" }) }));
  });
});

describe("navigation intents at the message boundary", () => {
  it("accepts the bare intents", () => {
    expect(parseWebviewToHostFlow({ type: "goToStart" })).toEqual({ type: "goToStart" });
    expect(parseWebviewToHostFlow({ type: "returnToDiscovery" })).toEqual({ type: "returnToDiscovery" });
  });

  it("rejects extra fields", () => {
    expect(parseWebviewToHostFlow({ type: "goToStart", projectId: "project_1" })).toBeNull();
    expect(parseWebviewToHostFlow({ type: "returnToDiscovery", kind: "builder/start" })).toBeNull();
  });
});

describe("start screen keeps History short", () => {
  it("shows three recent projects and expands on request", () => {
    const dom = installFakeDom();
    try {
      const root = dom.createElement("div");
      const client = new WebviewClient({ postMessage: () => {} } as VsCodeApi);
      bootstrap(root as unknown as HTMLElement, client);
      const history = Array.from({ length: 6 }, (_, i) => ({ projectId: `p${i}`, title: `프로젝트 ${i}`, learningGoal: "목표",
        status: "DISCOVERY", suggestedSurface: "DISCOVERY", pendingDecisionCount: 0, helperConversationCount: 0 }));
      client.dispatch({ type: "hydrateFlow", snapshot: { ...emptySnapshot(), history } as FlowSnapshot });
      const rows = () => root.queryAll((e) => e.className === "flow-history-row");
      const more = root.queryAll((e) => e.className === "flow-history-more")[0];
      expect(rows()).toHaveLength(3);
      expect(more.hidden).toBe(false);
      expect(more.textContent).toBe("이전 프로젝트 3개 더 보기");
      more.click();
      expect(rows()).toHaveLength(6);
      expect(more.textContent).toBe("접기");
    } finally { dom.restore(); }
  });
});
