/**
 * Core domain types for the Builder & Helper Agent Panel.
 *
 * These types define the shared data models used by the extension host's
 * PanelController / TabState core. They are pure, transport-agnostic, and
 * contain no VS Code or adapter runtime dependencies so they can be exercised
 * by the property-based test suite.
 *
 * See design.md "Data Models" for the authoritative field definitions.
 */

/** Identifies a tab within the Agent_Panel. */
export type TabId = "builder" | "helper";

/** Identifies the agent a turn is routed to. Mirrors {@link TabId} 1:1. */
export type AgentId = "builder" | "helper";

/** Discriminator for a {@link ConversationEntry}. */
export type EntryKind = "user_message" | "agent_response";

/** Lifecycle state of an {@link AgentResponseEntry}. */
export type ResponseState = "in_progress" | "complete" | "failed";

/** Lifecycle state of a {@link WorkStreamItem}. */
export type WorkItemStatus = "running" | "succeeded" | "failed";

/** Category of activity a {@link WorkStreamItem} represents. */
export type WorkItemType = "tool_call" | "file_change" | "command" | "test";

/**
 * Base shape shared by every entry in a tab's conversation. Every entry
 * carries a monotonic `seq` assigned at receipt time; render order is strictly
 * `seq` ascending and the UI never reorders.
 */
export interface ConversationEntry {
  id: string;
  kind: EntryKind;
  createdAt: number;
  /** Monotonic within a tab; defines render order. */
  seq: number;
}

/** A message composed and submitted by the user. */
export interface UserMessageEntry extends ConversationEntry {
  kind: "user_message";
  /** 1..10000 chars, not whitespace-only. */
  text: string;
}

/** An agent's streamed reply to a specific user message. */
export interface AgentResponseEntry extends ConversationEntry {
  kind: "agent_response";
  forMessageId: string;
  /** Message chunks appended in receipt order. */
  chunks: string[];
  /** Builder only; interleave position within the response tracked by `seq`. */
  workItems: WorkStreamItem[];
  state: ResponseState;
}

/**
 * A single unit of Builder work-stream activity (tool call, file change,
 * command, or test) rendered inline within a Builder response.
 */
export interface WorkStreamItem {
  id: string;
  /** Ordering within the response. */
  seq: number;
  itemType: WorkItemType;
  title: string;
  /** May be multi-line. */
  detail: string;
  /** Used to decide default-collapsed (collapsed when > 3). */
  lineCount: number;
  status: WorkItemStatus;
  /** Default false when `lineCount > 3`. */
  expanded: boolean;
}

/**
 * Handle to an in-flight agent turn. Defined by the Agent_Adapter layer;
 * declared here as the minimal contract needed by {@link InFlightTurn}.
 */
export interface TurnHandle {
  readonly turnId: string;
  cancel(): void;
}

/** Tracks the single in-flight turn a tab may have (the submission lock). */
export interface InFlightTurn {
  turnId: string;
  responseId: string;
  handle: TurnHandle;
  /** Timestamp of the last received event; drives the stall watchdog. */
  lastEventAt: number;
}

/**
 * Immutable projection of a tab's state used to (re-)hydrate the webview after
 * disposal/reveal without persisting anything.
 */
export interface TabStateSnapshot {
  tabId: TabId;
  entries: ConversationEntry[];
  draft: string;
  submissionEnabled: boolean;
  /** Human-readable label for the tab's active agent (Req 5.5). */
  activeAgentLabel: string;
}

/** Normalized adapter error surfaced to the controller regardless of host. */
export interface AdapterError {
  code: "start_timeout" | "stream_error" | "stalled" | "unavailable" | "unknown";
  message: string;
}
