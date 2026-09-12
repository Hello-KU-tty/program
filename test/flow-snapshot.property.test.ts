import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { FlowController } from "../src/core/flow/flow-controller";
import type { FlowSnapshot } from "../src/core/flow/flow-snapshot";
import { FlowViewModelStore } from "../src/webview/flow/flow-view-model";
import type { DiscoveryInput } from "../src/core/flow/flow-types";
import { SpyFlowPorts } from "./support/spy-flow-ports";
import { FakeClock } from "./support/fake-clock";
import { FakeIdSource } from "./support/fake-id-source";

/**
 * Property-based test for task 11.2.
 *
 * // Feature: discovery-spec-flow, Property 14: Flow snapshot round-trips controller state without duplication
 *
 * Property: applying a snapshot to a {@link FlowViewModelStore} twice equals
 * applying it once (idempotent), and rounds are never duplicated — after apply
 * the store reflects EXACTLY the controller's authoritative round list (same
 * length, same roundIndex sequence), with no duplicate roundIndex values.
 *
 * We build controller state deterministically from a randomized sequence of
 * intents driven through a {@link SpyFlowPorts} (backed by {@link FakeClock} +
 * {@link FakeIdSource}), snapshot the controller, then apply the snapshot to
 * the store twice and assert equality + no duplication.
 *
 * Validates: Requirements 13.2, 13.3.
 */

const NUM_RUNS = 100;

/** The randomized intents we drive to accumulate rounds deterministically. */
type Intent = { kind: "regenerate" } | { kind: "more" } | { kind: "toggleFirst" };

const intentArb: fc.Arbitrary<Intent> = fc.oneof(
  fc.constant<Intent>({ kind: "regenerate" }),
  fc.constant<Intent>({ kind: "more" }),
  fc.constant<Intent>({ kind: "toggleFirst" }),
);

async function buildController(intents: Intent[]): Promise<FlowController> {
  const clock = new FakeClock();
  const ports = new SpyFlowPorts({ clock });
  const controller = new FlowController(ports, { clock, ids: new FakeIdSource() });

  const input: DiscoveryInput = { learningGoal: "테스트 학습 목표" };
  await controller.startDiscovery(input);

  for (const intent of intents) {
    switch (intent.kind) {
      case "regenerate":
        await controller.submitFeedback({ intent: "REGENERATE", targets: [] });
        break;
      case "more":
        await controller.submitFeedback({ intent: "MORE", targets: [] });
        break;
      case "toggleFirst": {
        const rounds = controller.getRounds();
        const first = rounds[0]?.candidates[0];
        if (first) {
          controller.toggleBasket(first);
        }
        break;
      }
    }
  }
  return controller;
}

function roundIndices(snapshot: FlowSnapshot): number[] {
  return snapshot.rounds.map((r) => r.roundIndex);
}

describe("Property 14: Flow snapshot round-trips controller state without duplication (task 11.2)", () => {
  it("apply(s) twice == apply(s) once, and the store reflects the controller's rounds without duplication", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(intentArb, { maxLength: 6 }), async (intents) => {
        const controller = await buildController(intents);
        const snapshot = controller.snapshot();

        // Applying once, then again, is idempotent.
        const once = new FlowViewModelStore();
        once.apply(snapshot);
        const afterOnce = once.current;

        const twice = new FlowViewModelStore();
        twice.apply(snapshot);
        twice.apply(snapshot);
        const afterTwice = twice.current;

        // Idempotence: the projection after two applies deep-equals one apply.
        expect(afterTwice).toEqual(afterOnce);

        // The store reflects EXACTLY the controller's authoritative round list.
        expect(afterOnce).not.toBeNull();
        const storeRounds = roundIndices(afterOnce as FlowSnapshot);
        const controllerRounds = controller.getRounds().map((r) => r.roundIndex);
        expect(storeRounds).toEqual(controllerRounds);

        // No round duplication (Req 13.3): roundIndex values are unique.
        expect(new Set(storeRounds).size).toBe(storeRounds.length);

        // A second apply cannot have grown or shrunk the round list.
        const twiceRounds = roundIndices(afterTwice as FlowSnapshot);
        expect(twiceRounds).toEqual(storeRounds);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
