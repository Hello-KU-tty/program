/**
 * Deterministic, controllable {@link NativeWorker} test double (design "Testing
 * Strategy" > Fakes).
 *
 * {@link FakeNativeWorker} is a hand-written, in-memory fake for the managed
 * host's `NativeWorker`. It lets a test drive native user-input questions and
 * worker status changes deterministically, with no live worker, process, or
 * native window:
 *
 *  - {@link FakeNativeWorker.setQuestions} seeds the in-memory
 *    {@link NativeQuestion} list that {@link FakeNativeWorker.listUserInputs}
 *    returns (optionally filtered by `projectId`);
 *  - {@link FakeNativeWorker.notifyInputs} triggers every `subscribeUserInputs`
 *    listener (the controller then re-lists);
 *  - {@link FakeNativeWorker.pushStatus} pushes a diagnostic status code to
 *    every `subscribeStatus` listener and updates {@link getStatus};
 *  - {@link FakeNativeWorker.submitUserInput} records the submitted answer
 *    verbatim (for native-answer-fidelity assertions) and returns a
 *    configurable result value or throws a configurable mapped code.
 *
 * ## Determinism guarantees
 *
 * - No randomness, no timers, no wall-clock reads: listeners fire only when the
 *   test calls {@link FakeNativeWorker.pushStatus} / {@link FakeNativeWorker.notifyInputs}.
 * - Subscriptions return real unsubscribe functions; a removed listener never
 *   fires again.
 */

import type {
  NativeAnswer,
  NativeQuestion,
  NativeWorker,
  NativeWorkerStatusCode,
} from "../../vendor/frontend-host";

/** The three success result values `submitUserInput` may resolve. */
export type SubmitResult = "SUBMITTED" | "ALREADY_SUBMITTED" | "ALREADY_HANDLED";

/**
 * A `submitUserInput` script: a result value to resolve, or an error to throw
 * (a mapped code such as `NATIVE_USER_INPUT_STALE`). A `throw` value may be any
 * object with a `code` (mirrors the SDK's `LocalClientError`-like rejections).
 */
export type SubmitScript =
  | { readonly resolve: SubmitResult }
  | { readonly throw: { code: string; status?: number; message?: string } };

/** Construction options for {@link FakeNativeWorker}. */
export interface FakeNativeWorkerOptions {
  /** Initial in-memory questions (default: none). */
  readonly questions?: readonly NativeQuestion[];
  /** Initial worker status code (default: `undefined`, "not reported yet"). */
  readonly status?: NativeWorkerStatusCode;
  /** Initial `submitUserInput` script (default: resolves `SUBMITTED`). */
  readonly submit?: SubmitScript;
}

/**
 * Build a minimal, valid contract-shaped {@link NativeQuestion}. Override any
 * field via `overrides` (e.g. a distinct `requestId` / `role` / `taskId`).
 */
export function fakeNativeQuestion(
  overrides: Partial<NativeQuestion> = {},
): NativeQuestion {
  return {
    requestId: "request_1",
    nativeJobId: "native_job_1",
    projectId: "project_1",
    taskId: "task_1",
    discoverySessionId: null,
    role: "BUILDER",
    status: "WAITING",
    question: "어떤 방식으로 진행할까요?",
    options: [
      {
        title: "옵션 A",
        description: "설명 A",
        recommended: true,
        subOptions: [],
      },
      { title: "옵션 B", recommended: false, subOptions: [] },
    ],
    ...overrides,
  };
}

/**
 * Hand-written, in-memory {@link NativeWorker}. All listeners are triggered
 * explicitly by the test; nothing fires on its own.
 */
export class FakeNativeWorker implements NativeWorker {
  /** Every answer submitted, in order (native-answer-fidelity assertions). */
  readonly submitted: NativeAnswer[] = [];
  /** Current `submitUserInput` script (settable per test). */
  submitScript: SubmitScript;

  private questions: NativeQuestion[];
  private status: NativeWorkerStatusCode | undefined;
  private readonly statusListeners = new Set<
    (code: NativeWorkerStatusCode) => void
  >();
  private readonly inputListeners = new Set<() => void>();

  constructor(options: FakeNativeWorkerOptions = {}) {
    this.questions = [...(options.questions ?? [])];
    this.status = options.status;
    this.submitScript = options.submit ?? { resolve: "SUBMITTED" };
  }

  /** Replace the in-memory question list (does NOT auto-notify listeners). */
  setQuestions(questions: readonly NativeQuestion[]): void {
    this.questions = [...questions];
  }

  /** Trigger every `subscribeUserInputs` listener (controller then re-lists). */
  notifyInputs(): void {
    for (const listener of this.inputListeners) {
      listener();
    }
  }

  /** Push a status code to every `subscribeStatus` listener and record it. */
  pushStatus(code: NativeWorkerStatusCode): void {
    this.status = code;
    for (const listener of this.statusListeners) {
      listener(code);
    }
  }

  // --- NativeWorker methods ---

  getStatus(): NativeWorkerStatusCode | undefined {
    return this.status;
  }

  listUserInputs(projectId: string): NativeQuestion[] {
    return this.questions.filter((q) => q.projectId === projectId);
  }

  subscribeStatus(
    listener: (code: NativeWorkerStatusCode) => void,
  ): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeUserInputs(listener: () => void): () => void {
    this.inputListeners.add(listener);
    return () => {
      this.inputListeners.delete(listener);
    };
  }

  async submitUserInput(value: NativeAnswer): Promise<SubmitResult> {
    this.submitted.push(value);
    if ("throw" in this.submitScript) {
      throw this.submitScript.throw;
    }
    return this.submitScript.resolve;
  }
}
