/**
 * `toAgentError` — normalize any raw thrown value / Core / worker code into a
 * stable {@link AgentError} for the live Builder / Helper agent surfaces
 * (design §Error Handling mapping tables; Requirements 1.10–1.15, 4.6, 5.6,
 * 7.7, 9.4, 11.3).
 *
 * This mirrors the shipped `local-core-port.ts` `toPortError` / `mapClientCode`
 * style: match raw codes by EXACT string first, then by substring / HTTP
 * status. It handles the real {@link LocalClientError} (the same class the flow
 * adapter imports from the vendored barrel), a duck-typed
 * `{ code, status?, message? }` (cross-realm / fake in tests), a generic
 * {@link Error} (name / message), a raw string code, and any non-Error
 * primitive (`null`, numbers, plain objects). It NEVER throws.
 *
 * Ordering matters: the specific exact-string codes are checked BEFORE the
 * broad substring buckets so, e.g., `NATIVE_USER_INPUT_RESPONSE_INVALID` maps
 * to `native_response_invalid` (not the generic `invalid`), and
 * `TASK_ALREADY_COMPLETED` / `DECISION_ALREADY_RESOLVED` are not swallowed by a
 * generic bucket. Exact matches come first, then the `RESULT_` / `FINAL_UPGRADE_`
 * prefix checks, then `*_REQUIRED` (missing precondition → `invalid`, e.g.
 * `CURRENT_TASK_REQUIRED` per Requirement 1.1), then the timeout / unavailable /
 * invalid substring buckets, then `unknown`.
 */

import { LocalClientError } from "../../../vendor/frontend-client";
import type { AgentError, AgentErrorCode } from "./agent-run-port";

/** Exact raw-code → {@link AgentErrorCode} table (checked first). */
const EXACT: Readonly<Record<string, AgentErrorCode>> = {
  RUN_BUSY: "run_busy",
  STALE_TASK_REVISION: "stale_task_revision",
  TASK_ALREADY_COMPLETED: "task_already_completed",
  TASK_BINDING_MISMATCH: "task_binding_mismatch",
  RUNTIME_CAPACITY: "runtime_capacity",
  RUN_IDEMPOTENCY_CONFLICT: "idempotency_conflict",
  DECISION_BINDING_MISMATCH: "decision_binding_mismatch",
  HELPER_EMPTY_RESPONSE: "helper_empty_response",
  NATIVE_ROLE_CATALOG_UNVERIFIED: "native_role_catalog_unverified",
  DECISION_ALREADY_RESOLVED: "decision_already_resolved",
  LIVE_CONTEXT_STALE: "live_context_stale",
  NATIVE_USER_INPUT_STALE: "native_user_input_stale",
  NATIVE_USER_INPUT_RESPONSE_INVALID: "native_response_invalid",
  NATIVE_NOT_READY: "native_not_ready",
};

/**
 * Map a raw string Core / worker code (+ optional HTTP status) to a stable
 * {@link AgentErrorCode}. Exact-string matches win first, then the
 * `RESULT_` / `FINAL_UPGRADE_` prefixes, then the generic substring / status
 * buckets, then `unknown`.
 */
export function mapAgentCode(code: string, status?: number): AgentErrorCode {
  const c = code.toUpperCase();

  // 1) Exact-string matches (must precede any broad bucket).
  const exact = EXACT[c];
  if (exact) return exact;

  // 2) Near-exact families that share a stable substring.
  if (c.includes("STALE") && (c.includes("TASK") || c.includes("REVISION"))) {
    return "stale_task_revision";
  }
  if (c.includes("IDEMPOTENCY")) return "idempotency_conflict";

  // 3) Prefix buckets.
  if (c.startsWith("RESULT_")) return "result_unavailable";
  if (c.startsWith("FINAL_UPGRADE_")) return "final_upgrade_rejected";

  // 3b) Missing-precondition codes (e.g. CURRENT_TASK_REQUIRED, *_REQUIRED)
  // surface as `invalid` per Requirement 1.1 — the missing-current-task case
  // must not fall through to the generic `unknown` bucket. Placed after the
  // exact table and the RESULT_/FINAL_UPGRADE_ prefixes but before the broad
  // buckets; no exact code contains REQUIRED, so existing mappings are intact.
  if (c.includes("REQUIRED")) return "invalid";

  // 4) Generic substring / status buckets (broadest — checked last).
  if (
    c.includes("TIMEOUT") ||
    c.includes("TIMED_OUT") ||
    c.includes("DEADLINE") ||
    c === "ABORTERROR"
  ) {
    return "timeout";
  }
  if (
    c.includes("CANCEL") ||
    c.includes("CONNECTION") ||
    c.includes("UNAVAILABLE") ||
    c.includes("BACKEND_RESTARTED") ||
    c.includes("RESTART") ||
    c.includes("ROTATED") ||
    status === 502 ||
    status === 503
  ) {
    return "unavailable";
  }
  if (
    c.includes("INVALID") ||
    c.includes("VALIDATION") ||
    c.includes("SCHEMA") ||
    status === 400
  ) {
    return "invalid";
  }

  return "unknown";
}

/**
 * Normalize any thrown value / raw code into a stable {@link AgentError}.
 * `raw` is the original code string (or the error name, or `'UNKNOWN'`);
 * `code` is the mapped {@link AgentErrorCode}; `message` is human-readable.
 * Never throws on any input (Error, duck-typed client error, string, number,
 * `null`, or plain object).
 */
export function toAgentError(raw: unknown, fallbackMessage?: string): AgentError {
  const fallback = fallbackMessage ?? "agent operation failed";

  // Real LocalClientError (the class the flow adapter also imports).
  if (raw instanceof LocalClientError) {
    return {
      code: mapAgentCode(raw.code, raw.status),
      raw: raw.code,
      message: raw.message.length > 0 ? `${raw.code}: ${raw.message}` : raw.code,
    };
  }

  // Duck-typed LocalClientError-like ({ code, status?, message? }); e.g.
  // cross-realm instances or hand-written fakes in tests.
  if (isClientErrorLike(raw)) {
    const message =
      typeof raw.message === "string" && raw.message.length > 0
        ? `${raw.code}: ${raw.message}`
        : raw.code;
    return { code: mapAgentCode(raw.code, raw.status), raw: raw.code, message };
  }

  // Generic Error: an all-caps token message is itself a raw code; otherwise
  // classify by the name (AbortError → timeout) and keep the human message.
  if (raw instanceof Error) {
    const isCodeMessage = /^[A-Z][A-Z0-9_]{0,99}$/.test(raw.message);
    const rawCode = isCodeMessage
      ? raw.message
      : raw.name && raw.name !== "Error"
        ? raw.name
        : "UNKNOWN";
    return {
      code: mapAgentCode(isCodeMessage ? raw.message : raw.name),
      raw: rawCode,
      message: raw.message.length > 0 ? raw.message : fallback,
    };
  }

  // Raw string code.
  if (typeof raw === "string") {
    const code = raw.length > 0 ? raw : "UNKNOWN";
    return { code: mapAgentCode(code), raw: code, message: raw.length > 0 ? raw : fallback };
  }

  // Any other primitive / object (number, boolean, null, plain object).
  return { code: "unknown", raw: "UNKNOWN", message: fallback };
}

/** Shape of a duck-typed {@link LocalClientError}: a string `code` at minimum. */
interface ClientErrorLike {
  readonly code: string;
  readonly status?: number;
  readonly message?: string;
}

/** True when `e` structurally carries a string `code` (LocalClientError-like). */
function isClientErrorLike(e: unknown): e is ClientErrorLike {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  );
}
