import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentResult } from "../src/adapter/agent/agent-run-port";
import type { UiRequest } from "../vendor/frontend-client";
import type { NativeAnswer } from "../vendor/frontend-host";
import {
  FakeCoreClient,
  fakeLocalRun,
  fakeSnapshot,
  type ScriptedResult,
} from "./support/fake-core-client";
import { FakeNativeWorker, type SubmitScript } from "./support/fake-native-worker";

/**
 * Property 11 — Ports never throw (design §Correctness Property 11; Requirements
 * 11.1, 11.2).
 *
 * Statement: every {@link ManagedAgentPort} `AgentRunPort` / `NativeInputPort`
 * method resolves to an {@link AgentResult} (`ok` or `err`) and NEVER throws or
 * rejects — for ALL arbitrary inputs AND ALL arbitrary values thrown by the
 * underlying fake `CoreClient` / `NativeWorker`. No rejection ever escapes to
 * the controller.
 *
 * These property-based tests drive the REAL adapter through the deterministic,
 * controllable `FakeCoreClient` / `FakeNativeWorker` fakes (design "Testing
 * Strategy" > Fakes), scripting each underlying call to either resolve a
 * contract-shaped value or throw an arbitrary value (a real-ish
 * `LocalClientError`-like object, a generic `Error`, a raw string code, a
 * number, `null`, a plain object, a boolean). One property → one test; each
 * runs a minimum of {@link NUM_RUNS} iterations.
 *
 * Determinism: no timers, randomness, or network. `watchRun` is driven by
 * settling / failing the single in-flight watch synchronously after invocation.
 */

const NUM_RUNS = 200;

// ---------- Generators ----------

/**
 * An arbitrary value the underlying client / worker may throw. Covers every
 * branch of `toAgentError`: real `LocalClientError`-like objects (with a known
 * mapped code, a random code, and an optional HTTP status), generic `Error`s
 * (code-shaped message and human message), raw string codes, and non-Error
 * primitives (`null`, number, boolean, plain object without a `code`).
 */
const thrownArb: fc.Arbitrary<unknown> = fc.oneof(
  // LocalClientError-like: a known mapped code.
  fc.record({
    code: fc.constantFrom(
      "RUN_BUSY",
      "STALE_TASK_REVISION",
      "TASK_ALREADY_COMPLETED",
      "TASK_BINDING_MISMATCH",
      "RUNTIME_CAPACITY",
      "RUN_IDEMPOTENCY_CONFLICT",
      "DECISION_BINDING_MISMATCH",
      "HELPER_EMPTY_RESPONSE",
      "NATIVE_ROLE_CATALOG_UNVERIFIED",
      "DECISION_ALREADY_RESOLVED",
      "LIVE_CONTEXT_STALE",
      "NATIVE_USER_INPUT_STALE",
      "NATIVE_USER_INPUT_RESPONSE_INVALID",
      "NATIVE_NOT_READY",
      "RESULT_NOT_RUNNING",
      "FINAL_UPGRADE_INELIGIBLE",
    ),
    status: fc.option(fc.constantFrom(400, 409, 500, 502, 503), { nil: undefined }),
    message: fc.string(),
    name: fc.constant("LocalClientError"),
  }),
  // LocalClientError-like: an arbitrary (possibly-empty) code string.
  fc.record({
    code: fc.string(),
    status: fc.option(fc.integer({ min: 100, max: 599 }), { nil: undefined }),
    message: fc.option(fc.string(), { nil: undefined }),
  }),
  // Generic Error with an arbitrary message (may or may not be code-shaped).
  fc.oneof(
    fc.string().map((m) => new Error(m)),
    fc.constantFrom("AbortError", "TypeError", "RangeError").map((n) => {
      const e = new Error("boom");
      e.name = n;
      return e;
    }),
  ),
  // Raw string code (including empty).
  fc.string(),
  // Non-Error primitives / objects with no `code`.
  fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.integer(),
    fc.boolean(),
    fc.object(),
  ),
);

/** A scripted client result: either a resolved value or a thrown arbitrary. */
function scriptedArb<T>(value: T): fc.Arbitrary<ScriptedResult<T>> {
  return fc.oneof(
    fc.constant<ScriptedResult<T>>({ resolve: value }),
    thrownArb.map<ScriptedResult<T>>((t) => ({
      throw: t as { code: string },
    })),
  );
}

/** A scripted `submitUserInput` result: a success value or a thrown-code object. */
const submitScriptArb: fc.Arbitrary<SubmitScript> = fc.oneof(
  fc.constantFrom<SubmitScript>(
    { resolve: "SUBMITTED" },
    { resolve: "ALREADY_SUBMITTED" },
    { resolve: "ALREADY_HANDLED" },
  ),
  fc
    .record({
      code: fc.string(),
      status: fc.option(fc.integer({ min: 100, max: 599 }), { nil: undefined }),
      message: fc.option(fc.string(), { nil: undefined }),
    })
    .map<SubmitScript>((e) => ({ throw: e })),
);

/** An arbitrary non-empty project id. */
const projectIdArb = fc.string({ minLength: 1, maxLength: 24 });

/** An arbitrary native answer (verbatim user selection shapes). */
const nativeAnswerArb: fc.Arbitrary<NativeAnswer> = fc
  .record({
    projectId: fc.string({ minLength: 1 }),
    nativeJobId: fc.string({ minLength: 1 }),
    requestId: fc.string({ minLength: 1 }),
  })
  .chain((base) =>
    fc.oneof(
      fc.constant<NativeAnswer>({ ...base, action: "dismissed" }),
      fc
        .string()
        .map<NativeAnswer>((answer) => ({ ...base, action: "answered", answer })),
      fc
        .record({
          optionIndex: fc.integer({ min: 0, max: 5 }),
          subOptionIndices: fc.array(fc.integer({ min: 0, max: 5 }), {
            maxLength: 4,
          }),
        })
        .map<NativeAnswer>((sel) => ({ ...base, action: "answered", ...sel })),
    ),
  );

/** An arbitrary UI request kind (only `kind` matters to the fake `execute`). */
const uiRequestArb: fc.Arbitrary<UiRequest> = fc
  .constantFrom<UiRequest["kind"]>(
    "UI_RESOLVE_DECISION",
    "UI_PREPARE_BUILDER_SESSION",
    "UI_LAUNCH_RESULT",
    "UI_READ_EVIDENCE_TRACE",
    "UI_READ_ANALYSIS_JOBS",
    "UI_RETRY_ANALYSIS",
    "UI_PREPARE_FINAL_UPGRADE_TASK",
  )
  .map(
    (kind) =>
      ({
        schemaVersion: 1,
        correlationId: "corr_req",
        metadata: { kind: "UI" },
        kind,
        projectId: "project_1",
        idempotencyKey: "idem_1",
      }) as unknown as UiRequest,
  );

// ---------- Helpers ----------

/**
 * Assert a settled value is a well-formed {@link AgentResult}: either
 * `{ ok: true, value }` or `{ ok: false, error: { code, raw, message } }`.
 */
function assertAgentResult(result: AgentResult<unknown>): void {
  expect(typeof result).toBe("object");
  expect(result).not.toBeNull();
  if (result.ok) {
    expect(result).toHaveProperty("value");
  } else {
    expect(result.error).toBeDefined();
    expect(typeof result.error.code).toBe("string");
    expect(typeof result.error.raw).toBe("string");
    expect(typeof result.error.message).toBe("string");
  }
}

// ---------- Properties ----------

describe("Property 11: ManagedAgentPort methods never throw", () => {
  it("prepareBuilder resolves to an AgentResult for any snapshot outcome", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        // Snapshot may resolve (with or without a current task) or throw.
        fc.oneof(
          scriptedArb(fakeSnapshot()),
          scriptedArb(fakeSnapshot({ currentTask: null })),
        ),
        async (projectId, restoreProjectResult) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient({ restoreProjectResult }),
            new FakeNativeWorker(),
          );
          const result = await port.prepareBuilder(projectId);
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("startBuilder resolves to an AgentResult for any input and thrown value", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          projectId: projectIdArb,
          taskId: fc.string({ minLength: 1 }),
          expectedTaskRevision: fc.integer({ min: 0, max: 100 }),
          message: fc.string(),
        }),
        scriptedArb(fakeLocalRun()),
        async (input, startRunResult) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient({ startRunResult }),
            new FakeNativeWorker(),
          );
          const result = await port.startBuilder(input);
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("startHelper resolves to an AgentResult for any input and thrown value", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          projectId: projectIdArb,
          taskId: fc.string({ minLength: 1 }),
          decisionId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          message: fc.string(),
          origin: fc.constantFrom<"FREE_TEXT" | "QUICK_ACTION">(
            "FREE_TEXT",
            "QUICK_ACTION",
          ),
        }),
        scriptedArb(fakeLocalRun({ kind: "HELPER" })),
        async (input, startRunResult) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient({ startRunResult }),
            new FakeNativeWorker(),
          );
          const result = await port.startHelper(input);
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("cancel resolves to an AgentResult for any thrown value", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        scriptedArb(fakeLocalRun({ status: "CANCELLED" })),
        async (runId, cancelRunResult) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient({ cancelRunResult }),
            new FakeNativeWorker(),
          );
          const result = await port.cancel(runId);
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("listActiveBuilderRun resolves to an AgentResult for any listRuns outcome", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        scriptedArb([
          fakeLocalRun({ kind: "BUILDER", status: "RUNNING" }),
          fakeLocalRun({ kind: "HELPER", status: "RUNNING" }),
        ]),
        async (projectId, listRunsResult) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient({ listRunsResult }),
            new FakeNativeWorker(),
          );
          const result = await port.listActiveBuilderRun(projectId);
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("snapshot resolves to an AgentResult for any restoreProject outcome", async () => {
    await fc.assert(
      fc.asyncProperty(
        projectIdArb,
        scriptedArb(fakeSnapshot()),
        async (projectId, restoreProjectResult) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient({ restoreProjectResult }),
            new FakeNativeWorker(),
          );
          const result = await port.snapshot(projectId);
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("execute resolves to an AgentResult for any request and thrown value", async () => {
    await fc.assert(
      fc.asyncProperty(
        uiRequestArb,
        fc.option(scriptedArb<unknown>({ accepted: true }), { nil: undefined }),
        async (request, executeResult) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient(
              executeResult ? { executeResult } : {},
            ),
            new FakeNativeWorker(),
          );
          const result = await port.execute(
            request as Extract<UiRequest, { kind: UiRequest["kind"] }>,
          );
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("submit resolves to an AgentResult for any answer and thrown value", async () => {
    await fc.assert(
      fc.asyncProperty(
        nativeAnswerArb,
        submitScriptArb,
        async (answer, submit) => {
          const port = new ManagedAgentPort(
            new FakeCoreClient(),
            new FakeNativeWorker({ submit }),
          );
          const result = await port.submit(answer);
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("watch resolves to an AgentResult whether the stream settles or fails", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        // The watch either settles with a terminal run or fails with an
        // arbitrary thrown value (abort / transport failure).
        fc.oneof(
          fc.constant<{ settle: true }>({ settle: true }),
          thrownArb.map((t) => ({ settle: false as const, thrown: t })),
        ),
        fc.integer({ min: 0, max: 50 }),
        async (runId, outcome, after) => {
          const client = new FakeCoreClient();
          const port = new ManagedAgentPort(client, new FakeNativeWorker());
          const controller = new AbortController();
          const pending = port.watch(runId, {
            onEvent: () => {},
            onRun: () => {},
            signal: controller.signal,
            after,
          });
          // Drive the single in-flight watch to a terminal state.
          if (outcome.settle) {
            client.settle(fakeLocalRun({ status: "SUCCEEDED" }));
          } else {
            client.failWatch(outcome.thrown);
          }
          const result = await pending;
          assertAgentResult(result);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
