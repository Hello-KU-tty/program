/**
 * Agent_Adapter invocation boundary.
 *
 * This module defines the transport-agnostic contract used to invoke an agent
 * and receive its response as a single, normalized, ordered event stream. The
 * concrete invocation mechanism (Kiro CLI over ACP, Crew App SDK, or a
 * MockAdapter for tests) is chosen behind this interface so UI and
 * state-management code never bind to a specific host.
 *
 * These are type/interface declarations only; concrete implementations
 * (e.g. MockAdapter) live elsewhere.
 *
 * See design.md "Agent_Adapter (invocation boundary)" for the authoritative
 * definitions.
 */

import type { AgentId, WorkStreamItem, AdapterError, TurnHandle } from "../core/types";

// Re-export TurnHandle so the adapter layer exposes a single source of truth
// for the handle shape (declared in core/types.ts and referenced by
// InFlightTurn). Consumers may import it from either location interchangeably.
export type { TurnHandle } from "../core/types";

/**
 * Request to start a single agent turn.
 */
export interface StartTurnRequest {
  /** Which agent this turn is routed to. */
  agent: AgentId;
  /** The user's composed message text. */
  text: string;
  /**
   * Capability hint: only the Builder turn is permitted to emit work-stream
   * items. `true` for Builder, `false` for Helper.
   */
  allowWorkStream: boolean;
}

/**
 * A single normalized, ordered event within one turn's response stream.
 *
 * Message chunks and work-stream items arrive interleaved on this single
 * ordered sequence, guaranteeing the receipt-order and interleave semantics
 * the controller depends on. A turn ends with exactly one terminal event
 * (`completed` or `failed`).
 */
export type AgentStreamEvent =
  /** Turn stream has begun (Req 3.1). */
  | { kind: "started"; turnId: string }
  /** Incremental message content (Req 3.2). */
  | { kind: "message_chunk"; text: string }
  /** A Builder work-stream activity was reported (Req 4.1; Builder only). */
  | { kind: "work_item"; item: WorkStreamItem }
  /** Terminal status for a previously reported work item (Req 4.6). */
  | { kind: "work_item_result"; itemId: string; failed: boolean }
  /** Turn completed successfully (Req 3.3). */
  | { kind: "completed" }
  /** Turn failed before completion (Req 3.7, 6.2). */
  | { kind: "failed"; error: AdapterError };

/**
 * Invocation boundary for driving an agent turn.
 *
 * Resolving the {@link TurnHandle} returned by {@link AgentAdapter.startTurn}
 * means the turn was accepted; completion and failure arrive as
 * {@link AgentStreamEvent}s on the `onEvent` callback rather than via the
 * returned promise.
 */
export interface AgentAdapter {
  /** Reports whether the given agent can currently accept a turn (Req 6.4). */
  isAvailable(agent: AgentId): Promise<boolean>;
  /**
   * Starts a turn, emitting ordered events via `onEvent`. Resolving the
   * returned handle means "turn accepted"; completion/failure arrive as events.
   */
  startTurn(
    req: StartTurnRequest,
    onEvent: (e: AgentStreamEvent) => void,
  ): Promise<TurnHandle>;
}
