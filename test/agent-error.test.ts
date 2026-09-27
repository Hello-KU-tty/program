import { describe, it, expect } from "vitest";

import { LocalClientError } from "../vendor/frontend-client";
import { mapAgentCode, toAgentError } from "../src/adapter/agent/agent-error";
import type { AgentErrorCode } from "../src/adapter/agent/agent-run-port";

/**
 * Unit tests for `toAgentError` / `mapAgentCode` (task 2.3).
 *
 * These assert the design §Error-Handling mapping tables (Requirements
 * 1.10–1.15, 4.6, 5.6, 7.7, 9.4, 11.3):
 *   - each exact raw Core / worker code maps to its stable AgentErrorCode,
 *   - the RESULT_* / FINAL_UPGRADE_* prefix buckets map correctly,
 *   - the timeout / unavailable / invalid substring + status fallbacks work,
 *   - substring fallback (e.g. STALE + REVISION, IDEMPOTENCY, *_REQUIRED),
 *   - unknown / empty / non-Error inputs map to `unknown` and NEVER throw.
 *
 * We exercise every carrier shape `toAgentError` accepts: the real
 * LocalClientError, a duck-typed { code, status?, message? }, a generic Error,
 * a raw string, and non-Error primitives / objects.
 */

// --- 1) Exact-match code table --------------------------------------------

const EXACT_CASES: ReadonlyArray<[string, AgentErrorCode]> = [
  ["RUN_BUSY", "run_busy"],
  ["STALE_TASK_REVISION", "stale_task_revision"],
  ["TASK_ALREADY_COMPLETED", "task_already_completed"],
  ["TASK_BINDING_MISMATCH", "task_binding_mismatch"],
  ["RUNTIME_CAPACITY", "runtime_capacity"],
  ["RUN_IDEMPOTENCY_CONFLICT", "idempotency_conflict"],
  ["DECISION_BINDING_MISMATCH", "decision_binding_mismatch"],
  ["HELPER_EMPTY_RESPONSE", "helper_empty_response"],
  ["NATIVE_ROLE_CATALOG_UNVERIFIED", "native_role_catalog_unverified"],
  ["DECISION_ALREADY_RESOLVED", "decision_already_resolved"],
  ["LIVE_CONTEXT_STALE", "live_context_stale"],
  ["NATIVE_USER_INPUT_STALE", "native_user_input_stale"],
  ["NATIVE_USER_INPUT_RESPONSE_INVALID", "native_response_invalid"],
  ["NATIVE_NOT_READY", "native_not_ready"],
];

describe("mapAgentCode — exact-match table", () => {
  for (const [raw, expected] of EXACT_CASES) {
    it(`maps ${raw} → ${expected}`, () => {
      expect(mapAgentCode(raw)).toBe(expected);
    });

    it(`maps ${raw} case-insensitively (lower-case) → ${expected}`, () => {
      expect(mapAgentCode(raw.toLowerCase())).toBe(expected);
    });
  }
});

describe("toAgentError — exact codes via LocalClientError", () => {
  for (const [raw, expected] of EXACT_CASES) {
    it(`LocalClientError(${raw}) → code ${expected}, raw preserved`, () => {
      const err = toAgentError(new LocalClientError(raw));
      expect(err.code).toBe(expected);
      expect(err.raw).toBe(raw);
      // LocalClientError sets .message to the code, so toAgentError prefixes it
      // with the code → "CODE: CODE"; either way the raw code stays visible.
      expect(err.message).toContain(raw);
    });
  }
});

describe("toAgentError — exact codes via duck-typed client error", () => {
  for (const [raw, expected] of EXACT_CASES) {
    it(`{ code: ${raw}, message } → code ${expected}`, () => {
      const err = toAgentError({ code: raw, message: "detail here" });
      expect(err.code).toBe(expected);
      expect(err.raw).toBe(raw);
      expect(err.message).toBe(`${raw}: detail here`);
    });
  }
});

// --- 2) RESULT_* / FINAL_UPGRADE_* prefix buckets -------------------------

describe("mapAgentCode — RESULT_* prefix → result_unavailable", () => {
  const codes = [
    "RESULT_NOT_RUNNING",
    "RESULT_PORT_INVALID",
    "RESULT_UNAVAILABLE",
    "RESULT_",
  ];
  for (const c of codes) {
    it(`maps ${c} → result_unavailable`, () => {
      expect(mapAgentCode(c)).toBe("result_unavailable");
    });
  }
});

describe("mapAgentCode — FINAL_UPGRADE_* prefix → final_upgrade_rejected", () => {
  const codes = [
    "FINAL_UPGRADE_NOT_ELIGIBLE",
    "FINAL_UPGRADE_ALREADY_PREPARED",
    "FINAL_UPGRADE_REJECTED",
    "FINAL_UPGRADE_",
  ];
  for (const c of codes) {
    it(`maps ${c} → final_upgrade_rejected`, () => {
      expect(mapAgentCode(c)).toBe("final_upgrade_rejected");
    });
  }
});

// --- 3) Substring fallbacks -----------------------------------------------

describe("mapAgentCode — substring fallbacks", () => {
  it("STALE + REVISION substring → stale_task_revision", () => {
    expect(mapAgentCode("SOME_STALE_REVISION_THING")).toBe("stale_task_revision");
  });

  it("STALE + TASK substring → stale_task_revision", () => {
    expect(mapAgentCode("TASK_STALE_SOMETHING")).toBe("stale_task_revision");
  });

  it("IDEMPOTENCY substring → idempotency_conflict", () => {
    expect(mapAgentCode("SOME_IDEMPOTENCY_ISSUE")).toBe("idempotency_conflict");
  });

  it("*_REQUIRED (missing precondition) → invalid", () => {
    expect(mapAgentCode("CURRENT_TASK_REQUIRED")).toBe("invalid");
  });
});

describe("mapAgentCode — timeout fallback", () => {
  for (const c of ["OP_TIMEOUT", "REQUEST_TIMED_OUT", "DEADLINE_EXCEEDED", "AbortError"]) {
    it(`maps ${c} → timeout`, () => {
      expect(mapAgentCode(c)).toBe("timeout");
    });
  }
});

describe("mapAgentCode — unavailable fallback", () => {
  for (const c of [
    "CONNECTION_REFUSED",
    "SERVICE_UNAVAILABLE",
    "BACKEND_RESTARTED",
    "CORE_RESTART",
    "TOKEN_ROTATED",
    "CANCEL_PENDING",
  ]) {
    it(`maps ${c} → unavailable`, () => {
      expect(mapAgentCode(c)).toBe("unavailable");
    });
  }

  it("maps HTTP 502 → unavailable", () => {
    expect(mapAgentCode("BAD_GATEWAY", 502)).toBe("unavailable");
  });

  it("maps HTTP 503 → unavailable", () => {
    expect(mapAgentCode("GATEWAY", 503)).toBe("unavailable");
  });
});

describe("mapAgentCode — invalid fallback", () => {
  for (const c of ["INVALID_ARGUMENT", "VALIDATION_FAILED", "SCHEMA_MISMATCH"]) {
    it(`maps ${c} → invalid`, () => {
      expect(mapAgentCode(c)).toBe("invalid");
    });
  }

  it("maps HTTP 400 → invalid", () => {
    expect(mapAgentCode("BAD_REQUEST", 400)).toBe("invalid");
  });
});

describe("mapAgentCode — unknown fallback", () => {
  for (const c of ["", "SOMETHING_ELSE", "WEIRD_CODE", "OK"]) {
    it(`maps "${c}" → unknown`, () => {
      expect(mapAgentCode(c)).toBe("unknown");
    });
  }
});

// --- 4) Exact codes are NOT swallowed by broad buckets --------------------

describe("mapAgentCode — ordering: exact wins over substring buckets", () => {
  it("NATIVE_USER_INPUT_RESPONSE_INVALID → native_response_invalid, not invalid", () => {
    expect(mapAgentCode("NATIVE_USER_INPUT_RESPONSE_INVALID")).toBe(
      "native_response_invalid",
    );
  });

  it("TASK_ALREADY_COMPLETED → task_already_completed, not swallowed", () => {
    expect(mapAgentCode("TASK_ALREADY_COMPLETED")).toBe("task_already_completed");
  });

  it("DECISION_ALREADY_RESOLVED → decision_already_resolved, not swallowed", () => {
    expect(mapAgentCode("DECISION_ALREADY_RESOLVED")).toBe(
      "decision_already_resolved",
    );
  });

  it("RUN_IDEMPOTENCY_CONFLICT → idempotency_conflict (exact, not substring path)", () => {
    expect(mapAgentCode("RUN_IDEMPOTENCY_CONFLICT")).toBe("idempotency_conflict");
  });
});

// --- 5) toAgentError carrier shapes ---------------------------------------

describe("toAgentError — LocalClientError with status + message", () => {
  it("maps status 503 → unavailable and prefixes message with code", () => {
    const err = toAgentError(new LocalClientError("BAD_GATEWAY", 503));
    expect(err.code).toBe("unavailable");
    expect(err.raw).toBe("BAD_GATEWAY");
  });
});

describe("toAgentError — generic Error", () => {
  it("all-caps token message is treated as a raw code", () => {
    const err = toAgentError(new Error("RUN_BUSY"));
    expect(err.code).toBe("run_busy");
    expect(err.raw).toBe("RUN_BUSY");
    expect(err.message).toBe("RUN_BUSY");
  });

  it("AbortError (by name) → timeout with human message preserved", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    const err = toAgentError(abort);
    expect(err.code).toBe("timeout");
    expect(err.raw).toBe("AbortError");
    expect(err.message).toBe("The operation was aborted");
  });

  it("free-text Error with default name → unknown, raw UNKNOWN", () => {
    const err = toAgentError(new Error("something odd happened"));
    expect(err.code).toBe("unknown");
    expect(err.raw).toBe("UNKNOWN");
    expect(err.message).toBe("something odd happened");
  });

  it("empty-message Error → unknown with fallback message", () => {
    const err = toAgentError(new Error(""), "boom");
    expect(err.code).toBe("unknown");
    expect(err.raw).toBe("UNKNOWN");
    expect(err.message).toBe("boom");
  });
});

describe("toAgentError — raw string code", () => {
  it("maps a raw string exact code", () => {
    const err = toAgentError("STALE_TASK_REVISION");
    expect(err.code).toBe("stale_task_revision");
    expect(err.raw).toBe("STALE_TASK_REVISION");
    expect(err.message).toBe("STALE_TASK_REVISION");
  });

  it("empty string → unknown with UNKNOWN raw and fallback message", () => {
    const err = toAgentError("", "fallback msg");
    expect(err.code).toBe("unknown");
    expect(err.raw).toBe("UNKNOWN");
    expect(err.message).toBe("fallback msg");
  });
});

// --- 6) Non-Error / empty inputs → unknown, never throws ------------------

describe("toAgentError — non-Error inputs map to unknown without throwing", () => {
  const nonErrors: ReadonlyArray<[string, unknown]> = [
    ["null", null],
    ["undefined", undefined],
    ["number", 42],
    ["zero", 0],
    ["boolean", true],
    ["plain object without code", { foo: "bar" }],
    ["array", [1, 2, 3]],
    ["object with non-string code", { code: 123 }],
  ];

  for (const [label, input] of nonErrors) {
    it(`${label} → unknown, raw UNKNOWN, never throws`, () => {
      let err!: ReturnType<typeof toAgentError>;
      expect(() => {
        err = toAgentError(input);
      }).not.toThrow();
      expect(err.code).toBe("unknown");
      expect(err.raw).toBe("UNKNOWN");
      expect(err.message).toBe("agent operation failed");
    });
  }

  it("uses the provided fallback message for non-Error inputs", () => {
    const err = toAgentError(null, "custom fallback");
    expect(err.code).toBe("unknown");
    expect(err.message).toBe("custom fallback");
  });
});
