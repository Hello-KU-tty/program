/**
 * Webview messaging protocol for the Builder & Helper Agent Panel.
 *
 * This module defines the two message unions exchanged across the host <->
 * webview boundary and a couple of tiny (de)serialization helpers. It is the
 * single source of truth for the wire shape; both the host-side dispatcher
 * (see {@link file://./dispatcher.ts}) and the webview UI import these types so
 * the protocol stays in sync on both ends.
 *
 * The unions mirror design.md "Webview messaging protocol" exactly. They are
 * pure data (no runtime dependencies on VS Code or the adapter layer) so they
 * can be exercised directly by unit tests.
 *
 * Direction conventions:
 * - {@link HostToWebview}: render/patch messages the host posts to the webview.
 * - {@link WebviewToHost}: intent messages the webview posts back to the host.
 */

import type {
  ConversationEntry,
  TabId,
  TabStateSnapshot,
  WorkStreamItem,
} from "../core/types";
import type { NoticeKind } from "../core/panel-controller";

/**
 * Host -> Webview messages (render + fine-grained patches).
 *
 * Mirrors design.md exactly:
 * - `hydrate`: full rebuild of both tabs from immutable snapshots plus the
 *   active tab. Used on first render and whenever the webview is (re-)revealed
 *   after disposal, and as the pragmatic vehicle for any patch that the current
 *   controller API cannot emit granularly (Req 1.5, 3.5).
 * - `tabActivated`: the active tab changed (Req 1.4).
 * - `entryAdded`: a new User_Message or Agent_Response entry was appended.
 * - `chunkAppended`: a streamed message chunk was appended to a response
 *   (Req 3.2).
 * - `workItemAdded`: a Builder work-stream item was appended to a response
 *   (Req 4.1).
 * - `responseState`: a response transitioned between in_progress/complete/
 *   failed (Req 6.3/6.5).
 * - `submissionState`: submission was enabled/disabled for a tab (the
 *   per-tab lock, Req 2.6).
 * - `notice`: an error/unavailable/length-limit notice for a tab (Req 5.5,
 *   6.5). The `kind` reuses the controller's {@link NoticeKind} so host and
 *   webview agree on the categories.
 */
export type HostToWebview =
  | { type: "hydrate"; tabs: Record<TabId, TabStateSnapshot>; activeTab: TabId }
  | { type: "tabActivated"; tab: TabId }
  | { type: "entryAdded"; tab: TabId; entry: ConversationEntry }
  | { type: "chunkAppended"; tab: TabId; responseId: string; text: string }
  | { type: "workItemAdded"; tab: TabId; responseId: string; item: WorkStreamItem }
  | {
      type: "responseState";
      tab: TabId;
      responseId: string;
      state: "in_progress" | "complete" | "failed";
    }
  | { type: "submissionState"; tab: TabId; enabled: boolean }
  | { type: "notice"; tab: TabId; kind: NoticeKind; message: string };

/**
 * Webview -> Host messages (user intents).
 *
 * Mirrors design.md exactly:
 * - `selectTab`: the user activated a tab (Req 1.4).
 * - `submit`: the user submitted composed text from a tab (Req 2.2).
 * - `draftChanged`: the unsent Message_Input text changed; reported so the host
 *   can restore it on re-hydration (Req 1.5).
 * - `toggleWorkItem`: the user toggled a Builder work item's expand/collapse
 *   state (Req 4.5). Expand/collapse is view-local; it is reported so a
 *   persistence-free re-hydration could replay it, but the host does not own
 *   this state (see the dispatcher's `handle` for the view-local treatment).
 */
export type WebviewToHost =
  | { type: "selectTab"; tab: TabId }
  | { type: "submit"; tab: TabId; text: string }
  | { type: "draftChanged"; tab: TabId; text: string }
  | { type: "toggleWorkItem"; tab: TabId; itemId: string };

/** The set of valid {@link HostToWebview} discriminators. */
const HOST_TO_WEBVIEW_TYPES: ReadonlySet<HostToWebview["type"]> = new Set([
  "hydrate",
  "tabActivated",
  "entryAdded",
  "chunkAppended",
  "workItemAdded",
  "responseState",
  "submissionState",
  "notice",
]);

/** The set of valid {@link WebviewToHost} discriminators. */
const WEBVIEW_TO_HOST_TYPES: ReadonlySet<WebviewToHost["type"]> = new Set([
  "selectTab",
  "submit",
  "draftChanged",
  "toggleWorkItem",
]);

/**
 * Serializes a message to a JSON string for `postMessage`. The messages are
 * already plain JSON-safe data (snapshots are immutable projections of plain
 * objects), so this is a thin wrapper that documents the boundary and keeps
 * the (de)serialization pair colocated.
 */
export function serialize(message: HostToWebview | WebviewToHost): string {
  return JSON.stringify(message);
}

/**
 * Narrows an unknown value received over the boundary to a {@link WebviewToHost}
 * message, returning `null` when it does not match a known intent. The webview
 * is untrusted input from the host's perspective, so the dispatcher validates
 * the discriminator before acting on it.
 */
export function parseWebviewToHost(value: unknown): WebviewToHost | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const type = (value as { type?: unknown }).type;
  if (typeof type !== "string" || !WEBVIEW_TO_HOST_TYPES.has(type as WebviewToHost["type"])) {
    return null;
  }
  return value as WebviewToHost;
}

/**
 * Narrows an unknown value received over the boundary to a {@link HostToWebview}
 * message, returning `null` when it does not match a known patch. Provided for
 * symmetry so the webview can validate host messages with the same source of
 * truth.
 */
export function parseHostToWebview(value: unknown): HostToWebview | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const type = (value as { type?: unknown }).type;
  if (typeof type !== "string" || !HOST_TO_WEBVIEW_TYPES.has(type as HostToWebview["type"])) {
    return null;
  }
  return value as HostToWebview;
}
