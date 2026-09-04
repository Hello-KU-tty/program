/**
 * KiroAcpAdapter — normalizes Kiro host ACP `session/update` notifications into
 * the transport-agnostic {@link AgentStreamEvent} stream the controller
 * consumes.
 *
 * ## Spike status (IMPORTANT)
 *
 * Per design.md "Research Notes", the *exact* Kiro host invocation API (Kiro
 * CLI over ACP / JSON-RPC subprocess, Crew SDK, custom agent, ...) is an
 * OPEN/UNCONFIRMED spike item. This module therefore does **not** hard-bind to
 * a concrete transport and does **not** spawn any real process at import time.
 * Instead the design is split into two clean halves:
 *
 *  1. A **pure, testable normalization module** ({@link normalizeSessionUpdate}
 *     and {@link classifyError}) that turns a single ACP `session/update`
 *     notification payload — or a host error — into normalized
 *     {@link AgentStreamEvent}s / {@link AdapterError}s. This half has no I/O
 *     and is fully unit-testable.
 *
 *  2. A thin {@link KiroAcpAdapter} that consumes an **injected**
 *     {@link AcpTransport}. The adapter subscribes to the transport's
 *     notification/error surface, feeds each notification through the pure
 *     normalizer, and forwards the results to the controller's `onEvent`. The
 *     real Kiro transport implementation is the remaining spike and is *not*
 *     built here; it is provided from outside (see
 *     {@link createKiroAcpAdapter} in `adapter-factory.ts`).
 *
 * See design.md sections "Agent_Adapter (invocation boundary)",
 * "KiroAcpAdapter (target host)", and "Research Notes".
 *
 * Requirements: 2.2, 3.1, 3.2, 3.3, 3.7, 4.1, 4.6, 6.1, 6.2, 6.4
 */

import type { AdapterError, AgentId } from "../core/types";
import { createWorkItem } from "../core/work-item";
import type {
  AgentAdapter,
  AgentStreamEvent,
  StartTurnRequest,
  TurnHandle,
} from "./agent-adapter";

// ---------------------------------------------------------------------------
// ACP `session/update` notification shapes (expected wire model)
// ---------------------------------------------------------------------------
//
// These describe the subset of ACP `session/update` payloads this adapter
// normalizes, modeled on design.md's research notes. They are intentionally
// permissive/structural: the real Kiro wire shapes are unconfirmed (spike), so
// we key off a discriminating `sessionUpdate` tag and read the fields we need
// defensively. Unknown/unhandled updates normalize to `null`.

/** Text content block carried by message-chunk updates. */
export interface AcpTextContent {
  type: "text";
  text: string;
}

/** A message chunk update: incremental agent message text (Req 3.2). */
export interface AcpAgentMessageChunkUpdate {
  sessionUpdate: "agent_message_chunk";
  content: AcpTextContent | { type: string; text?: string };
}

/** Lifecycle status of a tool call as reported by the host. */
export type AcpToolCallStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

/** ACP tool-call "kind" → our {@link WorkItemType}. */
export type AcpToolKind = "read" | "edit" | "execute" | "test" | "other" | string;

/**
 * A tool-call update. The first sighting of a `toolCallId` (status
 * `pending`/`in_progress`) becomes a `work_item`; a subsequent
 * `completed`/`failed` for the same id becomes a `work_item_result` (Req
 * 4.1/4.6).
 */
export interface AcpToolCallUpdate {
  sessionUpdate: "tool_call" | "tool_call_update";
  toolCallId: string;
  status?: AcpToolCallStatus;
  /** Human-readable title, e.g. "Run tests". */
  title?: string;
  /** ACP tool "kind"; mapped to a {@link WorkItemType}. */
  kind?: AcpToolKind;
  /** Optional detail / output text (may be multi-line). */
  content?: string | AcpTextContent | { type: string; text?: string };
}

/** ACP stop reasons that end a turn. */
export type AcpStopReason =
  | "end_turn"
  | "completed"
  | "max_tokens"
  | "cancelled"
  | "canceled"
  | "aborted"
  | "refusal"
  | "error"
  | string;

/** A turn-completion update carrying the stop reason (Req 3.3 / 3.7). */
export interface AcpStopUpdate {
  sessionUpdate: "stop" | "turn_complete";
  stopReason: AcpStopReason;
  /** Optional error message when the stop reason is a failure. */
  message?: string;
}

/** The union of `session/update` payloads we recognize. */
export type AcpSessionUpdate =
  | AcpAgentMessageChunkUpdate
  | AcpToolCallUpdate
  | AcpStopUpdate
  | { sessionUpdate: string; [k: string]: unknown };

// ---------------------------------------------------------------------------
// Normalization context (tracks tool-call first-sight → work_item)
// ---------------------------------------------------------------------------

/**
 * Per-turn mutable state the normalizer threads across successive updates.
 *
 * The normalizer must remember which `toolCallId`s it has already surfaced as
 * `work_item`s so a later terminal update for the same id maps to a
 * `work_item_result` (rather than a duplicate `work_item`). It also assigns a
 * monotonic `seq` to work items in first-sight order.
 */
export interface NormalizeContext {
  /** toolCallIds already surfaced as a `work_item`. */
  readonly seenToolCalls: Set<string>;
  /** Monotonic work-item sequence counter (first-sight order). */
  workItemSeq: number;
}

/** Create a fresh {@link NormalizeContext} for one turn. */
export function createNormalizeContext(): NormalizeContext {
  return { seenToolCalls: new Set<string>(), workItemSeq: 0 };
}

// ---------------------------------------------------------------------------
// Pure normalization
// ---------------------------------------------------------------------------

const TERMINAL_TOOL_STATUSES: ReadonlySet<AcpToolCallStatus> = new Set([
  "completed",
  "failed",
]);

const FAILURE_STOP_REASONS: ReadonlySet<string> = new Set([
  "cancelled",
  "canceled",
  "aborted",
  "refusal",
  "error",
]);

/** Map an ACP tool "kind" to our {@link WorkItemType}. */
function mapToolKind(kind: AcpToolKind | undefined): ReturnType<typeof createWorkItem>["itemType"] {
  switch (kind) {
    case "edit":
      return "file_change";
    case "execute":
      return "command";
    case "test":
      return "test";
    default:
      return "tool_call";
  }
}

/** Extract plain text from a content field that may be a string or block. */
function extractText(
  content:
    | string
    | AcpTextContent
    | { type: string; text?: string }
    | undefined,
): string {
  if (content === undefined) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  return typeof content.text === "string" ? content.text : "";
}

/** Count the lines in a detail string (empty string → 0 lines). */
function countLines(detail: string): number {
  if (detail.length === 0) {
    return 0;
  }
  return detail.split("\n").length;
}

/**
 * Normalize a single ACP `session/update` notification payload into zero, one,
 * or more {@link AgentStreamEvent}s.
 *
 * Mapping (design.md "KiroAcpAdapter (target host)"):
 *  - `agent_message_chunk` (non-empty text) → `message_chunk`
 *  - `tool_call` / `tool_call_update` first sighting → `work_item` (built via
 *    the pure {@link createWorkItem} helper so the collapse default is applied)
 *  - `tool_call_update` with a terminal status for a previously-seen id →
 *    `work_item_result` (`failed` when status is `failed`)
 *  - `stop` / `turn_complete` → `completed` (success stop reasons) or `failed`
 *    (cancel/abort/refusal/error) with a normalized {@link AdapterError}
 *
 * Returns `null` for updates that don't map to any event (e.g. an unknown
 * update kind, an empty message chunk, or a tool-call update for an id we never
 * surfaced). Never throws on malformed input — unrecognized shapes yield
 * `null`.
 *
 * @param update The raw notification payload.
 * @param ctx Per-turn context tracking seen tool calls / work-item seq.
 * @returns A single event, an ordered array, or `null`.
 */
export function normalizeSessionUpdate(
  update: AcpSessionUpdate,
  ctx: NormalizeContext,
): AgentStreamEvent | AgentStreamEvent[] | null {
  if (update === null || typeof update !== "object") {
    return null;
  }
  const kind = (update as { sessionUpdate?: unknown }).sessionUpdate;
  if (typeof kind !== "string") {
    return null;
  }

  switch (kind) {
    case "agent_message_chunk": {
      const text = extractText((update as AcpAgentMessageChunkUpdate).content);
      if (text.length === 0) {
        return null;
      }
      return { kind: "message_chunk", text };
    }

    case "tool_call":
    case "tool_call_update": {
      const u = update as AcpToolCallUpdate;
      const id = u.toolCallId;
      if (typeof id !== "string" || id.length === 0) {
        return null;
      }
      const status = u.status;
      const terminal = status !== undefined && TERMINAL_TOOL_STATUSES.has(status);

      // Terminal update for an already-surfaced tool call → work_item_result.
      if (terminal && ctx.seenToolCalls.has(id)) {
        return {
          kind: "work_item_result",
          itemId: id,
          failed: status === "failed",
        };
      }

      // Terminal update for a tool call we never surfaced: surface it now as a
      // work_item AND its result so no failure is silently dropped (Req 4.6).
      if (terminal && !ctx.seenToolCalls.has(id)) {
        const detail = extractText(u.content);
        ctx.seenToolCalls.add(id);
        const seq = ctx.workItemSeq++;
        const item = createWorkItem({
          id,
          seq,
          itemType: mapToolKind(u.kind),
          title: u.title ?? id,
          detail,
          lineCount: countLines(detail),
          status: status === "failed" ? "failed" : "succeeded",
        });
        return [
          { kind: "work_item", item },
          { kind: "work_item_result", itemId: id, failed: status === "failed" },
        ];
      }

      // First sighting (pending/in_progress or no status) → work_item.
      if (ctx.seenToolCalls.has(id)) {
        // A non-terminal update for an already-seen id carries no new event.
        return null;
      }
      const detail = extractText(u.content);
      ctx.seenToolCalls.add(id);
      const seq = ctx.workItemSeq++;
      const item = createWorkItem({
        id,
        seq,
        itemType: mapToolKind(u.kind),
        title: u.title ?? id,
        detail,
        lineCount: countLines(detail),
        status: "running",
      });
      return { kind: "work_item", item };
    }

    case "stop":
    case "turn_complete": {
      const u = update as AcpStopUpdate;
      const reason = u.stopReason;
      if (typeof reason === "string" && FAILURE_STOP_REASONS.has(reason)) {
        return {
          kind: "failed",
          error: {
            code: reason === "error" ? "stream_error" : "unknown",
            message: u.message ?? `Turn ended with stop reason: ${reason}`,
          },
        };
      }
      return { kind: "completed" };
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

/**
 * A transport/host error annotated with a hint for {@link classifyError}. The
 * transport may throw/emit plain `Error`s; when it can, it should tag them with
 * a `code` (or set `.name`) so classification is exact rather than heuristic.
 */
export interface ClassifiableError {
  /** Explicit AdapterError code hint, if the transport can supply one. */
  code?: AdapterError["code"];
  name?: string;
  message?: string;
}

/**
 * Classify an arbitrary transport/host error into a normalized
 * {@link AdapterError} with one of the codes: `start_timeout`, `stream_error`,
 * `stalled`, `unavailable`, `unknown` (Req 6.1, 6.2).
 *
 * Classification precedence:
 *  1. An explicit `code` on the error object wins.
 *  2. Otherwise, the error's `name`/`message` is matched against known
 *     signals (timeout → start_timeout, stall → stalled, unavailable/ENOENT/
 *     ECONNREFUSED/spawn → unavailable, stream/parse/protocol → stream_error).
 *  3. Anything unrecognized → `unknown`.
 *
 * Never throws; non-object inputs degrade to an `unknown` error.
 *
 * @param err The raw error value.
 * @returns A normalized {@link AdapterError}.
 */
export function classifyError(err: unknown): AdapterError {
  const asObj = (err ?? {}) as ClassifiableError;
  const explicit = asObj.code;
  const validCodes: ReadonlySet<AdapterError["code"]> = new Set([
    "start_timeout",
    "stream_error",
    "stalled",
    "unavailable",
    "unknown",
  ]);
  const message =
    typeof asObj.message === "string" && asObj.message.length > 0
      ? asObj.message
      : typeof err === "string" && err.length > 0
        ? err
        : "Unknown adapter error";

  if (explicit !== undefined && validCodes.has(explicit)) {
    return { code: explicit, message };
  }

  const haystack = `${asObj.name ?? ""} ${message}`.toLowerCase();

  if (/(^|\W)(start[_-]?timeout|timed?\s*out|timeout)(\W|$)/.test(haystack)) {
    // Distinguish a stall ("no new events") from a start timeout when possible.
    if (haystack.includes("stall")) {
      return { code: "stalled", message };
    }
    return { code: "start_timeout", message };
  }
  if (haystack.includes("stall")) {
    return { code: "stalled", message };
  }
  if (
    haystack.includes("unavailable") ||
    haystack.includes("enoent") ||
    haystack.includes("econnrefused") ||
    haystack.includes("spawn") ||
    haystack.includes("not found") ||
    haystack.includes("disconnected")
  ) {
    return { code: "unavailable", message };
  }
  if (
    haystack.includes("stream") ||
    haystack.includes("parse") ||
    haystack.includes("protocol") ||
    haystack.includes("json-rpc") ||
    haystack.includes("jsonrpc")
  ) {
    return { code: "stream_error", message };
  }
  return { code: "unknown", message };
}

// ---------------------------------------------------------------------------
// Injected transport abstraction
// ---------------------------------------------------------------------------

/**
 * Minimal transport surface the {@link KiroAcpAdapter} consumes. A concrete
 * implementation drives the real Kiro host (JSON-RPC subprocess over ACP);
 * that implementation is the remaining spike and lives outside this module so
 * it can be injected (and faked in tests).
 *
 * The adapter treats this as the boundary: it sends a prompt and subscribes to
 * notifications/errors; it never spawns a process itself.
 */
export interface AcpTransport {
  /**
   * Probe whether the host can currently accept a turn for `agent` (Req 6.4).
   * Implementations may perform a lightweight liveness check.
   */
  isAvailable(agent: AgentId): Promise<boolean>;
  /**
   * Send a prompt to start a turn. Resolves once the host has *accepted* the
   * turn (turn acknowledgement), returning a host turn id. Completion/failure
   * arrive later as notifications. `allowWorkStream` conveys the Builder-only
   * work-stream capability hint.
   */
  sendPrompt(text: string, allowWorkStream: boolean): Promise<{ turnId: string }>;
  /**
   * Subscribe to `session/update` notifications for the in-flight turn. Returns
   * an unsubscribe function.
   */
  onNotification(cb: (update: AcpSessionUpdate) => void): () => void;
  /** Subscribe to transport/host errors. Returns an unsubscribe function. */
  onError(cb: (err: unknown) => void): () => void;
  /** Request cancellation of the in-flight turn. */
  cancel(): void;
}

// ---------------------------------------------------------------------------
// KiroAcpAdapter
// ---------------------------------------------------------------------------

/**
 * {@link AgentAdapter} backed by an injected {@link AcpTransport}. All host
 * `session/update` notifications are normalized via {@link normalizeSessionUpdate}
 * and forwarded to the controller's `onEvent`; transport errors are classified
 * via {@link classifyError} and surfaced as a terminal `failed` event.
 *
 * This class performs no process spawning at construction; the transport is
 * supplied by the caller (see `createKiroAcpAdapter`).
 */
export class KiroAcpAdapter implements AgentAdapter {
  constructor(private readonly transport: AcpTransport) {}

  isAvailable(agent: AgentId): Promise<boolean> {
    return this.transport.isAvailable(agent);
  }

  async startTurn(
    req: StartTurnRequest,
    onEvent: (e: AgentStreamEvent) => void,
  ): Promise<TurnHandle> {
    const ctx = createNormalizeContext();
    let terminated = false;

    // A single guarded emit so exactly one terminal event escapes and no events
    // are forwarded after termination (Req 3.3/3.7 terminal-once semantics).
    const emit = (e: AgentStreamEvent): void => {
      if (terminated) {
        return;
      }
      if (e.kind === "completed" || e.kind === "failed") {
        terminated = true;
      }
      onEvent(e);
    };

    const unsubNotification = this.transport.onNotification((update) => {
      const result = normalizeSessionUpdate(update, ctx);
      if (result === null) {
        return;
      }
      const events = Array.isArray(result) ? result : [result];
      for (const e of events) {
        // Helper turns (allowWorkStream=false) must not surface work items
        // (Req 4.7 capability gate). Defensive: the controller also gates this.
        if (
          !req.allowWorkStream &&
          (e.kind === "work_item" || e.kind === "work_item_result")
        ) {
          continue;
        }
        emit(e);
      }
      if (terminated) {
        unsubNotification();
        unsubError();
      }
    });

    const unsubError = this.transport.onError((err) => {
      emit({ kind: "failed", error: classifyError(err) });
      if (terminated) {
        unsubNotification();
        unsubError();
      }
    });

    let accepted: { turnId: string };
    try {
      accepted = await this.transport.sendPrompt(req.text, req.allowWorkStream);
    } catch (err) {
      // Failure to even accept the turn (e.g. start timeout / unavailable).
      emit({ kind: "failed", error: classifyError(err) });
      unsubNotification();
      unsubError();
      // Surface a handle anyway so the caller has a stable turnId to reason
      // about; cancel is a no-op past termination.
      return {
        turnId: `kiro-turn-failed`,
        cancel: () => {
          /* already terminated */
        },
      };
    }

    // Emit the `started` event once the host has acknowledged the turn (Req
    // 3.1). The host may also send its own started-style update; the guarded
    // emit + normalizer (which does not map to `started`) prevent duplicates.
    emit({ kind: "started", turnId: accepted.turnId });

    return {
      turnId: accepted.turnId,
      cancel: () => {
        this.transport.cancel();
        unsubNotification();
        unsubError();
      },
    };
  }
}
