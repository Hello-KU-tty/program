/**
 * Host-side messaging dispatcher for the Builder & Helper Agent Panel.
 *
 * The dispatcher is the translation layer between the pure {@link PanelController}
 * core and the webview. It has two responsibilities:
 *
 * 1. **Outbound (controller -> webview):** produce {@link HostToWebview} messages
 *    and hand them to an injected `post` callback. It can emit a full
 *    {@link HostToWebview.hydrate} on demand ({@link WebviewDispatcher.hydrateAll})
 *    and forward controller notices as `notice` messages. Fine-grained patches
 *    (`tabActivated`, `submissionState`, and the content patches) are exposed as
 *    small `emit*` helpers so the wiring/UI layer can drive them.
 *
 * 2. **Inbound (webview -> controller):** apply {@link WebviewToHost} intents to
 *    the controller via {@link WebviewDispatcher.handle}.
 *
 * ## A note on granular patches vs. re-hydration
 *
 * The current {@link PanelController} does not emit granular change events for
 * every state mutation (it exposes `getTabSnapshot`/`getTabState`/`selectTab`/
 * `submit` and an `onNotice` sink). Rather than growing a broad new event
 * stream on the controller (out of scope for this task), the dispatcher takes a
 * pragmatic approach:
 *
 * - `selectTab` intents post a precise `tabActivated` patch after selecting.
 * - `submit` intents post a `submissionState` patch after the call, reflecting
 *   the tab's current lock state read from the snapshot, and rely on the
 *   controller's `onNotice` sink for `length_limit`/`unavailable` notices.
 * - Streamed content patches (`entryAdded`/`chunkAppended`/`workItemAdded`/
 *   `responseState`) are **currently satisfied via re-hydration**: the wiring
 *   layer can call {@link WebviewDispatcher.hydrateAll} (or the per-tab
 *   {@link WebviewDispatcher.emitHydrate}) to replay the addressed tab's
 *   snapshot when content arrives. The message *types* for these patches are
 *   defined and the `emit*` helpers exist so a future controller that emits
 *   granular events can drive them directly without changing this contract.
 *
 * The `notice` outbound path is wired by exposing {@link WebviewDispatcher.onNotice},
 * which callers pass as the controller's `onNotice` option at construction time
 * (the controller's sink is set at construction, so the dispatcher cannot
 * attach it after the fact).
 */

import type {
  ConversationEntry,
  TabId,
  WorkStreamItem,
} from "../core/types";
import type {
  Notice,
  PanelController,
} from "../core/panel-controller";
import type { HostToWebview, WebviewToHost } from "./messages";

/** Sink the dispatcher pushes {@link HostToWebview} messages into. */
export type PostMessage = (message: HostToWebview) => void;

/**
 * Translates controller state into {@link HostToWebview} patches and applies
 * {@link WebviewToHost} intents to the controller.
 */
export class WebviewDispatcher {
  constructor(
    private readonly controller: PanelController,
    private readonly post: PostMessage,
  ) {}

  // --------------------------------------------------------------------------
  // Outbound: controller -> webview
  // --------------------------------------------------------------------------

  /**
   * Notice sink to hand to the controller as its `onNotice` option so every
   * emitted notice is forwarded to the webview as a `notice` message (Req 5.5,
   * 6.5). Bound as an arrow property so it can be passed by reference. Because
   * the controller's `onNotice` option is set at construction time, the wiring
   * layer forwards to the dispatcher via a closure, e.g.:
   *
   * ```ts
   * let dispatcher: WebviewDispatcher;
   * const controller = new PanelController(adapter, {
   *   onNotice: (notice) => dispatcher.forwardNotice(notice),
   * });
   * dispatcher = new WebviewDispatcher(controller, post);
   * ```
   */
  readonly onNotice = (notice: Notice): void => {
    this.forwardNotice(notice);
  };

  /** Forwards a single controller {@link Notice} to the webview. */
  forwardNotice(notice: Notice): void {
    this.post({
      type: "notice",
      tab: notice.tab,
      kind: notice.kind,
      message: notice.message,
    });
  }

  /**
   * Produces and posts a full {@link HostToWebview.hydrate} built from both
   * tabs' snapshots plus the active tab (Req 1.5, 3.5). This is the canonical
   * "rebuild the webview from host state" path used on first render, on
   * re-reveal after disposal, and as the current vehicle for content patches.
   */
  hydrateAll(): void {
    this.post({
      type: "hydrate",
      tabs: {
        builder: this.controller.getTabSnapshot("builder"),
        helper: this.controller.getTabSnapshot("helper"),
      },
      activeTab: this.controller.activeTab,
    });
  }

  /**
   * Posts a `tabActivated` patch for `tab`. Called after handling a `selectTab`
   * intent; also exposed for direct use by the wiring layer.
   */
  emitTabActivated(tab: TabId): void {
    this.post({ type: "tabActivated", tab });
  }

  /**
   * Posts a `submissionState` patch reflecting the tab's current lock state,
   * read from its snapshot (`submissionEnabled`). Called after `submit` and on
   * terminal transitions so the webview enables/disables the input (Req 2.6).
   */
  emitSubmissionState(tab: TabId): void {
    const enabled = this.controller.getTabSnapshot(tab).submissionEnabled;
    this.post({ type: "submissionState", tab, enabled });
  }

  /**
   * Posts an `entryAdded` patch. Provided for a future controller that emits
   * granular change events; today content is refreshed via {@link hydrateAll}.
   */
  emitEntryAdded(tab: TabId, entry: ConversationEntry): void {
    this.post({ type: "entryAdded", tab, entry });
  }

  /**
   * Posts a `chunkAppended` patch (Req 3.2). Provided for a future controller
   * that emits granular change events; today content is refreshed via
   * {@link hydrateAll}.
   */
  emitChunkAppended(tab: TabId, responseId: string, text: string): void {
    this.post({ type: "chunkAppended", tab, responseId, text });
  }

  /**
   * Posts a `workItemAdded` patch (Req 4.1). Provided for a future controller
   * that emits granular change events; today content is refreshed via
   * {@link hydrateAll}.
   */
  emitWorkItemAdded(tab: TabId, responseId: string, item: WorkStreamItem): void {
    this.post({ type: "workItemAdded", tab, responseId, item });
  }

  /**
   * Posts a `responseState` patch (Req 6.3/6.5). Provided for a future
   * controller that emits granular change events; today content is refreshed
   * via {@link hydrateAll}.
   */
  emitResponseState(
    tab: TabId,
    responseId: string,
    state: "in_progress" | "complete" | "failed",
  ): void {
    this.post({ type: "responseState", tab, responseId, state });
  }

  // --------------------------------------------------------------------------
  // Inbound: webview -> controller
  // --------------------------------------------------------------------------

  /**
   * Applies a single {@link WebviewToHost} intent to the controller.
   *
   * - `selectTab`: select the tab, then post `tabActivated` (Req 1.4).
   * - `submit`: submit the text, then post `submissionState` reflecting the
   *   tab's lock; `length_limit`/`unavailable` outcomes surface via the
   *   controller's `onNotice` sink (forwarded through {@link forwardNotice}).
   *   Async because {@link PanelController.submit} is async.
   * - `draftChanged`: store the unsent text on the tab's state so it can be
   *   restored on re-hydration (Req 1.5).
   * - `toggleWorkItem`: expand/collapse is **view-local** per design 4.5 — the
   *   controller/TabState owns no per-item toggle, so the host treats this as a
   *   no-op. The intent is still accepted (and could be replayed by the webview
   *   after re-hydration) but does not mutate host state. Documented here so
   *   the boundary contract is explicit rather than silently dropping it.
   */
  async handle(msg: WebviewToHost): Promise<void> {
    switch (msg.type) {
      case "selectTab": {
        this.controller.selectTab(msg.tab);
        this.emitTabActivated(msg.tab);
        return;
      }
      case "submit": {
        await this.controller.submit(msg.tab, msg.text);
        // Reflect the resulting lock state; on accept the tab is locked, on
        // reject/unavailable it stays enabled (Req 2.6). Notices for
        // length_limit/unavailable arrive via the onNotice sink.
        this.emitSubmissionState(msg.tab);
        return;
      }
      case "draftChanged": {
        this.controller.getTabState(msg.tab).setDraft(msg.text);
        return;
      }
      case "toggleWorkItem": {
        // View-local (design 4.5): no host-side state to mutate. Intentionally
        // a no-op on the controller so tab-state.ts stays unmodified.
        return;
      }
      default: {
        // Exhaustiveness guard: adding a new intent kind surfaces here at
        // compile time so the dispatcher is kept in sync with the protocol.
        const _exhaustive: never = msg;
        void _exhaustive;
        return;
      }
    }
  }
}
