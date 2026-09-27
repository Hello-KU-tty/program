import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import type { AgentRunPort } from "../src/adapter/agent/agent-run-port";
import type { NativeAnswer } from "../vendor/frontend-host";
import { FakeCoreClient } from "./support/fake-core-client";
import {
  FakeNativeWorker,
  fakeNativeQuestion,
} from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

/**
 * Property 9 — Native answers are verbatim (design §Correctness Property 9;
 * Requirement 7.5).
 *
 * Statement: for ANY valid native answer — a dismissal, a free-text answer, or
 * an option + sub-option-index selection — once client-side validation passes,
 * the {@link NativeAnswer} forwarded to the worker's `submitUserInput` is
 * BYTE-FOR-BYTE the user's selection. The host NEVER synthesizes, mutates, or
 * auto-answers: the submitted `action` / `answer` / `optionIndex` /
 * `subOptionIndices` equal exactly what the user chose, and the only host
 * contribution is binding the host-owned `projectId` (which the untrusted
 * webview cannot supply) alongside the webview's `nativeJobId` / `requestId`.
 *
 * The test drives the REAL {@link AgentSurfaceController} through the REAL
 * {@link ManagedAgentPort} over the deterministic {@link FakeCoreClient} /
 * {@link FakeNativeWorker} fakes (design "Testing Strategy" > Fakes) — no live
 * backend, process, or network. {@link FakeNativeWorker.submitted} records every
 * answer passed to `submitUserInput` verbatim, so the forwarded payload can be
 * compared field-for-field against the user's selection.
 */

const NUM_RUNS = 300;

const PROJECT_ID = "project_1";
// The default fakeSnapshot has currentTask.id === "task_1"; a BUILDER/HELPER
// question bound to this task passes isConsistentWithSnapshot so submit runs.
const TASK_ID = "task_1";
const REQUEST_ID = "request_1";
const NATIVE_JOB_ID = "native_job_1";

/**
 * Build a controller wired to a {@link ManagedAgentPort} over the fakes, with
 * one WAITING BUILDER question seeded that is consistent with the default
 * snapshot (so validation passes and the answer reaches `submitUserInput`).
 * Returns the controller and the worker (whose `submitted` array records every
 * forwarded answer verbatim).
 */
function buildHarness() {
  const client = new FakeCoreClient(); // default snapshot: currentTask.id "task_1"
  const worker = new FakeNativeWorker({
    questions: [
      fakeNativeQuestion({
        requestId: REQUEST_ID,
        nativeJobId: NATIVE_JOB_ID,
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        role: "BUILDER",
        status: "WAITING",
      }),
    ],
  });
  const port: AgentRunPort = new ManagedAgentPort(client, worker);

  const globalState = new FakeGlobalState({ "bhlr.lastProjectId": PROJECT_ID });
  const controller = new AgentSurfaceController({
    port: port as ManagedAgentPort,
    globalState,
    onChange: () => {},
    openFolder: async () => {},
    openExternal: async () => {},
  });

  return { controller, worker };
}

// ---------- Generators ----------

/**
 * An arbitrary VALID native answer variant, exactly as the webview would send
 * it (the `NativeAnswer` action union): a dismissal, a free-text answer, or an
 * option + sub-option-index selection.
 */
const answerVariantArb = fc.oneof(
  fc.constant<{ action: "dismissed" }>({ action: "dismissed" }),
  fc
    .string()
    .map((answer) => ({ action: "answered" as const, answer })),
  fc
    .record({
      optionIndex: fc.nat({ max: 10 }),
      subOptionIndices: fc.array(fc.nat({ max: 10 }), { maxLength: 5 }),
    })
    .map((sel) => ({
      action: "answered" as const,
      optionIndex: sel.optionIndex,
      subOptionIndices: sel.subOptionIndices,
    })),
);

// ---------- Property ----------

describe("Property 9: native answers are verbatim", () => {
  it("forwards exactly the user's selection to submitUserInput for ANY valid answer", async () => {
    await fc.assert(
      fc.asyncProperty(answerVariantArb, async (variant) => {
        const { controller, worker } = buildHarness();

        await controller.submitNativeAnswerAction({
          requestId: REQUEST_ID,
          nativeJobId: NATIVE_JOB_ID,
          answer: variant,
        });

        // Validation passed → exactly one answer reached the worker (never
        // auto-answered, never dropped).
        expect(worker.submitted).toHaveLength(1);
        const forwarded = worker.submitted[0] as NativeAnswer;

        // The correlation fields: host-bound projectId + the webview's
        // nativeJobId / requestId (the host contributes ONLY the projectId).
        expect(forwarded.projectId).toBe(PROJECT_ID);
        expect(forwarded.nativeJobId).toBe(NATIVE_JOB_ID);
        expect(forwarded.requestId).toBe(REQUEST_ID);

        // The answer payload is BYTE-FOR-BYTE the user's selection: the action
        // and its associated fields are never synthesized or mutated.
        expect(forwarded.action).toBe(variant.action);
        if (variant.action === "dismissed") {
          expect("answer" in forwarded).toBe(false);
          expect("optionIndex" in forwarded).toBe(false);
        } else if ("answer" in variant) {
          expect(forwarded).toMatchObject({ answer: variant.answer });
          // Free-text answer forwarded character-for-character.
          expect((forwarded as { answer: string }).answer).toBe(
            variant.answer,
          );
        } else {
          expect(forwarded).toMatchObject({
            optionIndex: variant.optionIndex,
            subOptionIndices: variant.subOptionIndices,
          });
          // Indices forwarded exactly (same values, same order, same length).
          const fwd = forwarded as {
            optionIndex: number;
            subOptionIndices: number[];
          };
          expect(fwd.optionIndex).toBe(variant.optionIndex);
          expect(fwd.subOptionIndices).toEqual(variant.subOptionIndices);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("the forwarded answer's payload deep-equals the user's selection plus only the correlation fields", async () => {
    await fc.assert(
      fc.asyncProperty(answerVariantArb, async (variant) => {
        const { controller, worker } = buildHarness();

        await controller.submitNativeAnswerAction({
          requestId: REQUEST_ID,
          nativeJobId: NATIVE_JOB_ID,
          answer: variant,
        });

        expect(worker.submitted).toHaveLength(1);
        // The full forwarded payload is exactly the user's variant merged with
        // the trusted correlation fields — nothing else is added or altered.
        const expected = {
          projectId: PROJECT_ID,
          nativeJobId: NATIVE_JOB_ID,
          requestId: REQUEST_ID,
          ...variant,
        };
        expect(worker.submitted[0]).toStrictEqual(expected);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
