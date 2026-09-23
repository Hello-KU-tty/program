import { describe, it, expect } from "vitest";

import { MockDiscoveryPort } from "../src/adapter/flow/mock-flow-port";
import { LocalCoreDiscoveryPort } from "../src/adapter/flow/local-core-port";
import { FlowController } from "../src/core/flow/flow-controller";
import type {
  FlowPorts,
  HistoryPort,
  PortError,
  PortResult,
  RequestEnvelope,
} from "../src/adapter/flow/discovery-port";
import type {
  ProjectHistoryView,
  RestoredProjectView,
} from "../src/core/flow/history-types";
import type { LocalCoreClient } from "../vendor/frontend-client";
import { FakeClock } from "./support/fake-clock";

/**
 * Tests for the READ-ONLY Project History feature (guide §6 History row, §9
 * security, §10-2). History is a SEPARATE, read-only concern from the
 * discovery -> spec state machine: it must NEVER start a run, mutate anything,
 * or auto-trigger discovery.
 *
 * We cover:
 *   - MockDiscoveryPort HistoryPort: listProjects returns ok(ProjectHistoryView)
 *     with only safe fields, deterministic by seed.
 *   - LocalCoreDiscoveryPort HistoryPort against a hand-written fake client:
 *     success maps to a safe ProjectHistoryView / RestoredProjectView (asserting
 *     NO workspace path / token leaks into the view), SDK error -> err(PortError),
 *     never throws.
 *   - FlowController.loadHistory(): sets historyLoading then populates history;
 *     on port err emits a "history" notice and clears loading; no run/mutation
 *     occurs (discovery/spec state untouched).
 */

const ENV: RequestEnvelope = {
  correlationId: "corr_h",
  idempotencyKey: "idem_h",
  expectedRevision: 0,
};

/** The set of keys allowed on a safe HistoryProjectView (guide §9). */
const SAFE_HISTORY_KEYS = new Set([
  "projectId",
  "title",
  "learningGoal",
  "status",
  "suggestedSurface",
  "pendingDecisionCount",
  "helperConversationCount",
  "updatedAt",
]);

/** The set of keys allowed on a safe RestoredProjectView (guide §9). */
const SAFE_RESTORED_KEYS = new Set([
  "projectId",
  "title",
  "learningGoal",
  "status",
  "suggestedSurface",
  "hasSpec",
  "currentTaskTitle",
]);

/** Deep-scan an object graph for any forbidden key or path-looking value. */
function assertNoLeaks(value: unknown): void {
  const forbiddenKeyPattern =
    /workspace|token|connection|secret|authorization|bearer|generatedWorkspacePath|path/i;
  const seen = new Set<unknown>();
  const walk = (v: unknown): void => {
    if (v === null || typeof v !== "object") return;
    if (seen.has(v)) return;
    seen.add(v);
    for (const [key, child] of Object.entries(v as Record<string, unknown>)) {
      expect(forbiddenKeyPattern.test(key)).toBe(false);
      walk(child);
    }
  };
  walk(value);
}

// --- MockDiscoveryPort HistoryPort ---------------------------------------

describe("MockDiscoveryPort HistoryPort (read-only, guide §6/§9)", () => {
  /** Drive a scheduled mock op to resolution against a FakeClock. */
  async function resolve<T>(
    clock: FakeClock,
    start: () => Promise<PortResult<T>>,
  ): Promise<PortResult<T>> {
    const pending = start();
    clock.advance(5000);
    return pending;
  }

  it("listProjects returns ok(ProjectHistoryView) with only safe fields", async () => {
    const clock = new FakeClock();
    const port = new MockDiscoveryPort({ seed: 7, clock, latency: { minMs: 500, maxMs: 500 } });

    const res = await resolve(clock, () => port.listProjects(50, ENV));
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(Array.isArray(res.value.projects)).toBe(true);
    for (const project of res.value.projects) {
      for (const key of Object.keys(project)) {
        expect(SAFE_HISTORY_KEYS.has(key)).toBe(true);
      }
      expect(typeof project.projectId).toBe("string");
      expect(typeof project.title).toBe("string");
      expect(typeof project.learningGoal).toBe("string");
      expect(typeof project.pendingDecisionCount).toBe("number");
      expect(typeof project.helperConversationCount).toBe("number");
    }
    assertNoLeaks(res.value);
  });

  it("is deterministic by seed", async () => {
    const runOnce = async (): Promise<ProjectHistoryView> => {
      const clock = new FakeClock();
      const port = new MockDiscoveryPort({ seed: 123, clock, latency: { minMs: 500, maxMs: 500 } });
      const res = await resolve(clock, () => port.listProjects(50, ENV));
      if (!res.ok) throw new Error("expected ok");
      return res.value;
    };
    const a = await runOnce();
    const b = await runOnce();
    // Same seed -> same number of projects and same titles/statuses.
    expect(a.projects.map((p) => `${p.title}:${p.status}`)).toEqual(
      b.projects.map((p) => `${p.title}:${p.status}`),
    );
  });

  it("restoreProject returns ok(RestoredProjectView) with only safe fields", async () => {
    const clock = new FakeClock();
    const port = new MockDiscoveryPort({ seed: 3, clock, latency: { minMs: 500, maxMs: 500 } });

    const res = await resolve(clock, () => port.restoreProject("project_x", ENV));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    for (const key of Object.keys(res.value)) {
      expect(SAFE_RESTORED_KEYS.has(key)).toBe(true);
    }
    expect(res.value.projectId).toBe("project_x");
    assertNoLeaks(res.value);
  });
});

// --- LocalCoreDiscoveryPort HistoryPort (fake client) --------------------

const ISO = "2026-02-03T04:05:06.000Z";
const ISO_EPOCH = Date.parse(ISO);

/** A contract-shaped ProjectHistory response (includes UNSAFE fields). */
function contractHistory() {
  return {
    schemaVersion: 1,
    correlationId: "corr_list",
    projects: [
      {
        project: {
          schemaVersion: 1,
          id: "project_1",
          correlationId: "corr_p",
          revision: 4,
          title: "습관 트래커",
          learningGoal: "매일 습관을 기록하는 앱",
          status: "BUILDING",
          // UNSAFE: an absolute path the safe view must NOT carry (guide §9).
          generatedWorkspacePath: "/Users/me/secret/workspace/project_1",
          createdAt: ISO,
          updatedAt: ISO,
          source: { kind: "USER" },
          redactionStatus: "NOT_REQUIRED",
        },
        suggestedSurface: "BUILD",
        activeTask: null,
        pendingDecisionCount: 2,
        currentContextVersion: 5,
        helperConversationCount: 3,
      },
    ],
  };
}

/** A contract-shaped ProjectSessionSnapshot (includes UNSAFE fields). */
function contractSnapshot() {
  return {
    schemaVersion: 1,
    correlationId: "corr_snap",
    project: {
      schemaVersion: 1,
      id: "project_1",
      correlationId: "corr_p",
      revision: 4,
      title: "습관 트래커",
      learningGoal: "매일 습관을 기록하는 앱",
      status: "BUILDING",
      generatedWorkspacePath: "/Users/me/secret/workspace/project_1",
      createdAt: ISO,
      updatedAt: ISO,
      source: { kind: "USER" },
      redactionStatus: "NOT_REQUIRED",
    },
    suggestedSurface: "BUILD",
    discoverySession: null,
    discoveryContext: null,
    selectedCandidate: null,
    learningSpec: { id: "learning_spec_1", status: "CONFIRMED" },
    activeTask: null,
    currentTask: { id: "task_1", title: "첫 화면 만들기" },
    liveContext: null,
    pendingDecisions: [],
    decisions: [],
    completionReport: null,
    helperConversations: [],
  };
}

function clientError(code: string, status?: number, message = "boom") {
  return { code, status, message, name: "LocalClientError" };
}

function fakeClient(overrides: Partial<Record<string, unknown>> = {}): LocalCoreClient {
  const base = {
    listProjects: async () => contractHistory(),
    restoreProject: async () => contractSnapshot(),
    startDiscovery: async () => ({ projectId: "project_1", run: {} }),
    startRun: async () => ({}),
    execute: async () => ({}),
    health: async () => ({ protocolVersion: 1, backendInstanceId: "b1" }),
    ...overrides,
  };
  return base as unknown as LocalCoreClient;
}

describe("LocalCoreDiscoveryPort HistoryPort (guide §6/§9, never throws)", () => {
  it("listProjects -> ok(ProjectHistoryView) with correct safe fields and no leaks", async () => {
    const port = new LocalCoreDiscoveryPort(fakeClient());
    const res = await port.listProjects(50, ENV);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.projects).toHaveLength(1);
    const p = res.value.projects[0];
    expect(p.projectId).toBe("project_1");
    expect(p.title).toBe("습관 트래커");
    expect(p.learningGoal).toBe("매일 습관을 기록하는 앱");
    expect(p.status).toBe("BUILDING");
    expect(p.suggestedSurface).toBe("BUILD");
    expect(p.pendingDecisionCount).toBe(2);
    expect(p.helperConversationCount).toBe(3);
    expect(p.updatedAt).toBe(ISO_EPOCH);

    // SECURITY (guide §9): only safe keys, and no path/token anywhere.
    for (const key of Object.keys(p)) {
      expect(SAFE_HISTORY_KEYS.has(key)).toBe(true);
    }
    assertNoLeaks(res.value);
    // The absolute workspace path in the contract must NOT appear anywhere.
    expect(JSON.stringify(res.value)).not.toContain("secret/workspace");
  });

  it("restoreProject -> ok(RestoredProjectView) with safe fields only, no leaks", async () => {
    const port = new LocalCoreDiscoveryPort(fakeClient());
    const res = await port.restoreProject("project_1", ENV);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const v: RestoredProjectView = res.value;
    expect(v.projectId).toBe("project_1");
    expect(v.title).toBe("습관 트래커");
    expect(v.status).toBe("BUILDING");
    expect(v.suggestedSurface).toBe("BUILD");
    expect(v.hasSpec).toBe(true);
    expect(v.currentTaskTitle).toBe("첫 화면 만들기");

    for (const key of Object.keys(v)) {
      expect(SAFE_RESTORED_KEYS.has(key)).toBe(true);
    }
    assertNoLeaks(v);
    expect(JSON.stringify(v)).not.toContain("secret/workspace");
  });

  it("maps an SDK error to err(PortError) without throwing (listProjects)", async () => {
    const port = new LocalCoreDiscoveryPort(
      fakeClient({
        listProjects: async () => {
          throw clientError("CORE_CONNECTION_UNAVAILABLE");
        },
      }),
    );
    const res = await port.listProjects(50, ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("unavailable");
  });

  it("maps an SDK error to err(PortError) without throwing (restoreProject)", async () => {
    const port = new LocalCoreDiscoveryPort(
      fakeClient({
        restoreProject: async () => {
          throw clientError("REQUEST_TIMEOUT");
        },
      }),
    );
    const res = await port.restoreProject("project_1", ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("timeout");
  });

  it("never throws even when a raw non-Error is thrown", async () => {
    const port = new LocalCoreDiscoveryPort(
      fakeClient({
        listProjects: async () => {
          throw "string failure";
        },
      }),
    );
    await expect(port.listProjects(50, ENV)).resolves.toMatchObject({ ok: false });
  });
});

// --- FlowController.loadHistory ------------------------------------------

/** A stub HistoryPort that resolves synchronously (no clock needed). */
class StubHistoryPort implements HistoryPort {
  listCalls = 0;
  restoreCalls = 0;

  constructor(
    private readonly listResult: PortResult<ProjectHistoryView>,
    private readonly restoreResult?: PortResult<RestoredProjectView>,
  ) {}

  async listProjects(): Promise<PortResult<ProjectHistoryView>> {
    this.listCalls += 1;
    return this.listResult;
  }

  async restoreProject(): Promise<PortResult<RestoredProjectView>> {
    this.restoreCalls += 1;
    return (
      this.restoreResult ?? {
        ok: false,
        error: { code: "unavailable", message: "no restore configured" },
      }
    );
  }
}

/** A discovery/spec port that FAILS the test if any op is called (proves no run). */
function forbiddenDiscoverySpecPorts(): Pick<FlowPorts, "discovery" | "spec"> {
  const forbid = (name: string) => () => {
    throw new Error(`unexpected discovery/spec op during History: ${name}`);
  };
  const discovery = {
    startDiscovery: forbid("startDiscovery"),
    generatePreviewRound: forbid("generatePreviewRound"),
    enrichCandidate: forbid("enrichCandidate"),
    submitFeedback: forbid("submitFeedback"),
  } as unknown as FlowPorts["discovery"];
  const spec = {
    generateSpecDraft: forbid("generateSpecDraft"),
    refineSpec: forbid("refineSpec"),
    confirmSpec: forbid("confirmSpec"),
    prepareBuilderTask: forbid("prepareBuilderTask"),
  } as unknown as FlowPorts["spec"];
  return { discovery, spec };
}

const SAMPLE_HISTORY: ProjectHistoryView = {
  projects: [
    {
      projectId: "project_1",
      title: "가계부",
      learningGoal: "지출을 기록하는 앱",
      status: "SPEC_REVIEW",
      suggestedSurface: "SPEC",
      pendingDecisionCount: 0,
      helperConversationCount: 1,
    },
  ],
};

describe("FlowController.loadHistory (read-only, guide §6/§10-2)", () => {
  it("populates history in the snapshot on success and clears loading", async () => {
    const history = new StubHistoryPort({ ok: true, value: SAMPLE_HISTORY });
    const ports: FlowPorts = { ...forbiddenDiscoverySpecPorts(), history };
    const changes: boolean[] = [];
    const controller = new FlowController(ports, {
      clock: new FakeClock(),
      onChange: () => changes.push(controller.isHistoryLoading()),
    });

    await controller.loadHistory();

    const snapshot = controller.snapshot();
    expect(snapshot.history).toEqual(SAMPLE_HISTORY.projects);
    expect(snapshot.historyLoading).toBe(false);
    expect(history.listCalls).toBe(1);
    // The loading flag was set true (a change emitted while loading) then cleared.
    expect(changes).toContain(true);
    expect(controller.isHistoryLoading()).toBe(false);
  });

  it("emits a history notice and clears loading on port error", async () => {
    const error: PortError = { code: "unavailable", message: "down" };
    const history = new StubHistoryPort({ ok: false, error });
    const ports: FlowPorts = { ...forbiddenDiscoverySpecPorts(), history };
    const notices: string[] = [];
    const controller = new FlowController(ports, {
      clock: new FakeClock(),
      onNotice: (n) => notices.push(n.surface),
    });

    await controller.loadHistory();

    expect(controller.snapshot().historyLoading).toBe(false);
    expect(controller.snapshot().history).toEqual([]);
    expect(notices).toContain("history");
  });

  it("is a no-op when no HistoryPort is wired", async () => {
    const ports: FlowPorts = forbiddenDiscoverySpecPorts();
    const controller = new FlowController(ports, { clock: new FakeClock() });

    await controller.loadHistory();

    expect(controller.snapshot().history).toEqual([]);
    expect(controller.snapshot().historyLoading).toBe(false);
  });

  it("does not touch discovery/spec state (no run, no mutation)", async () => {
    const history = new StubHistoryPort({ ok: true, value: SAMPLE_HISTORY });
    const ports: FlowPorts = { ...forbiddenDiscoverySpecPorts(), history };
    const controller = new FlowController(ports, { clock: new FakeClock() });

    const before = controller.snapshot();
    await controller.loadHistory();
    const after = controller.snapshot();

    // Discovery/spec projection is unchanged (the forbidden ports would throw
    // if any run had been started).
    expect(after.phase).toBe(before.phase);
    expect(after.project).toEqual(before.project);
    expect(after.previewRound).toEqual(before.previewRound);
    expect(after.rounds).toEqual(before.rounds);
    expect(after.spec).toEqual(before.spec);
    expect(after.selectedCandidate).toEqual(before.selectedCandidate);
  });

  it("single-flight: overlapping loadHistory calls do not stack", async () => {
    // A history port that only resolves when we release it, so the first call
    // is still in-flight when the second is issued.
    let release!: (r: PortResult<ProjectHistoryView>) => void;
    const gate = new Promise<PortResult<ProjectHistoryView>>((res) => {
      release = res;
    });
    let calls = 0;
    const history: HistoryPort = {
      listProjects: () => {
        calls += 1;
        return gate;
      },
      restoreProject: async () => ({
        ok: false,
        error: { code: "unavailable", message: "n/a" },
      }),
    };
    const ports: FlowPorts = { ...forbiddenDiscoverySpecPorts(), history };
    const controller = new FlowController(ports, { clock: new FakeClock() });

    const first = controller.loadHistory();
    // Second call while the first is loading: the single-flight guard returns
    // immediately without issuing another listProjects.
    await controller.loadHistory();
    expect(calls).toBe(1);

    release({ ok: true, value: SAMPLE_HISTORY });
    await first;
    expect(controller.snapshot().history).toEqual(SAMPLE_HISTORY.projects);
  });
});
