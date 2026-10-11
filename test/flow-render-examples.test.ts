import { describe, it, expect, beforeEach } from "vitest";

import {
  DiscoveryWorkspace,
  SpecReview,
  MAX_REFINEMENT_TEXT,
  type FlowRenderCallbacks,
} from "../src/webview/flow/flow-render";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import type {
  CandidatePreview,
  CandidateRevisionReference,
  ExpectedDecision,
  LearningSpecRevision,
  ProjectCandidateRevision,
  SpecScopeEntry,
} from "../src/core/flow/flow-types";
import { refKey } from "../src/core/flow/flow-types";
import type { RefinementAction } from "../src/webview/flow/flow-messages";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

/**
 * Example/edge tests for task 12.4.
 *
 * These deliberately DO NOT duplicate flow-workspace-ui.test.ts /
 * flow-spec-ui.test.ts. They focus on the four criteria called out by the
 * task and not already asserted there:
 *   - the composer action -> intent mapping SURFACE (which RefinementAction the
 *     buttons emit; the host maps narrow->REVISE, merge->MERGE,
 *     new_direction->REGENERATE, show_more->MORE) (Req 7.1/7.2/7.4/7.6/7.7),
 *   - the 2000-char composer boundary via the MAX_REFINEMENT_TEXT constant
 *     (Req 7.1),
 *   - specific Korean copy strings rendered by the views (Req 7.1, 9.4),
 *   - one chip per conceptName in enriched + spec scope rendering (Req 9.4).
 *
 * The action->intent MAPPING itself lives host-side (FlowController); this
 * surface test asserts the webview emits the RefinementAction that the host
 * translates to the documented intent, so the mapping table is pinned end-to-end
 * without re-testing the guard behavior already covered elsewhere.
 */

function preview(position: number): CandidatePreview {
  return {
    candidateId: `cand-${position}`,
    position,
    title: `후보 ${position}`,
    summary: `요약 ${position}`,
    coreInteraction: `상호작용 ${position}`,
    appeal: `매력 ${position}`,
    technologyNecessity: `기술 필요성 ${position}`,
    generationTags: ["DIRECT"],
  };
}

function enriched(
  candidateId: string,
  coreConcepts: string[],
): ProjectCandidateRevision {
  return {
    candidateId,
    revision: 1,
    parentRevisions: [],
    title: `강화 ${candidateId}`,
    summary: "강화 요약",
    targetUsers: ["초보자"],
    coreInteraction: "강화 상호작용",
    usageMoment: "사용 순간",
    appeal: "강화 매력",
    technologyNecessity: "필요성",
    coreConcepts,
    mvpFeatures: ["기능 A"],
    suggestedScope: { learnerFocus: [], agentSupport: [], excluded: [] },
    generationTags: ["DIRECT"],
  };
}

function workspaceSnapshot(overrides: Partial<FlowSnapshot> = {}): FlowSnapshot {
  return {
    phase: "discovery_workspace",
    project: null,
    input: null,
    previewRound: {
      discoverySessionId: "sess-1",
      previews: Array.from({ length: 10 }, (_, i) => preview(i + 1)),
      generationRationale: "이 후보들을 이렇게 골랐어요.",
    },
    rounds: [],
    enrichedCandidates: [],
    basket: [],
    selectedCandidate: null,
    spec: null,
    preparedTask: null,
    discoveryInProgress: false,
    specInProgress: false,
    notice: null,
    flowSupport: { mode: "mock", experimental: false },
    history: [],
    historyLoading: false,
    ...overrides,
  };
}

function scopeEntry(overrides: Partial<SpecScopeEntry> = {}): SpecScopeEntry {
  return {
    category: "LEARNER_FOCUS",
    title: "제목",
    rationale: "이유",
    conceptNames: [],
    ...overrides,
  };
}

function decision(overrides: Partial<ExpectedDecision> = {}): ExpectedDecision {
  return {
    category: "DATA_MODEL",
    description: "데이터 구조를 정합니다.",
    whyUserInputMatters: "당신의 선택이 중요해요.",
    ...overrides,
  };
}

function spec(overrides: Partial<LearningSpecRevision> = {}): LearningSpecRevision {
  const selectedCandidate: CandidateRevisionReference = { candidateId: "cand-1", revision: 1 };
  return {
    id: "learning_spec_1",
    revision: 1,
    status: "DRAFT",
    selectedCandidate,
    productPurpose: "할 일을 쉽게 관리하는 앱",
    targetUsers: ["초보 개발자"],
    primaryUsageMoment: "아침에 계획을 세울 때",
    successMoment: "할 일을 다 끝냈을 때",
    mvpFeatures: ["할 일 추가"],
    scope: [scopeEntry()],
    expectedDecisions: [decision()],
    runtimeConstraint: "TYPESCRIPT",
    deploymentConstraints: ["로컬 실행"],
    ...overrides,
  };
}

function specSnapshot(overrides: Partial<LearningSpecRevision> = {}): FlowSnapshot {
  return {
    phase: "spec_review",
    project: null,
    input: null,
    previewRound: null,
    rounds: [],
    enrichedCandidates: [],
    basket: [],
    selectedCandidate: null,
    spec: spec(overrides),
    preparedTask: null,
    discoveryInProgress: false,
    specInProgress: false,
    notice: null,
    flowSupport: { mode: "mock", experimental: false },
    history: [],
    historyLoading: false,
  };
}

class CaptureCallbacks implements FlowRenderCallbacks {
  readonly refinements: { action: RefinementAction; text: string; targets: CandidateRevisionReference[] }[] = [];
  onStartDiscovery(): void {}
  onToggleBasket(): void {}
  onSubmitRefinement(action: RefinementAction, text: string, targets: CandidateRevisionReference[]): void {
    this.refinements.push({ action, text, targets });
  }
  onSelectCandidate(): void {}
  onRefineSpec(): void {}
  onConfirmSpec(): void {}
}

function byClass(root: FakeElement, className: string): FakeElement[] {
  return root.queryAll((e) => e.className === className);
}

describe("composer boundary constant (task 12.4, Req 7.1)", () => {
  it("caps refinement free text at 2000 characters", () => {
    expect(MAX_REFINEMENT_TEXT).toBe(2000);
  });

  it("applies MAX_REFINEMENT_TEXT as the composer textarea maxLength", () => {
    const dom = installFakeDom();
    const root = dom.createElement("div") as unknown as FakeElement;
    new DiscoveryWorkspace(root as unknown as HTMLElement, new CaptureCallbacks());
    const composer = byClass(root, "flow-composer-input")[0] as unknown as { maxLength?: number };
    expect(composer.maxLength).toBe(2000);
    dom.restore();
  });
});

describe("composer action -> intent mapping surface (task 12.4, Req 7.2/7.4/7.6/7.7)", () => {
  let restore: () => void;
  let root: FakeElement;
  let callbacks: CaptureCallbacks;
  let view: DiscoveryWorkspace;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div") as unknown as FakeElement;
    callbacks = new CaptureCallbacks();
    view = new DiscoveryWorkspace(root as unknown as HTMLElement, callbacks);
  });

  it("emits the single refine action with the basket selection as targets", () => {
    view.render(
      workspaceSnapshot({
        basket: [
          refKey({ candidateId: "cand-1", revision: 1 }),
          refKey({ candidateId: "cand-2", revision: 1 }),
        ],
      }),
    );
    const actions = byClass(root, "flow-composer-action");
    expect(actions.map((b) => b.dataset.action)).toEqual(["refine"]);
    actions[0].click();
    expect(callbacks.refinements.map((r) => [r.action, r.targets.length])).toEqual([["refine", 2]]);
    restore();
  });
});

describe("Korean copy strings (task 12.4, Req 7.1/9.4)", () => {
  it("workspace renders its heading, composer label, and action labels", () => {
    const dom = installFakeDom();
    const root = dom.createElement("div") as unknown as FakeElement;
    const view = new DiscoveryWorkspace(root as unknown as HTMLElement, new CaptureCallbacks());
    view.render(workspaceSnapshot());

    expect(byClass(root, "flow-workspace-heading")[0].textContent).toBe(
      "프로젝트 후보를 골라 보세요",
    );
    // The composer label copy (Req 7.1).
    const labels = byClass(root, "flow-field-label").map((e) => e.textContent);
    expect(labels).toContain("어떻게 보완할까요?");
    // One action button (feedback 2).
    const actionLabels = byClass(root, "flow-composer-action").map((e) => e.textContent);
    expect(actionLabels).toEqual(["보완하기"]);
    dom.restore();
  });

  it("spec review renders the three scope-section Korean titles in order (Req 9.4)", () => {
    const dom = installFakeDom();
    const root = dom.createElement("div") as unknown as FakeElement;
    const view = new SpecReview(root as unknown as HTMLElement, new CaptureCallbacks());
    view.render(
      specSnapshot({
        scope: [
          scopeEntry({ category: "LEARNER_FOCUS", conceptNames: [] }),
          scopeEntry({ category: "AGENT_SUPPORT", conceptNames: [] }),
          scopeEntry({ category: "EXCLUDED", conceptNames: [] }),
        ],
      }),
    );
    const scopeTitles = byClass(root, "flow-spec-scope-title").map((e) => e.textContent);
    expect(scopeTitles).toEqual(["내가 배울 것", "에이전트가 도울 것", "이번 범위에서 제외"]);
    dom.restore();
  });
});

describe("saved candidate revision display", () => {
  it("shows each feedback round's exact saved candidate revision", () => {
    const dom = installFakeDom();
    try {
      const root = dom.createElement("div");
      const view = new DiscoveryWorkspace(root as unknown as HTMLElement, new CaptureCallbacks());
      view.render(workspaceSnapshot({ previewRound: null,
        rounds: [1, 2].map(revision => ({ roundIndex: revision, candidates: [{ candidateId: "same", revision }], generationRationale: "saved", appliedFeedbackIds: [] })),
        enrichedCandidates: [1, 2].map(revision => ({ ...enriched("same", []), revision, title: `저장된 후보 ${revision}` })) }));
      // The latest round comes first; the earlier one is folded below it.
      expect(byClass(root, "flow-candidate-title").map(e => e.textContent)).toEqual(["저장된 후보 2", "저장된 후보 1"]);
      expect(byClass(root, "flow-candidate-summary").every(e => e.textContent !== "세부 정보를 불러오는 중이에요.")).toBe(true);
    } finally { dom.restore(); }
  });

});

describe("one chip per conceptName (task 12.4, Req 9.4)", () => {
  it("renders exactly one chip per enriched coreConcept in the workspace", () => {
    const dom = installFakeDom();
    const root = dom.createElement("div") as unknown as FakeElement;
    const view = new DiscoveryWorkspace(root as unknown as HTMLElement, new CaptureCallbacks());
    const concepts = ["상태 관리", "라우팅", "폼 검증"];
    view.render(workspaceSnapshot({ enrichedCandidates: [enriched("cand-1", concepts)] }));

    const enrichedBlock = byClass(root, "flow-enriched")[0];
    // The first chip group under the enriched block is the coreConcepts group.
    const conceptGroup = enrichedBlock.queryAll((e) => e.className === "flow-candidate-tags")[0];
    const chipText = conceptGroup
      .queryAll((e) => e.className === "flow-tag")
      .map((e) => e.textContent);
    expect(chipText).toEqual(concepts);
    dom.restore();
  });

  it("renders exactly one chip per conceptName in a spec scope entry (Req 9.4)", () => {
    const dom = installFakeDom();
    const root = dom.createElement("div") as unknown as FakeElement;
    const view = new SpecReview(root as unknown as HTMLElement, new CaptureCallbacks());
    const conceptNames = ["개념1", "개념2", "개념3", "개념4"];
    view.render(
      specSnapshot({
        scope: [scopeEntry({ category: "LEARNER_FOCUS", conceptNames })],
      }),
    );

    const learnerGroup = root
      .queryAll((e) => e.className === "flow-spec-scope-group")
      .find((g) => g.dataset.category === "LEARNER_FOCUS")!;
    const chipText = learnerGroup
      .queryAll((e) => e.className === "flow-tag")
      .map((e) => e.textContent);
    expect(chipText).toEqual(conceptNames);
    dom.restore();
  });
});
