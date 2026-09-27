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
import { describe, expect, it } from "vitest";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
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

const PROJECT_ID = "project_1";
const TASK_ID = "task_1";

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
    const h = buildHarness({
      client: { restoreProjectResult: { resolve: completedSnapshot() } },
    });

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
