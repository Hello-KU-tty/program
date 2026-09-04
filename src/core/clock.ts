/**
 * Clock abstraction for deterministic, injectable timing.
 *
 * The {@link PanelController} needs two time-based behaviors — the start-timeout
 * (Req 6.1) and the stall watchdog (Req 3.7) — that must be exercised
 * deterministically by tests without waiting on real wall-clock time. Rather
 * than call `Date.now()` / `setTimeout` / `clearTimeout` directly, the
 * controller depends on this small interface. Production wires the
 * {@link SystemClock}, which delegates to the real timers; tests provide a fake
 * clock that advances time explicitly and fires due callbacks synchronously.
 *
 * This module is pure/dependency-free apart from the Node/DOM timer globals
 * used only inside {@link SystemClock}. The interface itself imposes no runtime
 * dependency, so a controller constructed with a fake clock is fully
 * deterministic.
 */

/** Opaque identifier for a scheduled timer, returned by {@link Clock.setTimeout}. */
export type TimerId = number;

/**
 * Minimal timing surface the controller depends on. Deliberately mirrors the
 * subset of the standard timer API the controller needs so a real
 * implementation is trivial and a fake one is easy to drive in tests.
 */
export interface Clock {
  /** Current time in milliseconds (monotonic-enough for timeout math). */
  now(): number;
  /**
   * Schedule `cb` to run after `ms` milliseconds and return a {@link TimerId}
   * that can be passed to {@link clearTimeout} to cancel it before it fires.
   */
  setTimeout(cb: () => void, ms: number): TimerId;
  /** Cancel a previously scheduled timer. A no-op if it already fired/cleared. */
  clearTimeout(id: TimerId): void;
}

/**
 * Real system clock backed by the host's `Date.now` and global timer
 * functions. This is the production default injected into
 * {@link PanelController}; existing single-argument construction continues to
 * work because the controller falls back to a `new SystemClock()`.
 */
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  setTimeout(cb: () => void, ms: number): TimerId {
    // `setTimeout` returns a NodeJS.Timeout object under Node and a number in
    // the DOM; coerce to a number so the TimerId contract is stable across
    // environments. Node's Timeout has a numeric primitive via Symbol.toPrimitive.
    return Number(setTimeout(cb, ms));
  }

  clearTimeout(id: TimerId): void {
    clearTimeout(id);
  }
}
