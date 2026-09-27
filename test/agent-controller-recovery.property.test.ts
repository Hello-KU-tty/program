import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentRunPort } from "../src/adapter/agent/agent-run-port";
import type { LocalRun } from "../vendor/frontend-client";
import {
  FakeCoreClient,
  fakeLocalRun,
  fakeSnapshot,
} from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

/**
 * Property 6 — Recovery replays fully (design §Correctness Property 6;
 * Requirement 3.3).
 *
 * Statement (design §Correctness Property 6): on `recover()` with an active
 * Builder run, `watch` is called with `after === 0`. Concretely, starting a
 * Builder run can `openFolder` and reload the extension host, which drops the
 * SSE stream; on reactivation the controller re-binds to any still-active
 * BUILDER run and re-subscribes via `watchRun` with `after: 0` — a FULL replay
 * from sequence 0 (Requirement 3.3). Recovery NEVER resumes from a partial
 * offset, regardless of what sequence the run had retained before the reload
 * (`retainedFromSequence` / `lastSequence`).
 *
 * The test drives the REAL {@link AgentSurfaceController} through the REAL
 * {@link ManagedAgentPort} over the deterministic {@link FakeCoreClient} /
 * {@link FakeNativeWorker} fakes (design "Testing Strategy" > Fakes) — no live
 * backend, process, or network. The {@link FakeCoreClient} records every `after`
 * passed to `watchRun` in `watchAfters` / `lastWatchAfter`, so the replay-from-0
 * invariant is asserted directly (design fake note: "an `after` recorder
 * verifies replay-from-0 on recovery").
 */

const NUM_RUNS = 200;

const PROJECT_ID = "project_1";

/** Statuses for which `isRunActive` is true (ACCEPTED / RUNNING). */
const ACTIVE_STATUSES: readonly LocalRun["status"][] = ["ACCEPTED", "RUNNING"];

/**
 * Build a controller + fake client seeded with `bhlr.lastProjectId` so
 * `recover()` reads the project and re-binds to the active BUILDER run returned
 * by `listRuns`. The `restoreProject` fake carries a current task so
 * `prepareBuilder` (called inside `recover`) succeeds.
 */
function buildHarness(activeRun: LocalRun) {
  const client = new FakeCoreClient({
    // recover() → listActiveBuilderRun → listRuns must surface the active run.
    listRunsResult: { resolve: [activeRun] },
    // recover() → prepareBuilder → restoreProject requires a current task.
    restoreProjectResult: { resolve: fakeSnapshot() },
  });
  const worker = new FakeNativeWorker();
  const port: AgentRunPort = new ManagedAgentPort(client, worker);

  const globalState = new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID });
  const controller = new AgentSurfaceController({
    port: port as ManagedAgentPort,
    globalState,
    onChange: () => {},
    openFolder: async () => {},
    openExternal: async () => {},
  });

  return { controller, client };
}

/**
 * Drive `recover()` and, once its supervise loop has opened the watch, settle
 * that watch terminal so the returned promise resolves deterministically. The
 * `after` value recorded when the watch opened is what the property asserts.
 */
async function runRecover(
  controller: AgentSurfaceController,
  client: FakeCoreClient,
): Promise<void> {
  const recovering = controller.recover();
  // recover() awaits listActiveBuilderRun + prepareBuilder before opening the
  // watch, so yield microtasks until the watch is in-flight, then settle it.
  for (let i = 0; i < 50 && !client.isWatching; i += 1) {
    await Promise.resolve();
  }
  expect(client.isWatching).toBe(true);
  client.settle(fakeLocalRun({ status: "SUCCEEDED", outcome: "PENDING" }));
  await recovering;
}

// ---------- Generators ----------

/**
 * An arbitrary active BUILDER run bound to PROJECT_ID with ANY prior retained
 * offset. `retainedFromSequence` and `lastSequence` range widely (including
 * large non-zero offsets) so the property asserts replay-from-0 regardless of
 * the run's pre-reload progress. Status is constrained to the two active ones
 * so `isRunActive` holds and `listActiveBuilderRun` returns it.
 */
const activeBuilderRunArb = fc
  .record({
    status: fc.constantFrom(...ACTIVE_STATUSES),
    retainedFromSequence: fc.integer({ min: 0, max: 100000 }),
    extraLast: fc.integer({ min: 0, max: 100000 }),
    id: fc.string({ minLength: 1, maxLength: 24 }).map((s) => `run_${s}`),
  })
  .map(({ status, retainedFromSequence, extraLast, id }) =>
    fakeLocalRun({
      id,
      kind: "BUILDER",
      projectId: PROJECT_ID,
      status,
      outcome: "PENDING",
      retainedFromSequence,
      lastSequence: retainedFromSequence + extraLast,
    }),
  );

// ---------- Property ----------

describe("Property 6: recovery replays fully", () => {
  it("recover() opens the watch with after === 0 for ANY prior retained sequence", async () => {
    await fc.assert(
      fc.asyncProperty(activeBuilderRunArb, async (activeRun) => {
        const { controller, client } = buildHarness(activeRun);

        await runRecover(controller, client);

        // Core invariant (Property 6 / Requirement 3.3): the recovery watch is a
        // FULL replay from sequence 0 — never a partial resume from the run's
        // retained offset.
        expect(client.lastWatchAfter).toBe(0);
        // Exactly one watch was opened by recovery, and it used after: 0.
        expect(client.watchAfters).toEqual([0]);
        // The recovery `after` is pinned to 0 and NOT derived from the run's
        // retained offset: whenever the generated run carried a non-zero prior
        // offset, `after` still differs from it (i.e. never a partial resume).
        if (activeRun.retainedFromSequence !== 0) {
          expect(client.lastWatchAfter).not.toBe(activeRun.retainedFromSequence);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("with a large retained offset, recovery still replays from 0 (never partial)", async () => {
    const activeRun = fakeLocalRun({
      id: "run_recovered",
      kind: "BUILDER",
      projectId: PROJECT_ID,
      status: "RUNNING",
      outcome: "PENDING",
      retainedFromSequence: 4242,
      lastSequence: 9999,
    });
    const { controller, client } = buildHarness(activeRun);

    await runRecover(controller, client);

    expect(client.watchAfters).toEqual([0]);
    expect(client.lastWatchAfter).toBe(0);
  });
});
