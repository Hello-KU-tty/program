import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentRunPort } from "../src/adapter/agent/agent-run-port";
import type { LocalRun, LocalRunEvent } from "../vendor/frontend-client";
import {
  FakeCoreClient,
  fakeLocalRun,
} from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

/**
 * Property 4 — Abort is not cancel (design §Correctness Property 4;
 * Requirements 6.3, 6.4).
 *
 * Statement: `dispose()` (window hide / panel disposal) aborts the live SSE
 * `watch` subscription ONLY. A `watch` that resolves (rejects) after
 * `signal.aborted === true` NEVER transitions the Builder turn to `CANCELLED`,
 * and it NEVER calls `port.cancel` / `client.cancelRun`. Only the explicit
 * `cancelActive()` (webview `builder/stop`) calls `port.cancel` and moves the
 * turn to `CANCELLED → CLEANUP`.
 *
 * The test drives the REAL {@link AgentSurfaceController} through the REAL
 * {@link ManagedAgentPort} over the deterministic {@link FakeCoreClient} /
 * {@link FakeNativeWorker} fakes (design "Testing Strategy" > Fakes) — no live
 * backend, process, or network. `cancelActive` and the transport `cancelRun`
 * are both spied so the "abort never cancels" invariant is asserted at the
 * port level AND the transport level, for ANY prefix of streamed run events.
 */

const NUM_RUNS = 200;

const PROJECT_ID = "project_1";
const RUN_ID = "run_1";

/** A shape-valid TEXT run event pumped into the live watch. */
function textEvent(sequence: number, text: string): LocalRunEvent {
  return {
    runId: RUN_ID,
    projectId: PROJECT_ID,
    sequence,
    kind: "TEXT",
    text,
    transient: true,
    redactionStatus: "VERIFIED_REDACTED",
  } as unknown as LocalRunEvent;
}

/** A shape-valid TOOL run event pumped into the live watch. */
function toolEvent(
  sequence: number,
  update: Record<string, unknown>,
): LocalRunEvent {
  return {
    runId: RUN_ID,
    projectId: PROJECT_ID,
    sequence,
    kind: "TOOL",
    update,
    transient: true,
    redactionStatus: "VERIFIED_REDACTED",
  } as unknown as LocalRunEvent;
}

/**
 * Build a controller whose port is a {@link ManagedAgentPort} with a `cancel`
 * spy over the deterministic fakes. `startRun` accepts a RUNNING BUILDER run so
 * the controller opens a live `watch`; `cancelRunCount()` counts transport-level
 * `cancelRun` calls; `portCancelCount()` counts port-level `cancel` calls.
 */
function buildHarness() {
  const client = new FakeCoreClient({
    // startRun accepted → RUNNING so superviseRun opens a live watch.
    startRunResult: {
      resolve: fakeLocalRun({ id: RUN_ID, status: "ACCEPTED", phase: "RUNNING" }),
    },
  });

  // Count transport-level cancelRun calls (must stay 0 on the abort path).
  let cancelRunCount = 0;
  const originalCancelRun = client.cancelRun.bind(client);
  client.cancelRun = (id: string) => {
    cancelRunCount += 1;
    return originalCancelRun(id);
  };

  const worker = new FakeNativeWorker();
  const port: AgentRunPort = new ManagedAgentPort(client, worker);

  // Count port-level cancel calls (must stay 0 on the abort path).
  let portCancelCount = 0;
  const originalCancel = port.cancel.bind(port);
  port.cancel = (id) => {
    portCancelCount += 1;
    return originalCancel(id);
  };

  const globalState = new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID });
  const controller = new AgentSurfaceController({
    port: port as ManagedAgentPort,
    globalState,
    onChange: () => {},
    openFolder: async () => {},
    openExternal: async () => {},
  });

  return {
    controller,
    client,
    cancelRunCount: () => cancelRunCount,
    portCancelCount: () => portCancelCount,
  };
}

/** Wait (bounded, deterministic) until the fake watch is in flight. */
async function untilWatching(client: FakeCoreClient): Promise<void> {
  for (let i = 0; i < 50 && !client.isWatching; i += 1) {
    await Promise.resolve();
  }
}

// ---------- Generators ----------

/** An arbitrary prefix of streamed run events (TEXT / TOOL) before the abort. */
const eventPrefixArb = fc.array(
  fc.oneof(
    fc
      .tuple(fc.integer({ min: 1, max: 1000 }), fc.string({ maxLength: 40 }))
      .map(([sequence, text]) => textEvent(sequence, text)),
    fc
      .tuple(
        fc.integer({ min: 1, max: 1000 }),
        fc.option(fc.string({ maxLength: 24 }), { nil: undefined }),
        fc.constantFrom("running", "succeeded", "failed"),
      )
      .map(([sequence, toolId, state]) =>
        toolEvent(sequence, {
          ...(toolId !== undefined ? { toolId } : {}),
          tool: "read",
          state,
        }),
      ),
  ),
  { maxLength: 8 },
);

// ---------- Properties ----------

describe("Property 4: abort is not cancel", () => {
  it("dispose after any event prefix never transitions to CANCELLED and never calls cancel", async () => {
    await fc.assert(
      fc.asyncProperty(eventPrefixArb, async (events) => {
        const { controller, client, cancelRunCount, portCancelCount } =
          buildHarness();

        // Start a Builder run; the supervise loop opens a live watch.
        const running = controller.startBuilder("go");
        await untilWatching(client);
        expect(client.isWatching).toBe(true);

        // Stream an arbitrary prefix of events into the live turn.
        for (const event of events) {
          client.emit(event);
        }

        // Panel dispose: aborts the SSE subscription ONLY (§B.8 abort ≠ cancel).
        controller.dispose();

        // The aborted watch now rejects (as a live SSE drop would). The port
        // maps it to an error; superviseRun sees signal.aborted and returns
        // WITHOUT marking CANCELLED / FAILED.
        client.failWatch(new Error("aborted"));
        await running;

        // The watch's signal was aborted when it settled.
        expect(client.lastWatchAborted).toBe(true);

        // Core invariant (Property 4 / Requirements 6.3, 6.4): an abort is NOT a
        // cancel — the phase is never CANCELLED, and no cancel was issued at
        // either the port or the transport level.
        const phase = controller.getViewModel().builder.phase;
        expect(phase).not.toBe("CANCELLED");
        expect(portCancelCount()).toBe(0);
        expect(cancelRunCount()).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("only cancelActive calls port.cancel and moves the turn to CANCELLED → CLEANUP", async () => {
    const { controller, client, cancelRunCount, portCancelCount } =
      buildHarness();

    // A terminal CANCELLED run is returned by cancelRun (fake default).
    const cancelledRun: LocalRun = fakeLocalRun({
      id: RUN_ID,
      status: "CANCELLED",
      errorCode: "CANCELLED",
      outcome: "NONE",
    });
    client.cancelRunResult = { resolve: cancelledRun };

    // Start a Builder run so there is an active run to cancel.
    const running = controller.startBuilder("go");
    await untilWatching(client);
    expect(client.isWatching).toBe(true);

    // Explicit user "stop": cancelActive DOES call port.cancel → cancelRun.
    await controller.cancelActive();

    expect(portCancelCount()).toBe(1);
    expect(cancelRunCount()).toBe(1);
    // CANCELLED → CLEANUP: the turn settles in CLEANUP awaiting the worker ACK.
    expect(controller.getViewModel().builder.phase).toBe("CLEANUP");

    // Let the in-flight (now-terminal) watch resolve so `running` settles; the
    // cancelRequested coordination keeps the phase at CLEANUP (not re-classified).
    client.settle(cancelledRun);
    await running;
    expect(controller.getViewModel().builder.phase).toBe("CLEANUP");
  });
});
