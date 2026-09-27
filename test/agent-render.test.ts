import { describe, it, expect } from "vitest";

import { AgentSurfaceView, type AgentRenderCallbacks } from "../src/webview/agent/agent-render";
import {
  initialAgentViewModel,
  type AgentViewModel,
  type BuilderTurnViewModel,
  type ToolRowViewModel,
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
function mount(): {
  root: FakeElement;
  view: AgentSurfaceView;
  restore: () => void;
} {
  const dom = installFakeDom();
  const root = dom.createElement("div") as unknown as FakeElement;
  const view = new AgentSurfaceView(root as unknown as HTMLElement, noopCallbacks());
  return { root, view, restore: dom.restore };
}

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
