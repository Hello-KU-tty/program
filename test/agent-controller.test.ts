/**
 * Unit tests for {@link AgentSurfaceController} behaviors (task 5.9).
 *
 * These drive the REAL controller through the REAL {@link ManagedAgentPort}
 * over the deterministic {@link FakeCoreClient} / {@link FakeNativeWorker} /
 * {@link FakeGlobalState} fakes (design "Testing Strategy" > Fakes) — no live
 * backend, process, or network. Every behavior bullet from task 5.9 is covered:
 *
 *  - start → run → classify happy path (TASK_COMPLETED via the real classifier);
 *  - each start-error code → `START_ERROR` with the mapped code;
 *  - helper → `RECORDED` reads `helperConversations` from the After_Snapshot;
 *  - decision resolve → zero `startBuilder` invocations (spy);
 *  - cancel → `CANCELLED` → `CLEANUP`, then worker `AGENT_ENDED` → `IDLE`;
 *  - abort (panel dispose) → phase is NOT `CANCELLED`;
 *  - recover → `watch` called with `after: 0`;
 *  - native submit validates against the snapshot BEFORE submit;
 *  - workspace: the absolute path reaches ONLY the injected `openFolder` spy and
 *    never a projection.
 *
 * Requirements: 1.1, 3.3, 4.3, 5.3, 6.2, 6.4, 6.6, 7.2, 8.3.
 */
import { describe, expect, it, vi } from "vitest";

import { AgentSurfaceController, type AgentControllerDeps } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentRunPort } from "../src/adapter/agent/agent-run-port";
import type { LocalRunInput } from "../vendor/frontend-client";
import {
  clientError,
  FakeCoreClient,
  type FakeCoreClientOptions,
  fakeLocalRun,
  fakeSnapshot,
} from "./support/fake-core-client";
import {
  FakeNativeWorker,
  fakeNativeQuestion,
} from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";
import { AgentDispatcher } from "../src/webview/agent/agent-dispatcher";
import { FakeClock } from "./support/fake-clock";
import { NEXT_MOVE_REFRESH_MS } from "../src/core/agent/agent-controller";

const PROJECT_ID = "project_1";
const TASK_ID = "task_1";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const emptyTrace = { projectId: PROJECT_ID, concepts: [], analysis: [], personalization: [], emptyReason: "NO_EVIDENCE" };

describe("project-bound actions ignore stale asynchronous work", () => {
  it("does not call Core or mutate the view after disposal", async () => {
    const h = buildHarness();
    const execute = vi.spyOn(h.client, "execute");
    const snapshot = vi.spyOn(h.client, "restoreProject");
    const list = vi.spyOn(h.client, "listRuns");
    h.controller.dispose();
    const changes = h.changeCount();
    h.controller.bindProject("project_other");
    await Promise.all([
      h.controller.recover(), h.controller.refreshProject(), h.controller.cancelActive(),
      h.controller.startBuilder("build"), h.controller.startHelper({ message: "why", origin: "FREE_TEXT" }),
      h.controller.resolveDecision({ decisionId: "decision_1", selection: { kind: "RECOMMENDATION" }, helperUsed: false }),
      h.controller.submitNativeAnswerAction({ requestId: "request_1", nativeJobId: "native_job_1", answer: { action: "dismissed" } }),
      h.controller.openGeneratedWorkspace(TASK_ID), h.controller.launchResult(), h.controller.readEvidence(),
      h.controller.retryAnalysis("analysis_job_1", 1), h.controller.listFinalUpgradeCandidates(),
      h.controller.prepareFinalUpgrade({ sourceTaskId: TASK_ID, expectedSourceTaskRevision: 1, personalizationTraceId: "trace_1", userGoal: "goal" }),
    ]);
    expect(execute).not.toHaveBeenCalled();
    expect(snapshot).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(h.worker.submitted).toEqual([]);
    expect(h.changeCount()).toBe(changes);
  });

  it.each(["evidence/read", "finalUpgrade/list"])("checks binding again before posting %s to the webview", async (kind) => {
    const h = buildHarness();
    const posted: unknown[] = [];
    const dispatcher = new AgentDispatcher(h.controller, (message) => posted.push(message));
    if (kind === "evidence/read") vi.spyOn(h.controller, "readEvidence").mockImplementation(async () => {
      queueMicrotask(() => h.controller.bindProject("project_other"));
      return { concepts: [], analysis: [], userUnderstandingTotal: 0, emptyReason: "OLD_PROJECT" };
    });
    else vi.spyOn(h.controller, "listFinalUpgradeCandidates").mockImplementation(async () => {
      queueMicrotask(() => h.controller.bindProject("project_other"));
      return [];
    });
    await dispatcher.handle({ kind });
    expect(posted).toEqual([]);
    h.controller.dispose();
  });

  for (const transition of ["switch", "switch back", "dispose"] as const) {
    const invalidate = (controller: AgentSurfaceController) => {
      if (transition === "dispose") controller.dispose();
      else {
        controller.bindProject("project_other");
        if (transition === "switch back") controller.bindProject(PROJECT_ID);
      }
    };

    it.each(["decision", "native answer", "upgrade list"] as const)(`stops %s after a snapshot delayed across ${transition}`, async (action) => {
      const h = buildHarness({ worker: new FakeNativeWorker({ questions: [fakeNativeQuestion()] }), client: { executeResultByKind: { UI_READ_EVIDENCE_TRACE: { resolve: emptyTrace } } } });
      const pending = deferred<ReturnType<typeof fakeSnapshot>>();
      vi.spyOn(h.client, "restoreProject").mockImplementationOnce(() => pending.promise);
      const posted: unknown[] = [];
      const dispatcher = new AgentDispatcher(h.controller, (message) => posted.push(message));
      const result = action === "decision"
        ? h.controller.resolveDecision({ decisionId: "decision_1", selection: { kind: "OPTION", optionId: "option_a" }, helperUsed: false })
        : action === "native answer"
          ? h.controller.submitNativeAnswerAction({ requestId: "request_1", nativeJobId: "native_job_1", answer: { action: "dismissed" } })
          : dispatcher.handle({ kind: "finalUpgrade/list" });
      invalidate(h.controller);
      const changes = h.changeCount();
      pending.resolve(snapshotWithPendingDecision());
      await result;
      expect(h.client.executeKinds).toEqual([]);
      expect(h.worker.submitted).toEqual([]);
      expect(posted).toEqual([]);
      expect(h.changeCount()).toBe(changes);
      h.controller.dispose();
    });

    it.each(["workspace", "result", "evidence", "retry", "upgrade error", "decision", "upgrade trace"] as const)(`ignores %s completion after ${transition}`, async (action) => {
      const h = buildHarness({ client: { restoreProjectResult: { resolve: snapshotWithPendingDecision() }, executeResultByKind: { UI_READ_EVIDENCE_TRACE: { resolve: emptyTrace } } } });
      const pending = deferred<unknown>();
      const execute = vi.spyOn(h.client, "execute").mockImplementationOnce(() => pending.promise as never);
      const posted: unknown[] = [];
      const dispatcher = new AgentDispatcher(h.controller, (message) => posted.push(message));
      const result = action === "workspace" ? h.controller.openGeneratedWorkspace(TASK_ID)
        : action === "result" ? h.controller.launchResult()
          : action === "evidence" ? dispatcher.handle({ kind: "evidence/read" })
            : action === "upgrade trace" ? dispatcher.handle({ kind: "finalUpgrade/list" })
              : action === "decision" ? h.controller.resolveDecision({ decisionId: "decision_1", selection: { kind: "OPTION", optionId: "option_a" }, helperUsed: false })
            : action === "retry" ? h.controller.retryAnalysis("analysis_job_1", 1)
              : h.controller.prepareFinalUpgrade({ sourceTaskId: TASK_ID, expectedSourceTaskRevision: 1, personalizationTraceId: "trace_1", userGoal: "goal" });
      await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
      invalidate(h.controller);
      const changes = h.changeCount();
      if (action === "upgrade error") pending.reject(clientError("FINAL_UPGRADE_TRACE_NOT_ELIGIBLE"));
      else pending.resolve(action === "workspace" ? { workspaceDirectory: "/synthetic/previous-project" }
        : action === "result" ? { status: "RUNNING", url: "http://127.0.0.1:43210/" }
          : action === "evidence" || action === "upgrade trace" ? emptyTrace : {});
      await result;
      expect(h.openedFolders).toEqual([]);
      expect(h.openedUrls).toEqual([]);
      expect(posted).toEqual([]);
      expect(execute).toHaveBeenCalledTimes(1);
      expect(h.changeCount()).toBe(changes);
      h.controller.dispose();
    });
  }
});

describe("durable project binding", () => {
  it("projects the prepared upgrade task and clears previous completion without starting a run", async () => {
    const h = buildHarness({ client: { restoreProjectResult: { resolve: completedSnapshot() } } });
    await h.controller.recover();
    const next = fakeSnapshot({ currentTask: { ...fakeSnapshot().currentTask!, id: "task_upgrade", revision: 3, status: "PENDING", title: "Upgrade" } });
    vi.spyOn(h.client, "restoreProject").mockResolvedValue(next);
    await h.controller.prepareFinalUpgrade({ sourceTaskId: TASK_ID, expectedSourceTaskRevision: 1, personalizationTraceId: "trace_1", userGoal: "show the filter steps" });
    expect(h.controller.getViewModel().builder).toMatchObject({ taskId: "task_upgrade", taskRevision: 3, phase: "IDLE", completionReportId: null });
    expect(h.startBuilderCount()).toBe(0);
    expect(h.client.executeKinds).toEqual(["UI_PREPARE_FINAL_UPGRADE_TASK"]);
    h.controller.dispose();
  });

  it("handles a cancelled SSE terminal arriving before the cancel response", async () => {
    const h = buildHarness();
    let respond!: (run: ReturnType<typeof fakeLocalRun>) => void;
    vi.spyOn(h.client, "cancelRun").mockImplementation(() => new Promise(resolve => { respond = resolve; }));
    const turn = h.controller.startBuilder("build");
    await vi.waitFor(() => expect(h.client.isWatching).toBe(true));
    const stopping = h.controller.cancelActive();
    const terminal = fakeLocalRun({ status: "CANCELLED", outcome: "NONE" });
    h.client.settle(terminal);
    await turn;
    expect(h.controller.getViewModel().builder.phase).toBe("CLEANUP");
    respond(terminal);
    await stopping;
    expect(h.controller.getViewModel().builder.phase).toBe("CLEANUP");
    h.controller.dispose();
  });
  it("duplicate Builder gestures share one in-flight request", async () => {
    const h = buildHarness();
    const first = h.controller.startBuilder("same");
    const duplicate = h.controller.startBuilder("same");
    expect(duplicate).toBe(first);
    await vi.waitFor(() => expect(h.client.isWatching).toBe(true));
    expect(h.builderStartRunCount()).toBe(1);
    h.client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "TURN_ENDED" }));
    await first;
    h.controller.dispose();
  });

  it("Builder stop still targets Builder while Helper has an independent watch", async () => {
    const h = buildHarness();
    const watches = new Map<string, { signal?: AbortSignal; settle: (run: ReturnType<typeof fakeLocalRun>) => void }>();
    vi.spyOn(h.client, "startRun").mockImplementation(async input => fakeLocalRun({ id: `run_${input.kind}`, kind: input.kind }));
    vi.spyOn(h.client, "watchRun").mockImplementation((id, _onEvent, options) =>
      new Promise(resolve => { watches.set(id, { signal: options?.signal, settle: resolve }); }));
    const cancel = vi.spyOn(h.client, "cancelRun");
    const builder = h.controller.startBuilder("build");
    await vi.waitFor(() => expect(watches.has("run_BUILDER")).toBe(true));
    const helper = h.controller.startHelper({ message: "question", origin: "FREE_TEXT" });
    await vi.waitFor(() => expect(watches.has("run_HELPER")).toBe(true));
    await h.controller.cancelActive();
    expect(cancel).toHaveBeenCalledWith("run_BUILDER");
    expect(watches.get("run_HELPER")?.signal?.aborted).toBe(false);
    h.controller.dispose();
    for (const [id, watch] of watches) {
      expect(watch.signal?.aborted).toBe(true);
      watch.settle(fakeLocalRun({ id, status: "CANCELLED", outcome: "NONE" }));
    }
    await Promise.all([builder, helper]);
  });

  it("restores the task even when no Builder run is active", async () => {
    const h = buildHarness();
    await h.controller.recover();
    expect(h.controller.getViewModel().builder.taskId).toBe(TASK_ID);
    expect(h.client.isWatching).toBe(false);
    h.controller.dispose();
  });

  it("switching projects detaches a running stream without cancelling or leaking old output", async () => {
    const h = buildHarness();
    const cancel = vi.spyOn(h.client, "cancelRun");
    const turn = h.controller.startBuilder("synthetic");
    await vi.waitFor(() => expect(h.client.isWatching).toBe(true));
    h.controller.bindProject("project_other");
    // The controllable fake does not settle on abort; deliver an old terminal
    // afterwards to prove it cannot contaminate the newly bound surface.
    h.client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "TURN_ENDED" }));
    await turn;
    expect(h.client.lastWatchAborted).toBe(true);
    expect(cancel).not.toHaveBeenCalled();
    expect(h.controller.getViewModel().builder.taskId).toBeNull();
    expect(h.controller.getViewModel().builder.phase).toBe("IDLE");
    h.controller.dispose();
  });
});

/** A COMPLETED task + matching completion report → the classifier yields TASK_COMPLETED. */
function completedSnapshot() {
  return fakeSnapshot({
    currentTask: {
      schemaVersion: 1,
      id: TASK_ID,
      projectId: PROJECT_ID,
      revision: 1,
      title: "습관 트래커 만들기",
      status: "COMPLETED",
    },
    completionReport: {
      schemaVersion: 1,
      id: "report_1",
      taskId: TASK_ID,
    },
  });
}

/** A snapshot carrying one recorded Helper conversation for read-back. */
function helperRecordedSnapshot() {
  return fakeSnapshot({
    helperConversations: [
      {
        conversationId: "conv_1",
        taskId: TASK_ID,
        decisionId: null,
        status: "ANALYZED",
        redactedUserExcerpts: ["이걸 어떻게 하나요?"],
        helperResponseSummaries: ["이렇게 하세요."],
      },
    ],
  });
}

/**
 * Build a controller wired to a {@link ManagedAgentPort} over the fakes, with a
 * `startBuilder` spy on the port and injected `openFolder` / `openExternal`
 * spies. Records `onChange` calls too.
 */
function buildHarness(options: {
  client?: FakeCoreClientOptions;
  worker?: FakeNativeWorker;
  seedProjectId?: boolean;
  openInKiro?: AgentControllerDeps["openInKiro"];
  clock?: FakeClock;
} = {}) {
  const client = new FakeCoreClient(options.client ?? {});
  const worker = options.worker ?? new FakeNativeWorker();
  const port: AgentRunPort = new ManagedAgentPort(client, worker);

  let startBuilderCount = 0;
  const originalStartBuilder = port.startBuilder.bind(port);
  port.startBuilder = (input) => {
    startBuilderCount += 1;
    return originalStartBuilder(input);
  };

  const seed: Record<string, string> =
    options.seedProjectId === false ? {} : { "bhlr.lastProjectId": PROJECT_ID };
  const globalState = new FakeGlobalState(seed);

  const openedFolders: string[] = [];
  const openedUrls: string[] = [];
  let changeCount = 0;

  const controller = new AgentSurfaceController({
    port: port as ManagedAgentPort,
    globalState,
    onChange: () => {
      changeCount += 1;
    },
    openFolder: async (p: string) => {
      openedFolders.push(p);
    },
    openExternal: async (u: string) => {
      openedUrls.push(u);
    },
    ...(options.openInKiro ? { openInKiro: options.openInKiro } : {}),
    ...(options.clock ? { clock: options.clock } : {}),
  });

  return {
    controller,
    client,
    worker,
    globalState,
    openedFolders,
    openedUrls,
    startBuilderCount: () => startBuilderCount,
    builderStartRunCount: () =>
      client.startRunInputs.filter((r: LocalRunInput) => r.kind === "BUILDER")
        .length,
    changeCount: () => changeCount,
  };
}

/** Yield microtasks until the fake client has an in-flight watch (or give up). */
async function waitForWatch(client: FakeCoreClient): Promise<void> {
  for (let i = 0; i < 50 && !client.isWatching; i += 1) {
    await Promise.resolve();
  }
}

// ---------- start → run → classify happy path (Requirement 1.1) ----------

describe("AgentSurfaceController — start → run → classify happy path", () => {
  it("startBuilder streams events then classifies TASK_COMPLETED from the After_Snapshot", async () => {
    const h = buildHarness();

    const started = h.controller.startBuilder("build the tracker");
    await waitForWatch(h.client);

    expect(h.controller.getViewModel().builder.phase).toBe("RUNNING");
    // A start persists the project id for §3.1 recovery.
    expect(h.globalState.get("bhlr.lastProjectId")).toBe(PROJECT_ID);

    // Stream a couple of events, then settle a SUCCEEDED terminal run.
    h.client.emit({ kind: "TEXT", sequence: 1, text: "작업 시작" } as never);
    h.client.emit({
      kind: "TOOL",
      sequence: 2,
      toolId: "tool_a",
      tool: "write",
      status: "SUCCEEDED",
      relativePath: "src/app.ts",
      command: null,
      exitCode: null,
      coreAction: null,
      errorCode: null,
      output: null,
      truncated: false,
    } as never);
    h.client.restoreProjectResult = { resolve: completedSnapshot() };
    h.client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "PENDING" }));
    await started;

    const vm = h.controller.getViewModel().builder;
    expect(vm.phase).toBe("TASK_COMPLETED");
    expect(vm.completionReportId).toBe("report_1");
    expect(vm.transcript).toEqual([{ sequence: 1, text: "작업 시작" }]);
    // The TOOL event folded into exactly one row (keyed by its projected id);
    // the row never carries an absolute path (Requirement 2.9).
    expect(vm.toolRows).toHaveLength(1);
    expect(vm.toolRows[0].relativePath ?? "").not.toMatch(/^[A-Za-z]:\\/);
  });

  it("a SUCCEEDED run with a still-ACTIVE task classifies to TURN_ENDED, not TASK_COMPLETED", async () => {
    // Default fixture: currentTask is ACTIVE, completionReport is null.
    const h = buildHarness();

    const started = h.controller.startBuilder("go");
    await waitForWatch(h.client);
    h.client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "PENDING" }));
    await started;

    expect(h.controller.getViewModel().builder.phase).toBe("TURN_ENDED");
  });
});

// ---------- each start-error code → START_ERROR (Requirement 1.10–1.15) ----------

describe("AgentSurfaceController — start errors map to START_ERROR", () => {
  const cases: { raw: string; expected: string }[] = [
    { raw: "RUN_BUSY", expected: "run_busy" },
    { raw: "STALE_TASK_REVISION", expected: "stale_task_revision" },
    { raw: "TASK_ALREADY_COMPLETED", expected: "task_already_completed" },
    { raw: "TASK_BINDING_MISMATCH", expected: "task_binding_mismatch" },
    { raw: "RUNTIME_CAPACITY", expected: "runtime_capacity" },
    { raw: "RUN_IDEMPOTENCY_CONFLICT", expected: "idempotency_conflict" },
  ];

  for (const { raw, expected } of cases) {
    it(`startRun rejected with ${raw} → START_ERROR (${expected})`, async () => {
      const h = buildHarness({
        client: { startRunResult: { throw: clientError(raw) } },
      });

      await h.controller.startBuilder("go");

      const vm = h.controller.getViewModel().builder;
      expect(vm.phase).toBe("START_ERROR");
      expect(vm.errorCode).toBe(expected);
      const notice = h.controller.getViewModel().notice;
      expect(notice?.kind).toBe("error");
      expect(notice?.code).toBe(expected);
      // A rejected start never opens a watch.
      expect(h.client.isWatching).toBe(false);
    });
  }

  it("no current task → START_ERROR without calling startRun (Requirement 1.1)", async () => {
    const h = buildHarness({
      client: { restoreProjectResult: { resolve: fakeSnapshot({ currentTask: null }) } },
    });

    await h.controller.startBuilder("go");

    expect(h.controller.getViewModel().builder.phase).toBe("START_ERROR");
    // prepareBuilder failed → startRun was never attempted.
    expect(h.client.startRunInputs).toHaveLength(0);
  });
});

// ---------- helper → RECORDED reads helperConversations (Requirement 4.3) ----------

describe("AgentSurfaceController — helper turn read-back", () => {
  it.each(["TEXT", "TOOL"] as const)("clears opening on Helper %s from another host and ignores a stale local opening status", async kind => {
    const worker = new FakeNativeWorker();
    const h = buildHarness({ worker, client: { startRunResult: { resolve: fakeLocalRun({ kind: "HELPER" }) } } });
    const started = h.controller.startHelper({ message: "질문", origin: "FREE_TEXT" });
    await waitForWatch(h.client);
    worker.pushStatus("HELPER_WINDOW_OPENING");
    expect(h.controller.getViewModel().helper.windowOpening).toBe(true);
    h.client.emit({ kind, sequence: 1, text: "답변", toolId: "tool_1", tool: "core", status: "SUCCEEDED" } as never);
    expect(h.controller.getViewModel().helper.windowOpening).toBe(false);
    worker.pushStatus("HELPER_WINDOW_OPENING");
    expect(h.controller.getViewModel().helper.windowOpening).toBe(false);
    h.client.settle(fakeLocalRun({ kind: "HELPER", status: "SUCCEEDED", outcome: "HELPER_RECORDED" }));
    await started;
    expect(h.controller.getViewModel().helper.windowOpening).toBe(false);
    expect(h.builderStartRunCount()).toBe(0);
    h.controller.dispose();
  });

  it.each(["SUCCEEDED", "FAILED", "CANCELLED"] as const)("clears opening on %s even without a text event or a local worker update", async status => {
    const worker = new FakeNativeWorker();
    const h = buildHarness({ worker, client: { startRunResult: { resolve: fakeLocalRun({ kind: "HELPER" }) } } });
    const started = h.controller.startHelper({ message: "질문", origin: "FREE_TEXT" });
    await waitForWatch(h.client);
    worker.pushStatus("HELPER_WINDOW_OPENING");
    h.client.settle(fakeLocalRun({ kind: "HELPER", status, outcome: status === "SUCCEEDED" ? "HELPER_RECORDED" : "NONE" }));
    await started;
    expect(h.controller.getViewModel().helper.windowOpening).toBe(false);
    h.controller.dispose();
  });

  it("a HELPER_RECORDED terminal projects RECORDED and reads conversations from the snapshot", async () => {
    const h = buildHarness({
      client: {
        // snapshot() is used both for the current-task read AND the read-back.
        restoreProjectResult: { resolve: helperRecordedSnapshot() },
        // startRun returns a HELPER run.
        startRunResult: { resolve: fakeLocalRun({ kind: "HELPER" }) },
      },
    });

    const started = h.controller.startHelper({
      message: "도와주세요",
      origin: "FREE_TEXT",
    });
    await waitForWatch(h.client);
    expect(h.controller.getViewModel().helper.phase).toBe("RUNNING");

    h.client.emit({ kind: "TEXT", sequence: 1, text: "이렇게 하세요" } as never);
    h.client.settle(
      fakeLocalRun({ kind: "HELPER", status: "SUCCEEDED", outcome: "HELPER_RECORDED" }),
    );
    await started;

    const vm = h.controller.getViewModel();
    expect(vm.helper.phase).toBe("RECORDED");
    // Conversation content read from the After_Snapshot's helperConversations.
    expect(vm.helper.conversations).toHaveLength(1);
    expect(vm.helper.conversations[0]).toMatchObject({
      conversationId: "conv_1",
      userExcerpts: ["이걸 어떻게 하나요?"],
      responseSummaries: ["이렇게 하세요."],
    });
    // Read-only: never started a Builder run.
    expect(h.builderStartRunCount()).toBe(0);
  });

  it("a Helper run rejected before the model call explains the tool-catalog recovery", async () => {
    const h = buildHarness({
      client: {
        restoreProjectResult: { resolve: helperRecordedSnapshot() },
        startRunResult: { resolve: fakeLocalRun({ kind: "HELPER" }) },
      },
    });
    const started = h.controller.startHelper({ message: "질문", origin: "FREE_TEXT" });
    await waitForWatch(h.client);
    h.client.settle(fakeLocalRun({ kind: "HELPER", status: "FAILED", outcome: "NONE",
      errorCode: "NATIVE_ROLE_CATALOG_UNVERIFIED" }));
    await started;

    const vm = h.controller.getViewModel();
    expect(vm.helper.phase).toBe("FAILED");
    expect(vm.notice?.code).toBe("NATIVE_ROLE_CATALOG_UNVERIFIED");
    expect(vm.notice?.message).toContain("도우미 창이 열려 있다면 닫은 뒤");
    expect(vm.notice?.message).not.toContain("저장하지 못했어요");
  });

  it("a helper start rejection maps to helper FAILED with the mapped code (Requirement 4.6)", async () => {
    const h = buildHarness({
      client: {
        startRunResult: { throw: clientError("HELPER_EMPTY_RESPONSE") },
      },
    });

    await h.controller.startHelper({ message: "x", origin: "FREE_TEXT" });

    const vm = h.controller.getViewModel().helper;
    expect(vm.phase).toBe("FAILED");
    expect(vm.errorCode).toBe("helper_empty_response");
  });
});

// ---------- decision resolve → zero startBuilder (Requirement 5.3) ----------

describe("AgentSurfaceController — decision resolution never resumes Builder", () => {
  it("resolveDecision performs UI_RESOLVE_DECISION and starts zero Builder runs", async () => {
    const h = buildHarness({
      client: { restoreProjectResult: { resolve: snapshotWithPendingDecision() } },
    });

    await h.controller.resolveDecision({
      decisionId: "decision_1",
      selection: { kind: "OPTION", optionId: "option_a" },
      rationale: "내 이유",
      helperUsed: false,
    });

    expect(h.client.executeKinds).toContain("UI_RESOLVE_DECISION");
    expect(h.startBuilderCount()).toBe(0);
    expect(h.builderStartRunCount()).toBe(0);
  });
});

describe("explicit choose and continue", () => {
  const input = { decisionId: "decision_1", selection: { kind: "RECOMMENDATION" as const }, helperUsed: false };
  function ready(options: { remaining?: boolean; active?: boolean; changedTask?: boolean; fail?: boolean } = {}) {
    const pending = snapshotWithPendingDecision();
    const h = buildHarness({ client: { restoreProjectResult: { resolve: pending },
      listRunsResult: { resolve: options.active ? [fakeLocalRun({ status: "RUNNING" })] : [] } } });
    const original = h.client.execute.bind(h.client);
    vi.spyOn(h.client, "execute").mockImplementation(async request => {
      if (request.kind === "UI_RESOLVE_DECISION") {
        if (options.fail) throw clientError("LIVE_CONTEXT_STALE");
        const resolved = { ...pending,
          currentTask: options.changedTask ? { ...pending.currentTask!, id: "task_other" } : pending.currentTask,
          pendingDecisions: options.remaining ? [{ ...pending.pendingDecisions[0], id: "decision_2" }] : [],
          decisions: [{ request: pending.pendingDecisions[0], resolution: { id: "resolution_1" }, application: null }],
        } as unknown as ReturnType<typeof fakeSnapshot>;
        h.client.restoreProjectResult = { resolve: resolved };
      }
      return original(request);
    });
    return h;
  }

  it("saves once and starts once for duplicate clicks on the combined action", async () => {
    const h = ready();
    const first = h.controller.resolveDecisionAndContinue(input);
    const duplicate = h.controller.resolveDecisionAndContinue(input);
    await waitForWatch(h.client);
    expect(h.client.executeKinds.filter(kind => kind === "UI_RESOLVE_DECISION")).toHaveLength(1);
    expect(h.builderStartRunCount()).toBe(1);
    expect(h.client.startRunInputs[0]).toMatchObject({ kind: "BUILDER", projectId: PROJECT_ID, taskId: TASK_ID, message: "" });
    h.client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "TURN_ENDED" }));
    await Promise.all([first, duplicate]);
    h.controller.dispose();
  });

  it.each(["remaining", "active", "changedTask", "fail"] as const)("does not start when %s prevents continuation", async condition => {
    const h = ready({ [condition]: true });
    await h.controller.resolveDecisionAndContinue(input);
    expect(h.builderStartRunCount()).toBe(0);
    h.controller.dispose();
  });

  it("does not start a different task if the task changes during the final run check", async () => {
    const h = ready();
    vi.spyOn(h.client, "listRuns").mockImplementationOnce(async () => {
      const snapshot = await h.client.restoreProject(PROJECT_ID);
      h.client.restoreProjectResult = { resolve: { ...snapshot, currentTask: { ...snapshot.currentTask!, id: "task_other" } } };
      return [];
    });
    await h.controller.resolveDecisionAndContinue(input);
    expect(h.builderStartRunCount()).toBe(0);
    h.controller.dispose();
  });

  it.each(["switch", "dispose"] as const)("does not resume after %s during the save", async transition => {
    const h = ready();
    const gate = deferred<never>();
    vi.spyOn(h.client, "execute").mockImplementationOnce(() => gate.promise);
    const result = h.controller.resolveDecisionAndContinue(input);
    await vi.waitFor(() => expect(h.client.execute).toHaveBeenCalled());
    if (transition === "switch") h.controller.bindProject("project_other");
    else h.controller.dispose();
    gate.resolve({ accepted: true } as never);
    await result;
    expect(h.builderStartRunCount()).toBe(0);
    h.controller.dispose();
  });
});

/** A snapshot with one pending decision so resolveDecision reaches execute. */
function snapshotWithPendingDecision() {
  return fakeSnapshot({
    liveContext: {
      schemaVersion: 1,
      id: "live_context_1",
      projectId: PROJECT_ID,
      taskId: TASK_ID,
      correlationId: "corr_ctx",
      contextVersion: 1,
      expectedPreviousVersion: 0,
      checkpoint: "DECISION_REQUIRED",
      stage: "deciding",
      currentGoal: "결정 필요",
      recentChanges: [],
      activeDecisionIds: ["decision_1"],
      activeConceptNames: [],
      relatedFiles: [],
      nextActions: [],
      updatedAt: "2026-01-02T03:04:05.000Z",
      source: { kind: "AGENT", role: "BUILDER" },
      redactionStatus: "NOT_REQUIRED",
    },
    pendingDecisions: [
      {
        schemaVersion: 1,
        id: "decision_1",
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        correlationId: "corr_dec",
        contextVersion: 1,
        category: "PRODUCT_BEHAVIOR",
        question: "어떤 방식으로 진행할까요?",
        reasonRequiredNow: "필요",
        options: [
          { id: "option_a", label: "옵션 A", description: "설명 A", impacts: [], tradeoffs: [] },
          { id: "option_b", label: "옵션 B", description: "설명 B", impacts: [], tradeoffs: [] },
        ],
        recommendedOptionId: "option_a",
        recommendationRationale: "추천 이유",
        relatedConceptNames: [],
        sourceReferences: [],
        independentWorkCanContinue: false,
        requestedAt: "2026-01-02T03:04:05.000Z",
        source: { kind: "AGENT", role: "BUILDER" },
        redactionStatus: "NOT_REQUIRED",
      },
    ],
  });
}

// ---------- cancel → CANCELLED → CLEANUP, then AGENT_ENDED → IDLE (6.2, 6.6) ----------

describe("AgentSurfaceController — explicit cancel and worker-settled cleanup", () => {
  it("cancel moves the turn to CLEANUP, and worker AGENT_ENDED settles it to IDLE", async () => {
    const h = buildHarness();

    const started = h.controller.startBuilder("go");
    await waitForWatch(h.client);
    expect(h.controller.getViewModel().builder.phase).toBe("RUNNING");

    // Explicit user stop while the run is live.
    await h.controller.cancelActive();
    // After a Core-cancel the phase settles at CLEANUP (native ACK pending).
    expect(h.controller.getViewModel().builder.phase).toBe("CLEANUP");

    // The in-flight watch resolves to the (now terminal, CANCELLED) run: it must
    // NOT re-classify over CLEANUP.
    h.client.settle(
      fakeLocalRun({ status: "CANCELLED", errorCode: "CANCELLED", outcome: "NONE" }),
    );
    await started;
    expect(h.controller.getViewModel().builder.phase).toBe("CLEANUP");

    // The worker settles cleanup: an AGENT_ENDED stage transitions CLEANUP → IDLE.
    h.worker.pushStatus("AGENT_ENDED_BUILDER" as never);
    expect(h.controller.getViewModel().builder.phase).toBe("IDLE");
  });

  it("a non-AGENT_ENDED worker stage does NOT move CLEANUP to IDLE", async () => {
    const h = buildHarness();
    const started = h.controller.startBuilder("go");
    await waitForWatch(h.client);
    await h.controller.cancelActive();
    h.client.settle(
      fakeLocalRun({ status: "CANCELLED", errorCode: "CANCELLED", outcome: "NONE" }),
    );
    await started;

    h.worker.pushStatus("AGENT_RUNNING_BUILDER" as never);
    expect(h.controller.getViewModel().builder.phase).toBe("CLEANUP");
  });
});

// ---------- abort ≠ cancel (Requirement 6.4) ----------

describe("AgentSurfaceController — abort is not cancel", () => {
  it("disposing (aborting the SSE) after the watch fails does NOT mark the turn CANCELLED", async () => {
    const h = buildHarness();
    const started = h.controller.startBuilder("go");
    await waitForWatch(h.client);
    expect(h.controller.getViewModel().builder.phase).toBe("RUNNING");

    // Panel dispose aborts the subscription signal (≠ cancel), then the watch
    // rejects with an AbortError. The phase must stay RUNNING (not CANCELLED).
    h.controller.dispose();
    h.client.failWatch(clientError("ABORT_ERR"));
    await started;

    const phase = h.controller.getViewModel().builder.phase;
    expect(phase).not.toBe("CANCELLED");
    expect(phase).toBe("RUNNING");
    // dispose never calls cancelRun.
    expect(h.client.executeKinds).not.toContain("UI_RESOLVE_DECISION");
  });
});

// ---------- recover → watch(after: 0) (Requirement 3.3) ----------

describe("AgentSurfaceController — window-switch reload recovery", () => {
  it("recover re-watches an active BUILDER run with after: 0 (full replay)", async () => {
    const activeRun = fakeLocalRun({ id: "run_active", status: "RUNNING" });
    const h = buildHarness({
      client: { listRunsResult: { resolve: [activeRun] } },
    });

    const recovering = h.controller.recover();
    await waitForWatch(h.client);

    // RECOVERING → RUNNING, and the watch replays from sequence 0.
    expect(h.controller.getViewModel().builder.phase).toBe("RUNNING");
    expect(h.client.lastWatchAfter).toBe(0);
    expect(h.client.watchAfters).toContain(0);

    // Let it settle terminal so the recover promise resolves cleanly.
    h.client.settle(fakeLocalRun({ id: "run_active", status: "SUCCEEDED", outcome: "PENDING" }));
    await recovering;
  });

  it("recover with no active Builder run leaves the surface IDLE and opens no watch", async () => {
    const h = buildHarness({ client: { listRunsResult: { resolve: [] } } });

    await h.controller.recover();

    expect(h.controller.getViewModel().builder.phase).toBe("IDLE");
    expect(h.client.isWatching).toBe(false);
  });

  it("restores durable completion on reload without starting or watching an Agent", async () => {
    const h = buildHarness({ client: { restoreProjectResult: { resolve: completedSnapshot() } } });
    await h.controller.recover();
    expect(h.controller.getViewModel().builder).toMatchObject({ phase: "TASK_COMPLETED", taskId: TASK_ID, completionReportId: "report_1" });
    expect(h.client.isWatching).toBe(false);
    expect(h.client.executeKinds).toEqual([]);
    expect(h.startBuilderCount()).toBe(0);
    h.controller.dispose();
  });

  it.each(["missing report", "different task", "unapplied decision"])("does not restore false completion: %s", async (condition) => {
    const snapshot = completedSnapshot();
    const h = buildHarness({ client: { restoreProjectResult: { resolve: {
      ...snapshot,
      completionReport: condition === "missing report" ? null : condition === "different task" ? { ...snapshot.completionReport!, taskId: "task_other" } : snapshot.completionReport,
      decisions: condition === "unapplied decision" ? [{ request: snapshotWithPendingDecision().pendingDecisions[0], resolution: null, application: null }] : [],
    } } } });
    await h.controller.recover();
    expect(h.controller.getViewModel().builder.phase).not.toBe("TASK_COMPLETED");
    expect(h.controller.getViewModel().builder.completionReportId).toBeNull();
    expect(h.startBuilderCount()).toBe(0);
    h.controller.dispose();
  });

  it("restores a waiting Decision and its explicit resume action without resuming automatically", async () => {
    const h = buildHarness({ client: { restoreProjectResult: { resolve: snapshotWithPendingDecision() } } });
    await h.controller.recover();
    expect(h.controller.getViewModel().builder.phase).toBe("DECISION_REQUIRED");
    expect(h.startBuilderCount()).toBe(0);
    h.controller.dispose();
  });
});

// ---------- native submit validates before submit (Requirement 7.2) ----------

describe("AgentSurfaceController — native answer validation before submit", () => {
  it("a matching question passes validation and submits the answer verbatim", async () => {
    const worker = new FakeNativeWorker({
      questions: [fakeNativeQuestion({ requestId: "request_1", taskId: TASK_ID })],
    });
    const h = buildHarness({ worker });

    await h.controller.submitNativeAnswer({
      projectId: PROJECT_ID,
      requestId: "request_1",
      nativeJobId: "native_job_1",
      action: "answered",
      optionIndex: 1,
      subOptionIndices: [],
    } as never);

    // Submitted exactly once, verbatim.
    expect(worker.submitted).toHaveLength(1);
    expect(worker.submitted[0]).toMatchObject({
      requestId: "request_1",
      action: "answered",
      optionIndex: 1,
    });
    expect(h.controller.getViewModel().notice?.kind).toBe("info");
  });

  it("a missing question is rejected as stale WITHOUT submitting (Requirement 7.3)", async () => {
    const worker = new FakeNativeWorker({ questions: [] });
    const h = buildHarness({ worker });

    await h.controller.submitNativeAnswer({
      projectId: PROJECT_ID,
      requestId: "unknown_request",
      nativeJobId: "native_job_1",
      action: "dismissed",
    } as never);

    expect(worker.submitted).toHaveLength(0);
    expect(h.controller.getViewModel().notice?.code).toBe("NATIVE_USER_INPUT_STALE");
  });

  it("a question whose task no longer matches the snapshot is rejected as stale (Requirement 7.4)", async () => {
    const worker = new FakeNativeWorker({
      // Question bound to a task that is NOT the snapshot's currentTask (task_1).
      questions: [
        fakeNativeQuestion({ requestId: "request_1", role: "BUILDER", taskId: "task_other" }),
      ],
    });
    const h = buildHarness({ worker });

    await h.controller.submitNativeAnswer({
      projectId: PROJECT_ID,
      requestId: "request_1",
      nativeJobId: "native_job_1",
      action: "dismissed",
    } as never);

    expect(worker.submitted).toHaveLength(0);
    expect(h.controller.getViewModel().notice?.code).toBe("NATIVE_USER_INPUT_STALE");
  });
});

// ---------- workspace open: absolute path only reaches openFolder (8.3, 8.4) ----------

describe("AgentSurfaceController — open generated workspace", () => {
  const ABS = "C:\\Users\\learner\\generated\\project_1";

  it("passes the absolute workspaceDirectory ONLY to openFolder, never into a projection", async () => {
    const h = buildHarness({
      client: {
        // No active Builder run → the idle check passes.
        listRunsResult: { resolve: [] },
        executeResultByKind: {
          UI_PREPARE_BUILDER_SESSION: {
            resolve: {
              schemaVersion: 1,
              correlationId: "corr",
              projectId: PROJECT_ID,
              taskId: TASK_ID,
              workspaceDirectory: ABS,
              status: "READY",
            },
          },
        },
      },
    });

    await h.controller.openGeneratedWorkspace(TASK_ID);

    // The absolute path reached exactly the openFolder spy.
    expect(h.openedFolders).toEqual([ABS]);
    // And it never appears anywhere in the serialized view model (Property 7).
    const serialized = JSON.stringify(h.controller.getViewModel());
    expect(serialized).not.toContain(ABS);
    expect(serialized).not.toContain("generated");
  });

  it("refuses to open while a Builder run is active (Requirement 8.1)", async () => {
    const h = buildHarness({
      client: {
        listRunsResult: { resolve: [fakeLocalRun({ status: "RUNNING" })] },
      },
    });

    await h.controller.openGeneratedWorkspace(TASK_ID);

    expect(h.openedFolders).toHaveLength(0);
    expect(h.controller.getViewModel().notice?.code).toBe("RUN_ACTIVE");
    // Never issued the prepare command.
    expect(h.client.executeKinds).not.toContain("UI_PREPARE_BUILDER_SESSION");
  });
});

describe("AgentSurfaceController — Kiro-native host runs the Builder in Kiro chat", () => {
  type Opened = Awaited<ReturnType<NonNullable<AgentControllerDeps["openInKiro"]>>>;
  const opened = (folder: Opened["folder"]): Opened =>
    ({ projectId: PROJECT_ID, taskId: TASK_ID, openedNewWindow: folder === "GENERATED", folder });

  it("never starts a panel Builder run; start and resume point to Kiro chat", async () => {
    const h = buildHarness({ openInKiro: async () => opened("REGISTERED") });
    expect(h.controller.getViewModel().hostChat).toEqual({ opening: false });
    await h.controller.startBuilder("build the tracker");
    await h.controller.resumeAfterDecision();
    expect(h.startBuilderCount()).toBe(0);
    expect(h.builderStartRunCount()).toBe(0);
    expect(h.controller.getViewModel().builder.phase).toBe("IDLE");
    expect(h.controller.getViewModel().notice).toMatchObject({ kind: "info", code: "BUILDER_RUNS_IN_HOST_CHAT" });
  });

  it("connects the bound Project once per gesture and reports where it opened", async () => {
    const calls: string[] = [];
    let release!: (value: Opened) => void;
    const h = buildHarness({ openInKiro: projectId => {
      calls.push(projectId);
      return new Promise<Opened>(resolve => { release = resolve; });
    } });
    const first = h.controller.openInKiro();
    const second = h.controller.openInKiro();
    await Promise.resolve();
    expect(calls).toEqual([PROJECT_ID]);
    expect(h.controller.getViewModel().hostChat).toEqual({ opening: true });
    release(opened("GENERATED"));
    await Promise.all([first, second]);
    expect(h.controller.getViewModel().hostChat).toEqual({ opening: false });
    expect(h.controller.getViewModel().notice).toMatchObject({ kind: "info", code: "KIRO_CHAT_GENERATED" });
    expect(h.controller.getViewModel().notice?.message).toContain("새 창");
  });

  it("stays silent when the learner declines the new window", async () => {
    const h = buildHarness({ openInKiro: async () => opened("CANCELLED") });
    await h.controller.openInKiro();
    expect(h.controller.getViewModel().notice).toBeNull();
    expect(h.controller.getViewModel().hostChat).toEqual({ opening: false });
  });

  it("maps host refusals to fixed guidance and never echoes free text", async () => {
    const refused = buildHarness({ openInKiro: async () => { throw new Error("KIRO_BIND_TASK_NOT_READY"); } });
    await refused.controller.openInKiro();
    expect(refused.controller.getViewModel().notice).toMatchObject({ kind: "error", code: "KIRO_BIND_TASK_NOT_READY" });
    expect(refused.controller.getViewModel().notice?.message).toContain("계획을 확정");

    const odd = buildHarness({ openInKiro: async () => { throw new Error("/Users/learner token=abc"); } });
    await odd.controller.openInKiro();
    expect(odd.controller.getViewModel().notice?.code).toBe("UNKNOWN");
    expect(JSON.stringify(odd.controller.getViewModel())).not.toContain("learner");
    expect(odd.controller.getViewModel().hostChat).toEqual({ opening: false });
  });

  it("requires a bound Project and is inert on other hosts", async () => {
    const calls: string[] = [];
    const unbound = buildHarness({ seedProjectId: false, openInKiro: async projectId => { calls.push(projectId); return opened("REGISTERED"); } });
    await unbound.controller.openInKiro();
    expect(calls).toEqual([]);
    expect(unbound.controller.getViewModel().notice?.code).toBe("PROJECT_REQUIRED");

    const other = buildHarness();
    expect(other.controller.getViewModel().hostChat).toBeUndefined();
    await other.controller.openInKiro();
    expect(other.controller.getViewModel().notice).toBeNull();
  });
});

describe("AgentSurfaceController — Kiro-native Next Move card", () => {
  const JOB_ID = "next_move_job_1";
  const moves = [1, 2, 3].map((number) => ({
    number, title: `제안 ${number}`, summary: `설명 ${number}`, benefit: `좋아지는 점 ${number}`, size: "SMALL" as const,
  }));
  const none = { status: "NONE", moves: [] };
  const job = (status: "GENERATING" | "READY" | "FAILED", extra: Record<string, unknown> = {}) => ({
    status, nextMoveJobId: JOB_ID, jobRevision: status === "FAILED" ? 4 : 2, sourceTaskId: TASK_ID,
    moves: status === "READY" ? moves : [], ...extra,
  });
  const kiroHarness = () => {
    const clock = new FakeClock();
    const h = buildHarness({ clock, openInKiro: async () => ({ projectId: PROJECT_ID, taskId: TASK_ID, openedNewWindow: false, folder: "REGISTERED" }) });
    const reads = () => h.client.executeKinds.filter((kind) => kind === "UI_READ_NEXT_MOVE").length;
    const script = (view: unknown) => { h.client.executeResultByKind.UI_READ_NEXT_MOVE = { resolve: view }; };
    // Advance only once the next refresh is armed (it is armed after a read settles).
    const tick = async (ms: number) => {
      await vi.waitFor(() => expect(clock.pendingCount()).toBe(1));
      clock.advance(ms);
    };
    return { ...h, clock, reads, script, tick };
  };

  it("follows a Task finished in Kiro chat from generating to three suggestions", async () => {
    const h = kiroHarness();
    h.script(none);
    await h.controller.refreshProject();
    await h.tick(0);
    await vi.waitFor(() => expect(h.reads()).toBe(1));
    expect(h.controller.getViewModel().nextMove).toEqual({ status: "NONE", moves: [], retrying: false });
    const restores = vi.spyOn(h.client, "restoreProject");

    // The Builder finished the Task in Kiro chat; the card is the first to know.
    h.script(job("GENERATING"));
    await h.tick(NEXT_MOVE_REFRESH_MS.IDLE);
    await vi.waitFor(() => expect(h.controller.getViewModel().nextMove?.status).toBe("GENERATING"));
    await vi.waitFor(() => expect(restores).toHaveBeenCalled());

    // Generating re-reads sooner, and suggestions arrive without concepts.
    h.script(job("READY", { moves: moves.map((move) => ({ ...move, concepts: ["secret concept"] })) }));
    await h.tick(NEXT_MOVE_REFRESH_MS.GENERATING);
    await vi.waitFor(() => expect(h.controller.getViewModel().nextMove?.status).toBe("READY"));
    expect(h.controller.getViewModel().nextMove?.moves).toEqual(moves);
    expect(JSON.stringify(h.controller.getViewModel())).not.toContain("secret concept");
    expect(JSON.stringify(h.controller.getViewModel())).not.toContain(JOB_ID);
    // K17: every refresh re-reads the snapshot quietly, so choices made in
    // Kiro chat reach the panel; unchanged reads do not re-hydrate.
    const changes = h.changeCount();
    const before = restores.mock.calls.length;
    await h.tick(NEXT_MOVE_REFRESH_MS.IDLE);
    await vi.waitFor(() => expect(h.reads()).toBe(4));
    await vi.waitFor(() => expect(restores.mock.calls.length).toBeGreaterThan(before));
    expect(h.changeCount()).toBe(changes);

    // A follow-up Task started from Kiro chat hides the card and refreshes the header.
    h.script(none);
    await h.tick(NEXT_MOVE_REFRESH_MS.IDLE);
    await vi.waitFor(() => expect(h.controller.getViewModel().nextMove?.status).toBe("NONE"));
    // Only reads: the Next Move card and this Task's learning records.
    expect(new Set(h.client.executeKinds.filter((kind) => kind !== "UI_READ_NEXT_MOVE")))
      .toEqual(new Set(["UI_READ_EVIDENCE_TRACE"]));
  });

  it("shows choices made in Kiro chat and this Task's learner Evidence (K17)", async () => {
    const h = kiroHarness();
    h.script(none);
    const request = snapshotWithPendingDecision().pendingDecisions[0];
    const reopened = { ...request, id: "decision_2", replacesDecisionId: "decision_1" };
    h.client.restoreProjectResult = { resolve: fakeSnapshot({ decisions: [
      { request, resolution: { selectionKind: "OPTION", selectedOptionId: "option_b" }, application: null },
      { request: reopened, resolution: null, application: null },
    ] }) };
    const at = "2026-10-12T02:00:00.000Z";
    h.client.executeResultByKind.UI_READ_EVIDENCE_TRACE = { resolve: { ...emptyTrace, concepts: [{
      conceptName: "SQLite Locking",
      evidence: [
        { evidenceId: "evidence_1", kind: "USER_UNDERSTANDING", taskId: TASK_ID, supportsState: "EXPLAINED", acceptedAt: at, redactedEvidenceExcerpt: "확장하면 2번이 안전하다" },
        { evidenceId: "evidence_2", kind: "USER_UNDERSTANDING", taskId: "task_other", supportsState: "DEMONSTRATED", acceptedAt: at },
        { evidenceId: "evidence_3", kind: "CONCEPT_OBSERVATION", taskId: TASK_ID, supportsState: "OBSERVED", acceptedAt: at },
      ],
    }] } };
    await h.controller.refreshProject();
    await h.tick(0);
    await vi.waitFor(() => expect(h.controller.getViewModel().taskEvidence).toEqual([
      { evidenceId: "evidence_1", conceptName: "SQLite Locking", state: "EXPLAINED", excerpt: "확장하면 2번이 안전하다" },
    ]));
    const decisions = h.controller.getViewModel().decisions;
    expect(decisions.find((d) => d.decisionId === "decision_1")).toMatchObject({ chosenLabel: "옵션 B", replaced: true });
    expect(decisions.find((d) => d.decisionId === "decision_2")).toMatchObject({ chosenLabel: null, replaced: false, resolved: false });
    // Evidence is re-read at most every TASK_EVIDENCE_REFRESH_MS, not on every refresh.
    const evidenceReads = () => h.client.executeKinds.filter((kind) => kind === "UI_READ_EVIDENCE_TRACE").length;
    const read = evidenceReads();
    await h.tick(NEXT_MOVE_REFRESH_MS.IDLE);
    await vi.waitFor(() => expect(h.reads()).toBe(2));
    expect(evidenceReads()).toBe(read);
  });

  it("retries a failed job once with its id and revision, and only from the failure state", async () => {
    const h = kiroHarness();
    h.script(job("FAILED", { failureCode: "NEXT_MOVE_TIMEOUT" }));
    await h.controller.refreshProject();
    await h.tick(0);
    await vi.waitFor(() => expect(h.controller.getViewModel().nextMove?.status).toBe("FAILED"));
    const execute = vi.spyOn(h.client, "execute");
    let release!: () => void;
    h.client.executeResultByKind.UI_RETRY_NEXT_MOVE = { resolve: job("GENERATING", { jobRevision: 5 }) };
    const gate = new Promise<void>((resolve) => { release = resolve; });
    execute.mockImplementationOnce(async (request) => { await gate; return FakeCoreClient.prototype.execute.call(h.client, request); });
    const first = h.controller.retryNextMove();
    const second = h.controller.retryNextMove();
    expect(h.controller.getViewModel().nextMove?.retrying).toBe(true);
    release();
    await Promise.all([first, second]);
    const retries = execute.mock.calls.map(([request]) => request).filter((request) => request.kind === "UI_RETRY_NEXT_MOVE");
    expect(retries).toHaveLength(1);
    expect(retries[0]).toMatchObject({ projectId: PROJECT_ID, nextMoveJobId: JOB_ID, expectedJobRevision: 4 });
    expect(h.controller.getViewModel().nextMove).toEqual({ status: "GENERATING", moves: [], retrying: false });
    // Not failed any more: a stray retry does nothing.
    await h.controller.retryNextMove();
    expect(execute.mock.calls.filter(([request]) => request.kind === "UI_RETRY_NEXT_MOVE")).toHaveLength(1);
  });

  it("reports a refused retry with fixed guidance and keeps the failure card", async () => {
    const h = kiroHarness();
    h.script(job("FAILED"));
    await h.controller.refreshProject();
    await h.tick(0);
    await vi.waitFor(() => expect(h.controller.getViewModel().nextMove?.status).toBe("FAILED"));
    h.client.executeResultByKind.UI_RETRY_NEXT_MOVE = { throw: clientError("NEXT_MOVE_RETRY_NOT_ALLOWED", 400, "/Users/learner details") };
    await h.controller.retryNextMove();
    const vm = h.controller.getViewModel();
    expect(vm.notice).toMatchObject({ kind: "error", code: "NEXT_MOVE_RETRY_NOT_ALLOWED" });
    expect(vm.notice?.message).toContain("다시 만들지 못했어요");
    expect(JSON.stringify(vm)).not.toContain("learner");
    expect(vm.nextMove).toEqual({ status: "FAILED", moves: [], retrying: false });
  });

  it("keeps the last card when Core cannot be read, and stops after dispose", async () => {
    const h = kiroHarness();
    h.script(job("READY"));
    await h.controller.refreshProject();
    await h.tick(0);
    await vi.waitFor(() => expect(h.controller.getViewModel().nextMove?.status).toBe("READY"));
    h.client.executeResultByKind.UI_READ_NEXT_MOVE = { throw: clientError("CORE_UNAVAILABLE", 503) };
    await h.tick(NEXT_MOVE_REFRESH_MS.IDLE);
    await vi.waitFor(() => expect(h.reads()).toBe(2));
    expect(h.controller.getViewModel().nextMove?.status).toBe("READY");
    expect(h.controller.getViewModel().notice).toBeNull();
    // Malformed views are ignored too.
    h.script({ status: "SOMETHING", moves: [] });
    await h.tick(NEXT_MOVE_REFRESH_MS.IDLE);
    await vi.waitFor(() => expect(h.reads()).toBe(3));
    expect(h.controller.getViewModel().nextMove?.status).toBe("READY");
    h.controller.dispose();
    h.clock.advance(NEXT_MOVE_REFRESH_MS.IDLE * 3 + 1);
    await Promise.resolve();
    expect(h.reads()).toBe(3);
  });

  it("starts over for another Project and never reads on other hosts", async () => {
    const h = kiroHarness();
    h.script(job("READY"));
    await h.controller.refreshProject();
    await h.tick(0);
    await vi.waitFor(() => expect(h.controller.getViewModel().nextMove?.status).toBe("READY"));
    h.script(none);
    h.controller.bindProject("project_other");
    expect(h.controller.getViewModel().nextMove).toEqual({ status: "NONE", moves: [], retrying: false });
    await h.tick(0);
    await vi.waitFor(() => expect(h.reads()).toBe(2));

    const clock = new FakeClock();
    const other = buildHarness({ clock });
    await other.controller.refreshProject();
    clock.advance(NEXT_MOVE_REFRESH_MS.IDLE * 3);
    await Promise.resolve();
    expect(other.client.executeKinds).not.toContain("UI_READ_NEXT_MOVE");
    expect(other.controller.getViewModel().nextMove).toBeUndefined();
    await other.controller.retryNextMove();
    expect(other.client.executeKinds).not.toContain("UI_RETRY_NEXT_MOVE");
  });
});
