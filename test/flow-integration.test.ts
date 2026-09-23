import { describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * Task 16 — end-to-end integration tests for the Discovery -> Spec flow, driven
 * through the real host <-> webview wiring.
 *
 * Sub-tasks 16.1/16.2/16.3 drive a real {@link FlowController} + FlowDispatcher
 * wired to the real flow webview shell through {@link FlowHostWebviewHarness}
 * (see test/support/flow-host-webview-harness.ts). User actions are posted as
 * FLOW intents via `harness.client.postFlow(...)`, then `await harness.settle()`
 * lets the async intent -> controller -> onChange -> hydrateFlow -> render chain
 * complete; `harness.advanceClock(ms)` is used only where a timer must fire.
 *
 * Sub-task 16.4 is a regression guard for the existing Build_Surface: it does
 * NOT use FlowHostWebviewHarness (which hydrates the flow on init). Instead it
 * bootstraps the webview directly and drives a Build-surface hydrate through a
 * real PanelController + WebviewDispatcher (the pattern from
 * test/integration.test.ts) WITHOUT ever sending a `hydrateFlow`, asserting the
 * Build_Surface renders as before and the flow branch stays inert.
 *
 * ## A note on observed vs. specified behavior
 *
 * These tests assert the ACTUAL implementation behavior where it is the
 * authority. The most important such note: the {@link FlowController} never
 * calls `enrichCandidate` and never populates its `candidatesByRef` store, so
 * `snapshot.enrichedCandidates` is ALWAYS empty in the end-to-end flow —
 * enrichment is on-demand and is not auto-run by the controller. The
 * DiscoveryWorkspace only renders a `.flow-enriched` block when an enriched
 * revision matches a card's candidateId; therefore in these end-to-end tests no
 * enriched block is expected, and we assert the BASE card fields that ARE
 * present instead (see 16.1). The enriched-detail rendering itself is covered
 * by the renderer unit test test/flow-workspace-ui.test.ts.
 */

import { FlowHostWebviewHarness } from "./support/flow-host-webview-harness";
import type { FakeElement } from "./support/fake-dom";
import { installFakeDom } from "./support/fake-dom";
import { refKey } from "../src/core/flow/flow-types";

/**
 * The Agent_Run_Banner belonging to a specific flow surface container. Each of
 * the three flow views owns its own `flow-agent-banner`; the harness's global
 * `bannerHidden()` checks ALL of them. Once the flow moves past
 * discovery_start, the (now hidden-container) start view keeps its own banner
 * element in whatever state it last rendered — its `render` early-returns
 * before touching the banner when its phase is inactive. So to assert the
 * ACTIVE surface's banner we scope the probe to that surface's container.
 */
function bannerInContainer(h: FlowHostWebviewHarness, containerClass: string): FakeElement | undefined {
  const container = h.byClass(containerClass)[0];
  if (container === undefined) {
    return undefined;
  }
  return container.queryAll((e) => e.className === "flow-agent-banner")[0];
}

/** Whether the discovery_workspace surface's own banner is hidden. */
function workspaceBannerHidden(h: FlowHostWebviewHarness): boolean {
  const banner = bannerInContainer(h, "flow-workspace");
  return banner === undefined ? true : banner.hidden;
}

/** Whether the spec_review surface's own banner is hidden. */
function specBannerHidden(h: FlowHostWebviewHarness): boolean {
  const banner = bannerInContainer(h, "flow-spec");
  return banner === undefined ? true : banner.hidden;
}

// ---------------------------------------------------------------------------
// describe 16.1 — discovery start + workspace rendering
// (Req 4.1, 4.6, 5.1-5.5, 6.3)
// ---------------------------------------------------------------------------

describe("16.1 discovery start + workspace rendering (Req 4.1, 4.6, 5.1-5.5, 6.3)", () => {
  let h: FlowHostWebviewHarness;

  beforeEach(() => {
    h = new FlowHostWebviewHarness();
  });
  afterEach(() => h.dispose());

  it("initial hydrate shows the discovery_start surface with form fields + a hidden Agent_Run_Banner (Req 4.1, 4.6)", () => {
    // On construction the harness performs the first hydrateFlow from host
    // state (no project yet -> discovery_start phase).
    expect(h.startSurfaceVisible()).toBe(true);
    expect(h.workspaceSurfaceVisible()).toBe(false);
    expect(h.specSurfaceVisible()).toBe(false);

    // Required + optional form fields are present (Req 4.1).
    expect(h.byClass("flow-goal-input")).toHaveLength(1);
    expect(h.byClass("flow-optional-input")).toHaveLength(2); // personalNeed + recentFriction
    expect(h.byClass("flow-level-select")).toHaveLength(1);
    expect(h.byClass("flow-start-submit")).toHaveLength(1);

    // The Agent_Run_Banner element exists but is hidden while idle (Req 4.6).
    expect(h.byClass("flow-agent-banner").length).toBeGreaterThanOrEqual(1);
    expect(h.bannerHidden()).toBe(true);
  });

  it("startDiscovery renders the workspace with exactly 10 candidate cards + round rationale + round header (Req 5.1, 5.2)", async () => {
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "리액트를 배우고 싶어요" } });
    await h.settle();

    // A preview round exists -> discovery_workspace phase is revealed.
    expect(h.workspaceSurfaceVisible()).toBe(true);
    expect(h.startSurfaceVisible()).toBe(false);

    // The base preview round renders exactly 10 candidate cards (Req 5.1).
    expect(h.byClass("flow-candidate-card")).toHaveLength(10);

    // Round header + rationale are present (Req 5.2). "라운드 1" is the base round.
    const headers = h.byClass("flow-round-header").map((e) => e.textContent);
    expect(headers[0]).toBe("라운드 1");
    expect(h.byClass("flow-round-rationale").length).toBeGreaterThanOrEqual(1);
    expect(h.byClass("flow-round-rationale")[0].textContent.length).toBeGreaterThan(0);
  });

  it("renders the base card fields present in the end-to-end flow; no enriched block (enrichment is not auto-run) (Req 5.1, 5.3)", async () => {
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "타입스크립트 연습" } });
    await h.settle();

    // Base fields the preview cards carry (Req 5.1): title, summary, appeal,
    // core interaction. Ten of each, one per card.
    expect(h.byClass("flow-candidate-title")).toHaveLength(10);
    expect(h.byClass("flow-candidate-summary")).toHaveLength(10);
    expect(h.byClass("flow-candidate-appeal")).toHaveLength(10);
    expect(h.byClass("flow-candidate-interaction")).toHaveLength(10);
    // Generation-tag chips render for the cards (Req 5.1).
    expect(h.byClass("flow-tag").length).toBeGreaterThanOrEqual(10);

    // The controller does not call enrichCandidate / populate candidatesByRef,
    // so snapshot.enrichedCandidates is empty and NO enriched block renders
    // (Req 5.3 — enrichment is on-demand, not auto-run here). Enriched-detail
    // rendering itself is covered by test/flow-workspace-ui.test.ts.
    expect(h.controller.getEnrichedCandidates()).toHaveLength(0);
    expect(h.byClass("flow-enriched")).toHaveLength(0);
  });

  it("accumulated rounds render in ascending order after a second accepted feedback (Req 5.4)", async () => {
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "웹앱 만들기" } });
    await h.settle();
    expect(h.byClass("flow-round-header").map((e) => e.textContent)).toEqual(["라운드 1"]);

    // "show_more" maps to a MORE feedback intent (0 targets) -> the mock returns
    // a fresh round with roundIndex 2, appended in ascending order (Req 5.4).
    h.client.postFlow({ type: "submitRefinement", action: "show_more", text: "", targets: [] });
    await h.settle();

    const headers = h.byClass("flow-round-header").map((e) => e.textContent);
    expect(headers).toEqual(["라운드 1", "라운드 2"]);
    // The controller accumulated exactly one feedback round (roundIndex 2).
    expect(h.controller.getRounds().map((r) => r.roundIndex)).toEqual([2]);
  });

  it("shows the Agent_Run_Banner + disables controls while a discovery op is in flight (Req 5.5, 7.11)", async () => {
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "게임 만들기" } });
    await h.settle();
    // Idle after the round resolved: the workspace banner is hidden.
    expect(h.controller.isInProgress("discovery")).toBe(false);
    expect(workspaceBannerHidden(h)).toBe(true);

    // Script the next feedback op to hang so the discovery surface stays busy.
    h.ports!.setPending("submitFeedback");
    h.client.postFlow({ type: "submitRefinement", action: "show_more", text: "", targets: [] });
    await h.settle();

    // In-flight: the workspace banner is visible and its controls are disabled.
    // (We scope the banner to the visible workspace surface: the hidden
    // discovery_start container retains its own banner element, so the global
    // bannerHidden() helper is not the right probe once past the start phase.)
    expect(h.workspaceSurfaceVisible()).toBe(true);
    expect(workspaceBannerHidden(h)).toBe(false);
    expect(h.controller.isInProgress("discovery")).toBe(true);
    expect(h.byClass("flow-composer-action").every((b) => b.disabled)).toBe(true);
    expect(h.byClass("flow-select-button").every((b) => b.disabled)).toBe(true);
    expect(h.byClass("flow-basket-toggle").every((b) => b.disabled)).toBe(true);
  });

  it("hides the banner + re-enables controls once a discovery op resolves (Req 7.12)", async () => {
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "데이터 시각화" } });
    await h.settle();

    // A resolving op (the spy's default ok payload settles on the microtask
    // queue): after settle the surface is idle again.
    h.client.postFlow({ type: "submitRefinement", action: "show_more", text: "", targets: [] });
    await h.settle();

    expect(h.controller.isInProgress("discovery")).toBe(false);
    expect(workspaceBannerHidden(h)).toBe(true);
    expect(h.byClass("flow-composer-action").every((b) => !b.disabled)).toBe(true);
    expect(h.byClass("flow-select-button").every((b) => !b.disabled)).toBe(true);
  });

  it("toggleBasket reflects membership on the toggled card (Req 6.3)", async () => {
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "메모 앱" } });
    await h.settle();

    // Preview candidates are referenced as revision 1. Grab the first card's
    // candidateId from the controller's preview round to build the ref.
    const firstPreview = h.controller.getPreviewRound()!.previews[0];
    const ref = { candidateId: firstPreview.candidateId, revision: 1 };

    // Initially not in the basket.
    expect(h.byClass("flow-basket-toggle")[0].textContent).toBe("바구니에 담기");

    h.client.postFlow({ type: "toggleBasket", ref });
    await h.settle();

    // The host basket now contains the ref, and the toggled card reflects it.
    expect(h.controller.getBasketKeys()).toContain(refKey(ref));
    expect(h.byClass("flow-basket-toggle")[0].textContent).toBe("바구니에서 빼기");
    expect(h.byClass("flow-basket-toggle")[0].attributes["aria-pressed"]).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// describe 16.2 — composer, select, spec review, confirm reveal
// (Req 7.11, 7.12, 8.1, 8.5, 9.1-9.6, 10.1, 10.4, 11.1, 11.5)
// ---------------------------------------------------------------------------

describe("16.2 composer, select, spec review, confirm reveal (Req 7.11, 7.12, 8.1, 8.5, 9.1-9.6, 10.1, 10.4, 11.1, 11.5)", () => {
  let h: FlowHostWebviewHarness;

  beforeEach(() => {
    h = new FlowHostWebviewHarness();
  });
  afterEach(() => h.dispose());

  /** Start discovery and settle so the workspace + preview round exist. */
  async function startWorkspace(goal = "리액트 앱 만들기"): Promise<void> {
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: goal } });
    await h.settle();
  }

  it("composer banner shows + actions disable while a refinement op is pending, re-enabling after a resolving op (Req 7.11, 7.12)", async () => {
    await startWorkspace();

    // First, a RESOLVING refinement op (the spy default) leaves the composer
    // re-enabled and the banner hidden once settled (Req 7.12). We assert the
    // re-enabled state first because a permanently-pending op holds the
    // single-flight lock and cannot be "un-hung" mid-flight.
    h.client.postFlow({ type: "submitRefinement", action: "show_more", text: "", targets: [] });
    await h.settle();
    expect(h.controller.isInProgress("discovery")).toBe(false);
    expect(workspaceBannerHidden(h)).toBe(true);
    expect(h.byClass("flow-composer-action").every((b) => !b.disabled)).toBe(true);

    // Now hang the next refinement op: the banner shows and the composer
    // actions disable while it is in flight (Req 7.11).
    h.ports!.setPending("submitFeedback");
    h.client.postFlow({ type: "submitRefinement", action: "show_more", text: "", targets: [] });
    await h.settle();
    expect(h.controller.isInProgress("discovery")).toBe(true);
    expect(workspaceBannerHidden(h)).toBe(false);
    expect(h.byClass("flow-composer-action").every((b) => b.disabled)).toBe(true);
  });

  it("selectCandidate advances to spec_review and drafts a spec (Req 8.1, 8.5, 8.4)", async () => {
    await startWorkspace();

    const first = h.controller.getPreviewRound()!.previews[0];
    const target = { candidateId: first.candidateId, revision: 1 };

    h.client.postFlow({ type: "selectCandidate", target });
    await h.settle();

    // SELECT transitions the project to SPEC_REVIEW; the spec surface shows.
    expect(h.specSurfaceVisible()).toBe(true);
    expect(h.workspaceSurfaceVisible()).toBe(false);
    expect(h.controller.getProject()?.status).toBe("SPEC_REVIEW");
    // The spec draft was generated (Req 8.4/8.5) and rendered.
    expect(h.controller.getSpec()).not.toBeNull();
    expect(h.byClass("flow-spec-purpose")).toHaveLength(1);
  });

  it("shows the draft Agent_Run_Banner while generateSpecDraft is in flight (Req 8.5)", async () => {
    await startWorkspace();
    const first = h.controller.getPreviewRound()!.previews[0];

    // Hang the spec-draft op so the spec surface renders in its in-flight state.
    h.ports!.setPending("generateSpecDraft");
    h.client.postFlow({
      type: "selectCandidate",
      target: { candidateId: first.candidateId, revision: 1 },
    });
    await h.settle();

    // Phase is spec_review (status flipped before the draft op ran); the spec
    // op is in flight so the spec banner shows and the loading state renders.
    expect(h.specSurfaceVisible()).toBe(true);
    expect(h.controller.isInProgress("spec")).toBe(true);
    expect(specBannerHidden(h)).toBe(false);
    expect(h.byClass("flow-spec-loading")).toHaveLength(1);
  });

  it("renders the full spec review from the default draft (Req 9.1-9.6)", async () => {
    await startWorkspace();
    const first = h.controller.getPreviewRound()!.previews[0];
    h.client.postFlow({
      type: "selectCandidate",
      target: { candidateId: first.candidateId, revision: 1 },
    });
    await h.settle();

    const spec = h.controller.getSpec()!;

    // Req 9.1: product purpose one-liner.
    expect(h.byClass("flow-spec-purpose")[0].textContent).toBe(spec.productPurpose);

    // Req 9.2: target users as chips + primaryUsageMoment / successMoment facts.
    const facts = h.byClass("flow-spec-fact-value").map((e) => e.textContent);
    expect(facts).toContain(spec.primaryUsageMoment);
    expect(facts).toContain(spec.successMoment);
    const chipTexts = h.byClass("flow-tag").map((e) => e.textContent);
    for (const user of spec.targetUsers) {
      expect(chipTexts).toContain(user);
    }

    // Req 9.3: MVP features as a list.
    const listItems = h.byClass("flow-spec-list-item").map((e) => e.textContent);
    for (const feature of spec.mvpFeatures) {
      expect(listItems).toContain(feature);
    }

    // Req 9.4: scope grouped into the three categories in a fixed order, with
    // concept chips.
    const groups = h.byClass("flow-spec-scope-group");
    expect(groups.map((g) => g.dataset.category)).toEqual([
      "LEARNER_FOCUS",
      "AGENT_SUPPORT",
      "EXCLUDED",
    ]);
    expect(h.byClass("flow-spec-scope-title").map((e) => e.textContent)).toEqual([
      "내가 배울 것",
      "에이전트가 도울 것",
      "이번 범위에서 제외",
    ]);

    // Req 9.5: each expected decision renders category / description / why.
    expect(h.byClass("flow-decision")).toHaveLength(spec.expectedDecisions.length);
    const categories = h.byClass("flow-decision-category").map((e) => e.textContent);
    const descriptions = h.byClass("flow-decision-description").map((e) => e.textContent);
    const whys = h.byClass("flow-decision-why").map((e) => e.textContent);
    for (const decision of spec.expectedDecisions) {
      expect(categories).toContain(decision.category);
      expect(descriptions).toContain(decision.description);
      expect(whys).toContain(decision.whyUserInputMatters);
    }

    // Req 9.6: runtimeConstraint + deploymentConstraints.
    expect(facts).toContain(spec.runtimeConstraint); // "TYPESCRIPT"
    for (const constraint of spec.deploymentConstraints) {
      expect(listItems).toContain(constraint);
    }
  });

  it("shows the refine input, and the banner while a refine op is in flight (Req 10.1, 10.4)", async () => {
    await startWorkspace();
    const first = h.controller.getPreviewRound()!.previews[0];
    h.client.postFlow({
      type: "selectCandidate",
      target: { candidateId: first.candidateId, revision: 1 },
    });
    await h.settle();

    // The refine input + button exist (Req 10.1).
    expect(h.byClass("flow-spec-refine-input")).toHaveLength(1);
    expect(h.byClass("flow-spec-refine-button")).toHaveLength(1);

    // Hang the refine op so the spec banner shows and controls disable (Req 10.4).
    h.ports!.setPending("refineSpec");
    h.client.postFlow({ type: "refineSpec", message: "사용자를 더 좁혀 주세요" });
    await h.settle();

    expect(h.controller.isInProgress("spec")).toBe(true);
    expect(specBannerHidden(h)).toBe(false);
    expect(h.byClass("flow-spec-refine-input")[0].disabled).toBe(true);
    expect(h.byClass("flow-spec-refine-button")[0].disabled).toBe(true);
    expect(h.byClass("flow-spec-confirm")[0].disabled).toBe(true);
  });

  it("confirmSpec advances to BUILDING: all flow surfaces hidden, Build_Surface revealed (Req 11.1, 11.5)", async () => {
    await startWorkspace();
    const first = h.controller.getPreviewRound()!.previews[0];
    h.client.postFlow({
      type: "selectCandidate",
      target: { candidateId: first.candidateId, revision: 1 },
    });
    await h.settle();
    expect(h.specSurfaceVisible()).toBe(true);

    // Confirm the spec (Req 11.1). The default spy path confirms with the spec's
    // current revision, so the mock's optimistic-concurrency guard passes.
    h.client.postFlow({ type: "confirmSpec" });
    await h.settle();

    // Project reaches BUILDING (Req 11.2/11.3) and the phase becomes "building".
    expect(h.controller.getProject()?.status).toBe("BUILDING");
    expect(h.controller.snapshot().phase).toBe("building");

    // All flow surfaces are hidden and the Build_Surface is revealed (Req 11.5).
    expect(h.startSurfaceVisible()).toBe(false);
    expect(h.workspaceSurfaceVisible()).toBe(false);
    expect(h.specSurfaceVisible()).toBe(false);

    // The build container (holding the PanelRenderer's Build_Surface DOM) is
    // visible; the flow container is hidden.
    const buildShell = h.byClass("build-shell")[0];
    const flowShell = h.byClass("flow-shell")[0];
    expect(buildShell).toBeDefined();
    expect(buildShell.hidden).toBe(false);
    expect(flowShell.hidden).toBe(true);
    // NOTE: the Build_Surface's tab panels are rendered lazily by the
    // PanelRenderer only on a Build `hydrate` message, which this flow-only
    // harness never sends. The reveal is therefore asserted at the container
    // level (build-shell shown / flow-shell hidden); the tab-panel DOM itself
    // is exercised by the Build-surface regression guard in describe 16.4.
  });
});

// ---------------------------------------------------------------------------
// describe 16.3 — shell phase gating + re-hydration (Req 12.2, 12.3, 13.4)
// ---------------------------------------------------------------------------

describe("16.3 shell phase gating + re-hydration (Req 12.2, 12.3, 13.4)", () => {
  let h: FlowHostWebviewHarness;

  afterEach(() => h.dispose());

  it("DISCOVERY phases render the flow surfaces and hide the Build tabs (Req 12.2)", async () => {
    h = new FlowHostWebviewHarness();

    // discovery_start (no project yet): flow shell shown, build shell hidden.
    expect(h.byClass("flow-shell")[0].hidden).toBe(false);
    expect(h.byClass("build-shell")[0].hidden).toBe(true);
    expect(h.startSurfaceVisible()).toBe(true);

    // discovery_workspace: still a flow phase; build tabs stay hidden.
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "플래시카드 앱" } });
    await h.settle();
    expect(h.workspaceSurfaceVisible()).toBe(true);
    expect(h.byClass("flow-shell")[0].hidden).toBe(false);
    expect(h.byClass("build-shell")[0].hidden).toBe(true);
  });

  it("SPEC_REVIEW renders the spec surface and hides the Build tabs (Req 12.2)", async () => {
    h = new FlowHostWebviewHarness();
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "가계부 앱" } });
    await h.settle();
    const first = h.controller.getPreviewRound()!.previews[0];
    h.client.postFlow({
      type: "selectCandidate",
      target: { candidateId: first.candidateId, revision: 1 },
    });
    await h.settle();

    expect(h.controller.snapshot().phase).toBe("spec_review");
    expect(h.specSurfaceVisible()).toBe(true);
    expect(h.byClass("flow-shell")[0].hidden).toBe(false);
    expect(h.byClass("build-shell")[0].hidden).toBe(true);
  });

  it("BUILDING reveals the Build tabs and hides the flow surfaces (Req 12.3)", async () => {
    h = new FlowHostWebviewHarness();
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "독서 기록 앱" } });
    await h.settle();
    const first = h.controller.getPreviewRound()!.previews[0];
    h.client.postFlow({
      type: "selectCandidate",
      target: { candidateId: first.candidateId, revision: 1 },
    });
    await h.settle();
    h.client.postFlow({ type: "confirmSpec" });
    await h.settle();

    expect(h.controller.snapshot().phase).toBe("building");
    // The build shell is revealed and the flow shell hidden (Req 12.3). The
    // Build_Surface tab-panel DOM is rendered lazily on a Build hydrate (never
    // sent by this flow-only harness); it is covered by describe 16.4.
    expect(h.byClass("build-shell")[0].hidden).toBe(false);
    expect(h.byClass("flow-shell")[0].hidden).toBe(true);
  });

  it("re-hydrates purely from onChange when a latency-driven mock op completes (Req 13.4)", async () => {
    // Drive a REAL seeded MockDiscoveryPort so ops complete after a scheduled
    // latency rather than on the microtask queue. The controller's
    // onChange -> hydrateFlow forwards each async, non-intent mutation to the
    // webview, so the webview must re-render WITHOUT the test posting a second
    // intent.
    //
    // IMPLEMENTATION NOTE: `createFlowPorts` (used by `useMock: true`)
    // constructs the MockDiscoveryPort WITHOUT injecting the controller's
    // clock, so the mock schedules its latency on the real SystemClock — the
    // harness's `advanceClock()` (which only drives the controller's own
    // timeout timers) cannot fire it. We therefore await the real (short,
    // <= ~1.4s per op) latency instead. This still exercises exactly what the
    // task targets: an async, non-intent-driven mutation reaching the webview
    // purely through the controller's onChange re-hydration.
    h = new FlowHostWebviewHarness({ useMock: true, seed: 7 });

    // Post the start intent. With real latency the op body has NOT fired yet
    // right after settle, so the workspace is not rendered — we are still on
    // the discovery_start surface.
    h.client.postFlow({ type: "startDiscovery", input: { learningGoal: "감정 일기 앱" } });
    await h.settle();
    expect(h.startSurfaceVisible()).toBe(true);
    expect(h.workspaceSurfaceVisible()).toBe(false);

    // Wait out the chained startDiscovery -> generatePreviewRound latencies.
    // Each op completion mutates the controller and triggers
    // onChange -> hydrateFlow with no further intent from the test.
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await h.settle();

    // The webview re-rendered the workspace purely from the controller's
    // onChange-driven re-hydration (Req 13.4): a preview round now exists and
    // the workspace surface is visible with its 10 cards.
    expect(h.controller.getPreviewRound()).not.toBeNull();
    expect(h.workspaceSurfaceVisible()).toBe(true);
    expect(h.byClass("flow-candidate-card")).toHaveLength(10);
  }, 10000);
});

// ---------------------------------------------------------------------------
// describe 16.4 — regression guard for the existing Build_Surface
// (Req 12.1, 12.2)
//
// This block does NOT use FlowHostWebviewHarness (which hydrates the flow on
// init). It bootstraps the webview directly and drives a Build-surface hydrate
// through a real PanelController + WebviewDispatcher (the pattern from
// test/integration.test.ts's HostWebviewHarness), WITHOUT ever sending a
// `hydrateFlow`. With no flow snapshot, selectShellSurface(null) === "build",
// so the Build_Surface must render exactly as before and the flow container
// must stay hidden/inert.
// ---------------------------------------------------------------------------

// Minimal `vscode` mock is not needed here (we do not import ../src/extension).

import { PanelController } from "../src/core/panel-controller";
import { WebviewDispatcher } from "../src/webview/dispatcher";
import { MockAdapter } from "../src/adapter/mock-adapter";
import { bootstrap } from "../src/webview/main";
import { WebviewClient } from "../src/webview/client-messaging";
import type { VsCodeApi } from "../src/webview/vscode-api";
import type { HostToWebview, WebviewToHost } from "../src/webview/messages";
import { selectShellSurface } from "../src/webview/shell-view-model";

describe("16.4 regression guard for the existing Build_Surface (Req 12.1, 12.2)", () => {
  let restore: () => void;
  let root: FakeElement;
  let controller: PanelController;
  let dispatcher: WebviewDispatcher;
  let client: WebviewClient;

  beforeEach(() => {
    const dom = installFakeDom();
    restore = dom.restore;
    root = dom.createElement("div");

    // Webview side over a stub VsCodeApi: webview -> host intents feed the
    // dispatcher, and each handled intent is followed by a full Build-surface
    // hydrateAll (mirroring the runtime provider wiring). No hydrateFlow is
    // ever sent, so the flow branch stays inert.
    let dispatcherRef: WebviewDispatcher;
    const api: VsCodeApi = {
      postMessage: (intent: WebviewToHost) => {
        void dispatcherRef.handle(intent as WebviewToHost).then(() => {
          dispatcherRef.hydrateAll();
        });
      },
    };
    client = new WebviewClient(api);
    bootstrap(root as unknown as HTMLElement, client);

    // Host side: a real PanelController + WebviewDispatcher, posting host ->
    // webview Build messages straight into the webview client's dispatch.
    controller = new PanelController(new MockAdapter(), {
      onNotice: (notice) => dispatcher.forwardNotice(notice),
    });
    dispatcher = new WebviewDispatcher(controller, (message: HostToWebview) => {
      client.dispatch(message);
    });
    dispatcherRef = dispatcher;

    // First paint from Build-surface host state (mirrors wireWebviewMessaging).
    dispatcher.hydrateAll();
  });

  afterEach(() => restore());

  async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  it("renders the Build_Surface (two tab panels) with the flow container hidden and inert (Req 12.1)", () => {
    // The Build_Surface renders its two tab panels; Builder is active by default.
    const panels = root.queryAll((e) => e.className === "tab-panel");
    expect(panels).toHaveLength(2);
    const builder = panels.find((p) => p.dataset.tab === "builder");
    const helper = panels.find((p) => p.dataset.tab === "helper");
    expect(builder?.hidden).toBe(false);
    expect(helper?.hidden).toBe(true);

    // No hydrateFlow was ever posted -> the flow phase branch is inert: the
    // build shell is shown and the flow shell hidden.
    const buildShell = root.queryAll((e) => e.className === "build-shell")[0];
    const flowShell = root.queryAll((e) => e.className === "flow-shell")[0];
    expect(buildShell.hidden).toBe(false);
    expect(flowShell.hidden).toBe(true);

    // With no flow snapshot, the pure phase gate defaults to "build" (Req 12.1).
    expect(selectShellSurface(null)).toBe("build");
  });

  it("keeps the Build_Surface behavior on a selectTab intent without ever touching the flow branch (Req 12.2)", async () => {
    // A Build intent flows host->controller->hydrate->webview exactly as before.
    client.post({ type: "selectTab", tab: "helper" });
    await settle();

    expect(controller.activeTab).toBe("helper");
    const panels = root.queryAll((e) => e.className === "tab-panel");
    expect(panels.find((p) => p.dataset.tab === "helper")?.hidden).toBe(false);
    expect(panels.find((p) => p.dataset.tab === "builder")?.hidden).toBe(true);

    // The flow branch stayed inert throughout (no flow snapshot hydrated).
    expect(root.queryAll((e) => e.className === "flow-shell")[0].hidden).toBe(true);
    expect(root.queryAll((e) => e.className === "build-shell")[0].hidden).toBe(false);
    expect(selectShellSurface(null)).toBe("build");
  });
});
