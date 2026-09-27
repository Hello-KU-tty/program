/**
 * Deterministic in-memory `globalState` test double (design "Testing Strategy" >
 * Fakes).
 *
 * {@link FakeGlobalState} backs the `AgentControllerDeps.globalState` shape with
 * a plain {@link Map}, so window-switch reload recovery (design §3.1) can be
 * driven deterministically: a test seeds `bhlr.lastProjectId`, exercises
 * `startBuilder` (which persists it) or `recover` (which reads it), and asserts
 * on the stored value.
 *
 * It matches the minimal structural contract the controller depends on:
 * `get(key): string | undefined` and `update(key, value): Promise<void>`. There
 * is no persistence and no VS Code coupling; state lives only for the test.
 *
 * ## Determinism guarantees
 *
 * - `get` is a pure map read; `update` resolves synchronously on the microtask
 *   queue via `Promise.resolve()`.
 * - No timers, randomness, or wall-clock reads.
 */

/**
 * In-memory {@link Map}-backed `globalState`. Construct with optional seed
 * entries (e.g. `{ 'bhlr.lastProjectId': 'project_1' }`).
 */
export class FakeGlobalState {
  private readonly store = new Map<string, string>();

  constructor(seed: Readonly<Record<string, string>> = {}) {
    for (const [key, value] of Object.entries(seed)) {
      this.store.set(key, value);
    }
  }

  /** Read a stored value, or `undefined` when the key is absent. */
  get(key: string): string | undefined {
    return this.store.get(key);
  }

  /** Store a value under `key`; resolves once the write is applied. */
  update(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  /** Test-only: whether a key is currently stored. */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /** Test-only: the number of stored entries. */
  get size(): number {
    return this.store.size;
  }
}
