import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { NativeWorkerStatusCode } from "../vendor/frontend-host";
import { classifyNativeWorkerStatus } from "../vendor/frontend-client";
import { FakeCoreClient, fakeLocalRun } from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

/**
 * Property 5 — Cleanup is settled by the worker (design §Correctness Property 5;
 * Requirements 6.5, 6.6, 12.1).
 *
 * Statement: once an explicit user "stop" (`cancelActive`) has put the Builder
 * turn into `CLEANUP`, the ONLY thing that settles it back to `IDLE` is a
 * worker status whose `classifyNativeWorkerStatus(code).stage === 'AGENT_ENDED'`
 * (the `AGENT_ENDED_*` / `AGENT_SESSION_CLOSED_*` codes). For EVERY other worker
 * status — regardless of how many arrive or in what order — the turn stays in
 * `CLEANUP`; no other status prematurely settles the cleanup.
 *
 * The test drives the REAL {@link AgentSurfaceController} through the REAL
 * {@link ManagedAgentPort} over the deterministic {@link FakeCoreClient} /
 * {@link FakeNativeWorker} fakes (design "Testing Strategy" > Fakes) — no live
 * backend, process, or network. Worker statuses are injected verbatim via
 * {@link FakeNativeWorker.pushStatus}, which fans out to the controller's
 * `subscribeStatus` listener exactly as the managed worker would.
 *
 * Determinism is total: cleanup is entered by settling a scripted `cancelRun`,
 * and every phase transition is a pure function of the injected status codes.
 * One property → one test; each runs a minimum of {@link NUM_RUNS} iterations.
 */

const NUM_RUNS = 200;

const PROJECT_ID = "project_1";
const RUN_ID = "run_1";

/** Non-AGENT_ENDED worker codes spanning every other classifier stage. */
const NON_ENDED_CODES: readonly NativeWorkerStatusCode[] = [
  "WORKER_STARTED", // STARTING
  "WORKER_CONNECTED", // CONNECTED
  "JOB_CLAIMED_BUILDER", // JOB_CLAIMED
  "AGENT_OPENING_BUILDER", // AGENT_OPENING
  "AGENT_QUEUED_BUILDER", // AGENT_QUEUED
  "AGENT_RUNNING_BUILDER", // AGENT_RUNNING
  "AGENT_FAILED_BUILDER", // AGENT_FAILED
  "USER_INPUT_BUILDER", // USER_INPUT
  "PERMISSION_BUILDER", // PERMISSION
  "HELPER_WINDOW_OPENING", // HELPER_WINDOW_OPENING
  "WORKSPACE_SWITCHING", // WORKSPACE_SWITCHING
  "WORKSPACE_SWITCH_FAILED", // WORKSPACE_SWITCH_FAILED
  "WORKSPACE_SWITCH_UNCONFIRMED", // WORKSPACE_SWITCH_FAILED
  "SOME_DIAGNOSTIC_CODE", // DIAGNOSTIC (fallthrough)
] as const;

/** AGENT_ENDED-classified worker codes (the only cleanup-settling stage). */
const ENDED_CODES: readonly NativeWorkerStatusCode[] = [
  "AGENT_ENDED_BUILDER",
  "AGENT_ENDED_HELPER",
  "AGENT_SESSION_CLOSED_BUILDER",
  "AGENT_SESSION_CLOSED_HELPER",
] as const;

/** Sanity: the fixtures actually classify to the stages this property assumes. */
function stageOf(code: NativeWorkerStatusCode): string | null {
  return classifyNativeWorkerStatus(code)?.stage ?? null;
}

/**
 * Build a controller already driven into `CLEANUP` via an explicit stop:
 *  1. `startBuilder` opens a live watch (phase RUNNING, `activeRunId` set);
 *  2. once the watch is in-flight, `cancelActive` runs the scripted `cancelRun`
 *     (a terminal CANCELLED run) → the controller sets CANCELLED → CLEANUP;
 *  3. the in-flight watch is settled with the terminal CANCELLED run so the
 *     `startBuilder` supervise loop resolves without re-classifying over the
 *     CLEANUP phase (the `cancelRequested` coordination flag).
 *
 * Returns the controller (in CLEANUP), the worker (to push statuses), and a
 * phase accessor.
 */
async function buildInCleanup(): Promise<{
  controller: AgentSurfaceController;
  worker: FakeNativeWorker;
  phase: () => string;
}> {
  const terminalCancelled = fakeLocalRun({
    id: RUN_ID,
    status: "CANCELLED",
    errorCode: "CANCELLED",
    outcome: "NONE",
  });
  const client = new FakeCoreClient({
    startRunResult: { resolve: fakeLocalRun({ id: RUN_ID }) },
    cancelRunResult: { resolve: terminalCancelled },
  });
  const worker = new FakeNativeWorker();
  const port = new ManagedAgentPort(client, worker);
  const globalState = new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID });
  const controller = new AgentSurfaceController({
    port,
    globalState,
    onChange: () => {},
    openFolder: async () => {},
    openExternal: async () => {},
  });

  // Start a live Builder run; do NOT await — the supervise loop blocks on the
  // in-flight watch until we settle it below.
  const started = controller.startBuilder("start please");

  // Yield microtasks until the watch is in-flight (prepareBuilder + startBuilder
  // resolve first), then the run is RUNNING and `activeRunId` is set.
  for (let i = 0; i < 50 && !client.isWatching; i += 1) {
    await Promise.resolve();
  }
  expect(client.isWatching).toBe(true);
  expect(controller.getViewModel().builder.phase).toBe("RUNNING");

  // Explicit user "stop" → CANCELLED → CLEANUP.
  await controller.cancelActive();
  expect(controller.getViewModel().builder.phase).toBe("CLEANUP");

  // Settle the in-flight watch with the terminal CANCELLED run so `startBuilder`
  // resolves; the `cancelRequested` flag keeps the phase at CLEANUP.
  client.settle(terminalCancelled);
  await started;
  expect(controller.getViewModel().builder.phase).toBe("CLEANUP");

  return {
    controller,
    worker,
    phase: () => controller.getViewModel().builder.phase,
  };
}

// ---------- Generators ----------

const nonEndedArb = fc.constantFrom(...NON_ENDED_CODES);
const endedArb = fc.constantFrom(...ENDED_CODES);

// ---------- Properties ----------

describe("Property 5: cleanup is settled by the worker", () => {
  it("fixtures classify to the stages this property relies on", () => {
    for (const code of NON_ENDED_CODES) {
      expect(stageOf(code)).not.toBe("AGENT_ENDED");
    }
    for (const code of ENDED_CODES) {
      expect(stageOf(code)).toBe("AGENT_ENDED");
    }
  });

  it("no NON-AGENT_ENDED worker status ever settles CLEANUP → IDLE", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(nonEndedArb, { minLength: 1, maxLength: 12 }),
        async (codes) => {
          const { worker, phase } = await buildInCleanup();

          // Push an arbitrary sequence of non-AGENT_ENDED statuses.
          for (const code of codes) {
            worker.pushStatus(code);
            // The turn NEVER leaves CLEANUP for any of these.
            expect(phase()).toBe("CLEANUP");
          }
          expect(phase()).toBe("CLEANUP");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("CLEANUP settles to IDLE only when an AGENT_ENDED status arrives", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(nonEndedArb, { maxLength: 8 }),
        endedArb,
        async (noise, endedCode) => {
          const { worker, phase } = await buildInCleanup();

          // Arbitrary non-settling noise first — stays in CLEANUP throughout.
          for (const code of noise) {
            worker.pushStatus(code);
            expect(phase()).toBe("CLEANUP");
          }

          // The AGENT_ENDED status is the ONLY thing that settles cleanup.
          worker.pushStatus(endedCode);
          expect(phase()).toBe("IDLE");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("an AGENT_ENDED status has no effect unless the phase is CLEANUP", async () => {
    // Guard against over-eager settling: outside CLEANUP, AGENT_ENDED must not
    // force the turn to IDLE. A fresh controller starts IDLE; push AGENT_ENDED
    // codes and confirm nothing spuriously toggles the Builder phase.
    await fc.assert(
      fc.asyncProperty(
        fc.array(endedArb, { minLength: 1, maxLength: 6 }),
        async (codes) => {
          const client = new FakeCoreClient();
          const worker = new FakeNativeWorker();
          const port = new ManagedAgentPort(client, worker);
          const globalState = new FakeGlobalState();
          const controller = new AgentSurfaceController({
            port,
            globalState,
            onChange: () => {},
            openFolder: async () => {},
            openExternal: async () => {},
          });

          const before = controller.getViewModel().builder.phase;
          expect(before).toBe("IDLE");
          for (const code of codes) {
            worker.pushStatus(code);
          }
          // The AGENT_ENDED settling is CLEANUP-scoped: IDLE stays IDLE.
          expect(controller.getViewModel().builder.phase).toBe("IDLE");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
