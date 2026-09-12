/**
 * Webview messaging protocol for the Discovery -> Spec flow.
 *
 * This module is the flow-side analogue of {@link file://../messages.ts}: it
 * defines the two message unions exchanged across the host <-> webview boundary
 * for the Discovery/Spec surfaces plus the small (de)serialization helpers. It
 * is the single source of truth for the flow wire shape; both the host-side
 * flow dispatcher (see {@link file://./flow-dispatcher.ts}) and the flow shell
 * import these types so the protocol stays in sync on both ends.
 *
 * Mirrors design.md "Webview message model". The unions are pure data (no
 * runtime dependency on VS Code or the adapter layer) so they can be exercised
 * directly by unit tests.
 *
 * Direction conventions:
 * - {@link HostToWebviewFlow}: render/notice messages the host posts to the
 *   webview.
 * - {@link WebviewToHostFlow}: intent messages the webview posts back to the
 *   host.
 */

import type { FlowSnapshot } from "../../core/flow/flow-snapshot";
import type { CandidateRevisionReference, DiscoveryInput } from "../../core/flow/flow-types";

/**
 * The composer refinement action the learner picked, mapped by the host to the
 * corresponding Discovery_Feedback intent:
 * - `narrow`        — shrink/focus the pinned candidates
 * - `merge`         — merge the selected candidates into one direction
 * - `new_direction` — abandon the current framing for a fresh direction
 * - `show_more`     — request more candidates
 */
export type RefinementAction = "narrow" | "merge" | "new_direction" | "show_more";

/**
 * Host -> Webview messages (full-projection hydration + surface notices).
 *
 * Mirrors design.md exactly:
 * - `hydrateFlow`: full (re)build of the flow shell from an immutable
 *   {@link FlowSnapshot}. Used on first render and whenever the webview is
 *   (re-)revealed after disposal, and as the vehicle for any async,
 *   non-intent-driven mutation (Req 13.2, 13.4).
 * - `flowNotice`: a surface-scoped error/validation/info notice (Req 12.4).
 *   `surface` and `kind` are kept as plain strings at the wire boundary and
 *   narrowed by the consuming shell.
 */
export type HostToWebviewFlow =
  | { type: "hydrateFlow"; snapshot: FlowSnapshot }
  | { type: "flowNotice"; surface: string; kind: string; message: string };

/**
 * Webview -> Host messages (user intents).
 *
 * Mirrors design.md exactly:
 * - `startDiscovery`: the learner submitted the discovery start form (Req 4).
 * - `toggleBasket`: the learner toggled a candidate in the basket (Req 6.1/6.2).
 * - `submitRefinement`: the learner submitted composer feedback with an action,
 *   free text, and the targeted candidate references (Req 7).
 * - `selectCandidate`: the learner selected a candidate to draft a spec (Req 8).
 * - `refineSpec`: the learner asked to refine the current spec draft (Req 10).
 * - `confirmSpec`: the learner confirmed the spec, advancing to Build (Req 11).
 * - `draftChangedFlow`: an unsent input field changed; reported so the host can
 *   restore it on re-hydration (Req 13.2).
 */
export type WebviewToHostFlow =
  | { type: "startDiscovery"; input: DiscoveryInput }
  | { type: "toggleBasket"; ref: CandidateRevisionReference }
  | {
      type: "submitRefinement";
      action: RefinementAction;
      text: string;
      targets: CandidateRevisionReference[];
    }
  | { type: "selectCandidate"; target: CandidateRevisionReference }
  | { type: "refineSpec"; message: string }
  | { type: "confirmSpec" }
  | { type: "draftChangedFlow"; field: string; text: string };

/** The set of valid {@link HostToWebviewFlow} discriminators. */
const HOST_TO_WEBVIEW_FLOW_TYPES: ReadonlySet<HostToWebviewFlow["type"]> = new Set([
  "hydrateFlow",
  "flowNotice",
]);

/** The set of valid {@link WebviewToHostFlow} discriminators. */
const WEBVIEW_TO_HOST_FLOW_TYPES: ReadonlySet<WebviewToHostFlow["type"]> = new Set([
  "startDiscovery",
  "toggleBasket",
  "submitRefinement",
  "selectCandidate",
  "refineSpec",
  "confirmSpec",
  "draftChangedFlow",
]);

/**
 * Serializes a flow message to a JSON string for `postMessage`. The messages
 * are already plain JSON-safe data (the snapshot is an immutable projection of
 * plain objects), so this is a thin wrapper that documents the boundary and
 * keeps the (de)serialization pair colocated.
 */
export function serialize(message: HostToWebviewFlow | WebviewToHostFlow): string {
  return JSON.stringify(message);
}

/**
 * Narrows an unknown value received over the boundary to a
 * {@link WebviewToHostFlow} message, returning `null` when it does not match a
 * known intent. The webview is untrusted input from the host's perspective, so
 * the flow dispatcher validates the discriminator before acting on it. Like
 * {@link file://../messages.ts}, validation is kept at the discriminator level.
 */
export function parseWebviewToHostFlow(value: unknown): WebviewToHostFlow | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const type = (value as { type?: unknown }).type;
  if (
    typeof type !== "string" ||
    !WEBVIEW_TO_HOST_FLOW_TYPES.has(type as WebviewToHostFlow["type"])
  ) {
    return null;
  }
  return value as WebviewToHostFlow;
}

/**
 * Narrows an unknown value received over the boundary to a
 * {@link HostToWebviewFlow} message, returning `null` when it does not match a
 * known message. Provided for symmetry so the flow shell can validate host
 * messages with the same source of truth.
 */
export function parseHostToWebviewFlow(value: unknown): HostToWebviewFlow | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const type = (value as { type?: unknown }).type;
  if (
    typeof type !== "string" ||
    !HOST_TO_WEBVIEW_FLOW_TYPES.has(type as HostToWebviewFlow["type"])
  ) {
    return null;
  }
  return value as HostToWebviewFlow;
}
