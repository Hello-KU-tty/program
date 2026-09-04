import { describe, it, expect } from "vitest";

import {
  KiroAcpAdapter,
  classifyError,
  createNormalizeContext,
  normalizeSessionUpdate,
  type AcpSessionUpdate,
  type AcpTransport,
} from "../src/adapter/kiro-acp-adapter";
import type { AgentStreamEvent, StartTurnRequest } from "../src/adapter/agent-adapter";
import type { AgentId } from "../src/core/types";

/**
 * Unit tests for task 15.1: the pure ACP `session/update` normalization
 * function, the error-classification helper, and the {@link KiroAcpAdapter}
 * driven against an in-memory fake {@link AcpTransport}.
 *
 * Covers: message chunk → message_chunk (Req 3.2); tool-call start → work_item
 * with collapse default (Req 4.1); tool-call failure → work_item_result failed
 * (Req 4.6); stop reasons → completed / failed (Req 3.3, 3.7); error mapping to
 * AdapterError codes (Req 6.1, 6.2); ordered forwarding via startTurn and the
 * Helper (allowWorkStream=false) work-item gate (Req 4.7).
 */

// ---------------------------------------------------------------------------
// Pure normalizeSessionUpdate
// ---------------------------------------------------------------------------

describe("normalizeSessionUpdate (pure)", () => {
  it("maps agent_message_chunk with text -> message_chunk", () => {
    const ctx = createNormalizeContext();
    const result = normalizeSessionUpdate(
      {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "Hello" },
      },
      ctx,
    );
    expect(result).toEqual({ kind: "message_chunk", text: "Hello" });
  });

  it("returns null for an empty message chunk", () => {
    const ctx = createNormalizeContext();
    const result = normalizeSessionUpdate(
      { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "" } },
      ctx,
    );
    expect(result).toBeNull();
  });

  it("maps a tool_call first sighting -> work_item with correct fields and collapse default", () => {
    const ctx = createNormalizeContext();
    const longDetail = "l1\nl2\nl3\nl4"; // 4 lines -> collapsed by default
    const result = normalizeSessionUpdate(
      {
        sessionUpdate: "tool_call",
        toolCallId: "tc-1",
        status: "in_progress",
        title: "Run tests",
        kind: "test",
        content: longDetail,
      },
      ctx,
    );
    expect(result).toEqual({
      kind: "work_item",
      item: {
        id: "tc-1",
        seq: 0,
        itemType: "test",
        title: "Run tests",
        detail: longDetail,
        lineCount: 4,
        status: "running",
        expanded: false, // lineCount > 3 -> collapsed by default (Req 4.4)
      },
    });
  });

  it("expands a short (<=3 line) work item by default", () => {
    const ctx = createNormalizeContext();
    const result = normalizeSessionUpdate(
      {
        sessionUpdate: "tool_call",
        toolCallId: "tc-short",
        status: "pending",
        title: "Edit file",
        kind: "edit",
        content: "one line",
      },
      ctx,
    ) as Extract<AgentStreamEvent, { kind: "work_item" }>;
    expect(result.item.itemType).toBe("file_change");
    expect(result.item.lineCount).toBe(1);
    expect(result.item.expanded).toBe(true);
  });

  it("maps a terminal failed update for a previously-seen tool call -> work_item_result failed", () => {
    const ctx = createNormalizeContext();
    // First sighting -> work_item.
    normalizeSessionUpdate(
      { sessionUpdate: "tool_call", toolCallId: "tc-2", status: "in_progress", title: "Cmd" },
      ctx,
    );
    // Terminal failure -> work_item_result failed.
    const result = normalizeSessionUpdate(
      { sessionUpdate: "tool_call_update", toolCallId: "tc-2", status: "failed" },
      ctx,
    );
    expect(result).toEqual({ kind: "work_item_result", itemId: "tc-2", failed: true });
  });

  it("maps a terminal completed update for a seen tool call -> work_item_result (not failed)", () => {
    const ctx = createNormalizeContext();
    normalizeSessionUpdate(
      { sessionUpdate: "tool_call", toolCallId: "tc-3", status: "pending" },
      ctx,
    );
    const result = normalizeSessionUpdate(
      { sessionUpdate: "tool_call_update", toolCallId: "tc-3", status: "completed" },
      ctx,
    );
    expect(result).toEqual({ kind: "work_item_result", itemId: "tc-3", failed: false });
  });

  it("surfaces a terminal update for an UNSEEN tool call as work_item + work_item_result", () => {
    const ctx = createNormalizeContext();
    const result = normalizeSessionUpdate(
      {
        sessionUpdate: "tool_call_update",
        toolCallId: "tc-unseen",
        status: "failed",
        title: "Boom",
      },
      ctx,
    );
    expect(Array.isArray(result)).toBe(true);
    const events = result as AgentStreamEvent[];
    expect(events[0].kind).toBe("work_item");
    expect((events[0] as Extract<AgentStreamEvent, { kind: "work_item" }>).item.status).toBe(
      "failed",
    );
    expect(events[1]).toEqual({ kind: "work_item_result", itemId: "tc-unseen", failed: true });
  });

  it("assigns monotonic seq to work items in first-sight order", () => {
    const ctx = createNormalizeContext();
    const a = normalizeSessionUpdate(
      { sessionUpdate: "tool_call", toolCallId: "a", status: "pending" },
      ctx,
    ) as Extract<AgentStreamEvent, { kind: "work_item" }>;
    const b = normalizeSessionUpdate(
      { sessionUpdate: "tool_call", toolCallId: "b", status: "pending" },
      ctx,
    ) as Extract<AgentStreamEvent, { kind: "work_item" }>;
    expect(a.item.seq).toBe(0);
    expect(b.item.seq).toBe(1);
  });

  it("maps a success stop reason -> completed", () => {
    const ctx = createNormalizeContext();
    expect(
      normalizeSessionUpdate({ sessionUpdate: "stop", stopReason: "end_turn" }, ctx),
    ).toEqual({ kind: "completed" });
    expect(
      normalizeSessionUpdate({ sessionUpdate: "turn_complete", stopReason: "completed" }, ctx),
    ).toEqual({ kind: "completed" });
  });

  it("maps abort/cancel/error stop reasons -> failed with normalized codes", () => {
    const ctx = createNormalizeContext();
    const aborted = normalizeSessionUpdate(
      { sessionUpdate: "stop", stopReason: "aborted" },
      ctx,
    ) as Extract<AgentStreamEvent, { kind: "failed" }>;
    expect(aborted.kind).toBe("failed");
    expect(aborted.error.code).toBe("unknown");

    const errored = normalizeSessionUpdate(
      { sessionUpdate: "stop", stopReason: "error", message: "kaboom" },
      ctx,
    ) as Extract<AgentStreamEvent, { kind: "failed" }>;
    expect(errored.error.code).toBe("stream_error");
    expect(errored.error.message).toBe("kaboom");
  });

  it("returns null for unknown / malformed updates", () => {
    const ctx = createNormalizeContext();
    expect(normalizeSessionUpdate({ sessionUpdate: "who_knows" }, ctx)).toBeNull();
    expect(
      normalizeSessionUpdate({} as unknown as AcpSessionUpdate, ctx),
    ).toBeNull();
    expect(
      normalizeSessionUpdate(null as unknown as AcpSessionUpdate, ctx),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

describe("classifyError", () => {
  it("honors an explicit code hint", () => {
    expect(classifyError({ code: "stalled", message: "x" })).toEqual({
      code: "stalled",
      message: "x",
    });
  });

  it("maps timeout signals -> start_timeout", () => {
    expect(classifyError(new Error("Prompt timed out waiting for start")).code).toBe(
      "start_timeout",
    );
  });

  it("maps stall signals -> stalled", () => {
    expect(classifyError(new Error("stream stalled: no events for 30s")).code).toBe("stalled");
  });

  it("maps spawn/ENOENT/unavailable signals -> unavailable", () => {
    expect(classifyError(new Error("spawn kiro ENOENT")).code).toBe("unavailable");
    expect(classifyError(new Error("host unavailable")).code).toBe("unavailable");
    expect(classifyError({ name: "Error", message: "ECONNREFUSED" }).code).toBe("unavailable");
  });

  it("maps stream/protocol/parse signals -> stream_error", () => {
    expect(classifyError(new Error("JSON-RPC parse failure")).code).toBe("stream_error");
    expect(classifyError(new Error("protocol violation")).code).toBe("stream_error");
  });

  it("falls back to unknown for unrecognized errors", () => {
    const result = classifyError(new Error("something odd happened"));
    expect(result.code).toBe("unknown");
    expect(result.message).toBe("something odd happened");
  });

  it("degrades non-object inputs to unknown", () => {
    expect(classifyError(undefined).code).toBe("unknown");
    expect(classifyError("bare string").message).toBe("bare string");
  });
});

// ---------------------------------------------------------------------------
// Fake transport + KiroAcpAdapter.startTurn
// ---------------------------------------------------------------------------

/**
 * In-memory {@link AcpTransport} that emits a scripted sequence of
 * notifications/errors when `sendPrompt` is called, letting tests assert the
 * adapter normalizes and forwards them in order.
 */
class FakeAcpTransport implements AcpTransport {
  private notificationCbs: Array<(u: AcpSessionUpdate) => void> = [];
  private errorCbs: Array<(e: unknown) => void> = [];
  cancelled = false;
  lastPrompt?: { text: string; allowWorkStream: boolean };

  constructor(
    private readonly script: Array<
      { type: "update"; update: AcpSessionUpdate } | { type: "error"; error: unknown }
    >,
    private readonly available = true,
    private readonly acceptTurn = true,
  ) {}

  isAvailable(_agent: AgentId): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  async sendPrompt(
    text: string,
    allowWorkStream: boolean,
  ): Promise<{ turnId: string }> {
    this.lastPrompt = { text, allowWorkStream };
    if (!this.acceptTurn) {
      throw new Error("start timeout: host did not accept turn");
    }
    // Emit the scripted stream only after acceptance has fully settled (the
    // adapter emits `started` in the continuation after this promise resolves).
    // A macrotask (setTimeout 0) guarantees the acceptance continuation — and
    // thus `started` — runs before any scripted `session/update` flows, which
    // mirrors ACP: turn acknowledgement precedes streaming updates.
    setTimeout(() => {
      for (const step of this.script) {
        if (step.type === "update") {
          for (const cb of this.notificationCbs) cb(step.update);
        } else {
          for (const cb of this.errorCbs) cb(step.error);
        }
      }
    }, 0);
    return { turnId: "host-turn-1" };
  }

  onNotification(cb: (u: AcpSessionUpdate) => void): () => void {
    this.notificationCbs.push(cb);
    return () => {
      this.notificationCbs = this.notificationCbs.filter((c) => c !== cb);
    };
  }

  onError(cb: (e: unknown) => void): () => void {
    this.errorCbs.push(cb);
    return () => {
      this.errorCbs = this.errorCbs.filter((c) => c !== cb);
    };
  }

  cancel(): void {
    this.cancelled = true;
  }
}

function builderReq(text = "do the thing"): StartTurnRequest {
  return { agent: "builder", text, allowWorkStream: true };
}

/** Collect events, flushing microtasks so the scripted emission runs. */
async function runTurn(
  transport: FakeAcpTransport,
  req: StartTurnRequest,
): Promise<{ events: AgentStreamEvent[]; handle: Awaited<ReturnType<KiroAcpAdapter["startTurn"]>> }> {
  const adapter = new KiroAcpAdapter(transport);
  const events: AgentStreamEvent[] = [];
  const handle = await adapter.startTurn(req, (e) => events.push(e));
  // Wait for the transport's scheduled (macrotask) emission of the scripted
  // notifications to run and be forwarded.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { events, handle };
}

describe("KiroAcpAdapter.startTurn (fake transport)", () => {
  it("forwards normalized events in order for a Builder turn", async () => {
    const transport = new FakeAcpTransport([
      { type: "update", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Hi" } } },
      { type: "update", update: { sessionUpdate: "tool_call", toolCallId: "t1", status: "in_progress", title: "Run", kind: "execute", content: "x" } },
      { type: "update", update: { sessionUpdate: "tool_call_update", toolCallId: "t1", status: "completed" } },
      { type: "update", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "!" } } },
      { type: "update", update: { sessionUpdate: "stop", stopReason: "end_turn" } },
    ]);

    const { events, handle } = await runTurn(transport, builderReq());

    expect(handle.turnId).toBe("host-turn-1");
    expect(events.map((e) => e.kind)).toEqual([
      "started",
      "message_chunk",
      "work_item",
      "work_item_result",
      "message_chunk",
      "completed",
    ]);
    expect((events[2] as Extract<AgentStreamEvent, { kind: "work_item" }>).item.itemType).toBe(
      "command",
    );
    expect(transport.lastPrompt).toEqual({ text: "do the thing", allowWorkStream: true });
  });

  it("emits exactly one terminal event and drops post-terminal notifications", async () => {
    const transport = new FakeAcpTransport([
      { type: "update", update: { sessionUpdate: "stop", stopReason: "end_turn" } },
      { type: "update", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "late" } } },
      { type: "update", update: { sessionUpdate: "stop", stopReason: "error" } },
    ]);
    const { events } = await runTurn(transport, builderReq());
    const terminals = events.filter((e) => e.kind === "completed" || e.kind === "failed");
    expect(terminals).toHaveLength(1);
    expect(terminals[0].kind).toBe("completed");
  });

  it("classifies a transport error into a terminal failed event", async () => {
    const transport = new FakeAcpTransport([
      { type: "update", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "partial" } } },
      { type: "error", error: new Error("stream stalled: no events") },
    ]);
    const { events } = await runTurn(transport, builderReq());
    const failed = events.find((e) => e.kind === "failed") as
      | Extract<AgentStreamEvent, { kind: "failed" }>
      | undefined;
    expect(failed).toBeDefined();
    expect(failed!.error.code).toBe("stalled");
  });

  it("fails the turn when the host rejects acceptance (start timeout)", async () => {
    const transport = new FakeAcpTransport([], true, /* acceptTurn */ false);
    const { events } = await runTurn(transport, builderReq());
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("failed");
    expect((events[0] as Extract<AgentStreamEvent, { kind: "failed" }>).error.code).toBe(
      "start_timeout",
    );
  });

  it("suppresses work items for a Helper turn (allowWorkStream=false)", async () => {
    const transport = new FakeAcpTransport([
      { type: "update", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "A concept" } } },
      { type: "update", update: { sessionUpdate: "tool_call", toolCallId: "t1", status: "in_progress", title: "Run" } },
      { type: "update", update: { sessionUpdate: "tool_call_update", toolCallId: "t1", status: "failed" } },
      { type: "update", update: { sessionUpdate: "stop", stopReason: "end_turn" } },
    ]);
    const helperReq: StartTurnRequest = { agent: "helper", text: "explain", allowWorkStream: false };
    const { events } = await runTurn(transport, helperReq);

    expect(events.some((e) => e.kind === "work_item" || e.kind === "work_item_result")).toBe(false);
    expect(events.map((e) => e.kind)).toEqual(["started", "message_chunk", "completed"]);
    expect(transport.lastPrompt!.allowWorkStream).toBe(false);
  });

  it("cancel() delegates to the transport", async () => {
    const transport = new FakeAcpTransport([
      { type: "update", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "x" } } },
    ]);
    const adapter = new KiroAcpAdapter(transport);
    const handle = await adapter.startTurn(builderReq(), () => {});
    handle.cancel();
    expect(transport.cancelled).toBe(true);
  });

  it("isAvailable delegates to the transport", async () => {
    const transport = new FakeAcpTransport([], /* available */ false);
    const adapter = new KiroAcpAdapter(transport);
    await expect(adapter.isAvailable("builder")).resolves.toBe(false);
  });
});
