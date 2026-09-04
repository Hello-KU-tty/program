/**
 * Framework-free DOM rendering for the Builder & Helper Agent Panel webview.
 *
 * This module builds and updates the panel DOM with plain TypeScript + DOM
 * APIs (no framework, to avoid adding dependencies). It renders, per Req 1.2 /
 * 1.3 / 5.5:
 *
 * - exactly two tab buttons labeled "Builder" and "Helper";
 * - an active-agent label naming the current tab's agent;
 * - a scrollable conversation view per tab showing user messages and agent
 *   responses in order; and
 * - a message input (textarea) + send control per tab.
 *
 * Input behavior (Req 2.1, 2.3, 2.5, 2.6, 3.4):
 * - the send control posts `submit`; the textarea posts `draftChanged`;
 * - a client-side 10,000-char precheck shows the length indication immediately,
 *   though the host remains authoritative;
 * - the input clears optimistically on submit and is restored from the view
 *   model if a length_limit/unavailable notice comes back;
 * - the send control is disabled while the tab is locked, and an in-progress
 *   indicator shows while a response streams.
 *
 * Re-hydration (task 12.3, Req 1.5 / 3.5): the renderer always rebuilds from
 * whatever the {@link PanelViewModel} currently holds, so a second `hydrate`
 * that replaces the view model is reflected idempotently. `render` may be
 * called before or after the skeleton is built; the per-render updates rebuild
 * the conversation wholesale (no duplicate entries), overwrite each textarea
 * from the restored draft, reflect the restored submission lock, show the
 * snapshot's active tab, and clear any stale transient notice. Because
 * expand/collapse is view-local, a re-hydrate resets each work item's expand
 * state to the snapshot's `expanded` value (host-provided default), which is
 * acceptable per design since the host does not persist that state.
 */

import type {
  AgentResponseEntry,
  ConversationEntry,
  TabId,
  UserMessageEntry,
  WorkStreamItem,
} from "../core/types";
import {
  TAB_LABELS,
  isResponseInProgress,
  type PanelViewModel,
  type TabViewModel,
} from "./view-model";

/** Maximum accepted message length, mirrored from the host (Req 2.1/2.5). */
export const MAX_MESSAGE_LENGTH = 10_000;

/**
 * Work items whose output exceeds this many lines render collapsed by default
 * with an expand/collapse control (Req 4.4). Mirrors the core threshold
 * `DEFAULT_COLLAPSE_LINE_THRESHOLD` in {@link file://../core/work-item.ts}; the
 * item's stored `expanded` flag already reflects this default at creation, and
 * this constant decides whether a toggle control is offered at all.
 */
export const MAX_INLINE_WORK_ITEM_LINES = 3;

/** Callbacks the render layer invokes when the user interacts with the UI. */
export interface RenderCallbacks {
  onSelectTab(tab: TabId): void;
  onSubmit(tab: TabId, text: string): void;
  onDraftChanged(tab: TabId, text: string): void;
  /**
   * The user toggled a Builder work item's expand/collapse control (Req 4.5).
   * Expand/collapse is view-local; the caller flips the local view-model state
   * and posts a `toggleWorkItem` intent (a host-side no-op) for persistence-free
   * re-hydration.
   */
  onToggleWorkItem(tab: TabId, itemId: string): void;
}

/** Ordered list of tabs; drives tab-button and panel creation (Req 1.2). */
const TABS: readonly TabId[] = ["builder", "helper"];

/**
 * Owns the panel DOM and re-renders it from a {@link PanelViewModel}. Created
 * once against a root element; {@link PanelRenderer.render} is idempotent and
 * may be called on every model change.
 */
export class PanelRenderer {
  private readonly root: HTMLElement;
  private readonly doc: Document;
  private readonly callbacks: RenderCallbacks;

  /** Per-tab textarea elements, kept so draft/lock updates are targeted. */
  private readonly inputs = new Map<TabId, HTMLTextAreaElement>();
  /** Per-tab send buttons. */
  private readonly sendButtons = new Map<TabId, HTMLButtonElement>();
  /** Per-tab conversation containers. */
  private readonly conversations = new Map<TabId, HTMLElement>();
  /** Per-tab length/notice indication elements. */
  private readonly indicators = new Map<TabId, HTMLElement>();
  /** Per-tab in-progress indicator elements. */
  private readonly progress = new Map<TabId, HTMLElement>();
  /** Per-tab tab-button elements. */
  private readonly tabButtons = new Map<TabId, HTMLButtonElement>();
  /** Per-tab panel wrappers (shown/hidden by active tab). */
  private readonly panels = new Map<TabId, HTMLElement>();
  /** Active-agent label element (single, reflects the active tab). */
  private agentLabel: HTMLElement | null = null;

  private built = false;

  constructor(root: HTMLElement, callbacks: RenderCallbacks) {
    this.root = root;
    this.doc = root.ownerDocument;
    this.callbacks = callbacks;
  }

  /**
   * Renders the model into the DOM. On first call it builds the static
   * structure (tabs, panels, inputs); subsequent calls update text, visibility,
   * locks, and indicators in place.
   */
  render(model: PanelViewModel): void {
    if (!this.built) {
      this.buildSkeleton();
      this.built = true;
    }
    this.updateActiveTab(model.activeTab, model);
    for (const tab of TABS) {
      this.updateTab(tab, model.tabs[tab]);
    }
  }

  // --------------------------------------------------------------------------
  // Skeleton construction (once)
  // --------------------------------------------------------------------------

  private buildSkeleton(): void {
    this.root.textContent = "";
    this.root.classList.add("agent-panel");

    // Tab bar with exactly two tabs (Req 1.2).
    const tabBar = this.el("div", "tab-bar");
    tabBar.setAttribute("role", "tablist");
    for (const tab of TABS) {
      const button = this.el("button", "tab-button") as HTMLButtonElement;
      button.type = "button";
      button.textContent = TAB_LABELS[tab];
      button.setAttribute("role", "tab");
      button.dataset.tab = tab;
      button.addEventListener("click", () => this.callbacks.onSelectTab(tab));
      this.tabButtons.set(tab, button);
      tabBar.appendChild(button);
    }
    this.root.appendChild(tabBar);

    // Active-agent label (Req 5.5).
    const label = this.el("div", "active-agent-label");
    label.setAttribute("aria-live", "polite");
    this.agentLabel = label;
    this.root.appendChild(label);

    // One panel per tab (only the active one is visible).
    for (const tab of TABS) {
      this.panels.set(tab, this.buildTabPanel(tab));
      this.root.appendChild(this.panels.get(tab) as HTMLElement);
    }
  }

  private buildTabPanel(tab: TabId): HTMLElement {
    const panel = this.el("div", "tab-panel");
    panel.setAttribute("role", "tabpanel");
    panel.dataset.tab = tab;
    // Additive CSS hook mirroring data-tab, used to scope per-agent accents.
    panel.dataset.agent = tab;

    // Scrollable conversation view (Req 1.5 order preserved by array order).
    const conversation = this.el("div", "conversation");
    conversation.setAttribute("aria-label", `${TAB_LABELS[tab]} conversation`);
    this.conversations.set(tab, conversation);
    panel.appendChild(conversation);

    // In-progress indicator (Req 3.4) — hidden unless a response is streaming.
    const progress = this.el("div", "in-progress");
    progress.textContent = "Response in progress…";
    progress.hidden = true;
    this.progress.set(tab, progress);
    panel.appendChild(progress);

    // Composer: textarea + length/notice indicator + send button.
    const composer = this.el("div", "composer");

    const textarea = this.el("textarea", "message-input") as HTMLTextAreaElement;
    textarea.setAttribute("aria-label", `Message ${TAB_LABELS[tab]}`);
    textarea.rows = 3;
    textarea.addEventListener("input", () => {
      const text = textarea.value;
      // Report the draft so unsent text is restored on re-hydration (Req 1.5),
      // and clear any stale notice as the user edits.
      this.callbacks.onDraftChanged(tab, text);
      this.updateIndicator(tab, text, null);
      // Live "ready to send" affordance: light the send arrow while there is
      // valid sendable text, dim it otherwise.
      this.updateSendAffordance(tab);
    });
    textarea.addEventListener("keydown", (event: KeyboardEvent) => {
      // Enter submits; Shift+Enter inserts a newline.
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.attemptSubmit(tab, textarea);
      }
    });
    this.inputs.set(tab, textarea);
    composer.appendChild(textarea);

    const indicator = this.el("div", "length-indicator");
    indicator.setAttribute("aria-live", "polite");
    indicator.hidden = true;
    this.indicators.set(tab, indicator);
    composer.appendChild(indicator);

    const send = this.el("button", "send-button") as HTMLButtonElement;
    send.type = "button";
    send.textContent = "\u2191";
    send.setAttribute("aria-label", "Send message");
    send.title = "Send message";
    send.addEventListener("click", () => this.attemptSubmit(tab, textarea));
    this.sendButtons.set(tab, send);
    composer.appendChild(send);

    panel.appendChild(composer);
    // Initial "can send" evaluation so the fresh empty state renders dim.
    this.updateSendAffordance(tab);
    return panel;
  }

  // --------------------------------------------------------------------------
  // Per-render updates
  // --------------------------------------------------------------------------

  private updateActiveTab(activeTab: TabId, model: PanelViewModel): void {
    // Additive CSS hooks: reflect the active tab on the root so the whole panel
    // can re-theme its accent color when switching between Builder and Helper.
    this.root.dataset.agent = activeTab;
    this.root.dataset.active = activeTab;
    for (const tab of TABS) {
      const isActive = tab === activeTab;
      const panel = this.panels.get(tab);
      if (panel) {
        panel.hidden = !isActive;
      }
      const button = this.tabButtons.get(tab);
      if (button) {
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
      }
    }
    if (this.agentLabel) {
      this.agentLabel.textContent = model.tabs[activeTab].activeAgentLabel;
    }
  }

  private updateTab(tab: TabId, vm: TabViewModel): void {
    this.renderConversation(tab, vm);
    this.updateLockState(tab, vm);
    this.restoreDraft(tab, vm);
    this.reflectNotice(tab, vm);
  }

  /**
   * Rebuilds the conversation view from the view model. Rebuilding wholesale is
   * simple and correct for this task's scope (text entries); task 12.2 can
   * optimize to incremental chunk appends if needed.
   */
  private renderConversation(tab: TabId, vm: TabViewModel): void {
    const container = this.conversations.get(tab);
    if (!container) {
      return;
    }
    container.textContent = "";
    let anyInProgress = false;
    for (const entry of vm.entries) {
      container.appendChild(this.renderEntry(tab, entry));
      if (isResponseInProgress(entry)) {
        anyInProgress = true;
      }
    }
    // Keep the newest content in view.
    container.scrollTop = container.scrollHeight;

    // In-progress indicator: visible while a response streams or the tab is
    // locked with an active response (Req 3.4).
    const progress = this.progress.get(tab);
    if (progress) {
      progress.hidden = !anyInProgress;
    }
  }

  private renderEntry(tab: TabId, entry: ConversationEntry): HTMLElement {
    if (entry.kind === "user_message") {
      return this.renderUserEntry(entry as UserMessageEntry);
    }
    return this.renderResponseEntry(tab, entry as AgentResponseEntry);
  }

  private renderUserEntry(entry: UserMessageEntry): HTMLElement {
    const el = this.el("div", "entry entry-user");
    el.dataset.entryId = entry.id;
    const body = this.el("div", "entry-body");
    body.textContent = entry.text;
    el.appendChild(body);
    return el;
  }

  /**
   * Renders an agent response as a single ordered conversation combining the
   * streamed message text with any Builder work-stream items (Req 3.6, 4.3).
   *
   * Ordering (Req 3.2/4.2 — never reorder): the core `AgentResponseEntry`
   * stores chunks as a flat `string[]` with no per-chunk `seq`, while work items
   * each carry a `seq`. We therefore render the concatenated chunk text (chunks
   * are appended in receipt order, so their concatenation is already in order)
   * as the message body, then render work items in ascending `seq` beneath it.
   * Because work items are appended in receipt order after their preceding
   * chunks and their `seq` is monotonic, ascending-`seq` order is exactly their
   * receipt order — a deterministic interleave that never reorders items.
   *
   * The failed vs. complete distinction is carried by `entry.state` and mapped
   * to a distinct class (`entry-failed`/`entry-complete`/`entry-in_progress`)
   * plus an explicit failure marker, so failed responses are visually distinct
   * from completed ones while prior history is preserved (Req 6.3/6.5).
   *
   * Helper responses carry no work items (Req 4.7/5.3), so this same path
   * renders Helper responses as chat-only text with no work-item controls.
   */
  private renderResponseEntry(tab: TabId, entry: AgentResponseEntry): HTMLElement {
    const el = this.el("div", `entry entry-agent entry-${entry.state}`);
    el.dataset.entryId = entry.id;
    el.dataset.state = entry.state;

    // Additive identity header: a small avatar/role chip so agent bubbles read
    // as the current agent. Purely cosmetic; not queried by tests.
    const roleHeader = this.el("div", "entry-role");
    const avatar = this.el("span", "entry-avatar");
    avatar.textContent = tab === "builder" ? "🛠" : "💬";
    const roleName = this.el("span", "entry-role-name");
    roleName.textContent = TAB_LABELS[tab];
    roleHeader.appendChild(avatar);
    roleHeader.appendChild(roleName);
    el.appendChild(roleHeader);

    // Message text: the concatenation of chunks in receipt order (Req 3.6).
    const body = this.el("div", "entry-body");
    body.textContent = entry.chunks.join("");
    el.appendChild(body);

    // Work-stream items in ascending seq (Req 4.2/4.3). The Helper tab never
    // renders work items (Req 4.7/5.3); Helper responses carry none, but we
    // also gate on the tab so the Helper path is unambiguously chat-only. A
    // copy is sorted so we never mutate the view model's array.
    const items =
      tab === "builder"
        ? [...entry.workItems].sort((a, b) => a.seq - b.seq)
        : [];
    if (items.length > 0) {
      const workStream = this.el("div", "work-stream");
      for (const item of items) {
        workStream.appendChild(this.renderWorkItem(tab, item));
      }
      el.appendChild(workStream);
    }

    // Failed vs. complete distinction (Req 6.3): the class already encodes the
    // state; add an explicit marker for failed responses.
    if (entry.state === "failed") {
      const failed = this.el("div", "entry-failed");
      failed.textContent = "Response failed.";
      el.appendChild(failed);
    }
    return el;
  }

  /**
   * Renders a single Builder work-stream item (Req 4.1/4.4/4.6).
   *
   * - The header shows the item type and title and, when the item's output
   *   exceeds 3 lines, an expand/collapse toggle. Long items render collapsed
   *   by default; the `expanded` flag (view-local, owned by the view model)
   *   drives whether the detail is shown.
   * - Toggling posts `onToggleWorkItem` (Req 4.5) which flips only this item's
   *   `expanded` state and re-renders.
   * - Failed items get a `work-item-failed` class and a failure marker and are
   *   always retained (Req 4.6).
   */
  private renderWorkItem(tab: TabId, item: WorkStreamItem): HTMLElement {
    const collapsible = item.lineCount > MAX_INLINE_WORK_ITEM_LINES;
    const el = this.el(
      "div",
      `work-item work-item-${item.status}${item.expanded ? " expanded" : " collapsed"}`,
    );
    el.dataset.itemId = item.id;
    el.dataset.itemType = item.itemType;
    el.dataset.status = item.status;
    el.dataset.expanded = item.expanded ? "true" : "false";

    const header = this.el("div", "work-item-header");

    const type = this.el("span", "work-item-type");
    type.textContent = item.itemType;
    header.appendChild(type);

    const title = this.el("span", "work-item-title");
    title.textContent = item.title;
    header.appendChild(title);

    if (item.status === "failed") {
      const badge = this.el("span", "work-item-failed-badge");
      badge.textContent = "failed";
      header.appendChild(badge);
    }

    if (collapsible) {
      const toggle = this.el("button", "work-item-toggle") as HTMLButtonElement;
      toggle.type = "button";
      toggle.textContent = item.expanded ? "Collapse" : "Expand";
      toggle.setAttribute("aria-expanded", item.expanded ? "true" : "false");
      toggle.addEventListener("click", () =>
        this.callbacks.onToggleWorkItem(tab, item.id),
      );
      header.appendChild(toggle);
    }

    el.appendChild(header);

    // Detail: shown when not collapsible, or when expanded. Long items are
    // collapsed by default (Req 4.4) so their detail is hidden until expanded.
    const detail = this.el("div", "work-item-detail");
    detail.textContent = item.detail;
    detail.hidden = collapsible && !item.expanded;
    el.appendChild(detail);

    return el;
  }

  /** Enables/disables the composer for a tab per its submission lock (Req 2.6). */
  private updateLockState(tab: TabId, vm: TabViewModel): void {
    const enabled = vm.submissionEnabled;
    const send = this.sendButtons.get(tab);
    if (send) {
      send.disabled = !enabled;
    }
    const textarea = this.inputs.get(tab);
    if (textarea) {
      textarea.readOnly = !enabled;
    }
    // Lock changes re-evaluate the send affordance: locking makes canSend
    // false (dim); unlocking with valid text re-lights it.
    this.updateSendAffordance(tab);
  }

  /**
   * Toggles the "ready to send" visual affordance on the tab's send button
   * without touching its real `disabled` property or the message protocol.
   *
   * The arrow "lights up" (accent-colored, subtly emphasized via the additive
   * `can-send` class) only when the input holds valid sendable text: there is
   * non-whitespace content, it is within {@link MAX_MESSAGE_LENGTH}, and the
   * tab is not locked (mirroring {@link attemptSubmit}'s no-op guards). When
   * none of those hold, the button reads as "not ready" (dim).
   *
   * `disabled` remains driven solely by the lock state in
   * {@link updateLockState}; this only flips the additive `can-send` class and
   * an `aria-disabled` hint, so click behavior and the disabled-is-lock-only
   * contract are unaffected.
   */
  private updateSendAffordance(tab: TabId): void {
    const send = this.sendButtons.get(tab);
    const textarea = this.inputs.get(tab);
    if (!send || !textarea) {
      return;
    }
    const value = textarea.value;
    const canSend =
      value.trim().length > 0 &&
      value.length <= MAX_MESSAGE_LENGTH &&
      !send.disabled;
    send.classList.toggle("can-send", canSend);
    send.setAttribute("aria-disabled", canSend ? "false" : "true");
  }

  /**
   * Restores the unsent draft into the textarea when it differs from the host's
   * value. Only overwrites when out of sync so it does not fight active typing.
   */
  private restoreDraft(tab: TabId, vm: TabViewModel): void {
    const textarea = this.inputs.get(tab);
    if (textarea && textarea.value !== vm.draft) {
      textarea.value = vm.draft;
      this.updateIndicator(tab, vm.draft, null);
    }
    // A hydrate that restores a non-empty draft should light the button; an
    // empty draft dims it.
    this.updateSendAffordance(tab);
  }

  /**
   * Surfaces the tab's current notice (length_limit / unavailable / error) in
   * the tab's indicator element (Req 6.5). The notice `kind` is reflected as a
   * `data-notice-kind` attribute and a `notice-<kind>` class so error and
   * unavailability notices are visually distinguishable from a plain
   * length-limit indication. Emitting a notice never touches conversation
   * entries, so prior history is preserved (Req 6.5).
   */
  private reflectNotice(tab: TabId, vm: TabViewModel): void {
    const indicator = this.indicators.get(tab);
    if (!indicator) {
      return;
    }
    if (vm.notice) {
      indicator.dataset.noticeKind = vm.notice.kind;
      indicator.className = `length-indicator notice-${vm.notice.kind}`;
      this.updateIndicator(tab, this.inputs.get(tab)?.value ?? "", vm.notice.message);
    } else {
      // No notice: keep the base class so a prior notice's styling clears, drop
      // the kind marker, and re-evaluate the indicator against the current
      // draft. Passing `null` hides the indicator unless the draft is itself
      // over-limit, which clears any stale notice copy left over from a prior
      // render (important on re-hydrate, where a hydrate always resets notices
      // to null — the transient notice must not linger in the DOM).
      indicator.className = "length-indicator";
      delete indicator.dataset.noticeKind;
      this.updateIndicator(tab, this.inputs.get(tab)?.value ?? "", null);
    }
  }

  // --------------------------------------------------------------------------
  // Input helpers
  // --------------------------------------------------------------------------

  /**
   * Handles a submit action from the button or Enter key. Performs the
   * client-side length precheck to show an immediate indication (Req 2.5), and
   * otherwise posts the submit intent and clears the input optimistically
   * (Req 2.3). The host remains authoritative and may still reject.
   */
  private attemptSubmit(tab: TabId, textarea: HTMLTextAreaElement): void {
    const send = this.sendButtons.get(tab);
    if (send && send.disabled) {
      return; // Locked (Req 2.6).
    }
    const text = textarea.value;
    if (text.trim().length === 0) {
      return; // Empty/whitespace-only: no-op (Req 2.4).
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      // Over-limit: retain text and show length indication immediately (Req 2.5).
      this.updateIndicator(
        tab,
        text,
        `Message is ${text.length} characters; the limit is ${MAX_MESSAGE_LENGTH}.`,
      );
      return;
    }
    this.callbacks.onSubmit(tab, text);
    // Optimistic clear (Req 2.3). If the host rejects (length_limit/
    // unavailable), the view model's draft/notice will restore the text on the
    // next render.
    textarea.value = "";
    this.updateIndicator(tab, "", null);
    // Optimistic clear dims the send arrow immediately.
    this.updateSendAffordance(tab);
  }

  /**
   * Updates the length/notice indicator for a tab. Shows a message when one is
   * given or when the text is over the limit; otherwise hides it.
   */
  private updateIndicator(tab: TabId, text: string, message: string | null): void {
    const indicator = this.indicators.get(tab);
    if (!indicator) {
      return;
    }
    let shown = message;
    if (shown === null && text.length > MAX_MESSAGE_LENGTH) {
      shown = `Message is ${text.length} characters; the limit is ${MAX_MESSAGE_LENGTH}.`;
    }
    if (shown === null) {
      indicator.hidden = true;
      indicator.textContent = "";
    } else {
      indicator.hidden = false;
      indicator.textContent = shown;
    }
  }

  private el(tag: string, className: string): HTMLElement {
    const element = this.doc.createElement(tag);
    element.className = className;
    return element;
  }
}
