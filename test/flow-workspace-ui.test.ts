import { describe, it, expect, beforeEach } from "vitest";

import { DiscoveryWorkspace, type FlowRenderCallbacks } from "../src/webview/flow/flow-render";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import type {
  CandidatePreview,
  CandidateRevisionReference,
  CandidateRound,
  GenerationTag,
  ProjectCandidateRevision,
} from "../src/core/flow/flow-types";
import { refKey } from "../src/core/flow/flow-types";
import type { RefinementAction } from "../src/webview/flow/flow-messages";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

/**
 * Example-based unit tests for task 12.2 (DiscoveryWorkspace renderer). Like
 * the existing webview UI tests, these run against the in-file DOM stub rather
 * than pulling in a jsdom dependency.
 *
 * Covers: 10 preview cards with required fields (Req 5.1), round rationale +
 * roundIndex header + ascending accumulated rounds (Req 5.2/5.4), enriched
 * detail (Req 5.3), Agent_Run_Banner + disabled controls while in progress
 * (Req 5.5/7.11) and re-enable (Req 7.12), basket toggle state + intent
 * (Req 6.3), select-to-proceed (Req 8.1), composer narrow/merge guards
 * (Req 7.3/7.5), and action->submit mapping with targets + free text
 * (Req 7.2/7.4/7.6/7.7/7.8).
 */

function preview(position: number, tags: GenerationTag[] = ["DIRECT"]): CandidatePreview {
  return {
    candidateId: `cand-${position}`,
    position,
    title: `후보 ${position}`,
    summary: `요약 ${position}`,
    coreInteraction: `상호작용 ${position}`,
    appeal: `매력 ${position}`,
    technologyNecessity: `기술 필요성 ${position}`,
    generationTags: tags,
  };
}

function enriched(candidateId: string): ProjectCandidateRevision {
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
    coreConcepts: ["상태 관리", "비동기"],
    mvpFeatures: ["기능 A"],
    suggestedScope: {
      learnerFocus: ["집중 A"],
      agentSupport: ["지원 A"],
      excluded: ["제외 A"],
    },
    generationTags: ["DIRECT"],
  };
}

function snapshot(overrides: Partial<FlowSnapshot> = {}): FlowSnapshot {
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
    ...overrides,
  };
}

class CaptureCallbacks implements FlowRenderCallbacks {
  readonly started: unknown[] = [];
  readonly toggled: CandidateRevisionReference[] = [];
  readonly refinements: { action: RefinementAction; text: string; targets: CandidateRevisionReference[] }[] = [];
  readonly selected: CandidateRevisionReference[] = [];

  onStartDiscovery(input: unknown): void {
    this.started.push(input);
  }
  onToggleBasket(ref: CandidateRevisionReference): void {
    this.toggled.push(ref);
  }
  onSubmitRefinement(action: RefinementAction, text: string, targets: CandidateRevisionReference[]): void {
    this.refinements.push({ action, text, targets });
  }
  onSelectCandidate(target: CandidateRevisionReference): void {
    this.selected.push(target);
  }
  onRefineSpec(): void {}
  onConfirmSpec(): void {}
}

function byClass(root: FakeElement, className: string): FakeElement[] {
  return root.queryAll((e) => e.className === className);
}

describe("DiscoveryWorkspace (task 12.2)", () => {
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

  it("hides its container outside the discovery_workspace phase", () => {
    view.render(snapshot({ phase: "discovery_start", previewRound: null }));
    const container = byClass(root, "flow-workspace")[0];
    expect(container.hidden).toBe(true);
    restore();
  });

  it("renders exactly 10 preview cards with rationale + round header (Req 5.1/5.2)", () => {
    view.render(snapshot());
    expect(byClass(root, "flow-candidate-card")).toHaveLength(10);
    expect(byClass(root, "flow-round-rationale")[0].textContent).toBe("이 후보들을 이렇게 골랐어요.");
    expect(byClass(root, "flow-round-header")[0].textContent).toBe("라운드 1");
    // Each card shows title + tag chips (Req 5.1).
    expect(byClass(root, "flow-candidate-title")[0].textContent).toBe("후보 1");
    expect(byClass(root, "flow-tag").length).toBeGreaterThanOrEqual(10);
    restore();
  });

  it("renders accumulated feedback rounds in ascending roundIndex (Req 5.4)", () => {
    const rounds: CandidateRound[] = [
      { roundIndex: 3, candidates: [], generationRationale: "R3", appliedFeedbackIds: [] },
      { roundIndex: 2, candidates: [], generationRationale: "R2", appliedFeedbackIds: [] },
    ];
    view.render(snapshot({ rounds }));
    const headers = byClass(root, "flow-round-header").map((e) => e.textContent);
    expect(headers).toEqual(["라운드 1", "라운드 2", "라운드 3"]);
    restore();
  });

  it("shows enriched coreConcepts + suggestedScope when a match exists (Req 5.3)", () => {
    view.render(snapshot({ enrichedCandidates: [enriched("cand-1")] }));
    const enrichedBlocks = byClass(root, "flow-enriched");
    expect(enrichedBlocks).toHaveLength(1);
    const tags = enrichedBlocks[0].queryAll((e) => e.className === "flow-tag").map((e) => e.textContent);
    expect(tags).toContain("상태 관리");
    expect(tags).toContain("집중 A");
    expect(tags).toContain("지원 A");
    expect(tags).toContain("제외 A");
    restore();
  });

  it("reflects basket membership and toggles with a revision-1 ref (Req 6.3)", () => {
    view.render(snapshot({ basket: [refKey({ candidateId: "cand-1", revision: 1 })] }));
    const toggles = byClass(root, "flow-basket-toggle");
    expect(toggles[0].textContent).toBe("바구니에서 빼기");
    expect(toggles[1].textContent).toBe("바구니에 담기");
    toggles[1].click();
    expect(callbacks.toggled).toEqual([{ candidateId: "cand-2", revision: 1 }]);
    restore();
  });

  it("select-to-proceed posts onSelectCandidate with the card ref (Req 8.1)", () => {
    view.render(snapshot());
    byClass(root, "flow-select-button")[0].click();
    expect(callbacks.selected).toEqual([{ candidateId: "cand-1", revision: 1 }]);
    restore();
  });

  it("shows the banner and disables controls while in progress, re-enabling after (Req 5.5/7.11/7.12)", () => {
    view.render(snapshot({ discoveryInProgress: true }));
    expect(byClass(root, "flow-agent-banner")[0].hidden).toBe(false);
    expect(byClass(root, "flow-composer-action").every((b) => b.disabled)).toBe(true);
    expect(byClass(root, "flow-select-button").every((b) => b.disabled)).toBe(true);

    view.render(snapshot({ discoveryInProgress: false }));
    expect(byClass(root, "flow-agent-banner")[0].hidden).toBe(true);
    expect(byClass(root, "flow-composer-action").every((b) => !b.disabled)).toBe(true);
    restore();
  });

  it("blocks narrow unless exactly 1 selected, then submits REVISE-style target (Req 7.2/7.3)", () => {
    // 0 selected -> blocked with a message.
    view.render(snapshot());
    const narrow = byClass(root, "flow-composer-action").find((b) => b.dataset.action === "narrow")!;
    narrow.click();
    expect(callbacks.refinements).toHaveLength(0);
    expect(byClass(root, "flow-composer-message")[0].hidden).toBe(false);

    // Exactly 1 selected -> submits with that target.
    view.render(snapshot({ basket: [refKey({ candidateId: "cand-4", revision: 1 })] }));
    const narrow1 = byClass(root, "flow-composer-action").find((b) => b.dataset.action === "narrow")!;
    narrow1.click();
    expect(callbacks.refinements).toEqual([
      { action: "narrow", text: "", targets: [{ candidateId: "cand-4", revision: 1 }] },
    ]);
    restore();
  });

  it("blocks merge with < 2 selected and submits with >= 2 (Req 7.4/7.5)", () => {
    view.render(snapshot({ basket: [refKey({ candidateId: "cand-1", revision: 1 })] }));
    const merge = byClass(root, "flow-composer-action").find((b) => b.dataset.action === "merge")!;
    merge.click();
    expect(callbacks.refinements).toHaveLength(0);

    view.render(
      snapshot({
        basket: [
          refKey({ candidateId: "cand-1", revision: 1 }),
          refKey({ candidateId: "cand-2", revision: 1 }),
        ],
      }),
    );
    const merge2 = byClass(root, "flow-composer-action").find((b) => b.dataset.action === "merge")!;
    merge2.click();
    expect(callbacks.refinements).toHaveLength(1);
    expect(callbacks.refinements[0].action).toBe("merge");
    expect(callbacks.refinements[0].targets).toHaveLength(2);
    restore();
  });

  it("new_direction and show_more submit with no targets regardless of selection (Req 7.6/7.7)", () => {
    view.render(snapshot({ basket: [refKey({ candidateId: "cand-1", revision: 1 })] }));
    const newDir = byClass(root, "flow-composer-action").find((b) => b.dataset.action === "new_direction")!;
    newDir.click();
    const showMore = byClass(root, "flow-composer-action").find((b) => b.dataset.action === "show_more")!;
    showMore.click();
    expect(callbacks.refinements.map((r) => ({ action: r.action, targets: r.targets }))).toEqual([
      { action: "new_direction", targets: [] },
      { action: "show_more", targets: [] },
    ]);
    restore();
  });

  it("passes free text through and clears it optimistically after submit (Req 7.8)", () => {
    view.render(snapshot());
    const composer = byClass(root, "flow-composer-input")[0];
    composer.value = "더 실용적으로";
    const showMore = byClass(root, "flow-composer-action").find((b) => b.dataset.action === "show_more")!;
    showMore.click();
    expect(callbacks.refinements[0].text).toBe("더 실용적으로");
    expect(composer.value).toBe("");
    restore();
  });
});
