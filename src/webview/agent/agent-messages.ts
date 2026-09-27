/**
 * Webview messaging protocol for the Builder / Helper agent surfaces.
 *
 * This module is the agent-side analogue of {@link file://../flow/flow-messages.ts}:
 * it defines the two message unions exchanged across the trusted host <->
 * untrusted webview boundary for the agent surfaces, plus the strict inbound
 * parser. It is the single source of truth for the agent wire shape; both the
 * host-side agent dispatcher (see {@link file://./agent-dispatcher.ts}) and the
 * agent shell import these types so the protocol stays in sync on both ends.
 *
 * Mirrors design.md §B.16 exactly. The unions are pure data (no runtime
 * dependency on VS Code or the adapter layer) so they can be exercised directly
 * by unit tests.
 *
 * Direction conventions:
 * - {@link AgentAction}: semantic intent messages the webview posts back to the
 *   host. Re-validated host-side; agent text is rendered via `textContent` only.
 * - {@link AgentHostMessage}: full-hydrate / targeted-patch / notice messages the
 *   host posts to the webview. Safe DTOs only — no connection object, token,
 *   host object, or absolute path (Requirement 13.1).
 *
 * The webview is untrusted input from the host's perspective, so
 * {@link parseAgentAction} validates the discriminator AND every required
 * field's type/shape, returning `null` on any mismatch (Requirement 13.2),
 * mirroring the defensive style of `parseWebviewToHostFlow`.
 */

import type {
  AgentViewModel,
  BuilderTurnViewModel,
  HelperViewModel,
  NoticeViewModel,
} from "../../core/agent/agent-view-model";
import type {
  EvidenceTraceView,
  FinalUpgradeCandidate,
  NativeWorkerStatusView,
} from "../../../vendor/frontend-client";

/**
 * The nested `selection` shape carried by a {@link AgentAction} of kind
 * `decision/resolve`. A discriminated union over `kind`:
 * - `OPTION`         — the learner picked an existing option by id.
 * - `RECOMMENDATION` — the learner accepted the recommended option.
 * - `CUSTOM`         — the learner supplied a free-text custom proposal.
 */
export type DecisionSelection =
  | { readonly kind: "OPTION"; readonly optionId: string }
  | { readonly kind: "RECOMMENDATION" }
  | { readonly kind: "CUSTOM"; readonly customProposal: string };

/**
 * The nested `answer` shape carried by a {@link AgentAction} of kind
 * `native/answer`. A discriminated union over `action`:
 * - `dismissed`                          — the learner dismissed the question.
 * - `answered` (free text)               — the learner typed a text answer.
 * - `answered` (option + sub-options)    — the learner selected an option index
 *   with zero or more sub-option indices.
 */
export type NativeAnswerInput =
  | { readonly action: "dismissed" }
  | { readonly action: "answered"; readonly answer: string }
  | {
      readonly action: "answered";
      readonly optionIndex: number;
      readonly subOptionIndices: readonly number[];
    };

/**
 * Webview -> Host: semantic actions only (re-validated host-side).
 *
 * Mirrors design.md §B.16 exactly:
 * - `builder/start`: start a Builder turn on the current task (Req 1).
 * - `builder/stop`: cancel the active run (Req 6.1).
 * - `helper/start`: start a read-only Helper turn (Req 4).
 * - `decision/resolve`: resolve a Builder decision with the user's selection and
 *   verbatim rationale (Req 5).
 * - `builder/resumeAfterDecision`: explicit Builder resume; never auto-resumed
 *   as a side effect of resolution (Req 5.3).
 * - `native/answer`: submit exactly the user's native-question answer (Req 7).
 * - `workspace/open`: open the generated workspace for a task (Req 8).
 * - `result/launch`: launch the running result (Req 9).
 * - `evidence/read`: read the evidence trace (Req 10).
 * - `evidence/retry`: retry a failed analysis job (Req 10.5).
 * - `finalUpgrade/list`: list eligible final-upgrade candidates (Req 11.1).
 * - `finalUpgrade/prepare`: prepare a final-upgrade task (Req 11.2).
 */
export type AgentAction =
  | { readonly kind: "builder/start"; readonly message: string }
  | { readonly kind: "builder/stop" }
  | {
      readonly kind: "helper/start";
      readonly message: string;
      readonly origin: "FREE_TEXT" | "QUICK_ACTION";
      readonly decisionId?: string;
    }
  | {
      readonly kind: "decision/resolve";
      readonly decisionId: string;
      readonly selection: DecisionSelection;
      readonly rationale?: string;
      readonly helperUsed: boolean;
    }
  | { readonly kind: "builder/resumeAfterDecision" }
  | {
      readonly kind: "native/answer";
      readonly requestId: string;
      readonly nativeJobId: string;
      readonly answer: NativeAnswerInput;
    }
  | { readonly kind: "workspace/open"; readonly taskId: string }
  | { readonly kind: "result/launch" }
  | { readonly kind: "evidence/read"; readonly conceptId?: string }
  | {
      readonly kind: "evidence/retry";
      readonly analysisJobId: string;
      readonly expectedJobRevision: number;
    }
  | { readonly kind: "finalUpgrade/list" }
  | {
      readonly kind: "finalUpgrade/prepare";
      readonly sourceTaskId: string;
      readonly expectedSourceTaskRevision: number;
      readonly personalizationTraceId: string;
      readonly userGoal: string;
    };

/**
 * Host -> Webview: full hydrate or targeted patch + notices. Safe DTOs only.
 *
 * Mirrors design.md §B.16 exactly:
 * - `agent/hydrate`: full (re)build from an {@link AgentViewModel}.
 * - `agent/patch/builder`: targeted Builder-turn patch.
 * - `agent/patch/helper`: targeted Helper patch.
 * - `agent/patch/worker`: targeted native-worker status patch.
 * - `agent/evidence`: an evidence trace projection.
 * - `agent/finalUpgrade`: the list of eligible final-upgrade candidates.
 * - `agent/notice`: a surface notice (code + message).
 */
export type AgentHostMessage =
  | { readonly kind: "agent/hydrate"; readonly vm: AgentViewModel }
  | { readonly kind: "agent/patch/builder"; readonly builder: BuilderTurnViewModel }
  | { readonly kind: "agent/patch/helper"; readonly helper: HelperViewModel }
  | { readonly kind: "agent/patch/worker"; readonly worker: NativeWorkerStatusView | null }
  | { readonly kind: "agent/evidence"; readonly view: EvidenceTraceView }
  | { readonly kind: "agent/finalUpgrade"; readonly candidates: readonly FinalUpgradeCandidate[] }
  | { readonly kind: "agent/notice"; readonly notice: NoticeViewModel };

/** True when `value` is a non-null object (and not an array). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when `value` is a finite number (rejects `NaN` / `Infinity`). */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** True when `value` is a `string`. */
function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Validates the nested `selection` shape of a `decision/resolve` action,
 * rejecting unknown discriminators and wrong field types.
 */
function parseDecisionSelection(value: unknown): DecisionSelection | null {
  if (!isRecord(value)) {
    return null;
  }
  switch (value.kind) {
    case "OPTION":
      return isString(value.optionId) ? { kind: "OPTION", optionId: value.optionId } : null;
    case "RECOMMENDATION":
      return { kind: "RECOMMENDATION" };
    case "CUSTOM":
      return isString(value.customProposal)
        ? { kind: "CUSTOM", customProposal: value.customProposal }
        : null;
    default:
      return null;
  }
}

/**
 * Validates the nested `answer` shape of a `native/answer` action. `action`
 * must be `dismissed` or `answered`; an `answered` payload must carry either a
 * string `answer` or a finite `optionIndex` with a `subOptionIndices` array of
 * finite numbers.
 */
function parseNativeAnswer(value: unknown): NativeAnswerInput | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.action === "dismissed") {
    return { action: "dismissed" };
  }
  if (value.action !== "answered") {
    return null;
  }
  if (isString(value.answer)) {
    return { action: "answered", answer: value.answer };
  }
  if (
    isFiniteNumber(value.optionIndex) &&
    Array.isArray(value.subOptionIndices) &&
    value.subOptionIndices.every(isFiniteNumber)
  ) {
    return {
      action: "answered",
      optionIndex: value.optionIndex,
      subOptionIndices: value.subOptionIndices,
    };
  }
  return null;
}

/**
 * Narrows an unknown value received over the boundary to an {@link AgentAction},
 * returning `null` when it does not match a known action or when any required
 * field has the wrong type/shape (Requirement 13.2).
 *
 * The webview is untrusted, so validation is strict: the discriminator must be
 * a known `kind`, every required field's type is checked, nested discriminated
 * shapes (`selection`, `answer`) are validated precisely, numeric fields must be
 * finite numbers, string fields must be strings, and `helperUsed` must be a
 * boolean. Mirrors the defensive style of `parseWebviewToHostFlow`.
 */
export function parseAgentAction(raw: unknown): AgentAction | null {
  if (!isRecord(raw)) {
    return null;
  }
  const kind = raw.kind;
  if (typeof kind !== "string") {
    return null;
  }

  switch (kind) {
    case "builder/start":
      return isString(raw.message) ? { kind, message: raw.message } : null;

    case "builder/stop":
      return { kind };

    case "helper/start": {
      if (!isString(raw.message)) {
        return null;
      }
      if (raw.origin !== "FREE_TEXT" && raw.origin !== "QUICK_ACTION") {
        return null;
      }
      if (raw.decisionId !== undefined && !isString(raw.decisionId)) {
        return null;
      }
      return {
        kind,
        message: raw.message,
        origin: raw.origin,
        ...(raw.decisionId !== undefined ? { decisionId: raw.decisionId } : {}),
      };
    }

    case "decision/resolve": {
      if (!isString(raw.decisionId)) {
        return null;
      }
      const selection = parseDecisionSelection(raw.selection);
      if (selection === null) {
        return null;
      }
      if (typeof raw.helperUsed !== "boolean") {
        return null;
      }
      if (raw.rationale !== undefined && !isString(raw.rationale)) {
        return null;
      }
      return {
        kind,
        decisionId: raw.decisionId,
        selection,
        helperUsed: raw.helperUsed,
        ...(raw.rationale !== undefined ? { rationale: raw.rationale } : {}),
      };
    }

    case "builder/resumeAfterDecision":
      return { kind };

    case "native/answer": {
      if (!isString(raw.requestId) || !isString(raw.nativeJobId)) {
        return null;
      }
      const answer = parseNativeAnswer(raw.answer);
      if (answer === null) {
        return null;
      }
      return { kind, requestId: raw.requestId, nativeJobId: raw.nativeJobId, answer };
    }

    case "workspace/open":
      return isString(raw.taskId) ? { kind, taskId: raw.taskId } : null;

    case "result/launch":
      return { kind };

    case "evidence/read": {
      if (raw.conceptId !== undefined && !isString(raw.conceptId)) {
        return null;
      }
      return { kind, ...(raw.conceptId !== undefined ? { conceptId: raw.conceptId } : {}) };
    }

    case "evidence/retry":
      return isString(raw.analysisJobId) && isFiniteNumber(raw.expectedJobRevision)
        ? { kind, analysisJobId: raw.analysisJobId, expectedJobRevision: raw.expectedJobRevision }
        : null;

    case "finalUpgrade/list":
      return { kind };

    case "finalUpgrade/prepare":
      return isString(raw.sourceTaskId) &&
        isFiniteNumber(raw.expectedSourceTaskRevision) &&
        isString(raw.personalizationTraceId) &&
        isString(raw.userGoal)
        ? {
            kind,
            sourceTaskId: raw.sourceTaskId,
            expectedSourceTaskRevision: raw.expectedSourceTaskRevision,
            personalizationTraceId: raw.personalizationTraceId,
            userGoal: raw.userGoal,
          }
        : null;

    default:
      return null;
  }
}
