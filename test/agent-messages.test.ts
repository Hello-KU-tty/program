import { describe, it, expect } from "vitest";

import { parseAgentAction } from "../src/webview/agent/agent-messages";
import type { AgentAction } from "../src/webview/agent/agent-messages";

/**
 * Unit tests for task 1.3: strict inbound validation of `parseAgentAction`
 * in `src/webview/agent/agent-messages.ts` (Req 13.2).
 *
 * The webview is untrusted from the host's perspective, so the parser must:
 * - accept every well-formed `AgentAction` variant verbatim, and
 * - return `null` for malformed payloads, wrong/unknown discriminators, and
 *   payloads whose required fields have the wrong type/shape.
 *
 * There are twelve action variants (design.md §B.16): builder/start,
 * builder/stop, helper/start, decision/resolve, builder/resumeAfterDecision,
 * native/answer, workspace/open, result/launch, evidence/read, evidence/retry,
 * finalUpgrade/list, finalUpgrade/prepare. Each is covered below.
 *
 * NOTE on "extra-field" payloads: the parser reconstructs each action from the
 * fields it recognizes rather than echoing the raw object, so a payload that
 * carries an unexpected extra field alongside otherwise-valid fields is
 * normalized to the canonical action shape (the extra field is dropped, not
 * propagated). These tests assert that no unexpected field survives into the
 * parsed result. Payloads whose *only* deviation is an extra field on a
 * variant that also has a malformed required field still return `null`.
 */

describe("parseAgentAction - non-object / missing discriminator (task 1.3)", () => {
  it("rejects non-record inputs", () => {
    expect(parseAgentAction(null)).toBeNull();
    expect(parseAgentAction(undefined)).toBeNull();
    expect(parseAgentAction(42)).toBeNull();
    expect(parseAgentAction("builder/start")).toBeNull();
    expect(parseAgentAction(true)).toBeNull();
    expect(parseAgentAction([])).toBeNull();
    expect(parseAgentAction(["builder/start"])).toBeNull();
  });

  it("rejects objects without a string `kind`", () => {
    expect(parseAgentAction({})).toBeNull();
    expect(parseAgentAction({ kind: 123 })).toBeNull();
    expect(parseAgentAction({ kind: null })).toBeNull();
    expect(parseAgentAction({ message: "hi" })).toBeNull();
  });

  it("rejects unknown discriminators", () => {
    expect(parseAgentAction({ kind: "builder/pause" })).toBeNull();
    expect(parseAgentAction({ kind: "helper/stop" })).toBeNull();
    expect(parseAgentAction({ kind: "unknown", message: "x" })).toBeNull();
  });
});

describe("parseAgentAction - builder/start (task 1.3)", () => {
  it("accepts a well-formed payload verbatim", () => {
    const action = parseAgentAction({ kind: "builder/start", message: "implement task 3" });
    expect(action).toEqual<AgentAction>({ kind: "builder/start", message: "implement task 3" });
  });

  it("rejects a missing or non-string message", () => {
    expect(parseAgentAction({ kind: "builder/start" })).toBeNull();
    expect(parseAgentAction({ kind: "builder/start", message: 5 })).toBeNull();
    expect(parseAgentAction({ kind: "builder/start", message: null })).toBeNull();
  });

  it("drops extra fields (normalizes to the canonical shape)", () => {
    const action = parseAgentAction({
      kind: "builder/start",
      message: "go",
      unexpected: "surprise",
    });
    expect(action).toEqual<AgentAction>({ kind: "builder/start", message: "go" });
    expect(action).not.toHaveProperty("unexpected");
  });
});

describe("parseAgentAction - builder/stop (task 1.3)", () => {
  it("accepts the bare payload verbatim", () => {
    expect(parseAgentAction({ kind: "builder/stop" })).toEqual<AgentAction>({
      kind: "builder/stop",
    });
  });

  it("drops extra fields", () => {
    const action = parseAgentAction({ kind: "builder/stop", reason: "cancel" });
    expect(action).toEqual<AgentAction>({ kind: "builder/stop" });
    expect(action).not.toHaveProperty("reason");
  });
});

describe("parseAgentAction - helper/start (task 1.3)", () => {
  it("accepts FREE_TEXT origin without decisionId", () => {
    expect(
      parseAgentAction({ kind: "helper/start", message: "explain this", origin: "FREE_TEXT" }),
    ).toEqual<AgentAction>({ kind: "helper/start", message: "explain this", origin: "FREE_TEXT" });
  });

  it("accepts QUICK_ACTION origin with a decisionId", () => {
    expect(
      parseAgentAction({
        kind: "helper/start",
        message: "help me decide",
        origin: "QUICK_ACTION",
        decisionId: "dec_1",
      }),
    ).toEqual<AgentAction>({
      kind: "helper/start",
      message: "help me decide",
      origin: "QUICK_ACTION",
      decisionId: "dec_1",
    });
  });

  it("rejects a missing/non-string message", () => {
    expect(parseAgentAction({ kind: "helper/start", origin: "FREE_TEXT" })).toBeNull();
    expect(parseAgentAction({ kind: "helper/start", message: 1, origin: "FREE_TEXT" })).toBeNull();
  });

  it("rejects an unknown origin", () => {
    expect(parseAgentAction({ kind: "helper/start", message: "x", origin: "OTHER" })).toBeNull();
    expect(parseAgentAction({ kind: "helper/start", message: "x", origin: 3 })).toBeNull();
    expect(parseAgentAction({ kind: "helper/start", message: "x" })).toBeNull();
  });

  it("rejects a non-string decisionId", () => {
    expect(
      parseAgentAction({ kind: "helper/start", message: "x", origin: "FREE_TEXT", decisionId: 7 }),
    ).toBeNull();
  });

  it("drops extra fields but keeps optional decisionId out when absent", () => {
    const action = parseAgentAction({
      kind: "helper/start",
      message: "x",
      origin: "FREE_TEXT",
      extra: true,
    });
    expect(action).toEqual<AgentAction>({ kind: "helper/start", message: "x", origin: "FREE_TEXT" });
    expect(action).not.toHaveProperty("decisionId");
    expect(action).not.toHaveProperty("extra");
  });
});

describe("parseAgentAction - decision/resolve (task 1.3)", () => {
  it("accepts an OPTION selection", () => {
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "dec_1",
        selection: { kind: "OPTION", optionId: "opt_a" },
        helperUsed: false,
      }),
    ).toEqual<AgentAction>({
      kind: "decision/resolve",
      decisionId: "dec_1",
      selection: { kind: "OPTION", optionId: "opt_a" },
      helperUsed: false,
    });
  });

  it("accepts a RECOMMENDATION selection", () => {
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "dec_2",
        selection: { kind: "RECOMMENDATION" },
        helperUsed: true,
      }),
    ).toEqual<AgentAction>({
      kind: "decision/resolve",
      decisionId: "dec_2",
      selection: { kind: "RECOMMENDATION" },
      helperUsed: true,
    });
  });

  it("accepts a CUSTOM selection with a verbatim rationale", () => {
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "dec_3",
        selection: { kind: "CUSTOM", customProposal: "use approach X" },
        helperUsed: false,
        rationale: "because it fits my goal",
      }),
    ).toEqual<AgentAction>({
      kind: "decision/resolve",
      decisionId: "dec_3",
      selection: { kind: "CUSTOM", customProposal: "use approach X" },
      helperUsed: false,
      rationale: "because it fits my goal",
    });
  });

  it("rejects a missing/non-string decisionId", () => {
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        selection: { kind: "RECOMMENDATION" },
        helperUsed: false,
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: 9,
        selection: { kind: "RECOMMENDATION" },
        helperUsed: false,
      }),
    ).toBeNull();
  });

  it("rejects malformed selection shapes", () => {
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "d",
        selection: { kind: "OPTION" },
        helperUsed: false,
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "d",
        selection: { kind: "CUSTOM" },
        helperUsed: false,
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "d",
        selection: { kind: "MYSTERY" },
        helperUsed: false,
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "d",
        selection: "RECOMMENDATION",
        helperUsed: false,
      }),
    ).toBeNull();
  });

  it("rejects a non-boolean helperUsed", () => {
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "d",
        selection: { kind: "RECOMMENDATION" },
        helperUsed: "yes",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "d",
        selection: { kind: "RECOMMENDATION" },
      }),
    ).toBeNull();
  });

  it("rejects a non-string rationale", () => {
    expect(
      parseAgentAction({
        kind: "decision/resolve",
        decisionId: "d",
        selection: { kind: "RECOMMENDATION" },
        helperUsed: false,
        rationale: 42,
      }),
    ).toBeNull();
  });

  it("drops extra fields and omits optional rationale when absent", () => {
    const action = parseAgentAction({
      kind: "decision/resolve",
      decisionId: "d",
      selection: { kind: "RECOMMENDATION" },
      helperUsed: false,
      extra: "nope",
    });
    expect(action).toEqual<AgentAction>({
      kind: "decision/resolve",
      decisionId: "d",
      selection: { kind: "RECOMMENDATION" },
      helperUsed: false,
    });
    expect(action).not.toHaveProperty("rationale");
    expect(action).not.toHaveProperty("extra");
  });
});

describe("parseAgentAction - builder/resumeAfterDecision (task 1.3)", () => {
  it("accepts the bare payload verbatim", () => {
    expect(parseAgentAction({ kind: "builder/resumeAfterDecision" })).toEqual<AgentAction>({
      kind: "builder/resumeAfterDecision",
    });
  });

  it("drops extra fields", () => {
    const action = parseAgentAction({ kind: "builder/resumeAfterDecision", now: true });
    expect(action).toEqual<AgentAction>({ kind: "builder/resumeAfterDecision" });
    expect(action).not.toHaveProperty("now");
  });
});

describe("parseAgentAction - native/answer (task 1.3)", () => {
  it("accepts a dismissed answer", () => {
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "req_1",
        nativeJobId: "job_1",
        answer: { action: "dismissed" },
      }),
    ).toEqual<AgentAction>({
      kind: "native/answer",
      requestId: "req_1",
      nativeJobId: "job_1",
      answer: { action: "dismissed" },
    });
  });

  it("accepts a free-text answer", () => {
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "req_2",
        nativeJobId: "job_2",
        answer: { action: "answered", answer: "my choice" },
      }),
    ).toEqual<AgentAction>({
      kind: "native/answer",
      requestId: "req_2",
      nativeJobId: "job_2",
      answer: { action: "answered", answer: "my choice" },
    });
  });

  it("accepts an option + sub-options answer", () => {
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "req_3",
        nativeJobId: "job_3",
        answer: { action: "answered", optionIndex: 1, subOptionIndices: [0, 2] },
      }),
    ).toEqual<AgentAction>({
      kind: "native/answer",
      requestId: "req_3",
      nativeJobId: "job_3",
      answer: { action: "answered", optionIndex: 1, subOptionIndices: [0, 2] },
    });
  });

  it("rejects missing/non-string ids", () => {
    expect(
      parseAgentAction({
        kind: "native/answer",
        nativeJobId: "job",
        answer: { action: "dismissed" },
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: 1,
        nativeJobId: "job",
        answer: { action: "dismissed" },
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "req",
        answer: { action: "dismissed" },
      }),
    ).toBeNull();
  });

  it("rejects malformed answer shapes", () => {
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "r",
        nativeJobId: "j",
        answer: { action: "unknown" },
      }),
    ).toBeNull();
    // answered with neither a string answer nor a valid option payload
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "r",
        nativeJobId: "j",
        answer: { action: "answered" },
      }),
    ).toBeNull();
    // non-finite optionIndex
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "r",
        nativeJobId: "j",
        answer: { action: "answered", optionIndex: Number.NaN, subOptionIndices: [] },
      }),
    ).toBeNull();
    // non-numeric sub-option entries
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "r",
        nativeJobId: "j",
        answer: { action: "answered", optionIndex: 0, subOptionIndices: ["a"] },
      }),
    ).toBeNull();
    // answer not a record
    expect(
      parseAgentAction({
        kind: "native/answer",
        requestId: "r",
        nativeJobId: "j",
        answer: "dismissed",
      }),
    ).toBeNull();
  });
});

describe("parseAgentAction - workspace/open (task 1.3)", () => {
  it("accepts a well-formed payload verbatim", () => {
    expect(parseAgentAction({ kind: "workspace/open", taskId: "task_1" })).toEqual<AgentAction>({
      kind: "workspace/open",
      taskId: "task_1",
    });
  });

  it("rejects a missing/non-string taskId", () => {
    expect(parseAgentAction({ kind: "workspace/open" })).toBeNull();
    expect(parseAgentAction({ kind: "workspace/open", taskId: 3 })).toBeNull();
  });

  it("drops extra fields", () => {
    const action = parseAgentAction({ kind: "workspace/open", taskId: "t", path: "/abs" });
    expect(action).toEqual<AgentAction>({ kind: "workspace/open", taskId: "t" });
    expect(action).not.toHaveProperty("path");
  });
});

describe("parseAgentAction - result/launch (task 1.3)", () => {
  it("accepts the bare payload verbatim", () => {
    expect(parseAgentAction({ kind: "result/launch" })).toEqual<AgentAction>({
      kind: "result/launch",
    });
  });

  it("drops extra fields", () => {
    const action = parseAgentAction({ kind: "result/launch", port: 8080 });
    expect(action).toEqual<AgentAction>({ kind: "result/launch" });
    expect(action).not.toHaveProperty("port");
  });
});

describe("parseAgentAction - evidence/read (task 1.3)", () => {
  it("accepts a payload without conceptId", () => {
    expect(parseAgentAction({ kind: "evidence/read" })).toEqual<AgentAction>({
      kind: "evidence/read",
    });
  });

  it("accepts a payload with a conceptId", () => {
    expect(parseAgentAction({ kind: "evidence/read", conceptId: "c_1" })).toEqual<AgentAction>({
      kind: "evidence/read",
      conceptId: "c_1",
    });
  });

  it("rejects a non-string conceptId", () => {
    expect(parseAgentAction({ kind: "evidence/read", conceptId: 9 })).toBeNull();
  });

  it("drops extra fields and omits optional conceptId when absent", () => {
    const action = parseAgentAction({ kind: "evidence/read", extra: 1 });
    expect(action).toEqual<AgentAction>({ kind: "evidence/read" });
    expect(action).not.toHaveProperty("conceptId");
    expect(action).not.toHaveProperty("extra");
  });
});

describe("parseAgentAction - evidence/retry (task 1.3)", () => {
  it("accepts a well-formed payload verbatim", () => {
    expect(
      parseAgentAction({
        kind: "evidence/retry",
        analysisJobId: "aj_1",
        expectedJobRevision: 4,
      }),
    ).toEqual<AgentAction>({
      kind: "evidence/retry",
      analysisJobId: "aj_1",
      expectedJobRevision: 4,
    });
  });

  it("rejects a missing/non-string analysisJobId", () => {
    expect(parseAgentAction({ kind: "evidence/retry", expectedJobRevision: 4 })).toBeNull();
    expect(
      parseAgentAction({ kind: "evidence/retry", analysisJobId: 1, expectedJobRevision: 4 }),
    ).toBeNull();
  });

  it("rejects a missing/non-finite expectedJobRevision", () => {
    expect(parseAgentAction({ kind: "evidence/retry", analysisJobId: "aj" })).toBeNull();
    expect(
      parseAgentAction({
        kind: "evidence/retry",
        analysisJobId: "aj",
        expectedJobRevision: "4",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "evidence/retry",
        analysisJobId: "aj",
        expectedJobRevision: Number.POSITIVE_INFINITY,
      }),
    ).toBeNull();
  });

  it("drops extra fields", () => {
    const action = parseAgentAction({
      kind: "evidence/retry",
      analysisJobId: "aj",
      expectedJobRevision: 2,
      extra: true,
    });
    expect(action).toEqual<AgentAction>({
      kind: "evidence/retry",
      analysisJobId: "aj",
      expectedJobRevision: 2,
    });
    expect(action).not.toHaveProperty("extra");
  });
});

describe("parseAgentAction - finalUpgrade/list (task 1.3)", () => {
  it("accepts the bare payload verbatim", () => {
    expect(parseAgentAction({ kind: "finalUpgrade/list" })).toEqual<AgentAction>({
      kind: "finalUpgrade/list",
    });
  });

  it("drops extra fields", () => {
    const action = parseAgentAction({ kind: "finalUpgrade/list", filter: "all" });
    expect(action).toEqual<AgentAction>({ kind: "finalUpgrade/list" });
    expect(action).not.toHaveProperty("filter");
  });
});

describe("parseAgentAction - finalUpgrade/prepare (task 1.3)", () => {
  it("accepts a well-formed payload verbatim", () => {
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        expectedSourceTaskRevision: 2,
        personalizationTraceId: "trace_1",
        userGoal: "ship the feature",
      }),
    ).toEqual<AgentAction>({
      kind: "finalUpgrade/prepare",
      sourceTaskId: "task_1",
      expectedSourceTaskRevision: 2,
      personalizationTraceId: "trace_1",
      userGoal: "ship the feature",
    });
  });

  it("rejects when any required field is missing", () => {
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        expectedSourceTaskRevision: 2,
        personalizationTraceId: "trace_1",
        userGoal: "goal",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        personalizationTraceId: "trace_1",
        userGoal: "goal",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        expectedSourceTaskRevision: 2,
        userGoal: "goal",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        expectedSourceTaskRevision: 2,
        personalizationTraceId: "trace_1",
      }),
    ).toBeNull();
  });

  it("rejects when a required field has the wrong type", () => {
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: 1,
        expectedSourceTaskRevision: 2,
        personalizationTraceId: "trace_1",
        userGoal: "goal",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        expectedSourceTaskRevision: "2",
        personalizationTraceId: "trace_1",
        userGoal: "goal",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        expectedSourceTaskRevision: Number.NaN,
        personalizationTraceId: "trace_1",
        userGoal: "goal",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        expectedSourceTaskRevision: 2,
        personalizationTraceId: null,
        userGoal: "goal",
      }),
    ).toBeNull();
    expect(
      parseAgentAction({
        kind: "finalUpgrade/prepare",
        sourceTaskId: "task_1",
        expectedSourceTaskRevision: 2,
        personalizationTraceId: "trace_1",
        userGoal: 5,
      }),
    ).toBeNull();
  });

  it("drops extra fields", () => {
    const action = parseAgentAction({
      kind: "finalUpgrade/prepare",
      sourceTaskId: "task_1",
      expectedSourceTaskRevision: 2,
      personalizationTraceId: "trace_1",
      userGoal: "goal",
      extra: "nope",
    });
    expect(action).toEqual<AgentAction>({
      kind: "finalUpgrade/prepare",
      sourceTaskId: "task_1",
      expectedSourceTaskRevision: 2,
      personalizationTraceId: "trace_1",
      userGoal: "goal",
    });
    expect(action).not.toHaveProperty("extra");
  });
});
