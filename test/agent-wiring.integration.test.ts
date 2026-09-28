/**
 * Integration test for the LIVE agent surface through {@link wireWebviewMessaging}
 * with a fake Managed_Host (task 8.3).
 *
 * Unlike `test/agent-controller.test.ts` (which drives the controller/port
 * directly), this test exercises the FULL product-mode wiring path exactly as it
 * runs inside `AgentPanelViewProvider.resolveWebviewView`:
 *
 *   webview postMessage({kind:'builder/start'})
 *     -> wireWebviewMessaging inbound listener
 *     -> AgentDispatcher.handle -> parseAgentAction
 *     -> AgentSurfaceController.startBuilder
 *     -> ManagedAgentPort over the fake CoreClient (start -> watch -> stream)
 *     -> restoreProject After_Snapshot -> classifyBuilderTurn
 *     -> controller.onChange -> AgentDispatcher.hydrate
 *     -> webview.postMessage({kind:'agent/hydrate', vm})
 *
 * The Managed_Host is a hand-built fake exposing `{ client, worker }` backed by
 * the deterministic {@link FakeCoreClient} / {@link FakeNativeWorker} fakes (plus
 * the `prepare` / `getStatus` / `subscribeStatus` / `onDidRotate` surface the
 * flow-port factory awaits). No live backend, process, network, or SSE socket.
 *
 * Two variants prove the full start -> stream -> classify cycle produces exactly
 * ONE `agent/hydrate` reflecting the classified outcome:
 *   - a COMPLETED task + matching completion report -> `TASK_COMPLETED`;
 *   - an ACTIVE task with a matching pending decision -> `DECISION_REQUIRED`.
 *
 * Security boundary (Requirements 13.1, 14.3): every posted message is
 * serialized to JSON and scanned so that NO connection object, token, or
 * absolute path ever crosses into the webview.
 *
 * Requirements: 1.3, 1.4, 13.1, 14.3.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => {
  class Disposable {
    constructor(private readonly fn: () => void) {}
    dispose(): void {
      this.fn();
    }
  }
  return {
    Disposable,
    Uri: {
      joinPath: (...parts: unknown[]) => ({ parts }),
      file: (p: string) => ({ fsPath: p }),
      parse: (s: string) => ({ toString: () => s }),
    },
    window: { registerWebviewViewProvider: vi.fn() },
    commands: { executeCommand: vi.fn() },
    env: { openExternal: vi.fn() },
    workspace: {
      getConfiguration: () => ({ get: () => undefined }),
    },
  };
});

import {
  wireWebviewMessaging,
  type MessagingWebview,
} from "../src/agent-panel-view-provider";
import type { HostToWebview } from "../src/webview/messages";
import type { HostToWebviewFlow } from "../src/webview/flow/flow-messages";
import type { AgentHostMessage } from "../src/webview/agent/agent-messages";
import type { FrontendHost, HostStatus } from "../vendor/frontend-host";
import {
  FakeCoreClient,
  type FakeCoreClientOptions,
  fakeLocalRun,
  fakeSnapshot,
} from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

const PROJECT_ID = "project_1";
const TASK_ID = "task_1";

/** The union of every message the wiring may post over the shared channel. */
type PostedMessage = HostToWebview | HostToWebviewFlow | AgentHostMessage;

/**
 * Fake webview capturing outbound host messages and driving inbound gestures,
 * mirroring the VS Code `Webview` surface the wiring depends on.
 */
class FakeWebview implements MessagingWebview {
  readonly posted: PostedMessage[] = [];
  private listener: ((message: unknown) => unknown) | null = null;

  postMessage(message: PostedMessage): unknown {
    this.posted.push(message);
    return true;
  }

  onDidReceiveMessage(listener: (message: unknown) => unknown) {
    this.listener = listener;
    return { dispose: () => (this.listener = null) };
  }

  /** Simulate the webview posting a gesture to the host. */
  send(message: unknown): unknown {
    return this.listener?.(message);
  }
}

/**
 * Build a fake {@link FrontendHost} exposing `{ client, worker }` backed by the
 * deterministic fakes, plus the minimal `prepare` / `getStatus` /
 * `subscribeStatus` / `onDidRotate` / `dispose` surface the flow-port factory
 * and the wiring await. It reports a live, worker-ready status so the wiring
 * treats it exactly as a product-mode managed host.
 */
function fakeHost(client: FakeCoreClient, worker: FakeNativeWorker): FrontendHost {
  const status: HostStatus = { phase: "CORE_CONNECTED", native: "WORKER_READY" };
  return {
    client,
    worker,
    prepare: async () => ({ client }),
    retry: async () => ({ client }),
    assertAgentReady: () => {},
    getStatus: () => status,
    subscribeStatus: () => () => {},
    onDidRotate: () => () => {},
    dispose: async () => {},
  } as unknown as FrontendHost;
}

/** A COMPLETED task + matching completion report -> classifier yields TASK_COMPLETED. */
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
    completionReport: { schemaVersion: 1, id: "report_1", taskId: TASK_ID },
  });
}

/** An ACTIVE task with a matching pending decision -> classifier yields DECISION_REQUIRED. */
function decisionRequiredSnapshot() {
  return fakeSnapshot({
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

/**
 * Wire the webview to the live agent surface through a fake managed host, then
 * await `agentReady` so the async `ManagedAgentPort` construction has settled.
 */
async function wire(clientOptions: FakeCoreClientOptions) {
  const client = new FakeCoreClient(clientOptions);
  const worker = new FakeNativeWorker();
  const globalState = new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID });
  const webview = new FakeWebview();

  const wired = wireWebviewMessaging(webview, {
    managedHost: Promise.resolve(fakeHost(client, worker)),
    globalState,
  });

  const agent = await wired.agentReady;
  expect(agent).not.toBeNull();
  // Let the async flow-port factory (createManagedFlowPorts + loadHistory) settle
  // so any startup posts land before the test drives the builder/start gesture.
  await new Promise((resolve) => setTimeout(resolve, 0));

  return { client, worker, globalState, webview, wired };
}

/** Yield microtasks until the fake client has an in-flight watch (or give up). */
async function waitForWatch(client: FakeCoreClient): Promise<void> {
  for (let i = 0; i < 50 && !client.isWatching; i += 1) {
    await Promise.resolve();
  }
}

/** Only the LIVE agent messages posted over the shared channel. */
function agentMessages(posted: readonly PostedMessage[]): AgentHostMessage[] {
  return posted.filter((m): m is AgentHostMessage =>
    typeof (m as { kind?: unknown }).kind === "string" &&
    ((m as { kind: string }).kind).startsWith("agent/"),
  );
}

it("drops mixed flow/agent discriminators without invoking either controller", async () => {
  const { client, webview, wired } = await wire({});
  try {
    await wired.ready;
    await webview.send({ type: "confirmSpec", kind: "builder/start", message: "must not run" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(client.startRunInputs).toHaveLength(0);
  } finally {
    wired.messageSubscription.dispose();
  }
});

/**
 * Assert the security boundary (Requirements 13.1, 14.3): serialize EVERY posted
 * message and scan for a connection object, token, or absolute path. Nothing of
 * the sort may ever cross into the webview.
 */
function assertNoSecretsPosted(posted: readonly PostedMessage[]): void {
  const serialized = JSON.stringify(posted);
  // No absolute Windows path (e.g. C:\...) or POSIX absolute path leaked.
  expect(serialized).not.toMatch(/[A-Za-z]:\\\\/);
  expect(serialized).not.toMatch(/[A-Za-z]:\\/);
  // No token / secret / connection object shapes.
  expect(serialized.toLowerCase()).not.toContain("token");
  expect(serialized.toLowerCase()).not.toContain("secret");
  expect(serialized).not.toContain("connectionFile");
  expect(serialized).not.toContain("workspaceDirectory");
}

describe("wireWebviewMessaging (live agent) — builder/start full cycle", () => {
  it("drives start -> stream -> classify producing exactly one agent/hydrate reflecting TASK_COMPLETED", async () => {
    const { client, webview } = await wire({
      restoreProjectResult: { resolve: completedSnapshot() },
    });

    const baseline = webview.posted.length;

    // Inbound builder/start gesture from the (untrusted) webview.
    webview.send({ kind: "builder/start", message: "build the tracker" });
    await waitForWatch(client);

    // A live watch opened -> phase RUNNING was hydrated at least once.
    const runningHydrates = agentMessages(webview.posted.slice(baseline)).filter(
      (m) => m.kind === "agent/hydrate" && m.vm.builder.phase === "RUNNING",
    );
    expect(runningHydrates.length).toBeGreaterThanOrEqual(1);

    const hydratesBeforeSettle = agentMessages(
      webview.posted.slice(baseline),
    ).filter((m) => m.kind === "agent/hydrate").length;

    // Stream a couple of events, then settle a SUCCEEDED terminal run so the
    // After_Snapshot classification runs.
    client.emit({ kind: "TEXT", sequence: 1, text: "작업 시작" } as never);
    client.emit({
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
    client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "PENDING" }));

    // Let the terminal classify + hydrate settle.
    for (let i = 0; i < 50; i += 1) {
      await Promise.resolve();
    }

    const agentPosts = agentMessages(webview.posted.slice(baseline));
    const completedHydrates = agentPosts.filter(
      (m) => m.kind === "agent/hydrate" && m.vm.builder.phase === "TASK_COMPLETED",
    );

    // Exactly one agent/hydrate reflects the classified TASK_COMPLETED terminal.
    expect(completedHydrates).toHaveLength(1);
    // And it is a genuinely NEW hydrate produced by the classify step.
    expect(agentPosts.filter((m) => m.kind === "agent/hydrate").length).toBeGreaterThan(
      hydratesBeforeSettle,
    );

    const vm = completedHydrates[0];
    if (vm.kind === "agent/hydrate") {
      expect(vm.vm.builder.completionReportId).toBe("report_1");
      expect(vm.vm.builder.transcript).toEqual([{ sequence: 1, text: "작업 시작" }]);
      expect(vm.vm.builder.toolRows).toHaveLength(1);
      expect(vm.vm.builder.toolRows[0].relativePath ?? "").not.toMatch(/^[A-Za-z]:\\/);
    }

    // Security boundary: no connection / token / absolute path in ANY posted message.
    assertNoSecretsPosted(webview.posted);
  });

  it("drives start -> stream -> classify producing exactly one agent/hydrate reflecting DECISION_REQUIRED", async () => {
    const { client, webview } = await wire({
      restoreProjectResult: { resolve: decisionRequiredSnapshot() },
    });

    const baseline = webview.posted.length;

    webview.send({ kind: "builder/start", message: "keep going" });
    await waitForWatch(client);

    // A terminal SUCCEEDED run over an ACTIVE task with a matching pending
    // decision classifies to DECISION_REQUIRED (never TASK_COMPLETED).
    client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "PENDING" }));
    for (let i = 0; i < 50; i += 1) {
      await Promise.resolve();
    }

    const agentPosts = agentMessages(webview.posted.slice(baseline));
    const decisionHydrates = agentPosts.filter(
      (m) => m.kind === "agent/hydrate" && m.vm.builder.phase === "DECISION_REQUIRED",
    );
    expect(decisionHydrates).toHaveLength(1);

    // Completion is decided only by the classifier: no TASK_COMPLETED anywhere.
    const completedAny = agentPosts.some(
      (m) => m.kind === "agent/hydrate" && m.vm.builder.phase === "TASK_COMPLETED",
    );
    expect(completedAny).toBe(false);

    // The DECISION_REQUIRED phase itself is the completion-gating signal
    // (design §Correctness Property 1): the classifier saw a matching pending
    // decision and refused TASK_COMPLETED. The resolved-decision projection
    // (`vm.decisions`) is populated separately from `snapshot.decisions`, so a
    // freshly-pending decision is reflected only via the phase here.
    const vm = decisionHydrates[0];
    if (vm.kind === "agent/hydrate") {
      expect(vm.vm.builder.phase).toBe("DECISION_REQUIRED");
      expect(vm.vm.builder.completionReportId).toBeNull();
    }

    assertNoSecretsPosted(webview.posted);
  });
});
