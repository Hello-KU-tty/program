/**
 * Client-side view model for the Discovery -> Spec flow shell.
 *
 * The webview owns no authoritative flow state — the {@link FlowController} in
 * the extension host does (design.md "Host-owned state and re-hydration", Req
 * 13.1). This module holds only an immutable *projection* of that state, so the
 * flow renderers have a stable, synchronous structure to read from. It is the
 * flow-side analogue of {@link file://../view-model.ts}'s `ViewModelStore`.
 *
 * Re-hydration semantics (Req 13.2, 13.3). Because VS Code disposes a webview
 * when hidden and recreates it on reveal, the host re-pushes a fresh
 * {@link FlowSnapshot} on reveal to restore the view from authoritative host
 * state. Unlike the Build_Surface's granular patch protocol, the flow snapshot
 * is *always* a full projection: {@link buildFlowSnapshot} deep-copies every
 * array and nested object, so the snapshot the store receives is already an
 * immutable, complete picture of the flow.
 *
 * Consequently {@link FlowViewModelStore.apply} simply REPLACES the prior
 * projection wholesale — there is no merge and no append. Two properties fall
 * out of this directly:
 *
 * - **Idempotent**: applying the same snapshot twice yields exactly the same
 *   projection as applying it once (`this.model` is overwritten, never
 *   accumulated).
 * - **No duplicated rounds** (Req 13.3): because `rounds` (and every other
 *   collection) come from the snapshot as-is and are never appended to, a
 *   re-hydrate cannot duplicate prior rounds — the recreated webview reflects
 *   exactly the host's authoritative round list.
 *
 * This module is framework-free: no DOM, no VS Code, no adapter layer, so it
 * can be exercised directly by unit and property tests.
 */

import type { FlowPhase, FlowSnapshot } from "../../core/flow/flow-snapshot";

/**
 * Holds the current {@link FlowSnapshot} projection for the flow renderers.
 *
 * The store is deliberately minimal: it wraps a single nullable snapshot and
 * exposes it for rendering. All the re-hydration guarantees (idempotence,
 * no round duplication — Req 13.2, 13.3) come from the fact that the host
 * pushes a complete, immutable, deep-copied projection, so replacement is the
 * only operation needed.
 */
export class FlowViewModelStore {
  /** The current projection, or null before the first {@link apply}. */
  private model: FlowSnapshot | null = null;

  /** Returns the current projection, or null before the first `apply`. */
  get current(): FlowSnapshot | null {
    return this.model;
  }

  /**
   * Replaces the prior projection with `snapshot` wholesale (Req 13.2, 13.3).
   *
   * The incoming {@link FlowSnapshot} is already an immutable, deep-copied full
   * projection built host-side by {@link buildFlowSnapshot}, so no merge or
   * append is needed — the store adopts it as-is. This makes `apply`:
   *
   * - **idempotent**: `apply(s); apply(s)` == `apply(s)` (the second call just
   *   overwrites `this.model` with the same reference), and
   * - **incapable of duplicating rounds** (Req 13.3): rounds are taken from the
   *   snapshot, never appended to a prior list.
   */
  apply(snapshot: FlowSnapshot): void {
    this.model = snapshot;
  }

  /**
   * The derived shell phase of the current projection, or null before the
   * first `apply`. A small convenience getter so renderers can gate surfaces
   * without repeatedly reaching through `current`.
   */
  phase(): FlowPhase | null {
    return this.model?.phase ?? null;
  }
}
