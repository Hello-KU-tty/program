/**
 * Top-level shell phase selector for the webview (Req 12.1, 12.2, 12.3).
 *
 * The webview hosts two coexisting surfaces behind one panel: the additive
 * Discovery -> Spec flow surfaces and the existing Builder/Helper
 * **Build_Surface**. This module is the *pure phase gate* that decides which
 * top-level surface is shown, derived solely from the immutable
 * {@link FlowSnapshot} projection pushed by the host.
 *
 * It is deliberately framework-free — no DOM, no VS Code API — so it can be
 * unit- and property-tested in isolation (task 13.3) and consumed by
 * `main.ts` (task 13.2) to route between the flow shell and the existing
 * panel renderer.
 *
 * Additive-by-default contract (design.md "Shell integration"): when no flow
 * state has been hydrated yet (`flowSnapshot === null`), the shell defaults to
 * the existing Build_Surface behavior. This keeps the branch inert until a
 * `hydrateFlow` arrives, so existing Builder/Helper behavior and tests are
 * unchanged (Req 12.1).
 *
 * See design.md "Shell integration (Req 12)".
 * Requirements: 12.1, 12.2, 12.3.
 */

import type { FlowPhase, FlowSnapshot } from "../core/flow/flow-snapshot";

/**
 * The top-level surface the webview renders:
 *   - `"flow"`  — the Discovery -> Spec surfaces (Build tabs are hidden).
 *   - `"build"` — the existing Builder/Helper Build_Surface tabs.
 */
export type ShellSurface = "flow" | "build";

/**
 * True when a {@link FlowPhase} corresponds to a flow surface (discovery or
 * spec review) rather than the Build_Surface. Kept as a small named helper so
 * both {@link selectShellSurface} and callers reasoning about the phase share
 * one definition of "is this a flow phase".
 *
 * `"building"` is the only non-flow phase (it reveals the Build_Surface).
 */
export function isFlowPhase(phase: FlowPhase): boolean {
  switch (phase) {
    case "discovery_start":
    case "discovery_workspace":
    case "spec_review":
      return true;
    case "building":
      return false;
    default: {
      // Exhaustiveness guard: a new FlowPhase must be classified explicitly.
      const _exhaustive: never = phase;
      void _exhaustive;
      return false;
    }
  }
}

/**
 * Select the top-level {@link ShellSurface} from the current flow projection
 * (Req 12.2, 12.3). Pure and total:
 *
 * - `flowSnapshot === null` (no flow state hydrated yet) -> `"build"`. The
 *   shell defaults to the existing Build_Surface so existing Builder/Helper
 *   behavior and tests are unchanged (Req 12.1 — the flow is additive).
 * - phase `"discovery_start" | "discovery_workspace" | "spec_review"` ->
 *   `"flow"`: show the Discovery -> Spec surfaces and do NOT show the Build
 *   tabs (Req 12.2).
 * - phase `"building"` -> `"build"`: reveal the Build_Surface tabs (Req 12.3).
 */
export function selectShellSurface(flowSnapshot: FlowSnapshot | null): ShellSurface {
  if (flowSnapshot === null) {
    return "build";
  }
  return isFlowPhase(flowSnapshot.phase) ? "flow" : "build";
}
