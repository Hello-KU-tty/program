import { describe, it, expect } from "vitest";

import { AgentSurfaceView, type AgentRenderCallbacks } from "../src/webview/agent/agent-render";
import {
  initialAgentViewModel,
  type AgentViewModel,
  type BuilderTurnViewModel,
  type ToolRowViewModel,
  type DecisionViewModel,
} from "../src/core/agent/agent-view-model";
import type { EvidenceTraceView } from "../vendor/frontend-client";
import { installFakeDom, type FakeElement } from "./support/fake-dom";

/**
 * Unit/DOM tests for the framework-free agent render (task 9.2).
 *
 * These focus on the four criteria the task calls out and NOT already covered
 * by other suites:
 *   - agent text and tool `output` are set via `textContent` only, so an
 *     HTML-looking string is shown literally and never interpreted as markup
 *     (Req 2.7) — asserted by checking `textContent` equals the raw string and
 *     no child element/markup node was created for it;
 *   - the view model's `toolRows` (keyed by `key`, i.e. a de-duplicated
 *     `toolId`) render exactly one row per key (Req 2.2 / 2.8);
 *   - honest evidence display: `OBSERVED_ONLY` / `userUnderstandingCount === 0`
 *     never claim understanding, and an `ANALYZED` analysis with
 *     `acceptedCount === 0` surfaces its `noEvidenceReason` (Req 10.2 / 10.4);
 *   - no absolute path ever appears in a rendered tool row — only
 *     `relativePath` (Req 2.9).
 *
 * The repo's DOM tests run under the `node` environment against the in-memory
 * `installFakeDom()` helper (see `flow-render-examples.test.ts`); this suite
 * follows the same convention rather than pulling in a browser DOM dependency.
 */

/** No-op callbacks; these tests exercise render output, not gestures. */
function noopCallbacks(): AgentRenderCallbacks {
  return {
    onBuilderStart: () => {},
    onBuilderStop: () => {},
    onHelperStart: () => {},
    onResolveDecision: () => {},
    onResumeAfterDecision: () => {},
    onOpenInKiro: () => {},
    onNativeAnswer: () => {},
    onOpenWorkspace: () => {},
    onLaunchResult: () => {},
    onReadEvidence: () => {},
    onRetryAnalysis: () => {},
    onListFinalUpgrade: () => {},
    onPrepareFinalUpgrade: () => {},
    onRetryNextMove: () => {},
    onCopyChatText: () => {},
  };
}

function toolRow(overrides: Partial<ToolRowViewModel> = {}): ToolRowViewModel {
  return {
    key: "tool-1",
    tool: "write",
    status: "SUCCEEDED",
    relativePath: "src/app.ts",
    command: null,
    exitCode: null,
    coreAction: null,
    output: null,
    truncated: false,
    errorCode: null,
    ...overrides,
  };
}

function builder(overrides: Partial<BuilderTurnViewModel> = {}): BuilderTurnViewModel {
  return {
    ...initialAgentViewModel().builder,
    ...overrides,
  };
}

function vmWithBuilder(overrides: Partial<BuilderTurnViewModel>): AgentViewModel {
  return { ...initialAgentViewModel(), builder: builder(overrides) };
}

function byClass(root: FakeElement, className: string): FakeElement[] {
  return root.queryAll((e) => e.className === className);
}

/** Builds a view against a fresh fake DOM; caller must call `restore`. */
function mount(callbacks = noopCallbacks()): {
  root: FakeElement;
  view: AgentSurfaceView;
  restore: () => void;
} {
  const dom = installFakeDom();
  const root = dom.createElement("div") as unknown as FakeElement;
  const view = new AgentSurfaceView(root as unknown as HTMLElement, callbacks);
  return { root, view, restore: dom.restore };
}

function pendingDecision(): DecisionViewModel {
  return { decisionId: "decision_synthetic", taskId: "task_synthetic", category: "PRODUCT_BEHAVIOR", question: "Choose data source",
    options: [{ id: "sample", label: "Sample", description: "Local sample" }], recommendedOptionId: "sample",
    resolved: false, applied: false, contextVersion: 1 };
}

describe("generated workspace and result actions", () => {
  it("starts a prepared task with an empty optional message only after an explicit click", () => {
    const starts: string[] = [];
    const { root, view, restore } = mount({ ...noopCallbacks(), onBuilderStart: message => starts.push(message) });
    try {
      view.render(vmWithBuilder({ taskId: "task_pending", readyToStart: true }));
      expect(starts).toEqual([]);
      const button = byClass(root, "agent-builder-send")[0];
      expect(button.textContent).toBe("빌더 시작");
      expect(byClass(root, "agent-builder-phase")[0].textContent).toBe("시작 대기");
      button.click();
      expect(starts).toEqual([""]);
      view.render(vmWithBuilder({ taskId: "task_pending", readyToStart: true, phase: "STARTING" }));
      button.click();
      expect(starts).toEqual([""]);
    } finally { restore(); }
  });

  it("does not turn an empty ordinary composer into a new Builder request", () => {
    const starts: string[] = [];
    const { root, view, restore } = mount({ ...noopCallbacks(), onBuilderStart: message => starts.push(message) });
    try {
      view.render(vmWithBuilder({ taskId: "task_active", readyToStart: false }));
      byClass(root, "agent-builder-send")[0].click();
      expect(starts).toEqual([]);
    } finally { restore(); }
  });

  it("labels a closed Discovery as a completed exploration, not a Builder failure", () => {
    const { root, view, restore } = mount();
    try {
      view.render({ ...vmWithBuilder({ taskId: "task_pending", readyToStart: true }),
        worker: { stage: "AGENT_ENDED", role: "DISCOVERY", code: "AGENT_SESSION_CLOSED_DISCOVERY" } });
      expect(byClass(root, "agent-worker-status")[0].textContent).toBe("탐색 작업이 끝났어요.");
    } finally { restore(); }
  });
  it("labels scrollable transcripts and saved conversations for keyboard access without announcing every token", () => {
    const { root, restore } = mount();
    try {
      const transcripts = byClass(root, "agent-transcript");
      expect(transcripts.map(el => el.attributes["aria-label"])).toEqual(["빌더 진행 내용", "도우미 응답 내용"]);
      for (const el of [...transcripts, ...byClass(root, "agent-helper-conversations")]) {
        expect(el.attributes.role).toBe("region");
        expect(el.attributes.tabindex).toBe("0");
        expect(el.attributes["aria-live"]).toBeUndefined();
      }
      expect(byClass(root, "agent-builder-phase")[0].attributes["aria-live"]).toBe("polite");
      expect(byClass(root, "agent-helper-error")[0].attributes.role).toBe("alert");
    } finally { restore(); }
  });

  it("makes bounded tool output independently keyboard-scrollable with a readable label", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ toolRows: [toolRow({ output: "bounded synthetic output" })] }));
      const output = byClass(root, "agent-tool-row-output")[0];
      expect(output.attributes).toMatchObject({ role: "region", tabindex: "0", "aria-label": "도구 실행 출력" });
      expect(output.textContent).toBe("bounded synthetic output");
    } finally { restore(); }
  });

  it("fills durable upgrade references while preserving the user's goal and explicit trace choice", () => {
    const { root, view, restore } = mount();
    try {
      const vm = vmWithBuilder({ phase: "TASK_COMPLETED", taskId: "task_source", taskRevision: 7 });
      view.render(vm);
      const source = byClass(root, "agent-input source-task-id")[0];
      const revision = byClass(root, "agent-input expected-source-task-revision")[0];
      const trace = byClass(root, "agent-input personalization-trace-id")[0];
      const goal = byClass(root, "agent-final-upgrade-goal")[0];
      expect(source.value).toBe("task_source"); expect(revision.value).toBe("7");
      goal.value = "my unfinished goal";
      view.renderFinalUpgrade([{ id: "trace_one", basisCount: 1, createdAt: "2026-09-28T00:00:00Z" }]);
      expect(trace.value).toBe("trace_one");
      trace.value = "trace_user_choice";
      view.render(vm);
      view.renderFinalUpgrade([{ id: "trace_two", basisCount: 2, createdAt: "2026-09-28T00:01:00Z" }]);
      expect(trace.value).toBe("trace_user_choice"); expect(goal.value).toBe("my unfinished goal");
      view.render(vmWithBuilder({ taskId: "task_upgrade", taskRevision: 1 }));
      expect(source.value).toBe("task_upgrade"); expect(revision.value).toBe("1"); expect(trace.value).toBe("");
      expect(goal.value).toBe("my unfinished goal");
    } finally { restore(); }
  });

  it("exposes explicit actions for the current task without leaking a path or running the Builder", () => {
    const opened: string[] = []; let launches = 0; let starts = 0;
    const { root, view, restore } = mount({ ...noopCallbacks(), onOpenWorkspace: id => opened.push(id), onLaunchResult: () => launches++, onBuilderStart: () => starts++ });
    try {
      view.render(vmWithBuilder({ phase: "TASK_COMPLETED", taskId: "task_synthetic", completionReportId: "report_synthetic" }));
      const workspace = byClass(root, "agent-workspace-open")[0];
      const result = byClass(root, "agent-result-launch")[0];
      expect(workspace.hidden).toBe(false); expect(workspace.disabled).toBe(false);
      expect(result.hidden).toBe(false); expect(result.disabled).toBe(false);
      workspace.click(); result.click();
      expect(opened).toEqual(["task_synthetic"]); expect(launches).toBe(1); expect(starts).toBe(0);
      expect(byClass(root, "agent-builder-send")[0].disabled).toBe(false);
      view.resetProject(); view.render(initialAgentViewModel());
      workspace.click(); result.click();
      expect(opened).toEqual(["task_synthetic"]); expect(launches).toBe(1);
    } finally { restore(); }
  });

  it("on a Kiro-native host connects through the '지금 할 일' card, never a panel Builder start (K23)", () => {
    let opens = 0; let starts = 0;
    const { root, view, restore } = mount({ ...noopCallbacks(), onOpenInKiro: () => opens++, onBuilderStart: () => starts++ });
    try {
      const kiro = { ...vmWithBuilder({ taskId: "task_synthetic", readyToStart: true }), hostChat: { opening: false } };
      view.render(kiro);
      const open = byClass(root, "agent-now-action")[0];
      expect(open.hidden).toBe(false); expect(open.disabled).toBe(false);
      expect(open.textContent).toBe("Kiro 채팅에서 열기");
      expect(byClass(root, "agent-now-lead")[0].textContent).toBe("이 Project를 Kiro 채팅에 연결해요.");
      expect(byClass(root, "agent-now-note")[0].hidden).toBe(false);
      expect(byClass(root, "agent-now-note")[0].textContent).toContain("10~30초");
      expect(byClass(root, "agent-composer")[0].hidden).toBe(true);
      for (const name of ["agent-workspace-open", "agent-builder-stop", "agent-builder-resume", "agent-result-launch", "agent-builder-next", "agent-builder-phase"])
        expect(byClass(root, name)[0].hidden).toBe(true);
      open.click();
      expect(opens).toBe(1); expect(starts).toBe(0);
      view.render({ ...kiro, hostChat: { opening: true } });
      expect(open.disabled).toBe(true);
      expect(open.textContent).toBe("연결하는 중…");
      open.click();
      expect(opens).toBe(1);
      // No Task yet: nothing to connect.
      view.render({ ...initialAgentViewModel(), hostChat: { opening: false } });
      expect(open.hidden).toBe(true);
      // Other hosts keep the panel Builder and never show the card.
      view.render(vmWithBuilder({ taskId: "task_synthetic", readyToStart: true }));
      expect(byClass(root, "agent-now")[0].hidden).toBe(true);
      expect(byClass(root, "agent-composer")[0].hidden).toBe(false);
      expect(byClass(root, "agent-builder-send")[0].hidden).toBe(false);
    } finally { restore(); }
  });

  it("does not expose workspace switching or launch while a Builder turn is active", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ phase: "RUNNING", taskId: "task_synthetic" }));
      expect(byClass(root, "agent-workspace-open")[0].disabled).toBe(true);
      expect(byClass(root, "agent-result-launch")[0].hidden).toBe(true);
    } finally { restore(); }
  });
});

describe("Decision/native form stability during stream hydration", () => {
  it("keeps the same Decision input nodes and exact drafts on unrelated stream updates", () => {
    const { root, view, restore } = mount();
    try {
      const vm = { ...initialAgentViewModel(), decisions: [pendingDecision()] };
      view.render(vm);
      const rationale = byClass(root, "agent-decision-rationale")[0];
      const custom = byClass(root, "agent-decision-custom")[0];
      rationale.value = "  unfinished reason  "; custom.value = "unfinished proposal";
      view.render({ ...vm, builder: builder({ phase: "RUNNING", transcript: [{ sequence: 1, text: "tick" }] }) });
      expect(byClass(root, "agent-decision-rationale")[0]).toBe(rationale);
      expect(byClass(root, "agent-decision-custom")[0]).toBe(custom);
      expect(rationale.value).toBe("  unfinished reason  ");
      expect(custom.value).toBe("unfinished proposal");
      view.render({ ...vm, decisions: [{ ...pendingDecision(), contextVersion: 2 }] });
      expect(byClass(root, "agent-decision-rationale")[0]).toBe(rationale);
      expect(rationale.value).toBe("  unfinished reason  ");
      view.resetProject(); view.render(vm);
      expect(byClass(root, "agent-decision-rationale")[0].value).toBe("");
      expect(byClass(root, "agent-decision-custom")[0].value).toBe("");
    } finally { restore(); }
  });

  for (const applied of [false, true]) it(`resolved Decision cannot submit again (applied=${applied})`, () => {
    let resolutions = 0; let helpers = 0;
    const { root, view, restore } = mount({ ...noopCallbacks(), onResolveDecision: () => resolutions++, onHelperStart: () => helpers++ });
    try {
      view.render({ ...initialAgentViewModel(), decisions: [{ ...pendingDecision(), resolved: true, applied }] });
      for (const name of ["agent-decision-rationale", "agent-decision-custom", "agent-decision-choose", "agent-decision-accept-recommended", "agent-decision-custom-submit"]) {
        const control = byClass(root, name)[0];
        expect(control.disabled).toBe(true);
        control.value = "synthetic proposal"; control.click();
      }
      expect(resolutions).toBe(0);
      byClass(root, "agent-decision-ask-helper")[0].click();
      expect(helpers).toBe(1);
    } finally { restore(); }
  });

  it("keeps native answer drafts and sub-option state until the question changes", () => {
    const { root, view, restore } = mount();
    try {
      const vm: AgentViewModel = { ...initialAgentViewModel(), nativeQuestions: [{ requestId: "request_synthetic", nativeJobId: "job_synthetic", role: "BUILDER", status: "WAITING", question: "Choose", options: [{ title: "A", recommended: true, subOptions: [{ title: "A1" }] }] }] };
      view.render(vm);
      const answer = byClass(root, "agent-native-question-freetext")[0];
      const checkbox = root.queryAll(e => e.type === "checkbox")[0] as FakeElement & { checked: boolean };
      answer.value = "  unfinished answer  "; checkbox.checked = true;
      view.render({ ...vm, helper: { ...vm.helper, phase: "RUNNING" } });
      expect(byClass(root, "agent-native-question-freetext")[0]).toBe(answer);
      expect(answer.value).toBe("  unfinished answer  ");
      expect(root.queryAll(e => e.type === "checkbox")[0]).toBe(checkbox);
      expect(checkbox.checked).toBe(true);
      view.resetProject(); view.render(vm);
      expect(byClass(root, "agent-native-question-freetext")[0].value).toBe("");
    } finally { restore(); }
  });
});

describe("agent text is rendered as text, never markup (task 9.2, Req 2.7)", () => {
  it("renders a transcript line's HTML-looking string literally with no child nodes", () => {
    const { root, view, restore } = mount();
    const injected = "<img src=x onerror=alert(1)><b>bold</b>";
    view.render(
      vmWithBuilder({
        phase: "RUNNING",
        transcript: [{ sequence: 1, text: injected }],
      }),
    );

    const lines = byClass(root, "agent-transcript-line");
    expect(lines).toHaveLength(1);
    // textContent equals the raw string verbatim (no unescaping/interpretation).
    expect(lines[0].textContent).toBe(injected);
    // No markup was parsed into child elements.
    expect(lines[0].children).toHaveLength(0);
    restore();
  });

  it("renders tool output via textContent only (no markup element created)", () => {
    const { root, view, restore } = mount();
    const injected = "<script>steal()</script>\n<div>nope</div>";
    view.render(
      vmWithBuilder({
        phase: "RUNNING",
        toolRows: [toolRow({ output: injected })],
      }),
    );

    const outputs = byClass(root, "agent-tool-row-output");
    expect(outputs).toHaveLength(1);
    expect(outputs[0].textContent).toBe(injected);
    expect(outputs[0].children).toHaveLength(0);
    restore();
  });
});

describe("readable stream and Helper lifecycle", () => {
  it("joins arbitrary transport chunks before formatting on both agent surfaces", () => {
    const { root, view, restore } = mount();
    try {
      const chunks = ["좌석 **HO", "L", "D**\n\n- 코드 `pack", "age.json`"].map((text, sequence) => ({ text, sequence }));
      const vm = { ...vmWithBuilder({ transcript: chunks }), helper: { ...initialAgentViewModel().helper, transcript: chunks } };
      view.render(vm);
      expect(byClass(root, "agent-chat-message")).toHaveLength(2);
      expect(root.queryAll(e => e.tagName === "STRONG").map(e => e.textContent)).toEqual(["HOLD", "HOLD"]);
      expect(root.queryAll(e => e.tagName === "CODE").map(e => e.textContent)).toEqual(["package.json", "package.json"]);
      const messages = byClass(root, "agent-chat-message");
      view.render({ ...vm, worker: { stage: "AGENT_ENDED", role: "BUILDER", code: "AGENT_SESSION_CLOSED_BUILDER" } });
      expect(byClass(root, "agent-chat-message")[0]).toBe(messages[0]);
      expect(byClass(root, "agent-chat-message")[1]).toBe(messages[1]);
    } finally { restore(); }
  });

  it("keeps a reader's Helper scroll position and follows the bottom only when already there", () => {
    const { root, view, restore } = mount();
    try {
      const region = byClass(root, "agent-transcript")[1] as FakeElement & { clientHeight: number };
      region.clientHeight = 100; region.scrollHeight = 1000; region.scrollTop = 210;
      const vm = initialAgentViewModel();
      view.render({ ...vm, helper: { ...vm.helper, transcript: [{ sequence: 1, text: "첫 문장" }] } });
      expect(region.scrollTop).toBe(210);
      region.scrollTop = 900;
      view.render({ ...vm, helper: { ...vm.helper, transcript: [{ sequence: 1, text: "첫 문장 다음 문장" }] } });
      expect(region.scrollTop).toBe(1000);
    } finally { restore(); }
  });

  it.each(["RECORDED", "FAILED", "IDLE"] as const)("never displays a stale opening banner when Helper is %s", phase => {
    const { root, view, restore } = mount();
    try {
      const vm = initialAgentViewModel();
      view.render({ ...vm, helper: { ...vm.helper, phase, windowOpening: true }, worker: { stage: "HELPER_WINDOW_OPENING", role: null, code: "HELPER_WINDOW_OPENING" } });
      expect(byClass(root, "agent-helper-window")[0].hidden).toBe(true);
      expect(byClass(root, "agent-worker-status")[0].hidden).toBe(true);
    } finally { restore(); }
  });
});

describe("duplicate toolId events render a single row (task 9.2, Req 2.2/2.8)", () => {
  it("renders exactly one tool row per stable key", () => {
    const { root, view, restore } = mount();
    // The reducer upserts by toolId into a single keyed row; the view model
    // therefore carries one entry per key. Even after re-rendering with an
    // updated status for the same key, exactly one row exists.
    view.render(
      vmWithBuilder({
        phase: "RUNNING",
        toolRows: [toolRow({ key: "tool-abc", status: "RUNNING" })],
      }),
    );
    expect(byClass(root, "agent-tool-row")).toHaveLength(1);

    view.render(
      vmWithBuilder({
        phase: "RUNNING",
        toolRows: [toolRow({ key: "tool-abc", status: "SUCCEEDED" })],
      }),
    );
    const rows = byClass(root, "agent-tool-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].dataset.key).toBe("tool-abc");

    // Distinct keys render distinct rows (sanity: dedup is by key, not blanket).
    view.render(
      vmWithBuilder({
        phase: "RUNNING",
        toolRows: [
          toolRow({ key: "tool-abc" }),
          toolRow({ key: "tool-def" }),
        ],
      }),
    );
    expect(byClass(root, "agent-tool-row")).toHaveLength(2);
    restore();
  });
});

describe("no absolute path appears in rendered tool rows (task 9.2, Req 2.9)", () => {
  it("renders relativePath only and never an absolute-looking path", () => {
    const { root, view, restore } = mount();
    view.render(
      vmWithBuilder({
        phase: "RUNNING",
        toolRows: [toolRow({ relativePath: "src/features/login.ts" })],
      }),
    );

    const paths = byClass(root, "agent-tool-row-path");
    expect(paths).toHaveLength(1);
    expect(paths[0].textContent).toBe("src/features/login.ts");

    // Scan the whole rendered tool-rows subtree for any absolute path shape
    // (POSIX `/...`, Windows drive `C:\`, or a UNC prefix). None may appear.
    const toolRegion = byClass(root, "agent-tool-rows")[0];
    const allText = toolRegion
      .queryAll(() => true)
      .map((e) => e.textContent)
      .join("\n");
    expect(allText).not.toMatch(/(^|\s)\/[^\s]/);
    expect(allText).not.toMatch(/[A-Za-z]:\\/);
    expect(allText).not.toMatch(/\\\\/);
    restore();
  });
});

describe("honest learning record (task 9.2, Req 10.2/10.4, K23)", () => {
  function evidenceView(overrides: Partial<EvidenceTraceView> = {}): EvidenceTraceView {
    return {
      concepts: [],
      analysis: [],
      userUnderstandingTotal: 0,
      emptyReason: null,
      ...overrides,
    };
  }
  type Concept = EvidenceTraceView["concepts"][number];
  type Accepted = Concept["accepted"][number];
  const accepted = (overrides: Partial<Accepted>): Accepted => ({
    id: "e1", kind: "USER_UNDERSTANDING", signal: "JUSTIFIED_DECISION", strength: "MEDIUM", promptDependence: "INDEPENDENT",
    supportsState: "EXPLAINED", episodeId: "ep-1", excerpt: "지금 몇 개 남았는지 바로 보는 게 편할 것 같아", rationale: null, ...overrides,
  });
  const concept = (overrides: Partial<Concept>): Concept => ({
    id: "c1", name: "상태 관리", state: null, displayState: "OBSERVED_ONLY", userUnderstandingCount: 0, openIssueCount: 0,
    accepted: [], rejected: [], ...overrides,
  });
  const text = (root: FakeElement) => root.queryAll(() => true).map(e => e.textContent).join("\n");

  it("OBSERVED_ONLY / zero understanding is never shown as understanding (Req 10.2)", () => {
    const { root, view, restore } = mount();
    try {
      view.renderEvidence(evidenceView({ concepts: [concept({
        // An observation quotes code the Agent wrote, never the learner.
        accepted: [accepted({ id: "o1", kind: "OBSERVED", signal: null, supportsState: "OBSERVED", excerpt: "db.transaction(() => ...)" })],
      })] }));
      // Code-only concepts fold into one line of names; no understanding label at all.
      expect(byClass(root, "agent-evidence-concept-state")).toHaveLength(0);
      expect(byClass(root, "agent-evidence-code-label")[0].textContent).toBe("코드에 쓰인 개념");
      expect(byClass(root, "agent-evidence-chip").map(e => e.textContent)).toEqual(["상태 관리"]);
      expect(byClass(root, "agent-evidence-quote")).toHaveLength(0);
      expect(text(root)).not.toContain("db.transaction");
      expect(text(root)).not.toMatch(/설명할 수 있어요|직접 적용했어요/);
      expect(byClass(root, "agent-evidence-empty")[0].textContent).toContain("고른 이유를 내 말로");
      // A user state without accepted understanding still makes no claim.
      view.renderEvidence(evidenceView({ concepts: [concept({ displayState: "USER_EVIDENCE_EXPLAINED", userUnderstandingCount: 0 })] }));
      expect(byClass(root, "agent-evidence-concept-state")).toHaveLength(0);
      expect(text(root)).not.toContain("설명할 수 있어요");
    } finally { restore(); }
  });

  it("quotes only the learner's own words per concept, with no counts, spoken concepts first", () => {
    const { root, view, restore } = mount();
    try {
      view.renderEvidence(evidenceView({
        userUnderstandingTotal: 2,
        concepts: [
          concept({ id: "c0", name: "트랜잭션과 동시성" }),
          concept({ id: "c1", name: "관계형 데이터베이스 설계", displayState: "USER_EVIDENCE_EXPLAINED", userUnderstandingCount: 1,
            accepted: [accepted({}), accepted({ id: "e2", signal: "REPHRASE", excerpt: "<b>이력은</b> 쌓기만 해" })], openIssueCount: 1 }),
        ],
      }));
      const names = byClass(root, "agent-evidence-concept-name").map(e => e.textContent);
      expect(names).toEqual(["관계형 데이터베이스 설계"]);
      expect(byClass(root, "agent-evidence-chip").map(e => e.textContent)).toEqual(["트랜잭션과 동시성"]);
      expect(byClass(root, "agent-evidence-concept-state")[0].textContent).toBe("설명할 수 있어요");
      expect(byClass(root, "agent-evidence-quote-text").map(e => e.textContent))
        .toEqual(["지금 몇 개 남았는지 바로 보는 게 편할 것 같아", "<b>이력은</b> 쌓기만 해"]);
      expect(byClass(root, "agent-evidence-quote-kind").map(e => e.textContent)).toEqual(["고른 이유", "내 말로 설명"]);
      expect(root.queryAll(e => e.tagName === "B")).toHaveLength(0);
      expect(byClass(root, "agent-evidence-concept-issues")[0].textContent).toContain("다시 짚어 볼 부분");
      expect(byClass(root, "agent-evidence-empty")).toHaveLength(0);
      expect(text(root)).not.toMatch(/\d+건|근거 \d/);
      // A quote from another Project names it; this Project's quotes need no name.
      view.renderEvidence({ ...evidenceView({ concepts: [concept({ id: "c1", name: "관계형 데이터베이스 설계",
        displayState: "USER_EVIDENCE_EXPLAINED", userUnderstandingCount: 1, accepted: [accepted({ id: "e_old" })] })] }),
        sources: { e_old: "편의점 상품 입출고 API" } });
      expect(byClass(root, "agent-evidence-quote-kind").map(e => e.textContent)).toEqual(["편의점 상품 입출고 API · 고른 이유"]);
      view.renderEvidence({ ...evidenceView({ concepts: [concept({ id: "c1", name: "관계형 데이터베이스 설계",
        displayState: "USER_EVIDENCE_EXPLAINED", userUnderstandingCount: 1, accepted: [accepted({ id: "e_old" })] })] }),
        sources: { e_old: "가게 재고를 관리하는 간단한 API를 만들어 보고 싶어. 데이터베이스는 처음이야." } });
      expect(byClass(root, "agent-evidence-quote-kind").map(e => e.textContent)).toEqual(["가게 재고를 관리하는 간단한 API를… · 고른 이유"]);
    } finally { restore(); }
  });

  it("never shows the Analyst memo or Core's empty reason, and says only that analysis is pending (Req 10.4)", () => {
    const { root, view, restore } = mount();
    try {
      view.renderEvidence(evidenceView({
        emptyReason: "인정된 근거 없음: Episode에서 USER_DECISION reference가 없다",
        analysis: [
          { jobId: "job-1", episodeId: "ep-1", status: "SUCCEEDED", displayState: "ANALYZED", acceptedCount: 0,
            noEvidenceReason: "인정된 근거 없음: Episode에서 USER_DECISION reference가 없고 BUILDER_CHAT_TURN 요약뿐이다", failureCode: null },
          { jobId: "job-2", episodeId: "ep-2", status: "RUNNING", displayState: "ANALYZING", acceptedCount: null, noEvidenceReason: null, failureCode: null },
        ],
      }));
      expect(text(root)).not.toMatch(/Episode|USER_DECISION|BUILDER_CHAT_TURN|인정되었어요/);
      expect(byClass(root, "agent-evidence-analysis-memo")).toHaveLength(0);
      expect(byClass(root, "agent-evidence-analysis-job")).toHaveLength(0);
      const status = byClass(root, "agent-evidence-status")[0];
      expect(status.hidden).toBe(false);
      expect(status.textContent).toContain("정리하고 있어요");
      expect(byClass(root, "agent-evidence-empty")[0].textContent).toContain("아직 기록이 없어요");
    } finally { restore(); }
  });

  it("offers one retry per failed analysis, keeping the code out of the sentence", () => {
    const retries: string[] = [];
    const { root, view, restore } = mount({ ...noopCallbacks(), onRetryAnalysis: (jobId) => retries.push(jobId) });
    try {
      view.renderEvidence(evidenceView({ analysis: [
        { jobId: "job-9", episodeId: "ep-9", status: "FAILED", displayState: "ANALYSIS_FAILED", acceptedCount: null, noEvidenceReason: null, failureCode: "ANALYST_TIMEOUT" },
      ] }));
      expect(byClass(root, "agent-evidence-analysis-status")[0].textContent).toBe("정리하지 못한 대화가 있어요.");
      expect(byClass(root, "agent-evidence-status")[0].hidden).toBe(true);
      const retry = byClass(root, "agent-evidence-retry")[0];
      expect(retry.textContent).toBe("다시 정리하기");
      retry.click();
      expect(retries).toEqual(["job-9"]);
    } finally { restore(); }
  });
});

describe("native worker status line", () => {
  it("shows Korean guidance for window statuses and the raw stage otherwise", () => {
    const { root, view, restore } = mount();
    try {
      const status = () => byClass(root, "agent-worker-status")[0];
      view.render({ ...initialAgentViewModel(), worker: { stage: "DIAGNOSTIC", role: null, code: "WORKSPACE_WINDOW_AVAILABLE" } } as AgentViewModel);
      expect(status().hidden).toBe(false);
      expect(status().textContent).toContain("그 창에서 처리");
      expect((status() as unknown as { title?: string }).title).toBe("WORKSPACE_WINDOW_AVAILABLE");
      view.render({ ...initialAgentViewModel(), worker: { stage: "AGENT_RUNNING", role: "DISCOVERY", code: "AGENT_RUNNING_DISCOVERY" } } as AgentViewModel);
      expect(status().textContent).toBe("탐색 · 에이전트가 작업 중이에요");
    } finally { restore(); }
  });
});

describe("long tool activity stays compact", () => {
  const rows = Array.from({ length: 8 }, (_, i) => toolRow({
    key: `tool-${i}`, tool: i === 0 ? null : "read", relativePath: `src/f${i}.ts`,
    status: i === 2 || i === 7 ? "FAILED" : "SUCCEEDED",
  }));

  it("shows only the latest rows with a summary until expanded", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ toolRows: rows }));
      const shown = () => byClass(root, "agent-tool-row").map((r) => r.dataset.key);
      const toggle = byClass(root, "agent-tools-toggle")[0];
      expect(shown()).toEqual(["tool-5", "tool-6", "tool-7"]);
      expect(byClass(root, "agent-tools-summary")[0].textContent).toBe("8개 · 실패 2");
      expect(toggle.hidden).toBe(false);
      expect(toggle.textContent).toBe("이전 5개 더 보기");
      expect(toggle.attributes["aria-expanded"]).toBe("false");

      toggle.click();
      expect(shown()).toHaveLength(8);
      expect(toggle.attributes["aria-expanded"]).toBe("true");
      expect(byClass(root, "agent-tool-rows")[0].dataset.expanded).toBe("true");

      // A streamed re-render keeps the reader's choice.
      view.render(vmWithBuilder({ toolRows: [...rows, toolRow({ key: "tool-8" })] }));
      expect(shown()).toHaveLength(9);

      view.resetProject();
      view.render(vmWithBuilder({ toolRows: rows }));
      expect(shown()).toHaveLength(3);
    } finally { restore(); }
  });

  it("hides the toggle for short lists and names tools in Korean", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ toolRows: [
        toolRow({ key: "a", tool: null }),
        toolRow({ key: "b", tool: "core", relativePath: null, coreAction: "BUILDER_GET_TASK" }),
      ] }));
      expect(byClass(root, "agent-tools-toggle")[0].hidden).toBe(true);
      expect(byClass(root, "agent-tool-row-tool").map((e) => e.textContent)).toEqual(["기타 도구", "Core 작업"]);
      expect(byClass(root, "agent-tool-row-core-action")[0].textContent).toBe("작업 조회");
    } finally { restore(); }
  });
});

describe("error lines explain known codes", () => {
  it("explains a Helper tool-catalog rejection and keeps the code", () => {
    const { root, view, restore } = mount();
    try {
      view.render({ ...initialAgentViewModel(), helper: { ...initialAgentViewModel().helper, phase: "FAILED",
        errorCode: "NATIVE_ROLE_CATALOG_UNVERIFIED" } });
      const text = byClass(root, "agent-helper-error")[0].textContent;
      expect(text).toContain("도우미 창이 열려 있다면 닫은 뒤");
      expect(text).toContain("(NATIVE_ROLE_CATALOG_UNVERIFIED)");
    } finally { restore(); }
  });

  it("keeps an unknown Builder code as-is", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ phase: "FAILED", errorCode: "SOMETHING_NEW" }));
      expect(byClass(root, "agent-builder-error")[0].textContent).toBe("SOMETHING_NEW");
    } finally { restore(); }
  });

  it("explains a Builder shell guard denial in the worker line", () => {
    const { root, view, restore } = mount();
    try {
      view.render({ ...initialAgentViewModel(), worker: { stage: "DIAGNOSTIC", role: "BUILDER",
        code: "PERMISSION_GUARD_BUILDER_SHELL_LOCKFILE_PREPARE_DENIED" } } as AgentViewModel);
      expect(byClass(root, "agent-worker-status")[0].textContent).toContain("안전 규칙에 막혔어요");
    } finally { restore(); }
  });
});

describe("next step after a Builder turn", () => {
  it("tells the learner the task continues on their next instruction", () => {
    const { root, view, restore } = mount();
    try {
      const hint = () => byClass(root, "agent-builder-next")[0];
      view.render(vmWithBuilder({ phase: "TURN_ENDED", permissionDenied: true }));
      expect(hint().hidden).toBe(false);
      expect(hint().textContent).toContain("아직 끝나지 않았어요");
      expect(hint().textContent).toContain("막힌 작업");
      view.render(vmWithBuilder({ phase: "TASK_COMPLETED" }));
      expect(hint().hidden).toBe(false);
    } finally { restore(); }
  });
});

describe("backend B8/B9 tool guidance", () => {
  it("shows a missing file as 파일 없음 and does not count it as a failure", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ toolRows: [
        toolRow({ key: "a", tool: "read", status: "FAILED", errorCode: "NATIVE_FILE_NOT_FOUND" }),
        toolRow({ key: "b", tool: "shell", status: "FAILED" }),
      ] }));
      const statuses = byClass(root, "agent-tool-row-status");
      expect(statuses[0].textContent).toBe("파일 없음");
      expect(statuses[0].dataset.status).toBe("NOT_FOUND");
      expect(statuses[1].textContent).toBe("실패");
      expect(byClass(root, "agent-tools-summary")[0].textContent).toBe("2개 · 실패 1");
      expect(byClass(root, "agent-tool-row-hint")).toHaveLength(0);
    } finally { restore(); }
  });

  it("names the new tool kinds and explains a refused completion", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ toolRows: [
        toolRow({ key: "a", tool: "unknown" }),
        toolRow({ key: "b", tool: "user_input" }),
        toolRow({ key: "c", tool: "core", relativePath: null, coreAction: "BUILDER_COMPLETE_TASK", status: "FAILED",
          errorCode: "TASK_VALIDATION_NOT_RUN" }),
      ] }));
      expect(byClass(root, "agent-tool-row-tool").map((e) => e.textContent)).toEqual(["기타 도구", "사용자 확인", "Core 작업"]);
      expect(byClass(root, "agent-tool-row-hint")[0].textContent).toContain("검증을 실행하지 않아");
    } finally { restore(); }
  });
});

describe("final upgrade is a suggestion after completion", () => {
  it("stays hidden until the task completes, then lists candidates once", () => {
    let lists = 0;
    const { root, view, restore } = mount({ ...noopCallbacks(), onListFinalUpgrade: () => lists++ });
    try {
      const section = () => byClass(root, "agent-final-upgrade")[0];
      view.render(vmWithBuilder({ phase: "RUNNING", taskId: "task_1" }));
      expect(section().hidden).toBe(true);
      expect(lists).toBe(0);
      view.render(vmWithBuilder({ phase: "TASK_COMPLETED", taskId: "task_1", taskRevision: 3 }));
      expect(section().hidden).toBe(false);
      view.render(vmWithBuilder({ phase: "TASK_COMPLETED", taskId: "task_1", taskRevision: 3 }));
      expect(lists).toBe(1);
      expect(byClass(root, "agent-final-upgrade-references")[0].hidden).toBe(true);
      view.render(vmWithBuilder({ phase: "IDLE", taskId: "task_2" }));
      expect(section().hidden).toBe(true);
    } finally { restore(); }
  });

  it("lets the learner pick a candidate instead of typing its id", () => {
    const { root, view, restore } = mount();
    try {
      view.render(vmWithBuilder({ phase: "TASK_COMPLETED", taskId: "task_1", taskRevision: 3 }));
      view.renderFinalUpgrade([
        { id: "trace_a", basisCount: 1, createdAt: "2026-09-28T00:00:00Z" },
        { id: "trace_b", basisCount: 2, createdAt: "2026-09-28T01:00:00Z" },
      ]);
      const trace = byClass(root, "agent-input personalization-trace-id")[0];
      const rows = byClass(root, "agent-final-upgrade-candidate");
      expect(rows.map((r) => r.attributes["aria-pressed"])).toEqual(["false", "false"]);
      expect(byClass(root, "agent-final-upgrade-candidate-id")[1].textContent).toBe("개선 제안 2");
      rows[1].click();
      expect(trace.value).toBe("trace_b");
      expect(rows.map((r) => r.attributes["aria-pressed"])).toEqual(["false", "true"]);
    } finally { restore(); }
  });
});

describe("Kiro-native Next Move card", () => {
  const moves = [1, 2, 3].map((number) => ({
    number, title: `제안 ${number}`, summary: `제안 ${number} 설명`, benefit: `좋아지는 점 ${number}`,
    size: number === 3 ? "MEDIUM" as const : "SMALL" as const,
  }));
  const kiro = (nextMove: AgentViewModel["nextMove"], phase: BuilderTurnViewModel["phase"] = "TASK_COMPLETED"): AgentViewModel =>
    ({ ...vmWithBuilder({ phase, taskId: "task_1", taskRevision: 3 }), hostChat: { opening: false }, nextMove });

  it("shows generating, then three suggestions without any start button, and replaces the final upgrade", () => {
    let lists = 0;
    const copies: unknown[] = [];
    const { root, view, restore } = mount({ ...noopCallbacks(), onListFinalUpgrade: () => lists++, onCopyChatText: (r) => copies.push(r) });
    try {
      const section = () => byClass(root, "agent-next-move")[0];
      view.render(kiro({ status: "NONE", moves: [], retrying: false }, "IDLE"));
      expect(section().hidden).toBe(true);

      view.render(kiro({ status: "GENERATING", moves: [], retrying: false }));
      expect(section().hidden).toBe(false);
      expect(section().dataset.status).toBe("GENERATING");
      expect(byClass(root, "agent-next-move-status")[0].hidden).toBe(false);
      expect(byClass(root, "agent-next-move-status")[0].textContent).toContain("고르고 있어요");
      expect(byClass(root, "agent-next-move-item")).toHaveLength(0);
      expect(byClass(root, "agent-next-move-retry")[0].hidden).toBe(true);
      // Kiro-native hosts never offer the panel final upgrade.
      expect(byClass(root, "agent-final-upgrade")[0].hidden).toBe(true);
      expect(lists).toBe(0);

      view.render(kiro({ status: "READY", moves, retrying: false }));
      const items = byClass(root, "agent-next-move-item");
      expect(items).toHaveLength(3);
      expect(byClass(root, "agent-next-move-number").map((n) => n.textContent)).toEqual(["1", "2", "3"]);
      expect(byClass(root, "agent-next-move-title")[1].textContent).toBe("제안 2");
      expect(byClass(root, "agent-next-move-summary")[1].textContent).toBe("제안 2 설명");
      expect(byClass(root, "agent-next-move-benefit")[1].textContent).toBe("좋아지는 점: 좋아지는 점 2");
      expect(byClass(root, "agent-next-move-size").map((n) => n.textContent)).toEqual(["작음", "작음", "보통"]);
      expect(byClass(root, "agent-next-move-status")[0].hidden).toBe(true);
      expect(byClass(root, "agent-next-move-note")[0].hidden).toBe(false);
      expect(byClass(root, "agent-next-move-note")[0].textContent).toContain("지금 안 해도 돼요");
      expect(byClass(root, "agent-next-move-retry")[0].hidden).toBe(true);
      for (const item of items) expect(byClass(item, "agent-next-move-number")).toHaveLength(1);
      // K23: each suggestion shows what to send in Kiro chat with a copy button; nothing starts it here.
      expect(byClass(byClass(root, "agent-next-move-list")[0], "agent-send-text").map((n) => n.textContent))
        .toEqual(["다음 한 걸음 1번 해 보자", "다음 한 걸음 2번 해 보자", "다음 한 걸음 3번 해 보자"]);
      for (const item of items)
        expect(item.queryAll((e) => e.tagName === "BUTTON").map((b) => b.className)).toEqual(["agent-copy"]);
      const copy = byClass(items[1], "agent-copy")[0];
      copy.click();
      expect(copies).toEqual([{ what: "NEXT_MOVE", number: 2 }]);
      expect(copy.textContent).toBe("복사했어요");
      // Same suggestions on the next hydrate keep the same nodes.
      view.render(kiro({ status: "READY", moves, retrying: false }));
      expect(byClass(root, "agent-next-move-item")[0]).toBe(items[0]);

      // A follow-up Task started in Kiro chat: the card goes away.
      view.render(kiro({ status: "NONE", moves: [], retrying: false }, "IDLE"));
      expect(section().hidden).toBe(true);
    } finally { restore(); }
  });

  it("offers one retry after a failure and blocks repeated clicks while it runs", () => {
    let retries = 0;
    const { root, view, restore } = mount({ ...noopCallbacks(), onRetryNextMove: () => retries++ });
    try {
      view.render(kiro({ status: "FAILED", moves: [], retrying: false }));
      const retry = byClass(root, "agent-next-move-retry")[0];
      expect(retry.hidden).toBe(false);
      expect(retry.textContent).toBe("다시 만들기");
      expect(byClass(root, "agent-next-move-status")[0].textContent).toContain("만들지 못했어요");
      expect(byClass(root, "agent-next-move-note")[0].hidden).toBe(true);
      retry.click();
      expect(retries).toBe(1);
      view.render(kiro({ status: "FAILED", moves: [], retrying: true }));
      expect(retry.disabled).toBe(true);
      retry.click();
      expect(retries).toBe(1);
    } finally { restore(); }
  });

  it("renders suggestion text literally and stays off other hosts and other tabs", () => {
    const { root, view, restore } = mount();
    try {
      const html = "<img src=x onerror=alert(1)>";
      view.render(kiro({ status: "READY", moves: [{ ...moves[0], title: html }, moves[1], moves[2]], retrying: false }));
      const title = byClass(root, "agent-next-move-title")[0];
      expect(title.textContent).toBe(html);
      expect(title.children).toHaveLength(0);
      // The panel Builder host keeps its final upgrade and never shows the card.
      view.render({ ...vmWithBuilder({ phase: "TASK_COMPLETED", taskId: "task_1", taskRevision: 3 }),
        nextMove: { status: "READY", moves, retrying: false } });
      expect(byClass(root, "agent-next-move")[0].hidden).toBe(true);
      expect(byClass(root, "agent-final-upgrade")[0].hidden).toBe(false);
    } finally { restore(); }
  });
});

describe("agent surface tabs", () => {
  it("switches surfaces and badges waiting decisions", () => {
    const { root, view, restore } = mount();
    try {
      const surface = byClass(root, "agent-surface")[0];
      const tabs = byClass(root, "agent-tab");
      expect(surface.dataset.tab).toBe("builder");
      expect(tabs.map((t) => t.attributes["aria-selected"])).toEqual(["true", "false", "false"]);
      tabs[1].click();
      expect(surface.dataset.tab).toBe("helper");
      view.render({ ...initialAgentViewModel(), decisions: [pendingDecision()] });
      const badges = byClass(root, "agent-tab-badge");
      expect(badges[0].hidden).toBe(false);
      expect(badges[0].textContent).toBe("1");
      view.render({ ...initialAgentViewModel(), decisions: [{ ...pendingDecision(), resolved: true }] });
      expect(badges[0].hidden).toBe(true);
    } finally { restore(); }
  });
});


describe("Helper answer without duplicate summary", () => {
  const textOf = (el: FakeElement): string => el.textContent + el.children.map(textOf).join("");
  it.each(["RUNNING", "RECORDED"] as const)("keeps the full answer and durable question while %s", phase => {
    const {root,view,restore}=mount();
    try {
      const vm=initialAgentViewModel();
      const full="처음 설명부터 마지막 결론까지 모두 보이는 답변";
      const conversation={conversationId:"conversation_synthetic",taskId:"task_synthetic",decisionId:null,status:"PENDING_ANALYSIS" as const,userExcerpts:["합성 질문"],responseSummaries:["잘린 마지막 문장만"]};
      view.render({...vm,helper:{...vm.helper,phase,transcript:[{sequence:1,text:full}],conversations:[conversation]}});
      expect(textOf(byClass(root,"agent-transcript")[1])).toContain(full);
      expect(byClass(root,"agent-helper-conversation-user")[0].textContent).toBe("합성 질문");
      expect(byClass(root,"agent-helper-conversation-status")[0].textContent).toContain("근거 정리 대기");
      expect(byClass(root,"agent-helper-conversation-response")).toEqual([]);
      expect(textOf(root)).not.toContain("도우미 답변 요약");
      expect(textOf(root)).not.toContain("잘린 마지막 문장만");
      view.render({...vm,helper:{...vm.helper,conversations:[conversation]}});
      expect(byClass(root,"agent-helper-conversation-user")[0].textContent).toBe("합성 질문");
      expect(textOf(root)).not.toContain("잘린 마지막 문장만");
    } finally {restore();}
  });
});


describe("continuous use after MVP completion", () => {
  it("keeps Builder and Helper send controls usable and retains prior denied tool history", () => {
    const sent: string[] = [];
    const {root,view,restore}=mount({...noopCallbacks(),onBuilderStart: message=>sent.push(message)});
    try {
      view.render(vmWithBuilder({phase:"TASK_COMPLETED",taskId:"task_done",permissionDenied:true,
        toolRows:[toolRow({status:"FAILED",errorCode:"PERMISSION_GUARD_BUILDER_SHELL_PROJECT_COMMAND_NODE"})]}));
      const composer=byClass(root,"agent-composer-input")[0];
      const send=byClass(root,"agent-builder-send")[0];
      expect(composer.disabled).toBe(false);
      expect(send.disabled).toBe(false);
      expect(send.textContent).toBe("보내기");
      expect(byClass(root,"agent-composer-input")[1].disabled).toBe(false);
      expect(byClass(root,"agent-helper-send")[0].disabled).toBe(false);
      expect(byClass(root,"agent-builder-permission")[0].hidden).toBe(true);
      expect(byClass(root,"agent-tool-row-status")[0].textContent).toBe("요청 제한");
      expect(byClass(root,"agent-tools-summary")[0].textContent).toBe("1개 · 제한 1");
      composer.value="접속할 수 있게 해줘";send.click();
      expect(sent).toEqual(["접속할 수 있게 해줘"]);
    } finally {restore();}
  });
});

describe("Kiro-native Builder tab (K17)", () => {
  const kiroVm = (overrides: Partial<AgentViewModel> = {}): AgentViewModel => ({
    ...vmWithBuilder({ phase: "IDLE", taskId: "task_synthetic", taskRevision: 2 }),
    hostChat: { opening: false },
    ...overrides,
  });

  it("lists this Task's choices compactly, with no panel choose buttons, and names the one Kiro chat waits on", () => {
    const { root, view, restore } = mount();
    try {
      const waiting = { ...pendingDecision(), decisionId: "decision_waiting", question: "잠금 방식은?" };
      const chosen = { ...pendingDecision(), decisionId: "decision_chosen", question: "저장 방식은?", resolved: true, chosenLabel: "하이브리드" };
      const replaced = { ...pendingDecision(), decisionId: "decision_old", question: "예전 질문", resolved: true, replaced: true };
      const otherTask = { ...pendingDecision(), decisionId: "decision_other", taskId: "task_other", question: "다른 작업" };
      view.render(kiroVm({ decisions: [chosen, waiting, replaced, otherTask] }));
      const rows = byClass(root, "agent-decision agent-decision-compact");
      // K23: only what was already chosen; the card names the open question.
      expect(rows.map((row) => row.dataset.decisionId)).toEqual(["decision_chosen"]);
      expect(rows.map((row) => row.dataset.state)).toEqual(["chosen"]);
      // K23: the choice leads; the question is the second line.
      expect(byClass(root, "agent-decision-compact-choice").map((el) => el.textContent)).toEqual(["하이브리드"]);
      expect(byClass(root, "agent-decision-compact-question").map((el) => el.textContent)).toEqual(["저장 방식은?"]);
      expect(byClass(root, "agent-decision-compact-applied")).toHaveLength(0);
      expect(byClass(root, "agent-decision-compact-option").filter((el) => el.dataset.chosen === "true")).toHaveLength(0);
      expect(byClass(root, "agent-decision-choose")).toHaveLength(0);
      // K23: the card names the question Kiro chat waits on.
      expect(byClass(root, "agent-now")[0].dataset.state).toBe("WAITING");
      expect(byClass(root, "agent-now-lead")[0].textContent).toBe("Kiro 채팅이 답을 기다려요.");
      expect(byClass(root, "agent-now-question")[0].textContent).toBe("잠금 방식은?");
      expect(root.queryAll((e) => e.textContent === "이번 작업에서 고른 것")).toHaveLength(1);
      view.render(kiroVm({ decisions: [{ ...chosen, applied: true,
        options: [{ id: "a", label: "변경 레코드", description: "" }, { id: "b", label: "하이브리드", description: "" }] }] }));
      expect(byClass(root, "agent-decision-compact-applied").map((el) => el.textContent)).toEqual(["반영함"]);
      expect(byClass(root, "agent-decision-compact-option").filter((el) => el.dataset.chosen === "true").map((el) => el.textContent))
        .toEqual(["하이브리드"]);
    } finally {
      restore();
    }
  });

  it("shows this Task's accepted learner Evidence, and nothing of it on a panel host", () => {
    const { root, view, restore } = mount();
    try {
      view.render(kiroVm({ taskEvidence: [] }));
      const section = byClass(root, "agent-task-evidence")[0];
      expect(section.hidden).toBe(false);
      expect(byClass(root, "agent-task-evidence-empty")[0].hidden).toBe(false);
      view.render(kiroVm({ taskEvidence: [
        { evidenceId: "evidence_1", conceptName: "SQLite Locking", state: "EXPLAINED", excerpt: "확장하면 <b>2번</b>이 안전하다" },
      ] }));
      expect(byClass(root, "agent-task-evidence-concept")[0].textContent).toBe("SQLite Locking");
      expect(byClass(root, "agent-task-evidence-state")[0].textContent).toBe("설명할 수 있어요");
      const excerpt = byClass(root, "agent-task-evidence-excerpt")[0];
      expect(excerpt.textContent).toBe("확장하면 <b>2번</b>이 안전하다");
      expect(excerpt.children).toHaveLength(0);
      expect(byClass(root, "agent-task-evidence-empty")[0].hidden).toBe(true);
      view.render(vmWithBuilder({ phase: "IDLE", taskId: "task_synthetic" }));
      expect(section.hidden).toBe(true);
    } finally {
      restore();
    }
  });
});

describe("Kiro-native '지금 할 일', steps and tabs (K23)", () => {
  type HostChat = NonNullable<AgentViewModel["hostChat"]>;
  const kiro = (builderOverrides: Partial<BuilderTurnViewModel>, hostChat: Partial<HostChat> = {}, extra: Partial<AgentViewModel> = {}): AgentViewModel => ({
    ...vmWithBuilder({ phase: "IDLE", taskId: "task_synthetic", taskTitle: "편의점 상품 입출고 API", taskSequence: 1, ...builderOverrides }),
    hostChat: { opening: false, ...hostChat },
    ...extra,
  });
  const card = (root: FakeElement) => ({
    state: byClass(root, "agent-now")[0].dataset.state,
    lead: byClass(root, "agent-now-lead")[0].textContent,
    detail: byClass(root, "agent-now-detail")[0].hidden ? null : byClass(root, "agent-now-detail")[0].textContent,
    send: byClass(root, "agent-now")[0].queryAll((e) => e.className === "agent-send")[0].hidden ? null
      : byClass(byClass(root, "agent-now")[0], "agent-send-text")[0].textContent,
    action: byClass(root, "agent-now-action")[0].hidden ? null : byClass(root, "agent-now-action")[0].textContent,
    note: !byClass(root, "agent-now-note")[0].hidden,
  });

  it("asks for the first message only once this window's chat reaches the Project, and copies it on request", () => {
    const copies: unknown[] = [];
    const { root, view, restore } = mount({ ...noopCallbacks(), onCopyChatText: (r) => copies.push(r) });
    try {
      view.render(kiro({ readyToStart: true }, { window: "READY" }));
      expect(card(root)).toEqual({ state: "SEND_START", lead: "오른쪽 Kiro 채팅에 이렇게 보내 보세요.",
        detail: "짧게 ‘ㄱㄱ’만 보내도 시작해요.", send: "시작해 줘", action: null, note: false });
      expect(byClass(root, "agent-now-task-title")[0].textContent).toBe("편의점 상품 입출고 API");
      byClass(byClass(root, "agent-now")[0], "agent-copy")[0].click();
      expect(copies).toEqual([{ what: "START" }]);
      // A connected session without Vibe Helper hooks: open a new one first. The notice itself stays off.
      view.render(kiro({ readyToStart: true }, { window: "READY" },
        { notice: { kind: "info", code: "KIRO_CHAT_REGISTERED", message: "이 폴더를 Project로 연결했어요." } }));
      expect(card(root).detail).toContain("+ 로 새 세션을 연 뒤");
      expect(byClass(root, "agent-notice")[0].hidden).toBe(true);
      // Errors still show.
      view.render(kiro({ readyToStart: true }, { window: "READY" }, { notice: { kind: "error", code: "KIRO_BIND_FAILED", message: "연결하지 못했어요" } }));
      expect(byClass(root, "agent-notice")[0].hidden).toBe(false);
    } finally { restore(); }
  });

  it("says what the window needs before chat can start: a new window, trust, or a reload", () => {
    const { root, view, restore } = mount();
    try {
      view.render(kiro({ readyToStart: true }, { window: "NOT_BOUND", openedNewWindow: true }));
      expect(card(root)).toMatchObject({ state: "NEW_WINDOW", action: null, send: null });
      expect(card(root).detail).toContain("10~30초");
      view.render(kiro({ readyToStart: true }, { window: "UNTRUSTED" }));
      expect(card(root)).toMatchObject({ state: "UNTRUSTED", action: null, lead: "이 폴더를 신뢰하면 Kiro 채팅에 연결돼요." });
      view.render(kiro({ readyToStart: true }, { window: "RELOAD" }));
      expect(card(root)).toMatchObject({ state: "RELOAD", action: null });
      expect(card(root).detail).toContain("‘다시 로드’");
      // An older host cannot tell: connect, with the waiting time said first.
      view.render(kiro({ readyToStart: true }));
      expect(card(root)).toMatchObject({ state: "CONNECT", action: "Kiro 채팅에서 열기", note: true });
    } finally { restore(); }
  });

  it("never offers to reconnect a window whose chat already reaches the Project", () => {
    let opens = 0;
    const { root, view, restore } = mount({ ...noopCallbacks(), onOpenInKiro: () => opens++ });
    try {
      view.render(kiro({}, { window: "READY" }));
      expect(card(root)).toMatchObject({ state: "BUILDING", action: null, send: null });
      // Another folder's window: the real state stays, and a note above it leads to the Project's own window.
      const elsewhere = () => byClass(root, "agent-elsewhere")[0];
      expect(elsewhere().hidden).toBe(true);
      view.render(kiro({}, { window: "NOT_BOUND" }));
      expect(card(root)).toMatchObject({ state: "BUILDING", action: null, note: false });
      expect(elsewhere().hidden).toBe(false);
      expect(byClass(root, "agent-elsewhere-text")[0].textContent).toBe("다른 프로젝트의 작업 내역이에요. 이어서 하려면 이 프로젝트를 새 창에서 열어야 해요.");
      expect(byClass(root, "agent-elsewhere-action")[0].textContent).toBe("새 창에서 열기");
      byClass(root, "agent-elsewhere-action")[0].click();
      expect(opens).toBe(1);
      view.render(kiro({ phase: "TASK_COMPLETED" }, { window: "NOT_BOUND" }));
      expect(card(root).state).toBe("DONE");
      expect(elsewhere().hidden).toBe(false);
      // Not before the first message (the card already connects), and not in its own window.
      view.render(kiro({ readyToStart: true }, { window: "NOT_BOUND" }));
      expect(elsewhere().hidden).toBe(true);
      view.render(kiro({ phase: "TASK_COMPLETED" }, { window: "READY" }));
      expect(elsewhere().hidden).toBe(true);
    } finally { restore(); }
  });

  it("asks for a number and the learner's own reason, never offering a reason to copy", () => {
    const { root, view, restore } = mount();
    try {
      const waiting = { ...pendingDecision(), taskId: "task_synthetic", question: "입출고 기록을 어떻게 저장할까요?" };
      view.render(kiro({ phase: "DECISION_REQUIRED" }, { window: "READY" }, { decisions: [waiting] }));
      expect(card(root)).toMatchObject({ state: "WAITING", send: null, action: null });
      expect(byClass(root, "agent-now-question")[0].textContent).toBe("입출고 기록을 어떻게 저장할까요?");
      expect(card(root).detail).toContain("내 말로");
      // The only copy in the card is the start line, hidden here.
      expect(byClass(byClass(root, "agent-now")[0], "agent-copy")).toHaveLength(1);
    } finally { restore(); }
  });

  it("points to the result in chat when done, with no launch button that Core would refuse", () => {
    const { root, view, restore } = mount();
    try {
      view.render(kiro({ phase: "TASK_COMPLETED" }, { window: "READY" }));
      expect(card(root)).toMatchObject({ state: "DONE", lead: "다 만들었어요. 결과를 확인해 보세요.", action: null });
      expect(card(root).detail).toContain("완료 메시지");
      expect(byClass(root, "agent-result-launch")[0].hidden).toBe(true);
    } finally { restore(); }
  });

  it("marks the current step and folds the steps once the first Task is done, keeping the learner's choice", () => {
    const { root, view, restore } = mount();
    try {
      const steps = byClass(root, "agent-steps")[0] as FakeElement & { open: boolean };
      const marks = () => byClass(root, "agent-step").map((e) => e.dataset.step);
      view.render(kiro({ readyToStart: true }, { window: "READY" }));
      expect(steps.hidden).toBe(false);
      expect(steps.open).toBe(true);
      expect(marks()).toEqual(["done", "now", "next", "next"]);
      expect(byClass(root, "agent-steps-now")[0].textContent).toBe("지금: 채팅에 ‘시작해 줘’ 보내기");
      view.render(kiro({ phase: "DECISION_REQUIRED" }, { window: "READY" }));
      expect(marks()).toEqual(["done", "done", "now", "next"]);
      view.render(kiro({ phase: "TASK_COMPLETED" }, { window: "READY" }));
      expect(steps.open).toBe(false);
      expect(marks()).toEqual(["done", "done", "done", "now"]);
      // The learner opens it again: it stays open for this Task.
      steps.open = true;
      steps.dispatchEvent("toggle");
      view.render(kiro({ phase: "TASK_COMPLETED" }, { window: "READY" }));
      expect(steps.open).toBe(true);
      // A follow-up Task starts folded.
      view.render(kiro({ taskId: "task_follow_up", taskSequence: 2 }, { window: "READY" }));
      expect(steps.open).toBe(false);
      // No steps without a Task, or on other hosts.
      view.render({ ...initialAgentViewModel(), hostChat: { opening: false } });
      expect(steps.hidden).toBe(true);
      view.render(vmWithBuilder({ taskId: "task_synthetic" }));
      expect(steps.hidden).toBe(true);
    } finally { restore(); }
  });

  it("shows two tabs, 진행 and 학습 기록, and loads the record when its tab opens", () => {
    let reads = 0;
    const { root, view, restore } = mount({ ...noopCallbacks(), onReadEvidence: () => reads++ });
    try {
      const tabs = byClass(root, "agent-tab");
      // Even if the Helper tab was open on another host, Kiro-native hides it.
      tabs[1].click();
      view.render(kiro({}, { window: "READY" }));
      expect(tabs.filter((t) => !t.hidden).map((t) => byClass(t, "agent-tab-label")[0].textContent)).toEqual(["진행", "학습 기록"]);
      expect(byClass(root, "agent-surface")[0].dataset.tab).toBe("builder");
      expect(byClass(root, "agent-chat-hint")[0].hidden).toBe(false);
      expect(reads).toBe(0);
      tabs[2].click();
      expect(reads).toBe(1);
      tabs[2].click();
      expect(reads).toBe(1);
      // New learning records while the tab is open reload it once.
      view.render(kiro({}, { window: "READY" }, { taskEvidence: [{ evidenceId: "e1", conceptName: "c", state: "EXPLAINED", excerpt: "x" }] }));
      expect(reads).toBe(2);
      view.render(kiro({}, { window: "READY" }, { taskEvidence: [{ evidenceId: "e1", conceptName: "c", state: "EXPLAINED", excerpt: "x" }] }));
      expect(reads).toBe(2);
      // Other hosts keep three tabs.
      view.render(vmWithBuilder({ taskId: "task_synthetic" }));
      expect(tabs.filter((t) => !t.hidden)).toHaveLength(3);
      expect(byClass(tabs[0], "agent-tab-label")[0].textContent).toBe("빌더");
    } finally { restore(); }
  });
});

describe("Kiro chat's progress note on the card (K23)", () => {
  const progress = { stage: "테스트 실행", goal: "<b>네 기능</b>과 예외 상황 테스트를 작성했고 vitest로 실행해 확인합니다.",
    steps: ["물품 등록 구현", "대여 기록 구현"], updatedAt: "2026-10-17T17:43:49.150Z" };
  const kiro = (builder: Partial<BuilderTurnViewModel>, extra: Partial<AgentViewModel> = {}): AgentViewModel => ({
    ...vmWithBuilder({ phase: "IDLE", taskId: "task_synthetic", taskTitle: "물품 대여 API", ...builder }),
    hostChat: { opening: false, window: "READY" }, ...extra,
  });

  it("shows the Builder's latest note while it builds, as its own note and as text only", () => {
    const { root, view, restore } = mount();
    try {
      view.render(kiro({ progress }));
      const block = byClass(root, "agent-now-progress")[0];
      expect(block.hidden).toBe(false);
      expect(byClass(root, "agent-now-progress-label")[0].textContent).toBe("Kiro 채팅의 최근 진행 메모");
      // Not live: the note says when it was written and never claims "지금".
      expect(byClass(root, "agent-now-progress-stage")[0].textContent).toBe("테스트 실행");
      expect(byClass(root, "agent-now-progress-goal")[0].textContent).toBe(progress.goal);
      expect(root.queryAll((e) => e.tagName === "B")).toHaveLength(0);
      expect(byClass(root, "agent-now-progress-time")[0].textContent).toMatch(/에 남김$/);
      // One toggle under the note: "자세히" opens the full note and its plan, then reads "접기".
      const toggle = byClass(root, "agent-now-progress-toggle")[0];
      const steps = byClass(root, "agent-now-progress-steps")[0];
      expect(toggle.hidden).toBe(false);
      expect(toggle.textContent).toBe("자세히");
      expect(steps.hidden).toBe(true);
      expect(block.dataset.expanded).toBe("false");
      toggle.click();
      expect(toggle.textContent).toBe("접기");
      expect(toggle.attributes["aria-expanded"]).toBe("true");
      expect(block.dataset.expanded).toBe("true");
      expect(steps.hidden).toBe(false);
      expect(byClass(root, "agent-now-progress-step").map((e) => e.textContent)).toEqual(progress.steps);
      // A newer note keeps it open; "접기" folds it back.
      view.render(kiro({ progress: { ...progress, stage: "구현" } }));
      expect(toggle.textContent).toBe("접기");
      toggle.click();
      expect(toggle.textContent).toBe("자세히");
      expect(steps.hidden).toBe(true);
      // No plan: a long note still opens; a short one needs no toggle.
      const longGoal = "네 기능(입고, 출고, 현황 조회, 이력 조회)과 예외 상황(재고 없음, 없는 상품) 테스트를 작성했고 vitest로 실행해 확인합니다.";
      view.render(kiro({ progress: { ...progress, steps: [], goal: longGoal } }));
      expect(toggle.hidden).toBe(false);
      toggle.click();
      expect(steps.hidden).toBe(true);
      expect(block.dataset.expanded).toBe("true");
      view.render(kiro({ progress: { ...progress, steps: [], goal: "테스트를 돌려요." } }));
      expect(toggle.hidden).toBe(true);
    } finally { restore(); }
  });

  it("stays off while a choice waits, after the Task is done, before it starts and without a note", () => {
    const { root, view, restore } = mount();
    try {
      const block = () => byClass(root, "agent-now-progress")[0];
      view.render(kiro({ phase: "DECISION_REQUIRED", progress }, { decisions: [{ ...pendingDecision(), taskId: "task_synthetic" }] }));
      expect(block().hidden).toBe(true);
      view.render(kiro({ phase: "TASK_COMPLETED", progress }));
      expect(block().hidden).toBe(true);
      view.render(kiro({ readyToStart: true, progress }));
      expect(block().hidden).toBe(true);
      view.render(kiro({ progress: null }));
      expect(block().hidden).toBe(true);
    } finally { restore(); }
  });
});
