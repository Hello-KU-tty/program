/**
 * Shared deterministic {@link Clock} for flow/panel tests.
 *
 * This consolidates the ad-hoc `FakeClock` classes currently duplicated across
 * `test/panel-controller.property.test.ts`, `test/dispatcher.test.ts`, and
 * `test/controller-mock-adapter.test.ts` into one reusable, API-compatible
 * implementation. It implements the production {@link Clock} interface from
 * `src/core/clock.ts` exactly (`now()`, `setTimeout(cb, ms)`,
 * `clearTimeout(id)`), so anything that accepts a `Clock` — the
 * {@link FlowController}, the {@link PanelController}, or the
 * {@link MockDiscoveryPort} — can be constructed with it for fully
 * deterministic timing.
 *
 * ## Determinism guarantees
 *
 * - Virtual time starts at `0` and advances ONLY through {@link FakeClock.advance}.
 *   No real wall-clock time is ever read; `now()` returns the virtual time.
 * - Timer ids are monotonic positive integers (`1, 2, 3, ...`), assigned in
 *   scheduling order, so ids are stable and inspectable.
 * - `advance(ms)` fires every timer whose deadline has elapsed, in ascending
 *   deadline order (scheduling order breaks ties since ids/deadlines are
 *   assigned monotonically), re-scanning after each fire so a timer re-armed
 *   with an earlier-or-equal deadline within the same `advance` also fires.
 * - Nothing fires on its own: the 30s port timeouts / start-timeout / stall
 *   watchdog only fire when the test explicitly advances past their deadline.
 */

import type { Clock, TimerId } from "../../src/core/clock";

/**
 * Deterministic fake {@link Clock}. Timers are recorded but never auto-fire;
 * tests drive due timers explicitly via {@link FakeClock.advance}.
 */
export class FakeClock implements Clock {
  private current = 0;
  private nextId = 1;
  private readonly timers = new Map<TimerId, { fireAt: number; cb: () => void }>();

  /** The current virtual time in milliseconds (starts at 0). */
  now(): number {
    return this.current;
  }

  /**
   * Records a timer to fire `ms` after the current virtual time and returns a
   * monotonic {@link TimerId}. The callback is NOT invoked until an
   * {@link FakeClock.advance} crosses its deadline.
   */
  setTimeout(cb: () => void, ms: number): TimerId {
    const id = this.nextId++ as TimerId;
    this.timers.set(id, { fireAt: this.current + ms, cb });
    return id;
  }

  /** Cancels a scheduled timer. A no-op if it already fired or was cleared. */
  clearTimeout(id: TimerId): void {
    this.timers.delete(id);
  }

  /**
   * Advance virtual time by `ms`, firing any now-due timers in ascending
   * deadline order. Re-scans after each fire so a timer re-armed within this
   * advance (with a deadline `<= current`) also fires before returning.
   */
  advance(ms: number): void {
    this.current += ms;
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, t]) => t.fireAt <= this.current)
        .sort((a, b) => a[1].fireAt - b[1].fireAt);
      if (due.length === 0) {
        break;
      }
      const [id, t] = due[0];
      this.timers.delete(id);
      t.cb();
    }
  }

  /** Number of timers currently armed (matches the ad-hoc `armedCount`). */
  get armedCount(): number {
    return this.timers.size;
  }

  /** Alias for {@link armedCount} so either shared name is importable. */
  pendingCount(): number {
    return this.timers.size;
  }
}
