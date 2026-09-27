import { describe, it, expect } from "vitest";

import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { WatchHandlers } from "../src/adapter/agent/agent-run-port";
import type { RunEventView } from "../vendor/frontend-client";
import type {
  LocalRun,
  LocalRunEvent,
  UiRequest,
} from "../vendor/frontend-client";
import type { NativeAnswer } from "../vendor/frontend-host";
import {
  FakeCoreClient,
  clientError,
  fakeLocalRun,
  fakeSnapshot,
} from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";

/**
 * Unit tests for the live {@link ManagedAgentPort} (task 3.2).
 *
 * The port wraps the managed host's `CoreClient` / `NativeWorker`. It is driven
 * here against the hand-written {@link FakeCoreClient} / {@link FakeNativeWorker}
 * fakes with the REAL SDK helpers (`projectRunEvent`, `entityId`, `isRunActive`)
 * — no live backend, process, or network.
 *
 * We assert (design §B.2; Requirements 1.11, 11.2):
 *   - each method maps success -> `ok(value)`,
 *   - each mapped Core / worker code -> the right `AgentErrorCode`,
 *   - the port NEVER throws, including on a raw non-Error throw,
 *   - `prepareBuilder` with no `currentTask` -> `err('invalid')`,
 *   - `watch` forwards `projectRunEvent`-projected views, records `after`, and
 *     resolves with the settled terminal run.
 */

/** Build a port over fresh fakes; returns the port and the fakes for scripting. */
function makePort(
  clientOptions?: ConstructorParameters<typeof FakeCoreClient>[0],
  workerOptions?: ConstructorParameters<typeof FakeNativeWorker>[0],
) {
  const client = new FakeCoreClient(clientOptions);
  const worker = new FakeNativeWorker(workerOptions);
  const port = new ManagedAgentPort(client, worker);
  return { port, client, worker };
}

/** A no-op `WatchHandlers` with a live abort signal and a view recorder. */
function watchHandlers(overrides: Partial<WatchHandlers> = {}): {
  handlers: WatchHandlers;
  views: RunEventView[];
  runs: LocalRun[];
} {
  const views: RunEventView[] = [];
  const runs: LocalRun[] = [];
  const handlers: WatchHandlers = {
    onEvent: (view) => views.push(view),
    onRun: (run) => runs.push(run),
    signal: new AbortController().signal,
    ...overrides,
  };
  return { handlers, views, runs };
}

/** A shape-valid TEXT run event. */
function textEvent(sequence: number, text: string): LocalRunEvent {
  return {
    runId: "run_1",
    projectId: "project_1",
    sequence,
    kind: "TEXT",
    text,
    transient: true,
    redactionStatus: "VERIFIED_REDACTED",
  } as unknown as LocalRunEvent;
}

/** A shape-valid TOOL run event carrying an `update` record. */
function toolEvent(
  sequence: number,
  update: Record<string, unknown>,
): LocalRunEvent {
  return {
    runId: "run_1",
    projectId: "project_1",
    sequence,
    kind: "TOOL",
    update,
    transient: true,
    redactionStatus: "VERIFIED_REDACTED",
  } as unknown as LocalRunEvent;
}

describe("ManagedAgentPort — success maps to ok", () => {
  it("prepareBuilder returns the durable task binding from the snapshot", async () => {
    const { port } = makePort();
    const res = await port.prepareBuilder("project_1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.taskId).toBe("task_1");
      expect(res.value.expectedTaskRevision).toBe(1);
      expect(res.value.taskTitle).toBe("습관 트래커 만들기");
    }
  });

  it("startBuilder resolves ok and mints a fresh idempotency key", async () => {
    const { port, client } = makePort();
    const res = await port.startBuilder({
      projectId: "project_1",
      taskId: "task_1",
      expectedTaskRevision: 1,
      message: "start",
    });
    expect(res.ok).toBe(true);
    expect(client.startRunInputs).toHaveLength(1);
    const input = client.startRunInputs[0] as Record<string, unknown>;
    expect(input.kind).toBe("BUILDER");
    expect(input.taskId).toBe("task_1");
    expect(input.expectedTaskRevision).toBe(1);
    expect(typeof input.idempotencyKey).toBe("string");
    expect((input.idempotencyKey as string).startsWith("idem_")).toBe(true);
  });

  it("startHelper resolves ok with kind HELPER and forwards origin/decisionId", async () => {
    const { port, client } = makePort({
      startRunResult: { resolve: fakeLocalRun({ kind: "HELPER" }) },
    });
    const res = await port.startHelper({
      projectId: "project_1",
      taskId: "task_1",
      decisionId: "decision_9",
      message: "help me",
      origin: "QUICK_ACTION",
    });
    expect(res.ok).toBe(true);
    const input = client.startRunInputs[0] as Record<string, unknown>;
    expect(input.kind).toBe("HELPER");
    expect(input.decisionId).toBe("decision_9");
    expect(input.origin).toBe("QUICK_ACTION");
  });

  it("cancel resolves ok with the terminal CANCELLED run", async () => {
    const { port } = makePort();
    const res = await port.cancel("run_1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.status).toBe("CANCELLED");
      expect(res.value.errorCode).toBe("CANCELLED");
      expect(res.value.outcome).toBe("NONE");
    }
  });

  it("snapshot resolves ok with the durable snapshot", async () => {
    const { port } = makePort();
    const res = await port.snapshot("project_1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.project.id).toBe("project_1");
    }
  });

  it("execute resolves ok with the UI response", async () => {
    const { port, client } = makePort();
    const request = {
      schemaVersion: 1,
      correlationId: "corr_exec",
      actor: { kind: "UI" },
      kind: "UI_LAUNCH_RESULT",
      idempotencyKey: "idem_x",
      projectId: "project_1",
    } as unknown as Extract<UiRequest, { kind: "UI_LAUNCH_RESULT" }>;
    const res = await port.execute(request);
    expect(res.ok).toBe(true);
    expect(client.executeKinds).toEqual(["UI_LAUNCH_RESULT"]);
  });

  it("listActiveBuilderRun returns the active BUILDER run", async () => {
    const active = fakeLocalRun({ id: "run_active", status: "RUNNING" });
    const { port } = makePort({
      listRunsResult: {
        resolve: [
          fakeLocalRun({ id: "run_done", status: "SUCCEEDED" }),
          active,
        ],
      },
    });
    const res = await port.listActiveBuilderRun("project_1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value?.id).toBe("run_active");
    }
  });

  it("listActiveBuilderRun returns null when no active BUILDER run exists", async () => {
    const { port } = makePort({
      listRunsResult: {
        resolve: [
          fakeLocalRun({ id: "run_done", status: "SUCCEEDED" }),
          fakeLocalRun({ id: "helper", kind: "HELPER", status: "RUNNING" }),
        ],
      },
    });
    const res = await port.listActiveBuilderRun("project_1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBeNull();
    }
  });

  it("submit resolves ok with the worker's submit result", async () => {
    const { port } = makePort(undefined, { submit: { resolve: "ALREADY_SUBMITTED" } });
    const answer = {
      projectId: "project_1",
      requestId: "request_1",
      nativeJobId: "native_job_1",
      action: "dismissed",
    } as unknown as NativeAnswer;
    const res = await port.submit(answer);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe("ALREADY_SUBMITTED");
    }
  });

  it("getStatus / listUserInputs / subscribe* pass through to the worker", () => {
    const { port, worker } = makePort(undefined, { status: "AGENT_STARTED_OK" as never });
    expect(port.getStatus()).toBe("AGENT_STARTED_OK");
    worker.setQuestions([]);
    expect(port.listUserInputs("project_1")).toEqual([]);

    let statusFires = 0;
    let inputFires = 0;
    const unsubStatus = port.subscribeStatus(() => statusFires++);
    const unsubInputs = port.subscribeUserInputs(() => inputFires++);
    worker.pushStatus("AGENT_ENDED_OK" as never);
    worker.notifyInputs();
    expect(statusFires).toBe(1);
    expect(inputFires).toBe(1);
    unsubStatus();
    unsubInputs();
    worker.pushStatus("AGENT_ENDED_OK" as never);
    worker.notifyInputs();
    expect(statusFires).toBe(1);
    expect(inputFires).toBe(1);
  });
});

describe("ManagedAgentPort — error codes map correctly", () => {
  it("prepareBuilder with no currentTask maps to err('invalid')", async () => {
    const { port } = makePort({
      restoreProjectResult: { resolve: fakeSnapshot({ currentTask: null }) },
    });
    const res = await port.prepareBuilder("project_1");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("invalid");
      expect(res.error.raw).toBe("CURRENT_TASK_REQUIRED");
    }
  });

  const startBuilderCases: ReadonlyArray<[string, string]> = [
    ["RUN_BUSY", "run_busy"],
    ["STALE_TASK_REVISION", "stale_task_revision"],
    ["TASK_ALREADY_COMPLETED", "task_already_completed"],
    ["TASK_BINDING_MISMATCH", "task_binding_mismatch"],
    ["RUNTIME_CAPACITY", "runtime_capacity"],
    ["RUN_IDEMPOTENCY_CONFLICT", "idempotency_conflict"],
  ];
  for (const [raw, mapped] of startBuilderCases) {
    it(`startBuilder rejection ${raw} maps to '${mapped}'`, async () => {
      const { port } = makePort({ startRunResult: { throw: clientError(raw) } });
      const res = await port.startBuilder({
        projectId: "project_1",
        taskId: "task_1",
        expectedTaskRevision: 1,
        message: "start",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe(mapped);
        expect(res.error.raw).toBe(raw);
      }
    });
  }

  const helperCases: ReadonlyArray<[string, string]> = [
    ["DECISION_BINDING_MISMATCH", "decision_binding_mismatch"],
    ["HELPER_EMPTY_RESPONSE", "helper_empty_response"],
    ["NATIVE_ROLE_CATALOG_UNVERIFIED", "native_role_catalog_unverified"],
  ];
  for (const [raw, mapped] of helperCases) {
    it(`startHelper rejection ${raw} maps to '${mapped}'`, async () => {
      const { port } = makePort({ startRunResult: { throw: clientError(raw) } });
      const res = await port.startHelper({
        projectId: "project_1",
        taskId: "task_1",
        message: "help",
        origin: "FREE_TEXT",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe(mapped);
      }
    });
  }

  it("execute rejection RESULT_NOT_RUNNING maps to 'result_unavailable'", async () => {
    const { port } = makePort({
      executeResult: { throw: clientError("RESULT_NOT_RUNNING") },
    });
    const request = {
      schemaVersion: 1,
      correlationId: "corr",
      actor: { kind: "UI" },
      kind: "UI_LAUNCH_RESULT",
      idempotencyKey: "idem_x",
      projectId: "project_1",
    } as unknown as Extract<UiRequest, { kind: "UI_LAUNCH_RESULT" }>;
    const res = await port.execute(request);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("result_unavailable");
    }
  });

  const submitCases: ReadonlyArray<[string, string]> = [
    ["NATIVE_USER_INPUT_STALE", "native_user_input_stale"],
    ["NATIVE_USER_INPUT_RESPONSE_INVALID", "native_response_invalid"],
    ["NATIVE_NOT_READY", "native_not_ready"],
  ];
  for (const [raw, mapped] of submitCases) {
    it(`submit rejection ${raw} maps to '${mapped}'`, async () => {
      const { port } = makePort(undefined, { submit: { throw: { code: raw } } });
      const answer = {
        projectId: "project_1",
        requestId: "request_1",
        nativeJobId: "native_job_1",
        action: "dismissed",
      } as unknown as NativeAnswer;
      const res = await port.submit(answer);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe(mapped);
      }
    });
  }

  it("cancel / snapshot / listActiveBuilderRun map rejections to errors", async () => {
    const cancel = await makePort({
      cancelRunResult: { throw: clientError("CONNECTION_LOST") },
    }).port.cancel("run_1");
    expect(cancel.ok).toBe(false);
    if (!cancel.ok) expect(cancel.error.code).toBe("unavailable");

    const snap = await makePort({
      restoreProjectResult: { throw: clientError("REQUEST_TIMEOUT") },
    }).port.snapshot("project_1");
    expect(snap.ok).toBe(false);
    if (!snap.ok) expect(snap.error.code).toBe("timeout");

    const list = await makePort({
      listRunsResult: { throw: clientError("BOOM_UNKNOWN") },
    }).port.listActiveBuilderRun("project_1");
    expect(list.ok).toBe(false);
    if (!list.ok) expect(list.error.code).toBe("unknown");
  });
});

describe("ManagedAgentPort — never throws even on a raw non-Error throw", () => {
  it("startBuilder returns err (never throws) when the client throws a bare string", async () => {
    const { port } = makePort({
      // A bare, unrecognized string code: not client-error-like, but the string
      // branch still normalizes it — the point is that no throw escapes.
      startRunResult: { throw: "BOOM_UNMAPPED" as unknown as { code: string } },
    });
    const res = await port.startBuilder({
      projectId: "project_1",
      taskId: "task_1",
      expectedTaskRevision: 1,
      message: "start",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("unknown");
    }
  });

  it("watch returns err (never throws) when watchRun rejects with a raw number", async () => {
    const { port, client } = makePort();
    const { handlers } = watchHandlers();
    const promise = port.watch("run_1", handlers);
    client.failWatch(42 as unknown);
    const res = await promise;
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("unknown");
    }
  });

  it("snapshot returns err (never throws) when restoreProject rejects with null", async () => {
    const { port } = makePort({
      restoreProjectResult: { throw: null as unknown as { code: string } },
    });
    const res = await port.snapshot("project_1");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("unknown");
    }
  });
});

describe("ManagedAgentPort — watch forwards projected views and terminal run", () => {
  it("forwards projectRunEvent-projected TEXT/TOOL views and records `after`", async () => {
    const { port, client } = makePort();
    const { handlers, views, runs } = watchHandlers({ after: 7 });
    const promise = port.watch("run_1", handlers);

    // TEXT event -> TEXT view.
    client.emit(textEvent(1, "hello"));
    // TOOL event with a stable toolId -> TOOL view, projected fields only.
    client.emit(
      toolEvent(2, {
        toolId: "tool_abc",
        toolName: "write",
        status: "completed",
        relativePath: "src/app.ts",
        output: "done",
      }),
    );
    // STATE event -> STATE view + onRun forward.
    const stateRun = fakeLocalRun({ status: "RUNNING" });
    client.emit({
      runId: "run_1",
      projectId: "project_1",
      sequence: 3,
      kind: "STATE",
      run: stateRun,
      transient: true,
      redactionStatus: "VERIFIED_REDACTED",
    } as unknown as LocalRunEvent);

    const terminal = fakeLocalRun({ status: "SUCCEEDED", outcome: "DURABLE_RESULT" });
    client.settle(terminal);
    const res = await promise;

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.status).toBe("SUCCEEDED");
    }

    // `after` was passed through to watchRun.
    expect(client.lastWatchAfter).toBe(7);

    // Views are the SDK projections (not the raw events).
    expect(views).toHaveLength(3);
    expect(views[0]).toEqual({ kind: "TEXT", sequence: 1, text: "hello" });

    const toolView = views[1];
    expect(toolView.kind).toBe("TOOL");
    if (toolView.kind === "TOOL") {
      expect(toolView.toolId).toBe("tool_abc");
      expect(toolView.tool).toBe("write");
      expect(toolView.status).toBe("SUCCEEDED");
      expect(toolView.relativePath).toBe("src/app.ts");
      expect(toolView.output).toBe("done");
    }

    expect(views[2].kind).toBe("STATE");
    // onRun received the STATE run.
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("RUNNING");
  });

  it("PERMISSION_DENIED event projects to a PERMISSION_DENIED view", async () => {
    const { port, client } = makePort();
    const { handlers, views } = watchHandlers();
    const promise = port.watch("run_1", handlers);
    client.emit({
      runId: "run_1",
      projectId: "project_1",
      sequence: 5,
      kind: "PERMISSION_DENIED",
      transient: true,
      redactionStatus: "VERIFIED_REDACTED",
    } as unknown as LocalRunEvent);
    client.settle(fakeLocalRun({ status: "SUCCEEDED" }));
    await promise;
    expect(views).toHaveLength(1);
    expect(views[0]).toEqual({ kind: "PERMISSION_DENIED", sequence: 5 });
  });

  it("watch maps an AbortError-like rejection to a mapped error (abort is normalized)", async () => {
    const { port, client } = makePort();
    const { handlers } = watchHandlers();
    const promise = port.watch("run_1", handlers);
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    client.failWatch(abortError);
    const res = await promise;
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("timeout");
    }
  });
});
