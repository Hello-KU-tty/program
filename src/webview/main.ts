/**
 * Webview entry point for the Builder & Helper Agent Panel.
 *
 * Wires the three webview modules together:
 *
 * - {@link WebviewClient} — transport: posts {@link WebviewToHost} intents and
 *   delivers validated {@link HostToWebview} messages.
 * - {@link ViewModelStore} — client-side projection of host state, built from
 *   `hydrate` and updated by patches.
 * - {@link PanelRenderer} — framework-free DOM rendering of the projection.
 *
 * The flow is one-directional in each direction:
 *   host message → store.apply → renderer.render(affected tabs)
 *   user action  → store update (optimistic) + client.post(intent)
 *
 * The host owns authoritative state (design.md), so user actions are posted as
 * intents and the resulting authoritative view arrives back as `hydrate`/patch
 * messages; the local optimistic updates (draft, cleared input) are corrected
 * by that next render if the host disagrees.
 */

import type { TabId } from "../core/types";
import { WebviewClient } from "./client-messaging";
import { PanelRenderer, type RenderCallbacks } from "./render";
import { ViewModelStore } from "./view-model";

/**
 * Bootstraps the webview against a root element and messaging client. Returns
 * the wired pieces so tests can drive them; in the real webview this is called
 * once on load with the defaults.
 *
 * @param root the container element to render into.
 * @param client messaging client; defaults to a new {@link WebviewClient} bound
 *   to the acquired VS Code API.
 */
export function bootstrap(
  root: HTMLElement,
  client: WebviewClient = new WebviewClient(),
): { store: ViewModelStore; renderer: PanelRenderer; client: WebviewClient } {
  const store = new ViewModelStore();

  const callbacks: RenderCallbacks = {
    onSelectTab: (tab: TabId) => {
      client.post({ type: "selectTab", tab });
    },
    onSubmit: (tab: TabId, text: string) => {
      // Optimistic: clear the local draft on submit (Req 2.3). The host confirms
      // via the next hydrate/patch; a length_limit/unavailable notice restores.
      store.setDraft(tab, "");
      store.clearNotice(tab);
      client.post({ type: "submit", tab, text });
    },
    onDraftChanged: (tab: TabId, text: string) => {
      store.setDraft(tab, text);
      store.clearNotice(tab);
      client.post({ type: "draftChanged", tab, text });
    },
    onToggleWorkItem: (tab: TabId, itemId: string) => {
      // Expand/collapse is view-local (design.md, Req 4.5): flip the local
      // view-model state so the toggle is reflected immediately, then re-render
      // just that tab. The intent is still posted so a persistence-free
      // re-hydration could replay it; the host treats it as a no-op.
      const toggled = store.toggleWorkItem(tab, itemId);
      client.post({ type: "toggleWorkItem", tab, itemId });
      const model = store.current;
      if (toggled && model) {
        renderer.render(model);
      }
    },
  };

  const renderer = new PanelRenderer(root, callbacks);

  // Host → store → render. `apply` returns the tabs whose view may have changed,
  // but the renderer re-renders from the full model, so we render whenever any
  // tab is affected (a hydrate affects both).
  client.onHostMessage((message) => {
    const affected = store.apply(message);
    const model = store.current;
    if (model && affected.length > 0) {
      renderer.render(model);
    }
  });

  client.start();
  return { store, renderer, client };
}

/**
 * Auto-bootstrap when running inside a real DOM with an `#app` root. Guarded so
 * importing this module in a non-DOM test does not throw.
 */
if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    bootstrap(root);
  }
}
