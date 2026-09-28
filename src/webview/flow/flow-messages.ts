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
import { MAX_DISCOVERY_CONTEXT_LENGTH } from "../../core/flow/flow-limits";

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
 * - `refreshHistory`: the learner asked to (re)load the read-only Project
 *   History list (guide §6/§10-2). READ-ONLY: it only triggers
 *   `listProjects()`; it NEVER starts a run or mutates anything.
 * - `openHistoryProject`: the learner opened a history row. READ-ONLY: it only
 *   triggers `restoreProject(projectId)` for a safe summary; it NEVER starts a
 *   run, mutates, or auto-triggers discovery.
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
  | { type: "returnToDiscovery" }
  | { type: "goToStart" }
  | { type: "draftChangedFlow"; field: string; text: string }
  | { type: "refreshHistory" }
  | { type: "openHistoryProject"; projectId: string };

/** The set of valid {@link HostToWebviewFlow} discriminators. */
const HOST_TO_WEBVIEW_FLOW_TYPES: ReadonlySet<HostToWebviewFlow["type"]> = new Set([
  "hydrateFlow",
  "flowNotice",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= max &&
    (allowEmpty || value.trim().length > 0);
}

// Both Core UUID-based ids and local deterministic mock ids are supported.
// This is a wire-shape check, not an authorization or existence check.
function isId(value: unknown): value is string {
  return isText(value, 128) && /^[A-Za-z0-9_-]+$/.test(value);
}

function isReference(value: unknown): value is CandidateRevisionReference {
  return isRecord(value) && onlyKeys(value, ["candidateId", "revision"]) &&
    isId(value.candidateId) && typeof value.revision === "number" &&
    Number.isSafeInteger(value.revision) && value.revision > 0;
}

function isDiscoveryInput(value: unknown): value is DiscoveryInput {
  if (!isRecord(value) || !onlyKeys(value, [
    "learningGoal", "personalNeed", "recentFriction", "interestAreas", "currentLevel", "freeContext",
  ]) || !isText(value.learningGoal, 240)) return false;
  for (const field of ["personalNeed", "recentFriction", "freeContext"] as const) {
    if (value[field] !== undefined && !isText(value[field], MAX_DISCOVERY_CONTEXT_LENGTH)) return false;
  }
  if (value.currentLevel !== undefined && ![
    "NEW", "BEGINNER", "FAMILIAR", "UNSPECIFIED",
  ].includes(value.currentLevel as string)) return false;
  return value.interestAreas === undefined || (
    Array.isArray(value.interestAreas) && value.interestAreas.length <= 12 &&
    Array.from(value.interestAreas).every((area) => isText(area, 120))
  );
}

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
 * known intent with a bounded, allowlisted payload. The webview is untrusted:
 * TypeScript types do not validate messages at runtime. Domain semantics (such
 * as feedback arity and current revision) remain controller/Core responsibilities.
 */
export function parseWebviewToHostFlow(value: unknown): WebviewToHostFlow | null {
  if (!isRecord(value)) return null;
  let valid = false;
  switch (value.type) {
    case "startDiscovery":
      valid = onlyKeys(value, ["type", "input"]) && isDiscoveryInput(value.input);
      break;
    case "toggleBasket":
      valid = onlyKeys(value, ["type", "ref"]) && isReference(value.ref);
      break;
    case "selectCandidate":
      valid = onlyKeys(value, ["type", "target"]) && isReference(value.target);
      break;
    case "submitRefinement":
      valid = onlyKeys(value, ["type", "action", "text", "targets"]) &&
        ["narrow", "merge", "new_direction", "show_more"].includes(value.action as string) &&
        isText(value.text, 4000, true) && Array.isArray(value.targets) &&
        value.targets.length <= 100 && Array.from(value.targets).every(isReference);
      break;
    case "refineSpec":
      valid = onlyKeys(value, ["type", "message"]) && isText(value.message, 4000);
      break;
    case "confirmSpec":
    case "returnToDiscovery":
    case "goToStart":
    case "refreshHistory":
      valid = onlyKeys(value, ["type"]);
      break;
    case "draftChangedFlow":
      valid = onlyKeys(value, ["type", "field", "text"]) &&
        isText(value.field, 64) && isText(value.text, 4000, true);
      break;
    case "openHistoryProject":
      valid = onlyKeys(value, ["type", "projectId"]) && isId(value.projectId);
      break;
  }
  return valid ? value as WebviewToHostFlow : null;
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
