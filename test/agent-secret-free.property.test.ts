import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { AgentDispatcher } from "../src/webview/agent/agent-dispatcher";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentHostMessage } from "../src/webview/agent/agent-messages";
import type { LocalRunEvent } from "../vendor/frontend-client";
import {
  FakeCoreClient,
  type FakeCoreClientOptions,
  fakeLocalRun,
  fakeSnapshot,
} from "./support/fake-core-client";
import { FakeNativeWorker, fakeNativeQuestion } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

/**
 * Property 7 — Secret-free projection (design §Correctness Property 7;
 * Requirements 2.9, 8.4, 13.1).
 *
 * Statement (design §Correctness Property 7 / Requirement 13.1): NO serialized
 * {@link AgentHostMessage} — and no serialized {@link AgentViewModel} the host
 * holds — ever contains a connection object, a token, a host object, or an
 * absolute `workspaceDirectory`. Absolute paths appear ONLY in host-side
 * `openFolder` / `openExternal` calls (Requirement 8.4); a tool row's
 * `relativePath` is relative only (Requirement 2.9).
 *
 * The implementation under test is the REAL {@link AgentSurfaceController}
 * driven through the REAL {@link ManagedAgentPort} (which runs each raw run
 * event through the REAL SDK `projectRunEvent`), with the REAL
 * {@link AgentDispatcher} capturing EVERY posted {@link AgentHostMessage}. The
 * fakes (`FakeCoreClient` / `FakeNativeWorker` / `FakeGlobalState`) drive it
 * deterministically with no live backend, process, or network (design "Testing
 * Strategy" > Fakes).
 *
 * Strategy: we generate a wide space of run events, snapshots, native
 * questions, and a `UI_PREPARE_BUILDER_SESSION` response that CONTAIN injected
 * secret markers — bearer tokens, connection handles, and absolute paths
 * (Windows `C:\Users\...` and POSIX `/home/...`) — placed into BOTH the raw
 * diagnostic fields the SDK is expected to drop AND the host-only
 * `workspaceDirectory`. We then drive a full Builder start → stream → classify
 * cycle (plus a Helper turn, a native-question refresh, and a workspace-open),
 * serialize the resulting `AgentViewModel` and every captured host→webview
 * message to JSON, and assert none of the injected markers survive — while
 * confirming the absolute `workspaceDirectory` DID reach the `openFolder` spy
 * (so the test proves suppression, not mere absence of the value).
 */

const NUM_RUNS = 200;
const PROJECT_ID = "project_1";
const TASK_ID = "task_1";

/**
 * The distinctive, high-entropy secret markers injected into generated inputs.
 * Each is a single unbroken token so a substring scan of the serialized output
 * is a reliable leak detector. Absolute-path markers cover both Windows and
 * POSIX shapes (design §Testing Strategy: "no `^[A-Za-z]:\\` or `/` absolute
 * prefixes, no `token`").
 */
const SECRETS = {
  bearerToken: "SECRETTOKEN_bearer_9f3a2b1c8d7e6f5a4b3c2d1e0f",
  connectionHandle: "SECRETCONN_handle_0011223344556677889900aabb",
  sessionCookie: "SECRETCOOKIE_sid_deadbeefcafebabe0123456789",
  winWorkspaceDir: "C:\\Users\\learner\\SECRETABS_generated\\project_1",
  posixWorkspaceDir: "/home/learner/SECRETABS_generated/project_1",
  winToolPath: "C:\\Users\\learner\\SECRETABS_tool\\app.ts",
  posixToolPath: "/home/learner/SECRETABS_tool/app.ts",
} as const;

/** Every injected marker value, for a single-pass leak scan. */
const ALL_MARKERS: readonly string[] = Object.values(SECRETS);

/**
 * A raw {@link LocalRunEvent} `update` record carrying BOTH the safe fields the
 * SDK `projectRunEvent` reads (`toolId` / `toolName` / `relativePath` /
 * `command` / `output` / ...) AND a pile of injected secret / connection /
 * absolute-path diagnostic fields that the projection is expected to DROP.
 *
 * `relativePath` is only ever a genuinely relative path here: it is a
 * contractually-relative, Core-redacted field the projection legitimately
 * surfaces (Requirement 2.9), so a marker there would be a false positive
 * rather than a leak. The absolute-path markers are injected ONLY into the
 * diagnostic slots (`absolutePath` / `workspaceDirectory`) that
 * `projectRunEvent` is expected to DROP.
 */
function toolUpdateArb(): fc.Arbitrary<Record<string, unknown>> {
  return fc.record({
    // Safe, projected fields.
    toolId: fc.option(fc.string({ minLength: 1, maxLength: 12 }), {
      nil: undefined,
    }),
    toolName: fc.constantFrom("read", "write", "search", "shell", "core"),
    status: fc.constantFrom("pending", "in_progress", "completed", "failed"),
    command: fc.option(fc.string({ maxLength: 40 }), { nil: undefined }),
    output: fc.option(fc.string({ maxLength: 40 }), { nil: undefined }),
    // Contractually relative — legitimately surfaced (Requirement 2.9).
    relativePath: fc.constantFrom("src/app.ts", "src/index.ts", "lib/util.ts"),
    // Injected secret / absolute-path diagnostic fields the projection MUST drop.
    absolutePath: fc.constantFrom(
      SECRETS.winToolPath,
      SECRETS.posixToolPath,
    ),
    workspaceDirectory: fc.constantFrom(
      SECRETS.winWorkspaceDir,
      SECRETS.posixWorkspaceDir,
    ),
    token: fc.constant(SECRETS.bearerToken),
    authorization: fc.constant(`Bearer ${SECRETS.bearerToken}`),
    connectionId: fc.constant(SECRETS.connectionHandle),
    cookie: fc.constant(SECRETS.sessionCookie),
  });
}

/**
 * An arbitrary raw {@link LocalRunEvent}. TEXT events carry only their (safe,
 * Core-redacted) text; TOOL events carry a secret-laden `update`;
 * PERMISSION_DENIED carries nothing extra. Cast to the transport type at the
 * boundary (the fake forwards it through the REAL `projectRunEvent`).
 */
function runEventArb(): fc.Arbitrary<LocalRunEvent> {
  return fc
    .oneof(
      // TEXT — deliberately never carries a secret marker (transcript text is a
      // legitimately-surfaced, Core-redacted value; injecting a marker here
      // would be a false positive, not a leak).
      fc.record({ kind: fc.constant("TEXT"), text: fc.string({ maxLength: 30 }) }),
      // TOOL — carries the secret-laden update record.
      fc.record({ kind: fc.constant("TOOL"), update: toolUpdateArb() }),
      // PERMISSION_DENIED — no payload.
      fc.record({ kind: fc.constant("PERMISSION_DENIED") }),
    )
    .map(
      (spec) =>
        ({
          runId: "run_1",
          projectId: PROJECT_ID,
          sequence: 1,
          transient: true,
          redactionStatus: "VERIFIED_REDACTED",
          ...spec,
        }) as unknown as LocalRunEvent,
    );
}

/** A short, sequence-numbered list of arbitrary run events. */
function runEventsArb(): fc.Arbitrary<LocalRunEvent[]> {
  return fc.array(runEventArb(), { minLength: 0, maxLength: 6 }).map((events) =>
    events.map(
      (e, i) => ({ ...e, sequence: i + 1 }) as unknown as LocalRunEvent,
    ),
  );
}

/**
 * A snapshot that CONTAINS secret-like values: a decision, a recorded Helper
 * conversation, and — critically — a `liveContext` / task carrying injected
 * connection / token / absolute-path fields in EXTRA diagnostic slots. The
 * controller projects only the safe DecisionViewModel / HelperConversation /
 * task-binding fields, so no marker should survive into the view model.
 */
function secretLadenSnapshot() {
  return fakeSnapshot({
    // Extra secret-bearing top-level diagnostic fields (never projected).
    connection: {
      id: SECRETS.connectionHandle,
      token: SECRETS.bearerToken,
      cookie: SECRETS.sessionCookie,
    },
    hostToken: SECRETS.bearerToken,
    workspaceDirectory: SECRETS.winWorkspaceDir,
    currentTask: {
      schemaVersion: 1,
      id: TASK_ID,
      projectId: PROJECT_ID,
      revision: 1,
      title: "습관 트래커 만들기",
      status: "ACTIVE",
      // Injected secret diagnostic fields on the task (never projected).
      absoluteWorkspace: SECRETS.posixWorkspaceDir,
      accessToken: SECRETS.bearerToken,
    },
    helperConversations: [
      {
        conversationId: "conv_1",
        taskId: TASK_ID,
        decisionId: null,
        status: "ANALYZED",
        redactedUserExcerpts: ["이걸 어떻게 하나요?"],
        helperResponseSummaries: ["이렇게 하세요."],
        // Injected secret fields on the conversation (never projected).
        rawConnection: SECRETS.connectionHandle,
        authToken: SECRETS.bearerToken,
      },
    ],
  });
}

/** Build the controller + dispatcher harness, capturing every posted message. */
function buildHarness(clientOptions: FakeCoreClientOptions, worker?: FakeNativeWorker) {
  const client = new FakeCoreClient(clientOptions);
  const w = worker ?? new FakeNativeWorker();
  const port = new ManagedAgentPort(client, w);

  const posted: AgentHostMessage[] = [];
  const openedFolders: string[] = [];
  const openedUrls: string[] = [];

  // Forward-reference closure: controller.onChange → dispatcher.hydrate()
  // (design §B.17), so every mutation posts an agent/hydrate we can inspect.
  let dispatcher: AgentDispatcher;
  const controller = new AgentSurfaceController({
    port,
    globalState: new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID }),
    onChange: () => dispatcher.hydrate(),
    openFolder: async (p: string) => {
      openedFolders.push(p);
    },
    openExternal: async (u: string) => {
      openedUrls.push(u);
    },
  });
  dispatcher = new AgentDispatcher(controller, (m) => posted.push(m));

  return { client, worker: w, controller, dispatcher, posted, openedFolders, openedUrls };
}

/** Yield microtasks until the fake client has an in-flight watch (or give up). */
async function waitForWatch(client: FakeCoreClient): Promise<void> {
  for (let i = 0; i < 50 && !client.isWatching; i += 1) {
    await Promise.resolve();
  }
}

/**
 * Assert no injected secret marker appears in the serialized string, and that
 * no absolute-path prefix leaks either (a defensive, marker-independent check
 * mirroring the design's regex intent). `context` labels the failure site.
 */
function assertNoSecrets(serialized: string, context: string): void {
  for (const marker of ALL_MARKERS) {
    expect(serialized, `${context} leaked marker ${marker}`).not.toContain(marker);
  }
  // Marker-independent guard: the injected absolute paths share these prefixes;
  // asserting the prefixes never appear catches a differently-sliced leak too.
  expect(serialized, `${context} leaked a Windows absolute path`).not.toContain(
    "C:\\Users\\learner\\SECRETABS",
  );
  expect(serialized, `${context} leaked a POSIX absolute path`).not.toContain(
    "/home/learner/SECRETABS",
  );
}

describe("Property 7: secret-free projection", () => {
  it("no secret/token/absolute path survives a full Builder start → stream → classify cycle", async () => {
    await fc.assert(
      fc.asyncProperty(runEventsArb(), async (events) => {
        const h = buildHarness({
          restoreProjectResult: { resolve: secretLadenSnapshot() },
        });

        const started = h.controller.startBuilder("build the tracker");
        await waitForWatch(h.client);

        // Pump the secret-laden run events, then settle terminal.
        for (const event of events) {
          h.client.emit(event);
        }
        h.client.settle(
          fakeLocalRun({ status: "SUCCEEDED", outcome: "PENDING" }),
        );
        await started;

        // The host-held view model must be secret-free.
        assertNoSecrets(JSON.stringify(h.controller.getViewModel()), "view model");

        // EVERY posted host→webview message must be secret-free.
        expect(h.posted.length).toBeGreaterThan(0);
        assertNoSecrets(JSON.stringify(h.posted), "posted messages");
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("no secret survives a Helper turn read-back from a secret-laden snapshot", async () => {
    await fc.assert(
      fc.asyncProperty(runEventsArb(), async (events) => {
        const h = buildHarness({
          restoreProjectResult: { resolve: secretLadenSnapshot() },
          startRunResult: { resolve: fakeLocalRun({ kind: "HELPER" }) },
        });

        const started = h.controller.startHelper({
          message: "도와주세요",
          origin: "FREE_TEXT",
        });
        await waitForWatch(h.client);
        for (const event of events) {
          h.client.emit(event);
        }
        h.client.settle(
          fakeLocalRun({
            kind: "HELPER",
            status: "SUCCEEDED",
            outcome: "HELPER_RECORDED",
          }),
        );
        await started;

        assertNoSecrets(JSON.stringify(h.controller.getViewModel()), "view model");
        assertNoSecrets(JSON.stringify(h.posted), "posted messages");
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("the absolute workspaceDirectory reaches ONLY openFolder, never a projection or message", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(SECRETS.winWorkspaceDir, SECRETS.posixWorkspaceDir),
        async (workspaceDirectory) => {
          const h = buildHarness({
            // No active Builder run → the idle check passes.
            listRunsResult: { resolve: [] },
            executeResultByKind: {
              UI_PREPARE_BUILDER_SESSION: {
                resolve: {
                  schemaVersion: 1,
                  correlationId: "corr",
                  projectId: PROJECT_ID,
                  taskId: TASK_ID,
                  // Host-only absolute path (must reach openFolder only).
                  workspaceDirectory,
                  status: "READY",
                },
              },
            },
          });

          await h.controller.openGeneratedWorkspace(TASK_ID);

          // Proof of suppression (not mere absence): the absolute path DID reach
          // the host-side openFolder spy...
          expect(h.openedFolders).toEqual([workspaceDirectory]);
          // ...yet it never entered the view model or any posted message.
          assertNoSecrets(
            JSON.stringify(h.controller.getViewModel()),
            "view model",
          );
          assertNoSecrets(JSON.stringify(h.posted), "posted messages");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("no secret survives a native-question refresh from secret-laden questions", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            requestId: fc.string({ minLength: 1, maxLength: 8 }),
            role: fc.constantFrom<
              "DISCOVERY" | "BUILDER" | "HELPER" | "EVIDENCE_ANALYST"
            >("BUILDER", "HELPER", "DISCOVERY", "EVIDENCE_ANALYST"),
          }),
          { minLength: 1, maxLength: 4 },
        ),
        async (specs) => {
          const worker = new FakeNativeWorker({
            questions: specs.map((s, i) =>
              fakeNativeQuestion({
                requestId: `${s.requestId}_${i}`,
                projectId: PROJECT_ID,
                role: s.role,
                // Inject secret diagnostic fields onto the raw question; the
                // projection copies only the safe NativeQuestionViewModel slice.
                question: "어떤 방식으로 진행할까요?",
                options: [
                  {
                    title: "옵션 A",
                    description: "설명 A",
                    recommended: true,
                    subOptions: [],
                    // Extra secret fields (never projected).
                    token: SECRETS.bearerToken,
                    connectionId: SECRETS.connectionHandle,
                  },
                ],
                // Extra secret fields on the question (never projected).
                rawConnection: SECRETS.connectionHandle,
                absolutePath: SECRETS.winWorkspaceDir,
              } as never),
            ),
          });
          const h = buildHarness(
            { restoreProjectResult: { resolve: secretLadenSnapshot() } },
            worker,
          );

          // Trigger a subscribeUserInputs notify → the controller re-lists.
          worker.notifyInputs();

          assertNoSecrets(
            JSON.stringify(h.controller.getViewModel()),
            "view model",
          );
          assertNoSecrets(JSON.stringify(h.posted), "posted messages");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
