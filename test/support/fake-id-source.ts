/**
 * Shared deterministic {@link IdSource} for flow tests.
 *
 * Mirrors the production `DefaultIdSource` in `src/core/flow/flow-controller.ts`
 * but is exported from test support with a {@link FakeIdSource.reset} so a test
 * can restart the counter (or just construct a fresh instance per test). Every
 * call increments a single shared monotonic counter and formats it, so the ids
 * a {@link FlowController} stamps onto its {@link RequestEnvelope}s and entities
 * are fully deterministic and inspectable:
 *
 * - `correlationId()` -> `corr_1`, `corr_2`, ...
 * - `idempotencyKey()` -> `idem_3`, `idem_4`, ...
 * - `id(prefix)` -> `${prefix}_5`, ...
 *
 * ## Determinism guarantees
 *
 * - No randomness, no time, no global state: ids depend solely on how many
 *   times the instance has been called, in call order.
 * - A fresh `FakeIdSource()` (or a `reset()`) always produces the same id
 *   sequence for the same sequence of calls, so envelope assertions in tests
 *   are stable across runs.
 */

import type { IdSource } from "../../src/core/flow/flow-controller";

/**
 * Counter-based deterministic {@link IdSource}. Identical formatting to the
 * production `DefaultIdSource`, with a resettable counter for test isolation.
 */
export class FakeIdSource implements IdSource {
  private counter = 0;

  /** A fresh, deterministic correlation id (`corr_<n>`). */
  correlationId(): string {
    return `corr_${++this.counter}`;
  }

  /** A fresh, deterministic idempotency key (`idem_<n>`). */
  idempotencyKey(): string {
    return `idem_${++this.counter}`;
  }

  /** A fresh, deterministic entity id (`${prefix}_<n>`). */
  id(prefix: string): string {
    return `${prefix}_${++this.counter}`;
  }

  /** Restarts the counter so a reused instance replays the same id sequence. */
  reset(): void {
    this.counter = 0;
  }
}
