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
    onNativeAnswer: () => {},
    onOpenWorkspace: () => {},
    onLaunchResult: () => {},
    onReadEvidence: () => {},
    onRetryAnalysis: () => {},
    onListFinalUpgrade: () => {},
    onPrepareFinalUpgrade: () => {},
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
      expect(byClass(root, "agent-builder-send")[0].disabled).toBe(true);
      view.resetProject(); view.render(initialAgentViewModel());
      workspace.click(); result.click();
      expect(opened).toEqual(["task_synthetic"]); expect(launches).toBe(1);
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

describe("honest evidence display (task 9.2, Req 10.2/10.4)", () => {
  function evidenceView(overrides: Partial<EvidenceTraceView> = {}): EvidenceTraceView {
    return {
      concepts: [],
      analysis: [],
      userUnderstandingTotal: 0,
      emptyReason: null,
      ...overrides,
    };
  }

  it("OBSERVED_ONLY / zero understanding is never shown as understanding (Req 10.2)", () => {
    const { root, view, restore } = mount();
    view.renderEvidence(
      evidenceView({
        concepts: [
          {
            id: "c1",
            name: "상태 관리",
            state: null,
            displayState: "OBSERVED_ONLY",
            userUnderstandingCount: 0,
            openIssueCount: 0,
            accepted: [],
            rejected: [],
          },
        ],
      }),
    );

    const states = byClass(root, "agent-evidence-concept-state");
    expect(states).toHaveLength(1);
    // Honest: observed only, explicitly not marked as understood.
    expect(states[0].textContent).toBe("관찰만 되었어요 (이해했다고 표시하지 않음)");
    expect(states[0].textContent).not.toContain("사용자 이해 근거");
    restore();
  });

  it("ANALYZED with acceptedCount 0 surfaces noEvidenceReason, not success (Req 10.4)", () => {
    const { root, view, restore } = mount();
    view.renderEvidence(
      evidenceView({
        analysis: [
          {
            jobId: "job-1",
            episodeId: "ep-1",
            status: "SUCCEEDED",
            displayState: "ANALYZED",
            acceptedCount: 0,
            noEvidenceReason: "설명이 근거로 인정될 만큼 구체적이지 않았어요",
            failureCode: null,
          },
        ],
      }),
    );

    const statuses = byClass(root, "agent-evidence-analysis-status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toBe(
      "인정된 근거 없음: 설명이 근거로 인정될 만큼 구체적이지 않았어요",
    );
    // Must not present a "근거 N건이 인정되었어요" success claim.
    expect(statuses[0].textContent).not.toContain("인정되었어요");
    restore();
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
      expect(status().textContent).toContain("(WORKSPACE_WINDOW_AVAILABLE)");
      view.render({ ...initialAgentViewModel(), worker: { stage: "AGENT_RUNNING", role: "DISCOVERY", code: "AGENT_RUNNING_DISCOVERY" } } as AgentViewModel);
      expect(status().textContent).toBe("작업 상태: AGENT_RUNNING · DISCOVERY (AGENT_RUNNING_DISCOVERY)");
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
      expect(hint().hidden).toBe(true);
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
