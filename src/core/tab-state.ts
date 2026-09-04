/**
 * TabState: per-tab conversation state for the Builder & Helper Agent Panel.
 *
 * A `TabState` owns the ordered conversation entries for a single tab (Builder
 * or Helper), the unsent Message_Input draft, and the single in-flight turn
 * (the submission lock). It is a pure, transport-agnostic state container with
 * no VS Code or adapter runtime dependencies so it can be exercised by the
 * property-based test suite.
 *
 * Ordering rule (design.md "Data Models"): every entry, every chunk, and every
 * work item carries a monotonic `seq` assigned at receipt time. Render order is
 * strictly `seq` ascending, with chunks and work items interleaved by receipt
 * order within their response. The state never reorders received content.
 *
 * Role rule (Req 4.7): a Helper `TabState` never holds work-stream items;
 * {@link TabState.appendWorkItem} throws if called on a Helper tab.
 */

import type {
  AgentResponseEntry,
  ConversationEntry,
  TabId,
  TabStateSnapshot,
  UserMessageEntry,
  WorkStreamItem,
} from "./types";

/** Human-readable labels for each tab's active agent (Req 5.5). */
const AGENT_LABELS: Record<TabId, string> = {
  builder: "Builder_Agent",
  helper: "Helper_Agent",
};

/**
 * Deep-clones a conversation entry so snapshots are immutable projections that
 * cannot be mutated through shared references. Structured cloning is avoided in
 * favor of explicit copies to keep the shape predictable and dependency-free.
 */
function cloneEntry(entry: ConversationEntry): ConversationEntry {
  if (entry.kind === "user_message") {
    const e = entry as UserMessageEntry;
    return {
      id: e.id,
      kind: "user_message",
      createdAt: e.createdAt,
      seq: e.seq,
      text: e.text,
    } as UserMessageEntry;
  }
  const e = entry as AgentResponseEntry;
  return {
    id: e.id,
    kind: "agent_response",
    createdAt: e.createdAt,
    seq: e.seq,
    forMessageId: e.forMessageId,
    chunks: [...e.chunks],
    workItems: e.workItems.map((w) => ({ ...w })),
    state: e.state,
  } as AgentResponseEntry;
}

/**
 * Per-tab conversation state and mutation methods.
 *
 * The controller owns one `TabState` per agent and never shares mutable
 * structures between them (Req 1.6). All `seq` values are drawn from a single
 * monotonic counter per tab, so that user messages, response entries, chunks,
 * and work items share one strictly-increasing receipt order.
 */
export class TabState {
  readonly tabId: TabId;

  /** Ordered User_Message and Agent_Response entries (render order == index). */
  private readonly _entries: ConversationEntry[] = [];

  /** Unsent Message_Input text (Req 1.5). */
  private _draft = "";

  /** Monotonic counter; the next `seq` to assign at receipt time. */
  private _nextSeq = 0;

  /** Monotonic id counter for generated ids within this tab. */
  private _nextId = 0;

  constructor(tabId: TabId) {
    this.tabId = tabId;
  }

  /** True for a tab that is permitted to hold work-stream items (Builder only). */
  private get allowsWorkItems(): boolean {
    return this.tabId === "builder";
  }

  private allocSeq(): number {
    return this._nextSeq++;
  }

  private allocId(prefix: string): string {
    return `${this.tabId}-${prefix}-${this._nextId++}`;
  }

  private findResponse(responseId: string): AgentResponseEntry {
    const entry = this._entries.find(
      (e) => e.id === responseId && e.kind === "agent_response",
    ) as AgentResponseEntry | undefined;
    if (!entry) {
      throw new Error(
        `TabState(${this.tabId}): no agent_response entry with id "${responseId}"`,
      );
    }
    return entry;
  }

  /** The current unsent Message_Input text. */
  get draft(): string {
    return this._draft;
  }

  /** Replaces the unsent Message_Input text (Req 1.5 restore support). */
  setDraft(text: string): void {
    this._draft = text;
  }

  /** Clears the unsent Message_Input text (Req 2.3 on successful submit). */
  clearDraft(): void {
    this._draft = "";
  }

  /**
   * Appends a User_Message entry and returns its id (Req 2.2). The caller is
   * responsible for validation; this method assumes `text` is already accepted.
   */
  appendUserMessage(text: string): string {
    const id = this.allocId("msg");
    const entry: UserMessageEntry = {
      id,
      kind: "user_message",
      createdAt: Date.now(),
      seq: this.allocSeq(),
      text,
    };
    this._entries.push(entry);
    return id;
  }

  /**
   * Creates an in-progress Agent_Response entry for a user message and returns
   * its id (Req 3.1). The response begins with no chunks or work items.
   */
  beginResponse(forMessageId: string): string {
    const id = this.allocId("resp");
    const entry: AgentResponseEntry = {
      id,
      kind: "agent_response",
      createdAt: Date.now(),
      seq: this.allocSeq(),
      forMessageId,
      chunks: [],
      workItems: [],
      state: "in_progress",
    };
    this._entries.push(entry);
    return id;
  }

  /**
   * Appends a content chunk to a response in receipt order (Req 3.2/3.6).
   * Consumes a `seq` so chunk receipt order is interleaved with work-item
   * receipt order under the single monotonic counter.
   */
  appendChunk(responseId: string, chunk: string): void {
    const response = this.findResponse(responseId);
    // Consume a seq to preserve global receipt order even though the chunk's
    // position within `chunks[]` already encodes its order relative to chunks.
    this.allocSeq();
    response.chunks.push(chunk);
  }

  /**
   * Appends a work-stream item to a Builder response in receipt order (Req 4.1,
   * 4.2). The item is stored as given by the caller (collapse-default and
   * toggle logic live elsewhere); this method only assigns the receipt `seq`
   * and preserves ordering.
   *
   * Throws if invoked on a Helper tab (Req 4.7) — a Helper tab never holds
   * work-stream items.
   */
  appendWorkItem(responseId: string, item: WorkStreamItem): void {
    if (!this.allowsWorkItems) {
      throw new Error(
        `TabState(${this.tabId}): Helper tab cannot hold work-stream items (Req 4.7)`,
      );
    }
    const response = this.findResponse(responseId);
    const stored: WorkStreamItem = { ...item, seq: this.allocSeq() };
    response.workItems.push(stored);
  }

  /** Marks a response complete (Req 3.3). */
  completeResponse(responseId: string): void {
    this.findResponse(responseId).state = "complete";
  }

  /**
   * Marks a response failed while retaining all received chunks and work items
   * (Req 3.7, 6.2). Only flips state; never removes or edits prior content.
   */
  failResponse(responseId: string): void {
    this.findResponse(responseId).state = "failed";
  }

  /**
   * Produces an immutable snapshot for re-hydration (Req 1.5, 3.5). Entries are
   * deep-copied in `seq` order so the webview projection cannot mutate host
   * state and vice versa.
   *
   * @param submissionEnabled whether submission is currently enabled for this
   *   tab; the controller owns lock state, so it is passed in rather than
   *   inferred here.
   */
  snapshot(submissionEnabled: boolean): TabStateSnapshot {
    const entries = [...this._entries]
      .sort((a, b) => a.seq - b.seq)
      .map(cloneEntry);
    return {
      tabId: this.tabId,
      entries,
      draft: this._draft,
      submissionEnabled,
      activeAgentLabel: AGENT_LABELS[this.tabId],
    };
  }
}
