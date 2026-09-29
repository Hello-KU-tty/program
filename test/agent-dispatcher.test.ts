import { describe, it, expect, beforeEach } from "vitest";

import { AgentDispatcher } from "../src/webview/agent/agent-dispatcher";
import type { AgentSurfaceController } from "../src/core/agent/agent-controller";
import type { AgentHostMessage } from "../src/webview/agent/agent-messages";
import {
  type AgentViewModel,
  initialAgentViewModel,
} from "../src/core/agent/agent-view-model";
import type {
  EvidenceTraceView,
  FinalUpgradeCandidate,
} from "../vendor/frontend-client";

/**
 * Example-based unit tests for the agent-surface messaging dispatcher (task 7.2).
 *
 * These tests exercise {@link AgentDispatcher} against a hand-rolled *stub*
 * controller that records every routed call, and a capturing `post` spy. The
 * stub stands in for the real {@link AgentSurfaceController}: it exposes exactly
 * the methods the dispatcher routes to (plus a mutable `getViewModel()`), and an
 * `onChange` hook wired through the same forward-reference closure the wiring
 * layer uses (design §B.17) so a state mutation drives exactly one
 * `agent/hydrate`.
 *
 * Covers:
 *   - Malformed / untrusted payloads are dropped — no controller call (Req 13.2).
 *   - Each well-formed {@link AgentAction} reaches its matching controller
 *     method with the right arguments (Req 13.3, exercised for completeness).
 *   - `onChange` triggers exactly one `agent/hydrate` carrying the current vm.
 *   - A notice raised on the controller surfaces to the webview (`vm.notice`)
 *     through the hydrate driven by `onChange` (Req 13.4).
 */

/** A single recorded call: the routed method name plus its arguments. */
interface RecordedCall {
  readonly method: string;
  readonly args: readonly unknown[];
}

/**
 * Minimal stub of {@link AgentSurfaceController} exposing only what the
 * dispatcher touches: `getViewModel`, the routed action methods, and an
 * `onChange` sink the tests fire to simulate a state mutation. Every routed
 * method records its name + args into {@link calls} so tests can assert the
 * exact routing without a live Core.
 */
class StubController {
  captureBinding(): () => boolean { return () => true; }
  readonly calls: RecordedCall[] = [];
  private vm: AgentViewModel = initialAgentViewModel();

  /** Set by the wiring closure; the dispatcher's `hydrate` is registered here. */
  onChange: (() => void) | null = null;

  /** Read/write result surfaces so read-style routes can be asserted. */
  evidenceView: EvidenceTraceView | null = null;
  finalUpgradeCandidates: FinalUpgradeCandidate[] = [];

  getViewModel(): AgentViewModel {
    return this.vm;
  }

  /** Replace the projected vm and (like the real controller) fire onChange. */
  setViewModel(next: AgentViewModel): void {
    this.vm = next;
    this.onChange?.();
  }

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  async startBuilder(message: string): Promise<void> {
    this.record("startBuilder", message);
  }

  async cancelActive(): Promise<void> {
    this.record("cancelActive");
  }

  async startHelper(input: unknown): Promise<void> {
    this.record("startHelper", input);
  }

  async resolveDecision(input: unknown): Promise<void> {
    this.record("resolveDecision", input);
  }

  async resolveDecisionAndContinue(input: unknown): Promise<void> {
    this.record("resolveDecisionAndContinue", input);
  }

  async resumeAfterDecision(): Promise<void> {
    this.record("resumeAfterDecision");
  }

  async submitNativeAnswerAction(input: unknown): Promise<void> {
    this.record("submitNativeAnswerAction", input);
  }

  async openGeneratedWorkspace(taskId: string): Promise<void> {
    this.record("openGeneratedWorkspace", taskId);
  }

  async launchResult(): Promise<void> {
    this.record("launchResult");
  }

  async readEvidence(conceptId?: string): Promise<EvidenceTraceView | null> {
    this.record("readEvidence", conceptId);
    return this.evidenceView;
  }

  async retryAnalysis(
    analysisJobId: string,
    expectedJobRevision: number,
  ): Promise<EvidenceTraceView | null> {
    this.record("retryAnalysis", analysisJobId, expectedJobRevision);
    return this.evidenceView;
  }

  async listFinalUpgradeCandidates(): Promise<FinalUpgradeCandidate[]> {
    this.record("listFinalUpgradeCandidates");
    return this.finalUpgradeCandidates;
  }

  async prepareFinalUpgrade(input: unknown): Promise<void> {
    this.record("prepareFinalUpgrade", input);
  }
}

/**
 * Wire a stub controller + dispatcher pair with a capturing `post` sink, using
 * the documented forward-reference closure (design §B.17): the controller's
 * `onChange` forwards through the later-assigned dispatcher's `hydrate`.
 */
function makeHarness() {
  const controller = new StubController();
  const posted: AgentHostMessage[] = [];
  const post = (message: AgentHostMessage): void => {
    posted.push(message);
  };

  const dispatcher = new AgentDispatcher(
    controller as unknown as AgentSurfaceController,
    post,
  );
  // Forward-reference closure: state mutations re-hydrate through the dispatcher.
  controller.onChange = () => dispatcher.hydrate();

  return { controller, dispatcher, posted };
}

describe("AgentDispatcher — malformed payloads are dropped (Req 13.2)", () => {
  let controller: StubController;
  let dispatcher: AgentDispatcher;
  let posted: AgentHostMessage[];

  beforeEach(() => {
    ({ controller, dispatcher, posted } = makeHarness());
  });

  const malformed: readonly [string, unknown][] = [
    ["null", null],
    ["undefined", undefined],
    ["a bare string", "builder/start"],
    ["a number", 42],
    ["an array", [{ kind: "builder/start", message: "hi" }]],
    ["an empty object", {}],
    ["an unknown kind", { kind: "builder/teleport" }],
    ["a non-string kind", { kind: 123 }],
    ["builder/start without message", { kind: "builder/start" }],
    ["builder/start with non-string message", { kind: "builder/start", message: 7 }],
    ["helper/start with a bad origin", { kind: "helper/start", message: "x", origin: "NOPE" }],
    [
      "decision/resolve with a bad selection",
      { kind: "decision/resolve", decisionId: "d1", selection: { kind: "???" }, helperUsed: true },
    ],
    [
      "decision/resolve with a non-boolean helperUsed",
      {
        kind: "decision/resolve",
        decisionId: "d1",
        selection: { kind: "RECOMMENDATION" },
        helperUsed: "yes",
      },
    ],
    [
      "native/answer with a bad answer",
      { kind: "native/answer", requestId: "r", nativeJobId: "j", answer: { action: "??" } },
    ],
    ["workspace/open without taskId", { kind: "workspace/open" }],
    [
      "evidence/retry with a non-finite revision",
      { kind: "evidence/retry", analysisJobId: "a", expectedJobRevision: Number.NaN },
    ],
  ];

  for (const [name, payload] of malformed) {
    it(`drops ${name} without touching the controller`, async () => {
      await dispatcher.handle(payload);
      expect(controller.calls).toHaveLength(0);
      expect(posted).toHaveLength(0);
    });
  }
});

describe("AgentDispatcher — each valid action reaches its controller method (Req 13.3)", () => {
  let controller: StubController;
  let dispatcher: AgentDispatcher;

  beforeEach(() => {
    ({ controller, dispatcher } = makeHarness());
  });

  it("builder/start -> startBuilder(message)", async () => {
    await dispatcher.handle({ kind: "builder/start", message: "build the widget" });
    expect(controller.calls).toEqual([
      { method: "startBuilder", args: ["build the widget"] },
    ]);
  });

  it("builder/stop -> cancelActive()", async () => {
    await dispatcher.handle({ kind: "builder/stop" });
    expect(controller.calls).toEqual([{ method: "cancelActive", args: [] }]);
  });

  it("helper/start -> startHelper({ message, origin, decisionId })", async () => {
    await dispatcher.handle({
      kind: "helper/start",
      message: "explain this",
      origin: "QUICK_ACTION",
      decisionId: "dec-9",
    });
    expect(controller.calls).toEqual([
      {
        method: "startHelper",
        args: [{ message: "explain this", origin: "QUICK_ACTION", decisionId: "dec-9" }],
      },
    ]);
  });

  it("decision/resolve -> resolveDecision({ decisionId, selection, rationale, helperUsed })", async () => {
    await dispatcher.handle({
      kind: "decision/resolve",
      decisionId: "d1",
      selection: { kind: "OPTION", optionId: "opt-2" },
      rationale: "because",
      helperUsed: true,
    });
    expect(controller.calls).toEqual([
      {
        method: "resolveDecision",
        args: [
          {
            decisionId: "d1",
            selection: { kind: "OPTION", optionId: "opt-2" },
            rationale: "because",
            helperUsed: true,
          },
        ],
      },
    ]);
  });

  it("decision/resolveAndContinue dispatches one explicit combined action", async () => {
    await dispatcher.handle({ kind: "decision/resolveAndContinue", decisionId: "decision_1", selection: { kind: "RECOMMENDATION" }, helperUsed: false });
    expect(controller.calls).toEqual([{ method: "resolveDecisionAndContinue", args: [{ decisionId: "decision_1", selection: { kind: "RECOMMENDATION" }, helperUsed: false, rationale: undefined }] }]);
  });

  it("builder/resumeAfterDecision -> resumeAfterDecision()", async () => {
    await dispatcher.handle({ kind: "builder/resumeAfterDecision" });
    expect(controller.calls).toEqual([{ method: "resumeAfterDecision", args: [] }]);
  });

  it("native/answer -> submitNativeAnswerAction({ requestId, nativeJobId, answer })", async () => {
    await dispatcher.handle({
      kind: "native/answer",
      requestId: "req-1",
      nativeJobId: "job-1",
      answer: { action: "answered", answer: "yes please" },
    });
    expect(controller.calls).toEqual([
      {
        method: "submitNativeAnswerAction",
        args: [
          {
            requestId: "req-1",
            nativeJobId: "job-1",
            answer: { action: "answered", answer: "yes please" },
          },
        ],
      },
    ]);
  });

  it("workspace/open -> openGeneratedWorkspace(taskId)", async () => {
    await dispatcher.handle({ kind: "workspace/open", taskId: "task-7" });
    expect(controller.calls).toEqual([
      { method: "openGeneratedWorkspace", args: ["task-7"] },
    ]);
  });

  it("result/launch -> launchResult()", async () => {
    await dispatcher.handle({ kind: "result/launch" });
    expect(controller.calls).toEqual([{ method: "launchResult", args: [] }]);
  });

  it("evidence/read -> readEvidence(conceptId)", async () => {
    await dispatcher.handle({ kind: "evidence/read", conceptId: "concept-3" });
    expect(controller.calls).toEqual([
      { method: "readEvidence", args: ["concept-3"] },
    ]);
  });

  it("evidence/retry -> retryAnalysis(analysisJobId, expectedJobRevision)", async () => {
    await dispatcher.handle({
      kind: "evidence/retry",
      analysisJobId: "aj-5",
      expectedJobRevision: 3,
    });
    expect(controller.calls).toEqual([
      { method: "retryAnalysis", args: ["aj-5", 3] },
    ]);
  });

  it("finalUpgrade/list -> listFinalUpgradeCandidates()", async () => {
    await dispatcher.handle({ kind: "finalUpgrade/list" });
    expect(controller.calls).toEqual([
      { method: "listFinalUpgradeCandidates", args: [] },
    ]);
  });

  it("finalUpgrade/prepare -> prepareFinalUpgrade({ ... })", async () => {
    await dispatcher.handle({
      kind: "finalUpgrade/prepare",
      sourceTaskId: "src-1",
      expectedSourceTaskRevision: 2,
      personalizationTraceId: "trace-1",
      userGoal: "ship it",
    });
    expect(controller.calls).toEqual([
      {
        method: "prepareFinalUpgrade",
        args: [
          {
            sourceTaskId: "src-1",
            expectedSourceTaskRevision: 2,
            personalizationTraceId: "trace-1",
            userGoal: "ship it",
          },
        ],
      },
    ]);
  });
});

describe("AgentDispatcher — read-style responses post their targeted message", () => {
  it("evidence/read posts agent/evidence only when a view is present", async () => {
    const { controller, dispatcher, posted } = makeHarness();
    const view = { conceptId: "c1" } as unknown as EvidenceTraceView;
    controller.evidenceView = view;

    await dispatcher.handle({ kind: "evidence/read" });

    expect(posted).toEqual([{ kind: "agent/evidence", view }]);
  });

  it("evidence/read posts nothing when the controller returns null", async () => {
    const { controller, dispatcher, posted } = makeHarness();
    controller.evidenceView = null;

    await dispatcher.handle({ kind: "evidence/read" });

    expect(posted).toHaveLength(0);
  });

  it("finalUpgrade/list posts agent/finalUpgrade with the candidate list", async () => {
    const { controller, dispatcher, posted } = makeHarness();
    const candidates = [{ sourceTaskId: "t1" }] as unknown as FinalUpgradeCandidate[];
    controller.finalUpgradeCandidates = candidates;

    await dispatcher.handle({ kind: "finalUpgrade/list" });

    expect(posted).toEqual([{ kind: "agent/finalUpgrade", candidates }]);
  });
});

describe("AgentDispatcher — hydrate / onChange", () => {
  it("hydrate() posts exactly one agent/hydrate carrying the controller vm", () => {
    const { controller, dispatcher, posted } = makeHarness();

    dispatcher.hydrate();

    expect(posted).toHaveLength(1);
    expect(posted[0]).toEqual({ kind: "agent/hydrate", vm: controller.getViewModel() });
  });

  it("onChange triggers exactly one agent/hydrate reflecting the mutated vm", () => {
    const { controller, posted } = makeHarness();

    const next: AgentViewModel = {
      ...initialAgentViewModel(),
      builder: { ...initialAgentViewModel().builder, phase: "RUNNING" },
    };
    // A single state mutation fires onChange once.
    controller.setViewModel(next);

    const hydrates = posted.filter((m) => m.kind === "agent/hydrate");
    expect(hydrates).toHaveLength(1);
    const msg = hydrates[0];
    if (msg.kind !== "agent/hydrate") throw new Error("expected agent/hydrate");
    expect(msg.vm.builder.phase).toBe("RUNNING");
  });
});

describe("AgentDispatcher — notices reach the webview (Req 13.4)", () => {
  it("a controller notice surfaces to the webview through the onChange-driven hydrate", () => {
    const { controller, posted } = makeHarness();

    // The controller sets a notice on its vm and fires onChange (as the real
    // controller does via notify/notice). Notices ride inside vm.notice on the
    // hydrate rather than as a separate post.
    const withNotice: AgentViewModel = {
      ...initialAgentViewModel(),
      notice: { kind: "error", code: "RUN_BUSY", message: "a run is already active" },
    };
    controller.setViewModel(withNotice);

    const hydrates = posted.filter((m) => m.kind === "agent/hydrate");
    expect(hydrates).toHaveLength(1);
    const msg = hydrates[0];
    if (msg.kind !== "agent/hydrate") throw new Error("expected agent/hydrate");
    expect(msg.vm.notice).toEqual({
      kind: "error",
      code: "RUN_BUSY",
      message: "a run is already active",
    });
  });
});
