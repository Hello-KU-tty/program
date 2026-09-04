import { describe, it, expect } from "vitest";

import {
  KiroAcpAdapter,
  type AcpSessionUpdate,
  type AcpTransport,
} from "../src/adapter/kiro-acp-adapter";
import type { AgentStreamEvent, StartTurnRequest } from "../src/adapter/agent-adapter";
import type { AgentId } from "../src/core/types";

/**
 * Task 16.3 - Minimal end-to-end SMOKE test against {@link KiroAcpAdapter}.
 *
 * ## Spike status (why this uses a fake transport)
 *
 * design.md's Testing Strategy calls for "a thin smoke test against the real
 * KiroAcpAdapter (once the host invocation spike lands) [that] verifies a single
 * end-to-end turn streams and completes ... intentionally minimal (1-2 examples)
 * because it exercises the external host, not this feature's logic."
 *
 * The REAL Kiro transport (a concrete {@link AcpTransport} spawning the Kiro CLI
 * over ACP / JSON-RPC) is the OPEN spike item and is NOT implemented (see the
 * adapter-factory doc). So this smoke test stands in for the real host with an
 * in-memory fake {@link AcpTransport} that scripts one realistic turn:
 *
 *     turn accepted (sendPrompt) -> `started`
 *     -> a couple of `agent_message_chunk` updates
 *     -> a `stop` update (end_turn)  ->  `completed`
 *
 * It asserts that a single turn STREAMS and COMPLETES end-to-end through the
 * adapter's ACP-normalization to `onEvent` (Req 3.1 started, Req 3.2 ordered
 * chunks, Req 3.3 completed). SWAPPING IN THE REAL TRANSPORT is the remaining
 * spike; when it lands, this same shape can point {@link KiroAcpAdapter} at the
 * real transport with no change to the assertions below. This is clearly a
 * fake-transport smoke, kept minimal (2 examples), not a re-test of the pure
 * normalizer (covered exhaustively in kiro-acp-adapter.test.ts).
 */

/**
 * In-memory {@link AcpTransport} scripting exactly one realistic turn. Mirrors
 * ACP ordering: turn acknowledgement (sendPrompt resolves) precedes the
 * streamed `session/update` notifications, which are delivered on a macrotask.
 */
class SingleTurnFakeTransport implements AcpTransport {
  private notificationCbs: Array<(u: AcpSessionUpdate) => void> = [];
  private errorCbs: Array<(e: unknown) => void> = [];
  lastPrompt?: { text: string; allowWorkStream: boolean };

  constructor(private readonly updates: readonly AcpSessionUpdate[]) {}

  isAvailable(_agent: AgentId): Promise<boolean> {
    return Promise.resolve(true);
  }

  async sendPrompt(
    text: string,
    allowWorkStream: boolean,
  ): Promise<{ turnId: string }> {
    this.lastPrompt = { text, allowWorkStream };
    // Stream the scripted updates after the acceptance continuation runs, so
    // the adapter's `started` (emitted right after this resolves) precedes the
    // notifications - exactly as the real host behaves.
    setTimeout(() => {
      for (const update of this.updates) {
        for (const cb of this.notificationCbs) {
          cb(update);
        }
      }
    }, 0);
    return { turnId: "kiro-smoke-turn-1" };
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
    /* no-op for the smoke turn */
  }
}

/** Run one turn end-to-end, collecting the normalized events in order. */
async function runSingleTurn(
  transport: AcpTransport,
  req: StartTurnRequest,
): Promise<AgentStreamEvent[]> {
  const adapter = new KiroAcpAdapter(transport);
  const events: AgentStreamEvent[] = [];
  await adapter.startTurn(req, (e) => events.push(e));
  // Let the transport's macrotask-scheduled notification flush run.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return events;
}

describe("KiroAcpAdapter end-to-end smoke (fake transport stands in for the spike)", () => {
  it("a single Builder turn streams two chunks and completes (Req 3.1/3.2/3.3)", async () => {
    const transport = new SingleTurnFakeTransport([
      { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Hello" } },
      { sessionUpdate: "agent_message_chunk", content: { type: "text", text: ", world" } },
      { sessionUpdate: "stop", stopReason: "end_turn" },
    ]);

    const events = await runSingleTurn(transport, {
      agent: "builder",
      text: "say hello",
      allowWorkStream: true,
    });

    // Ordered, normalized stream: started (Req 3.1) -> chunks in receipt order
    // (Req 3.2) -> completed (Req 3.3).
    expect(events.map((e) => e.kind)).toEqual([
      "started",
      "message_chunk",
      "message_chunk",
      "completed",
    ]);

    // Chunks arrive in order and reconstruct the full reply.
    const text = events
      .filter((e): e is Extract<AgentStreamEvent, { kind: "message_chunk" }> => e.kind === "message_chunk")
      .map((e) => e.text)
      .join("");
    expect(text).toBe("Hello, world");

    // Exactly one terminal event, and it is `completed`.
    const terminals = events.filter((e) => e.kind === "completed" || e.kind === "failed");
    expect(terminals).toHaveLength(1);
    expect(terminals[0].kind).toBe("completed");

    // The prompt reached the transport with the Builder capability hint.
    expect(transport.lastPrompt).toEqual({ text: "say hello", allowWorkStream: true });
  });

  it("a single Helper turn streams one chunk and completes (Req 3.1/3.2/3.3)", async () => {
    const transport = new SingleTurnFakeTransport([
      { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "A brief explanation." } },
      { sessionUpdate: "turn_complete", stopReason: "completed" },
    ]);

    const events = await runSingleTurn(transport, {
      agent: "helper",
      text: "explain this",
      allowWorkStream: false,
    });

    expect(events.map((e) => e.kind)).toEqual(["started", "message_chunk", "completed"]);
    expect(
      (events[1] as Extract<AgentStreamEvent, { kind: "message_chunk" }>).text,
    ).toBe("A brief explanation.");
    expect(transport.lastPrompt!.allowWorkStream).toBe(false);
  });
});
