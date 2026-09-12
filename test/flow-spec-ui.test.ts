import { describe, it, expect, beforeEach } from "vitest";

import { SpecReview, type FlowRenderCallbacks } from "../src/webview/flow/flow-render";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import type {
  CandidateRevisionReference,
  ExpectedDecision,
  LearningSpecRevision,
  SpecScopeEntry,
} from "../src/core/flow/flow-types";
import type { RefinementAction } from "../src/webview/flow/flow-messages";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

/**
 * Example-based unit tests for task 12.3 (SpecReview renderer). Like the
 * existing webview UI tests, these run against the in-file DOM stub rather than
 * pulling in a jsdom dependency.
 *
 * Covers: purpose one-liner (Req 9.1), target-user chips + moments (Req 9.2),
 * MVP feature list (Req 9.3), scope grouped into the three category sections
 * with concept chips (Req 9.4), expected-decision fields (Req 9.5), runtime +
 * deployment constraints (Req 9.6), refine submit -> onRefineSpec + optimistic
 * clear (Req 10.1), confirm -> onConfirmSpec (Req 11.1), and Agent_Run_Banner +
 * disabled controls while a spec op runs (Req 10.4, 11.6).
 */

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
    targetUsers: ["초보 개발자", "학생"],
    primaryUsageMoment: "아침에 계획을 세울 때",
    successMoment: "할 일을 다 끝냈을 때",
    mvpFeatures: ["할 일 추가", "완료 체크"],
    scope: [
      scopeEntry({
        category: "LEARNER_FOCUS",
        title: "상태 관리",
        rationale: "핵심 학습 주제",
        conceptNames: ["useState", "리듀서"],
      }),
      scopeEntry({
        category: "AGENT_SUPPORT",
        title: "빌드 설정",
        rationale: "반복 작업은 에이전트가",
        conceptNames: ["Vite"],
      }),
      scopeEntry({
        category: "EXCLUDED",
        title: "인증",
        rationale: "이번엔 다루지 않음",
        conceptNames: ["OAuth"],
      }),
    ],
    expectedDecisions: [decision()],
    runtimeConstraint: "TYPESCRIPT",
    deploymentConstraints: ["로컬 실행", "정적 호스팅"],
    ...overrides,
  };
}

function snapshot(overrides: Partial<FlowSnapshot> = {}): FlowSnapshot {
  return {
    phase: "spec_review",
    project: null,
    input: null,
    previewRound: null,
    rounds: [],
    enrichedCandidates: [],
    basket: [],
    selectedCandidate: null,
    spec: spec(),
    preparedTask: null,
    discoveryInProgress: false,
    specInProgress: false,
    notice: null,
    ...overrides,
  };
}

class CaptureCallbacks implements FlowRenderCallbacks {
  readonly refined: string[] = [];
  confirmCount = 0;

  onStartDiscovery(): void {}
  onToggleBasket(): void {}
  onSubmitRefinement(_action: RefinementAction, _text: string, _targets: CandidateRevisionReference[]): void {}
  onSelectCandidate(): void {}
  onRefineSpec(message: string): void {
    this.refined.push(message);
  }
  onConfirmSpec(): void {
    this.confirmCount += 1;
  }
}

function byClass(root: FakeElement, className: string): FakeElement[] {
  return root.queryAll((e) => e.className === className);
}

describe("SpecReview (task 12.3)", () => {
  let restore: () => void;
  let root: FakeElement;
  let callbacks: CaptureCallbacks;
  let view: SpecReview;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div") as unknown as FakeElement;
    callbacks = new CaptureCallbacks();
    view = new SpecReview(root as unknown as HTMLElement, callbacks);
  });

  it("hides its container outside the spec_review phase", () => {
    view.render(snapshot({ phase: "discovery_start", spec: null }));
    expect(byClass(root, "flow-spec")[0].hidden).toBe(true);
    restore();
  });

  it("renders a minimal loading state when the spec is not ready yet", () => {
    view.render(snapshot({ spec: null }));
    expect(byClass(root, "flow-spec")[0].hidden).toBe(false);
    expect(byClass(root, "flow-spec-loading")[0].textContent).toBe("스펙을 준비하고 있어요…");
    restore();
  });

  it("renders the product purpose as a prominent one-liner (Req 9.1)", () => {
    view.render(snapshot());
    expect(byClass(root, "flow-spec-purpose")[0].textContent).toBe("할 일을 쉽게 관리하는 앱");
    restore();
  });

  it("renders target users, moments, and MVP features (Req 9.2/9.3)", () => {
    view.render(snapshot());
    const chipTexts = byClass(root, "flow-tag").map((e) => e.textContent);
    expect(chipTexts).toContain("초보 개발자");
    expect(chipTexts).toContain("학생");

    const facts = byClass(root, "flow-spec-fact-value").map((e) => e.textContent);
    expect(facts).toContain("아침에 계획을 세울 때");
    expect(facts).toContain("할 일을 다 끝냈을 때");

    const listItems = byClass(root, "flow-spec-list-item").map((e) => e.textContent);
    expect(listItems).toContain("할 일 추가");
    expect(listItems).toContain("완료 체크");
    restore();
  });

  it("groups scope into three category sections with concept chips (Req 9.4)", () => {
    view.render(snapshot());
    const groups = byClass(root, "flow-spec-scope-group");
    expect(groups).toHaveLength(3);
    // Order: LEARNER_FOCUS, AGENT_SUPPORT, EXCLUDED.
    expect(groups.map((g) => g.dataset.category)).toEqual([
      "LEARNER_FOCUS",
      "AGENT_SUPPORT",
      "EXCLUDED",
    ]);
    expect(byClass(root, "flow-spec-scope-title").map((e) => e.textContent)).toEqual([
      "내가 배울 것",
      "에이전트가 도울 것",
      "이번 범위에서 제외",
    ]);
    // First group carries its entry's concept chips.
    const firstGroupChips = groups[0].queryAll((e) => e.className === "flow-tag").map((e) => e.textContent);
    expect(firstGroupChips).toContain("useState");
    expect(firstGroupChips).toContain("리듀서");
    restore();
  });

  it("renders each expected decision's category, description, and why (Req 9.5)", () => {
    view.render(snapshot());
    expect(byClass(root, "flow-decision")).toHaveLength(1);
    expect(byClass(root, "flow-decision-category")[0].textContent).toBe("DATA_MODEL");
    expect(byClass(root, "flow-decision-description")[0].textContent).toBe("데이터 구조를 정합니다.");
    expect(byClass(root, "flow-decision-why")[0].textContent).toBe("당신의 선택이 중요해요.");
    restore();
  });

  it("renders the runtime and deployment constraints (Req 9.6)", () => {
    view.render(snapshot());
    const facts = byClass(root, "flow-spec-fact-value").map((e) => e.textContent);
    expect(facts).toContain("TYPESCRIPT");
    const listItems = byClass(root, "flow-spec-list-item").map((e) => e.textContent);
    expect(listItems).toContain("로컬 실행");
    expect(listItems).toContain("정적 호스팅");
    restore();
  });

  it("refine submit calls onRefineSpec and clears the input optimistically (Req 10.1)", () => {
    view.render(snapshot());
    const input = byClass(root, "flow-spec-refine-input")[0];
    input.value = "사용자를 더 좁혀 주세요";
    byClass(root, "flow-spec-refine-button")[0].click();
    expect(callbacks.refined).toEqual(["사용자를 더 좁혀 주세요"]);
    expect(input.value).toBe("");
    restore();
  });

  it("confirm click calls onConfirmSpec (Req 11.1)", () => {
    view.render(snapshot());
    byClass(root, "flow-spec-confirm")[0].click();
    expect(callbacks.confirmCount).toBe(1);
    restore();
  });

  it("shows the banner and disables controls while a spec op runs, re-enabling after (Req 10.4/11.6)", () => {
    view.render(snapshot({ specInProgress: true }));
    expect(byClass(root, "flow-agent-banner")[0].hidden).toBe(false);
    expect(byClass(root, "flow-spec-refine-input")[0].disabled).toBe(true);
    expect(byClass(root, "flow-spec-refine-button")[0].disabled).toBe(true);
    expect(byClass(root, "flow-spec-confirm")[0].disabled).toBe(true);

    // Controls do not fire while disabled.
    byClass(root, "flow-spec-confirm")[0].click();
    byClass(root, "flow-spec-refine-button")[0].click();
    expect(callbacks.confirmCount).toBe(0);
    expect(callbacks.refined).toHaveLength(0);

    view.render(snapshot({ specInProgress: false }));
    expect(byClass(root, "flow-agent-banner")[0].hidden).toBe(true);
    expect(byClass(root, "flow-spec-refine-input")[0].disabled).toBe(false);
    expect(byClass(root, "flow-spec-refine-button")[0].disabled).toBe(false);
    expect(byClass(root, "flow-spec-confirm")[0].disabled).toBe(false);
    restore();
  });
});
