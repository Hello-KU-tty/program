/**
 * Pure Discovery_Feedback intent validation.
 *
 * This module implements the well-formedness gate that the {@link FlowController}
 * runs before it ever calls {@link DiscoveryPort.submitFeedback}. It is a pure
 * function: no side effects, no port access, no VS Code or adapter dependency,
 * so it can be exercised exhaustively by the property-based suite.
 *
 * The rules mirror the `core` project's `discoveryFeedbackSchema.superRefine`
 * (see `core/packages/contracts/src/discovery.ts`) so that a feedback accepted
 * here is also accepted by the real backend when it is wired in behind
 * `createFlowPorts`:
 *
 *   - `MERGE`                    -> at least 2 targets
 *   - `SELECT`                   -> exactly 1 target
 *   - `REVISE` | `SHRINK` | `EXPAND` -> exactly 1 target
 *   - `MORE`                     -> exactly 0 targets
 *   - `REGENERATE`               -> 0 or more targets
 *   - any intent other than `REGENERATE`/`MORE` -> at least 1 target
 *     (so `PIN`/`REJECT` require >= 1 target)
 *   - no two targets may share the same candidate identity + revision (`refKey`)
 *   - the intent must be one of the 9 known enum members
 *
 * See design.md "Feedback-to-intent mapping" and Requirements 3.1-3.6, 3.8.
 */

import {
  type DiscoveryFeedbackInput,
  type DiscoveryFeedbackIntent,
  refKey,
} from "./flow-types";

/** The result of {@link validateFeedback}: accepted, or rejected with a reason. */
export type FeedbackValidation =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * The 9 known Discovery_Feedback intents. Kept as a runtime `Set` so an
 * off-enum string (Req 3.8) can be rejected even when it arrives from an
 * untrusted webview payload that bypassed the compile-time type.
 */
const KNOWN_INTENTS: ReadonlySet<DiscoveryFeedbackIntent> = new Set<DiscoveryFeedbackIntent>([
  "PIN",
  "REJECT",
  "MERGE",
  "REVISE",
  "SHRINK",
  "EXPAND",
  "REGENERATE",
  "MORE",
  "SELECT",
]);

/** Intents that are allowed to carry zero targets. */
const TARGET_OPTIONAL_INTENTS: ReadonlySet<DiscoveryFeedbackIntent> = new Set<DiscoveryFeedbackIntent>([
  "REGENERATE",
  "MORE",
]);

/**
 * Validate a learner-supplied Discovery_Feedback before it is sent to the
 * discovery agent. Pure: it inspects only `input` and returns a verdict; it
 * never mutates state or touches a port.
 *
 * @param input The webview-supplied feedback (no `id` yet).
 * @returns `{ ok: true }` when the feedback is well-formed, otherwise
 *   `{ ok: false, reason }` where `reason` is a concise notice string.
 */
export function validateFeedback(input: DiscoveryFeedbackInput): FeedbackValidation {
  const intent = input.intent as DiscoveryFeedbackIntent;

  // Reject unknown / off-enum intents first (Req 3.8). This guards against
  // untrusted webview payloads whose `intent` bypassed the compile-time type.
  if (!KNOWN_INTENTS.has(intent)) {
    return { ok: false, reason: `알 수 없는 피드백 동작입니다: ${String(input.intent)}` };
  }

  const targets = input.targets ?? [];
  const targetCount = targets.length;

  // Duplicate identity+revision targets are never allowed (Req 3.6).
  const keys = targets.map(refKey);
  if (new Set(keys).size !== keys.length) {
    return { ok: false, reason: "중복된 후보를 대상으로 지정할 수 없습니다." };
  }

  // MERGE requires at least 2 targets (Req 3.1).
  if (intent === "MERGE" && targetCount < 2) {
    return { ok: false, reason: "합치기는 후보를 2개 이상 선택해야 합니다." };
  }

  // SELECT requires exactly 1 target (Req 3.2).
  if (intent === "SELECT" && targetCount !== 1) {
    return { ok: false, reason: "진행하려면 후보를 정확히 1개 선택해야 합니다." };
  }

  // REVISE / SHRINK / EXPAND require exactly 1 target (Req 3.3).
  if ((intent === "REVISE" || intent === "SHRINK" || intent === "EXPAND") && targetCount !== 1) {
    return { ok: false, reason: `${intent} 동작은 후보를 정확히 1개 선택해야 합니다.` };
  }

  // MORE must have zero targets (Req 3.4).
  if (intent === "MORE" && targetCount !== 0) {
    return { ok: false, reason: "더 보기는 후보를 선택하지 않아야 합니다." };
  }

  // Every intent other than REGENERATE / MORE requires at least 1 target.
  // This is the general core rule that also enforces PIN/REJECT >= 1 target.
  if (!TARGET_OPTIONAL_INTENTS.has(intent) && targetCount === 0) {
    return { ok: false, reason: `${intent} 동작은 후보를 1개 이상 선택해야 합니다.` };
  }

  // REGENERATE accepts 0 or more targets (Req 3.5) — no additional constraint.

  return { ok: true };
}
