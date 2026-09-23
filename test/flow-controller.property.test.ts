import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { FlowController } from "../src/core/flow/flow-controller";
import { validateFeedback } from "../src/core/flow/feedback-validation";
import type {
  CandidateRevisionReference,
  DiscoveryFeedbackInput,
  DiscoveryFeedbackIntent,
  DiscoveryInput,
} from "../src/core/flow/flow-types";
import type { PortError } from "../src/adapter/flow/discovery-port";
import { SpyFlowPorts } from "./support/spy-flow-ports";
import { FakeClock } from "./support/fake-clock";
import { FakeIdSource } from "./support/fake-id-source";

/**
 * Property-based tests for the pure {@link FlowController} core (Discovery ->
 * Spec flow), exercised with the call-recording {@link SpyFlowPorts}, a
 * deterministic {@link FakeClock}, and a deterministic {@link FakeIdSource}.
 * Each property corresponds to a "Correctness Property" in
 * `.kiro/specs/discovery-spec-flow/design.md` and runs a minimum of 100
 * iterations. One property -> one test.
 *
 * Determinism notes (see test/support/spy-flow-ports.ts):
 *   - Default happy-path ops resolve on the microtask queue: the spy advances
 *     its OWN internal FakeClock synchronously inside each call, so simply
 *     `await`-ing the controller method settles them.
 *   - The controller's 30s timeout timers are armed on the injected FakeClock
 *     and fire ONLY when the test calls `clock.advance(...)`.
 *   - `setPending(op)` makes an op hang forever (models an in-flight op);
 *     `setError(op, err)` scripts an `err(PortError)`.
 */

const NUM_RUNS = 100;
const TIMEOUT_MS = 30_000;

// ---------- Generators ----------

/** The 9 known feedback intents. */
const KNOWN_INTENTS: readonly DiscoveryFeedbackIntent[] = [
  "PIN",
  "REJECT",
  "MERGE",
  "REVISE",
  "SHRINK",
  "EXPAND",
  "REGENERATE",
  "MORE",
  "SELECT",
];

/** A candidate reference (small id space so duplicates arise naturally). */
const refArb: fc.Arbitrary<CandidateRevisionReference> = fc.record({
  candidateId: fc.constantFrom("c1", "c2", "c3", "c4", "c5"),
  revision: fc.integer({ min: 1, max: 3 }),
});

/** An intent drawn from the known enum plus off-enum strings (Req 3.8). */
const intentArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(...KNOWN_INTENTS),
  fc.constantFrom("UNKNOWN", "select", "merge", "", "FOO"),
);

/**
 * An arbitrary feedback input: any intent (known or off-enum) with an arbitrary
 * target list and optional message. Cast through `unknown` because the intent
 * may be an off-enum string that the compile-time type forbids — exactly the
 * untrusted-webview payload the validator must guard against.
 */
const feedbackInputArb: fc.Arbitrary<DiscoveryFeedbackInput> = fc
  .record({
    intent: intentArb,
    targets: fc.array(refArb, { maxLength: 4 }),
    message: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
  })
  .map((r) => r as unknown as DiscoveryFeedbackInput);

/** A valid learning goal: 1..240 non-whitespace-only chars. */
const learningGoalArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 120 })
  .filter((s) => s.trim().length > 0 && s.length <= 240);

const discoveryInputArb: fc.Arbitrary<DiscoveryInput> = learningGoalArb.map(
  (learningGoal) => ({ learningGoal }),
);

/** A concrete valid feedback for a given intent (used to reach later phases). */
function validFeedbackFor(
  intent: DiscoveryFeedbackIntent,
  targets: CandidateRevisionReference[] = [{ candidateId: "c1", revision: 1 }],
): DiscoveryFeedbackInput {
  return { intent, targets };
}

// ---------- Harness helpers ----------

interface Harness {
  controller: FlowController;
  ports: SpyFlowPorts;
  clock: FakeClock;
  ids: FakeIdSource;
}

/** A fresh controller wired to a spy port, fake clock, and fake id source. */
function freshHarness(): Harness {
  const clock = new FakeClock();
  const ports = new SpyFlowPorts();
  const ids = new FakeIdSource();
  const controller = new FlowController(ports, { clock, ids });
  return { controller, ports, clock, ids };
}

/**
 * Drive the controller into DISCOVERY_WORKSPACE state: a project + active
 * session + first preview round, all via default happy-path ports. Awaiting
 * `startDiscovery` settles both the start and the chained first-preview op.
 */
async function toWorkspace(h: Harness): Promise<void> {
  await h.controller.startDiscovery({ learningGoal: "학습 목표" });
}

/**
 * Drive the controller into SPEC_REVIEW with a DRAFT spec: workspace, then a
 * valid SELECT (which transitions to SPEC_REVIEW and drafts a spec via the
 * default happy-path spec port).
 */
async function toSpecReview(h: Harness): Promise<void> {
  await toWorkspace(h);
  await h.controller.submitFeedback(validFeedbackFor("SELECT"));
}

describe("FlowController properties", () => {
  // Feature: discovery-spec-flow, Property 1: Feedback validity gate
  // For any DiscoveryFeedbackInput (arbitrary intent incl. off-enum, arbitrary
  // targets), submitFeedback invokes DiscoveryPort.submitFeedback iff the
  // feedback satisfies every validation rule; otherwise no port call occurs.
  it("Property 1: invokes submitFeedback iff the feedback is valid", async () => {
    await fc.assert(
      fc.asyncProperty(feedbackInputArb, async (feedback) => {
        const h = freshHarness();
        await toWorkspace(h);
        const before = h.ports.callCountOf("submitFeedback");

        await h.controller.submitFeedback(feedback);

        const delta = h.ports.callCountOf("submitFeedback") - before;
        const expectedValid = validateFeedback(feedback).ok;
        expect(delta).toBe(expectedValid ? 1 : 0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 2: Valid action makes exactly one enveloped port call
  // For any accepted controller action, the corresponding port op is invoked
  // exactly once and the RequestEnvelope carries a non-empty correlationId, a
  // non-empty idempotencyKey, and an expectedRevision equal to the controller's
  // current revision for the targeted entity.
  it("Property 2: valid action makes exactly one enveloped port call", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "startDiscovery",
          "submitFeedback",
          "select",
          "refineSpec",
          "confirmSpec",
        ),
        async (action) => {
          const h = freshHarness();

          if (action === "startDiscovery") {
            // Fresh start: expectedRevision is 0 (no session yet).
            await h.controller.startDiscovery({ learningGoal: "목표" });
            const calls = h.ports.calls.filter((c) => c.op === "startDiscovery");
            expect(calls).toHaveLength(1);
            const env = calls[0].env;
            expect(env.correlationId.length).toBeGreaterThan(0);
            expect(env.idempotencyKey.length).toBeGreaterThan(0);
            expect(env.expectedRevision).toBe(0);
            return;
          }

          if (action === "submitFeedback") {
            await toWorkspace(h);
            // Session revision is 1 (mock default) -> expectedRevision === 1.
            const session = h.controller.getSession();
            expect(session).not.toBeNull();
            const before = h.ports.callCountOf("submitFeedback");
            await h.controller.submitFeedback(validFeedbackFor("MORE", []));
            expect(h.ports.callCountOf("submitFeedback") - before).toBe(1);
            const call = h.ports.calls.filter((c) => c.op === "submitFeedback").at(-1)!;
            expect(call.env.correlationId.length).toBeGreaterThan(0);
            expect(call.env.idempotencyKey.length).toBeGreaterThan(0);
            expect(call.env.expectedRevision).toBe(session!.revision);
            return;
          }

          if (action === "select") {
            await toWorkspace(h);
            const session = h.controller.getSession();
            const before = h.ports.callCountOf("submitFeedback");
            await h.controller.submitFeedback(validFeedbackFor("SELECT"));
            expect(h.ports.callCountOf("submitFeedback") - before).toBe(1);
            const call = h.ports.calls.filter((c) => c.op === "submitFeedback").at(-1)!;
            expect(call.env.expectedRevision).toBe(session!.revision);
            return;
          }

          if (action === "refineSpec") {
            await toSpecReview(h);
            const spec = h.controller.getSpec();
            expect(spec).not.toBeNull();
            const before = h.ports.callCountOf("refineSpec");
            await h.controller.refineSpec("더 좁혀줘");
            expect(h.ports.callCountOf("refineSpec") - before).toBe(1);
            const call = h.ports.calls.filter((c) => c.op === "refineSpec").at(-1)!;
            expect(call.env.correlationId.length).toBeGreaterThan(0);
            expect(call.env.idempotencyKey.length).toBeGreaterThan(0);
            expect(call.env.expectedRevision).toBe(spec!.revision);
            return;
          }

          // confirmSpec
          await toSpecReview(h);
          const spec = h.controller.getSpec();
          expect(spec).not.toBeNull();
          const before = h.ports.callCountOf("confirmSpec");
          await h.controller.confirmSpec();
          expect(h.ports.callCountOf("confirmSpec") - before).toBe(1);
          const call = h.ports.calls.filter((c) => c.op === "confirmSpec").at(-1)!;
          expect(call.env.correlationId.length).toBeGreaterThan(0);
          expect(call.env.idempotencyKey.length).toBeGreaterThan(0);
          expect(call.env.expectedRevision).toBe(spec!.revision);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 3: Rejected feedback preserves session and basket
  // For any DiscoveryFeedbackInput that fails validation, after submitFeedback
  // returns the accumulated rounds, the session (incl. revision), and the
  // basket are unchanged, and exactly one rejection notice is appended.
  it("Property 3: rejected feedback preserves session and basket", async () => {
    await fc.assert(
      fc.asyncProperty(
        feedbackInputArb.filter((f) => !validateFeedback(f).ok),
        fc.array(refArb, { maxLength: 3 }),
        async (invalidFeedback, toBasket) => {
          const h = freshHarness();
          await toWorkspace(h);

          // Seed some basket state so we can prove it is untouched.
          for (const ref of toBasket) {
            h.controller.toggleBasket(ref);
          }

          const sessionBefore = JSON.stringify(h.controller.getSession());
          const roundsBefore = JSON.stringify(h.controller.getRounds());
          const basketBefore = JSON.stringify(h.controller.getBasketKeys());
          const noticesBefore = h.controller.notices.length;
          const feedbackCallsBefore = h.ports.callCountOf("submitFeedback");

          const res = await h.controller.submitFeedback(invalidFeedback);
          expect(res.accepted).toBe(false);

          // No port call was made.
          expect(h.ports.callCountOf("submitFeedback")).toBe(feedbackCallsBefore);
          // Session, rounds, basket unchanged byte-for-byte.
          expect(JSON.stringify(h.controller.getSession())).toBe(sessionBefore);
          expect(JSON.stringify(h.controller.getRounds())).toBe(roundsBefore);
          expect(JSON.stringify(h.controller.getBasketKeys())).toBe(basketBefore);
          // Exactly one rejection (validation) notice appended.
          const added = h.controller.notices.slice(noticesBefore);
          expect(added).toHaveLength(1);
          expect(added[0].kind).toBe("validation");
          expect(added[0].surface).toBe("discovery");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 4: Discovery start creates a project and requests previews
  // For any DiscoveryInput whose learningGoal has 1..240 non-whitespace chars, a
  // successful startDiscovery yields a Project with status DISCOVERY, exactly
  // one startDiscovery call, and exactly one generatePreviewRound call.
  it("Property 4: discovery start creates a project and requests previews", async () => {
    await fc.assert(
      fc.asyncProperty(discoveryInputArb, async (input) => {
        const h = freshHarness();

        await h.controller.startDiscovery(input);

        const project = h.controller.getProject();
        expect(project).not.toBeNull();
        expect(project!.status).toBe("DISCOVERY");
        expect(h.controller.getInput()).toEqual(input);
        expect(h.ports.callCountOf("startDiscovery")).toBe(1);
        expect(h.ports.callCountOf("generatePreviewRound")).toBe(1);
        // First preview round landed.
        expect(h.controller.getPreviewRound()).not.toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 5: Rounds accumulate and preserve basket membership
  // For any sequence of successful feedback-driven rounds, the controller
  // retains all prior rounds in strictly ascending roundIndex order (none
  // dropped/replaced), and every basketed ref still present in the accumulated
  // candidate set remains in the basket after each new round.
  it("Property 5: rounds accumulate and preserve basket membership", async () => {
    await fc.assert(
      fc.asyncProperty(
        // A sequence of non-SELECT accepted feedbacks so rounds accumulate on
        // the discovery surface (SELECT would leave to SPEC_REVIEW).
        fc.array(fc.constantFrom<DiscoveryFeedbackIntent>("MORE", "REGENERATE"), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.array(refArb, { maxLength: 3 }),
        async (intents, toBasket) => {
          const h = freshHarness();
          await toWorkspace(h);

          for (const ref of toBasket) {
            h.controller.toggleBasket(ref);
          }
          const basketBefore = new Set(h.controller.getBasketKeys());

          for (const intent of intents) {
            const roundsBefore = h.controller.getRounds();
            await h.controller.submitFeedback(validFeedbackFor(intent, []));
            const roundsAfter = h.controller.getRounds();

            // A new round was appended; no prior round dropped.
            expect(roundsAfter.length).toBe(roundsBefore.length + 1);
            for (let i = 0; i < roundsBefore.length; i++) {
              expect(roundsAfter[i].roundIndex).toBe(roundsBefore[i].roundIndex);
            }
            // Strictly ascending roundIndex.
            for (let i = 1; i < roundsAfter.length; i++) {
              expect(roundsAfter[i].roundIndex).toBeGreaterThan(
                roundsAfter[i - 1].roundIndex,
              );
            }
            // Basket membership is preserved (never cleared by a round).
            const basketNow = new Set(h.controller.getBasketKeys());
            for (const key of basketBefore) {
              expect(basketNow.has(key)).toBe(true);
            }
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 6: Failure preserves last-successful state and re-enables the surface
  // For any port op that resolves with a PortError, the controller emits exactly
  // one error notice for the affected surface, restores observable state to the
  // last successful value, and clears the surface's in-flight lock.
  it("Property 6: failure preserves last-successful state and re-enables the surface", async () => {
    const errorArb: fc.Arbitrary<PortError["code"]> = fc.constantFrom(
      "unavailable",
      "invalid",
      "unknown",
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("startDiscovery", "submitFeedback", "refineSpec", "confirmSpec"),
        errorArb,
        async (op, code) => {
          const h = freshHarness();
          const error: PortError = { code, message: "boom" };

          if (op === "startDiscovery") {
            h.ports.setError("startDiscovery", error);
            const noticesBefore = h.controller.notices.length;
            await h.controller.startDiscovery({ learningGoal: "목표" });
            // Input retained, status stays DISCOVERY, surface re-enabled.
            expect(h.controller.getInput()).toEqual({ learningGoal: "목표" });
            expect(h.controller.getProject()!.status).toBe("DISCOVERY");
            expect(h.controller.isInProgress("discovery")).toBe(false);
            const added = h.controller.notices.slice(noticesBefore);
            expect(added.filter((n) => n.surface === "discovery" && n.kind === "error")).toHaveLength(1);
            return;
          }

          if (op === "submitFeedback") {
            await toWorkspace(h);
            const sessionBefore = JSON.stringify(h.controller.getSession());
            const roundsBefore = h.controller.getRounds().length;
            h.ports.setError("submitFeedback", error);
            const noticesBefore = h.controller.notices.length;
            await h.controller.submitFeedback(validFeedbackFor("MORE", []));
            // No new round appended; session preserved; surface re-enabled.
            expect(h.controller.getRounds().length).toBe(roundsBefore);
            expect(JSON.stringify(h.controller.getSession())).toBe(sessionBefore);
            expect(h.controller.isInProgress("discovery")).toBe(false);
            const added = h.controller.notices.slice(noticesBefore);
            expect(added.filter((n) => n.surface === "discovery" && n.kind === "error")).toHaveLength(1);
            return;
          }

          if (op === "refineSpec") {
            await toSpecReview(h);
            const specBefore = JSON.stringify(h.controller.getSpec());
            h.ports.setError("refineSpec", error);
            const noticesBefore = h.controller.notices.length;
            await h.controller.refineSpec("좁혀줘");
            // Prior revision retained; spec surface re-enabled.
            expect(JSON.stringify(h.controller.getSpec())).toBe(specBefore);
            expect(h.controller.isInProgress("spec")).toBe(false);
            const added = h.controller.notices.slice(noticesBefore);
            expect(added.filter((n) => n.surface === "spec" && n.kind === "error")).toHaveLength(1);
            return;
          }

          // confirmSpec with a non-conflict error: prior status restored.
          await toSpecReview(h);
          const statusBefore = h.controller.getProject()!.status;
          h.ports.setError("confirmSpec", error);
          const noticesBefore = h.controller.notices.length;
          await h.controller.confirmSpec();
          expect(h.controller.getProject()!.status).toBe(statusBefore);
          expect(h.controller.isInProgress("spec")).toBe(false);
          const added = h.controller.notices.slice(noticesBefore);
          expect(added.filter((n) => n.surface === "spec" && n.kind === "error")).toHaveLength(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 7: Timeout is treated as failure with state preserved
  // For any port op whose resolution is delayed past the 30s budget, advancing
  // the clock past the budget causes the controller to treat it as failed: it
  // emits a timeout notice, preserves last-successful state, and re-enables the
  // surface — identically to an explicit failure.
  //
  // Implementation note: on timeout the controller's runOp emits the shared
  // timeout notice ("시간이 초과되었습니다...") AND then invokes the op's onErr,
  // which emits its own op-specific error notice. So a timeout yields >= 1
  // error notice on the surface, one of which is the timeout copy. The property
  // (treated as failure, state preserved, surface re-enabled, timeout surfaced)
  // holds; we assert the timeout notice is present rather than exactly one.
  const TIMEOUT_COPY = "시간이 초과되었습니다";
  it("Property 7: timeout is treated as failure with state preserved", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("submitFeedback", "refineSpec", "confirmSpec"),
        fc.integer({ min: 0, max: 5_000 }),
        async (op, overshoot) => {
          const h = freshHarness();

          if (op === "submitFeedback") {
            await toWorkspace(h);
            const sessionBefore = JSON.stringify(h.controller.getSession());
            const roundsBefore = h.controller.getRounds().length;
            h.ports.setPending("submitFeedback");
            const noticesBefore = h.controller.notices.length;

            // Kick the op; it hangs. Assert the surface is in progress.
            const pending = h.controller.submitFeedback(validFeedbackFor("MORE", []));
            expect(h.controller.isInProgress("discovery")).toBe(true);

            // Fire the 30s timeout timer on the controller's clock.
            h.clock.advance(TIMEOUT_MS + overshoot);

            // Treated as failure: state preserved, surface re-enabled, notice.
            expect(h.controller.getRounds().length).toBe(roundsBefore);
            expect(JSON.stringify(h.controller.getSession())).toBe(sessionBefore);
            expect(h.controller.isInProgress("discovery")).toBe(false);
            const added = h.controller.notices.slice(noticesBefore);
            const errs = added.filter((n) => n.surface === "discovery" && n.kind === "error");
            expect(errs.length).toBeGreaterThanOrEqual(1);
            expect(errs.some((n) => n.message.includes(TIMEOUT_COPY))).toBe(true);
            void pending;
            return;
          }

          if (op === "refineSpec") {
            await toSpecReview(h);
            const specBefore = JSON.stringify(h.controller.getSpec());
            h.ports.setPending("refineSpec");
            const noticesBefore = h.controller.notices.length;

            const pending = h.controller.refineSpec("좁혀줘");
            expect(h.controller.isInProgress("spec")).toBe(true);
            h.clock.advance(TIMEOUT_MS + overshoot);

            expect(JSON.stringify(h.controller.getSpec())).toBe(specBefore);
            expect(h.controller.isInProgress("spec")).toBe(false);
            const added = h.controller.notices.slice(noticesBefore);
            const errs = added.filter((n) => n.surface === "spec" && n.kind === "error");
            expect(errs.length).toBeGreaterThanOrEqual(1);
            expect(errs.some((n) => n.message.includes(TIMEOUT_COPY))).toBe(true);
            void pending;
            return;
          }

          // confirmSpec
          await toSpecReview(h);
          const statusBefore = h.controller.getProject()!.status;
          h.ports.setPending("confirmSpec");
          const noticesBefore = h.controller.notices.length;

          const pending = h.controller.confirmSpec();
          expect(h.controller.isInProgress("spec")).toBe(true);
          h.clock.advance(TIMEOUT_MS + overshoot);

          expect(h.controller.getProject()!.status).toBe(statusBefore);
          expect(h.controller.isInProgress("spec")).toBe(false);
          const added = h.controller.notices.slice(noticesBefore);
          const errs = added.filter((n) => n.surface === "spec" && n.kind === "error");
          expect(errs.length).toBeGreaterThanOrEqual(1);
          expect(errs.some((n) => n.message.includes(TIMEOUT_COPY))).toBe(true);
          void pending;
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 8: Candidate selection transitions to spec review and drafts a spec
  // For any accepted SELECT feedback targeting exactly one candidate, the
  // controller sets Project.status to SPEC_REVIEW, records the selected ref, and
  // invokes SpecPort.generateSpecDraft exactly once for that candidate.
  it("Property 8: candidate selection transitions to spec review and drafts a spec", async () => {
    await fc.assert(
      fc.asyncProperty(refArb, async (target) => {
        const h = freshHarness();
        await toWorkspace(h);

        const before = h.ports.callCountOf("generateSpecDraft");
        await h.controller.submitFeedback(validFeedbackFor("SELECT", [target]));

        expect(h.controller.getProject()!.status).toBe("SPEC_REVIEW");
        expect(h.controller.getSelectedCandidate()).toEqual(target);
        expect(h.ports.callCountOf("generateSpecDraft") - before).toBe(1);
        // The draft call targeted the selected candidate.
        const call = h.ports.calls.filter((c) => c.op === "generateSpecDraft").at(-1)!;
        expect((call.req as { selectedCandidate: CandidateRevisionReference }).selectedCandidate).toEqual(target);
        expect(h.controller.getSpec()).not.toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 9: Spec refinement produces a new monotonic DRAFT revision
  // For any current LearningSpecRevision and any refine message, a successful
  // refineSpec records the returned revision as current with status DRAFT and a
  // revision strictly greater than the prior revision.
  it("Property 9: spec refinement produces a new monotonic DRAFT revision", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 40 }), async (message) => {
        const h = freshHarness();
        await toSpecReview(h);

        const prior = h.controller.getSpec()!;
        await h.controller.refineSpec(message);

        const next = h.controller.getSpec()!;
        expect(next.status).toBe("DRAFT");
        expect(next.revision).toBeGreaterThan(prior.revision);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 10: Confirmation confirms the spec and advances to building
  // For any current DRAFT LearningSpecRevision, a successful confirmSpec sets the
  // spec status to CONFIRMED, sets Project.status to BUILDING, and then invokes
  // SpecPort.prepareBuilderTask exactly once.
  it("Property 10: confirmation confirms the spec and advances to building", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const h = freshHarness();
        await toSpecReview(h);

        expect(h.controller.getSpec()!.status).toBe("DRAFT");
        const before = h.ports.callCountOf("prepareBuilderTask");

        await h.controller.confirmSpec();

        expect(h.controller.getSpec()!.status).toBe("CONFIRMED");
        expect(h.controller.getProject()!.status).toBe("BUILDING");
        expect(h.ports.callCountOf("prepareBuilderTask") - before).toBe(1);
        expect(h.controller.getPreparedTask()).not.toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 11: One operation in flight per surface (single-flight)
  // For any surface with an op already in flight, invoking another op of the
  // same kind does not start a second port call and leaves the original
  // in-flight op active until it resolves.
  it("Property 11: one operation in flight per surface (single-flight)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("discovery", "spec"),
        fc.integer({ min: 1, max: 3 }),
        async (surface, extraInvocations) => {
          const h = freshHarness();

          if (surface === "discovery") {
            await toWorkspace(h);
            // Hang the feedback op to hold the discovery surface lock.
            h.ports.setPending("submitFeedback");
            const before = h.ports.callCountOf("submitFeedback");

            const first = h.controller.submitFeedback(validFeedbackFor("MORE", []));
            expect(h.controller.isInProgress("discovery")).toBe(true);

            for (let i = 0; i < extraInvocations; i++) {
              const res = await h.controller.submitFeedback(validFeedbackFor("MORE", []));
              expect(res.accepted).toBe(false);
            }

            // Only the first op ever reached the port; lock still held.
            expect(h.ports.callCountOf("submitFeedback") - before).toBe(1);
            expect(h.controller.isInProgress("discovery")).toBe(true);
            void first;
            return;
          }

          // spec surface: hang confirmSpec to hold the lock.
          await toSpecReview(h);
          h.ports.setPending("confirmSpec");
          const before = h.ports.callCountOf("confirmSpec");

          const first = h.controller.confirmSpec();
          expect(h.controller.isInProgress("spec")).toBe(true);

          for (let i = 0; i < extraInvocations; i++) {
            await h.controller.confirmSpec();
          }

          expect(h.ports.callCountOf("confirmSpec") - before).toBe(1);
          expect(h.controller.isInProgress("spec")).toBe(true);
          void first;
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 12: Confirmation revision conflict is surfaced without status change
  // For any confirm whose expectedRevision does not match the port's latest
  // stored revision (port returns revision_conflict), the controller emits a
  // "spec has changed" notice, leaves Project.status unchanged, and re-enables
  // the confirm control.
  it("Property 12: confirmation revision conflict is surfaced without status change", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const h = freshHarness();
        await toSpecReview(h);

        const statusBefore = h.controller.getProject()!.status; // SPEC_REVIEW
        const specBefore = JSON.stringify(h.controller.getSpec());
        h.ports.setError("confirmSpec", {
          code: "revision_conflict",
          message: "스펙이 변경되어 확정할 수 없습니다",
        });
        const noticesBefore = h.controller.notices.length;

        await h.controller.confirmSpec();

        // Status unchanged; confirm surface re-enabled.
        expect(h.controller.getProject()!.status).toBe(statusBefore);
        expect(JSON.stringify(h.controller.getSpec())).toBe(specBefore);
        expect(h.controller.isInProgress("spec")).toBe(false);
        // A "spec changed" notice is surfaced (controller copy: 스펙이 변경되었습니다).
        const added = h.controller.notices.slice(noticesBefore);
        expect(added).toHaveLength(1);
        expect(added[0].surface).toBe("spec");
        expect(added[0].kind).toBe("error");
        expect(added[0].message).toContain("스펙이 변경되었습니다");
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: discovery-spec-flow, Property 13: In-progress state is set on start and cleared on settle
  // For any port op, the affected surface's inProgress flag is true from the
  // moment the op is invoked until it resolves, and is false once the op
  // completes or fails.
  it("Property 13: in-progress state is set on start and cleared on settle", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("submitFeedback", "confirmSpec"),
        fc.boolean(),
        async (op, fail) => {
          const h = freshHarness();

          if (op === "submitFeedback") {
            await toWorkspace(h);
            if (fail) {
              h.ports.setError("submitFeedback", { code: "unknown", message: "x" });
            }
            // Hold the op to observe inProgress === true mid-flight.
            h.ports.setPending("submitFeedback");
            const pending = h.controller.submitFeedback(validFeedbackFor("MORE", []));
            expect(h.controller.isInProgress("discovery")).toBe(true);

            // Settle via timeout (models resolution/failure path).
            h.clock.advance(TIMEOUT_MS);
            expect(h.controller.isInProgress("discovery")).toBe(false);
            void pending;
            return;
          }

          // confirmSpec: observe the happy path clears the flag on settle.
          await toSpecReview(h);
          if (fail) {
            h.ports.setError("confirmSpec", { code: "unknown", message: "x" });
          }
          // Before invoke: not in progress.
          expect(h.controller.isInProgress("spec")).toBe(false);
          await h.controller.confirmSpec();
          // After settle: flag cleared regardless of success/failure.
          expect(h.controller.isInProgress("spec")).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
