/**
 * Client-side view model for the webview.
 *
 * The webview owns no authoritative state — the extension host does (design.md
 * "State in the extension host, not the webview"). This module holds a
 * *projection* of that state, derived from a `hydrate` message and updated by
 * subsequent patches, so the render layer has a stable, synchronous structure
 * to read from.
 *
 * Scope for task 12.1: tabs, text conversation entries, active tab, per-tab
 * submission lock, in-progress derivation, unsent draft, and the active-agent
 * label. Detailed work-item rendering (collapse/expand, failed styling) is
 * task 12.2. The patch handlers for content messages are implemented so that if
 * the host emits them granularly they are applied, while the current host
 * re-hydrates (both paths are supported).
 *
 * Re-hydration semantics (task 12.3, Req 1.5 / 3.5). Because VS Code disposes a
 * webview when hidden and recreates it on reveal, the host re-pushes a
 * `hydrate` on `resolveWebviewView` (wired by task 13.2) to restore the view
 * from authoritative host state. A `hydrate` therefore fully REPLACES the prior
 * projection rather than merging into it:
 *
 * - Both tabs are rebuilt wholesale from their snapshots, so entries are
 *   restored in their original order with no duplication of prior entries,
 *   each tab's `draft` and `submissionEnabled` are restored, and `activeTab` is
 *   set from the snapshot (no stale active tab survives).
 * - Every transient notice is reset to `null` — a re-hydrate clears any
 *   length-limit / unavailable / error notice that was showing, since the
 *   authoritative snapshot carries no transient notice.
 * - Work-item expand/collapse is view-local (design.md: the host treats
 *   `toggleWorkItem` as a no-op and does not persist expand state). A hydrate
 *   therefore carries whatever `expanded` values are in the snapshot's work
 *   items (host-provided defaults), and view-local expand state RESETS to those
 *   snapshot values on re-hydrate. This is acceptable per design because the
 *   host does not persist expand state; a locally-toggled item reverts to the
 *   snapshot's default after a disposal/reveal round-trip.
 * - Streaming into a non-active tab followed by a hydrate is faithful: the
 *   webview reflects exactly the snapshot's `activeTab`, so a Builder stream
 *   that arrived while Helper was active does not switch the active tab on
 *   re-hydrate (Req 3.5 is enforced host-side; the webview mirrors it).
 */

import type {
  AgentResponseEntry,
  ConversationEntry,
  TabId,
  TabStateSnapshot,
  WorkStreamItem,
} from "../core/types";
import type { HostToWebview } from "./messages";
import type { NoticeKind } from "../core/panel-controller";
import { toggleWorkItemExpanded } from "../core/work-item";

/** Human-readable tab labels shown on the tab controls (Req 1.2). */
export const TAB_LABELS: Record<TabId, string> = {
  builder: "Builder",
  helper: "Helper",
};

/** A notice currently shown for a tab (length_limit / unavailable / error). */
export interface TabNotice {
  kind: NoticeKind;
  message: string;
}

/**
 * The view model for a single tab: a faithful copy of the host snapshot plus a
 * transient notice. Copies are held (not shared references) so re-hydration can
 * replace them wholesale without aliasing surprises.
 */
export interface TabViewModel {
  tabId: TabId;
  /** Ordered conversation entries (render order == array order). */
  entries: ConversationEntry[];
  /** Unsent Message_Input text to restore on return (Req 1.5). */
  draft: string;
  /** Whether submission is currently allowed in this tab (Req 2.6). */
  submissionEnabled: boolean;
  /** Human-readable active-agent label (Req 5.5). */
  activeAgentLabel: string;
  /** The most recent notice to surface, or null when none. */
  notice: TabNotice | null;
}

/** The complete client-side view model across both tabs. */
export interface PanelViewModel {
  tabs: Record<TabId, TabViewModel>;
  activeTab: TabId;
}

/** Builds a fresh {@link TabViewModel} from a host snapshot. */
function tabFromSnapshot(snapshot: TabStateSnapshot): TabViewModel {
  return {
    tabId: snapshot.tabId,
    entries: snapshot.entries.map(cloneEntry),
    draft: snapshot.draft,
    submissionEnabled: snapshot.submissionEnabled,
    activeAgentLabel: snapshot.activeAgentLabel,
    notice: null,
  };
}

/** Deep-copies a conversation entry so the view model never aliases input. */
function cloneEntry(entry: ConversationEntry): ConversationEntry {
  if (entry.kind === "agent_response") {
    const e = entry as AgentResponseEntry;
    const copy: AgentResponseEntry = {
      ...e,
      chunks: [...e.chunks],
      workItems: e.workItems.map((w) => ({ ...w })),
    };
    return copy;
  }
  return { ...entry };
}

/**
 * Returns true when a response entry is currently streaming — used to derive
 * the in-progress indicator (Req 3.4). A tab is "busy" when submission is
 * disabled or any of its responses is still in progress.
 */
export function isResponseInProgress(entry: ConversationEntry): boolean {
  return entry.kind === "agent_response" && (entry as AgentResponseEntry).state === "in_progress";
}

/**
 * Holds and mutates the {@link PanelViewModel} in response to host messages.
 *
 * All mutations are total and defensive: a patch addressing an unknown response
 * id is ignored rather than throwing, keeping the projection resilient to
 * out-of-order or stale patches (fuller robustness is task 12.3).
 */
export class ViewModelStore {
  private model: PanelViewModel | null = null;

  /** Returns the current model, or null before the first `hydrate`. */
  get current(): PanelViewModel | null {
    return this.model;
  }

  /**
   * Applies a host message to the model and returns the tabs whose rendering
   * may need to change (so the caller can re-render minimally). Before the
   * first `hydrate`, only a `hydrate` message is meaningful; other messages are
   * ignored until the model exists.
   */
  apply(message: HostToWebview): TabId[] {
    if (message.type === "hydrate") {
      // Full replacement (task 12.3): a hydrate discards the prior projection
      // entirely and rebuilds both tabs from the authoritative snapshots. This
      // is what makes webview disposal/reveal safe — the recreated webview asks
      // for (or is pushed) a hydrate and its state is restored from the host.
      // Re-hydration cannot duplicate entries (the arrays are rebuilt, not
      // appended to), cannot keep a stale active tab (activeTab is overwritten),
      // and clears every transient notice (tabFromSnapshot sets notice: null).
      // Any local optimistic change (a typed-but-unsent draft, a toggled work
      // item) is overwritten by the authoritative snapshot.
      this.model = {
        tabs: {
          builder: tabFromSnapshot(message.tabs.builder),
          helper: tabFromSnapshot(message.tabs.helper),
        },
        activeTab: message.activeTab,
      };
      return ["builder", "helper"];
    }

    const model = this.model;
    if (model === null) {
      return [];
    }

    switch (message.type) {
      case "tabActivated": {
        model.activeTab = message.tab;
        return ["builder", "helper"];
      }
      case "submissionState": {
        model.tabs[message.tab].submissionEnabled = message.enabled;
        return [message.tab];
      }
      case "notice": {
        model.tabs[message.tab].notice = {
          kind: message.kind,
          message: message.message,
        };
        return [message.tab];
      }
      case "entryAdded": {
        model.tabs[message.tab].entries.push(cloneEntry(message.entry));
        return [message.tab];
      }
      case "chunkAppended": {
        const response = this.findResponse(message.tab, message.responseId);
        if (response) {
          response.chunks.push(message.text);
        }
        return [message.tab];
      }
      case "workItemAdded": {
        const response = this.findResponse(message.tab, message.responseId);
        if (response) {
          response.workItems.push({ ...(message.item as WorkStreamItem) });
        }
        return [message.tab];
      }
      case "responseState": {
        const response = this.findResponse(message.tab, message.responseId);
        if (response) {
          response.state = message.state;
        }
        return [message.tab];
      }
      default: {
        const _exhaustive: never = message;
        void _exhaustive;
        return [];
      }
    }
  }

  /** Clears a tab's transient notice (e.g. after the user edits the input). */
  clearNotice(tab: TabId): void {
    if (this.model) {
      this.model.tabs[tab].notice = null;
    }
  }

  /** Updates the locally-tracked draft for a tab (optimistic input handling). */
  setDraft(tab: TabId, text: string): void {
    if (this.model) {
      this.model.tabs[tab].draft = text;
    }
  }

  /**
   * Flips the `expanded` state of a single work item locally (Req 4.5).
   *
   * Expand/collapse is view-local per design.md ("view-local, but reported for
   * persistence-free re-hydration"): the host treats a `toggleWorkItem` intent
   * as a no-op, so the webview owns this state. The flip uses the pure core
   * helper {@link toggleWorkItemExpanded}, which changes only the targeted
   * item and preserves every other item's expanded state (toggle locality).
   *
   * Returns `true` when a matching item was found and toggled (so the caller
   * can re-render the tab), `false` otherwise.
   */
  toggleWorkItem(tab: TabId, itemId: string): boolean {
    const model = this.model;
    if (!model) {
      return false;
    }
    let toggled = false;
    for (const entry of model.tabs[tab].entries) {
      if (entry.kind !== "agent_response") {
        continue;
      }
      const response = entry as AgentResponseEntry;
      if (response.workItems.some((w) => w.id === itemId)) {
        response.workItems = toggleWorkItemExpanded(response.workItems, itemId);
        toggled = true;
      }
    }
    return toggled;
  }

  private findResponse(tab: TabId, responseId: string): AgentResponseEntry | null {
    const model = this.model;
    if (!model) {
      return null;
    }
    const entry = model.tabs[tab].entries.find(
      (e) => e.id === responseId && e.kind === "agent_response",
    ) as AgentResponseEntry | undefined;
    return entry ?? null;
  }
}
