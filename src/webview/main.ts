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
 *
 * ## Additive Discovery -> Spec flow shell (Req 12, 13)
 *
 * The same webview additively hosts the Discovery -> Spec flow surfaces
 * alongside the Build_Surface. `bootstrap` also constructs a
 * {@link FlowViewModelStore} and the three flow views ({@link DiscoveryStartView},
 * {@link DiscoveryWorkspace}, {@link SpecReview}) into a dedicated child
 * container of `root`, and routes flow intents/messages over the same transport
 * via {@link WebviewClient.postFlow} / {@link WebviewClient.onHostFlowMessage}.
 *
 * The flow branch is **inert until a `hydrateFlow` host message arrives**:
 * before then {@link FlowViewModelStore.current} is null, so
 * {@link selectShellSurface}`(null)` returns `"build"` and the Build_Surface is
 * shown exactly as before (the flow container starts hidden). On `hydrateFlow`
 * the flow store is updated, {@link selectShellSurface} decides which surface is
 * visible, and the three flow views render from the snapshot (each self-hides by
 * phase). This keeps existing Builder/Helper behavior and tests unchanged.
 */

import type { TabId } from "../core/types";
import type { FlowSnapshot } from "../core/flow/flow-snapshot";
import { WebviewClient } from "./client-messaging";
import { PanelRenderer, type RenderCallbacks } from "./render";
import { ViewModelStore } from "./view-model";
import { FlowViewModelStore } from "./flow/flow-view-model";
import {
  DiscoveryStartView,
  DiscoveryWorkspace,
  SpecReview,
  type FlowRenderCallbacks,
} from "./flow/flow-render";
import { selectShellSurface } from "./shell-view-model";

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
): {
  store: ViewModelStore;
  renderer: PanelRenderer;
  client: WebviewClient;
  flowStore: FlowViewModelStore;
  flowViews: {
    discoveryStart: DiscoveryStartView;
    discoveryWorkspace: DiscoveryWorkspace;
    specReview: SpecReview;
  };
} {
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

  // The Build_Surface renders into its own child container of `root`, so its
  // visibility can be toggled independently of the additive flow container
  // (both are siblings under `root`). This does not restructure PanelRenderer —
  // it simply renders into `buildContainer` instead of `root` directly.
  const buildContainer = root.ownerDocument.createElement("div");
  buildContainer.className = "build-shell";
  root.appendChild(buildContainer);

  const renderer = new PanelRenderer(buildContainer, callbacks);

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

  // ---- Additive Discovery -> Spec flow shell (Req 12, 13) ------------------
  //
  // The flow views render into their own child container of `root` (a sibling
  // of `buildContainer`) so surface visibility can be toggled by hiding one
  // container vs. the other. The flow container starts hidden: before any
  // `hydrateFlow` arrives `flowStore.current` is null, so
  // `selectShellSurface(null)` === "build" and the Build_Surface shows exactly
  // as today (the flow branch is inert).
  const flowStore = new FlowViewModelStore();

  const flowContainer = root.ownerDocument.createElement("div");
  flowContainer.className = "flow-shell";
  flowContainer.hidden = true;
  root.appendChild(flowContainer);

  const flowCallbacks: FlowRenderCallbacks = {
    onStartDiscovery: (input) => {
      client.postFlow({ type: "startDiscovery", input });
    },
    onToggleBasket: (ref) => {
      client.postFlow({ type: "toggleBasket", ref });
    },
    onSubmitRefinement: (action, text, targets) => {
      client.postFlow({ type: "submitRefinement", action, text, targets });
    },
    onSelectCandidate: (target) => {
      client.postFlow({ type: "selectCandidate", target });
    },
    onRefineSpec: (message) => {
      client.postFlow({ type: "refineSpec", message });
    },
    onConfirmSpec: () => {
      client.postFlow({ type: "confirmSpec" });
    },
    onDraftChanged: (field, text) => {
      client.postFlow({ type: "draftChangedFlow", field, text });
    },
  };

  // Constructing the views appends their (self-hiding) containers to
  // `flowContainer`; they only become visible when their phase is active.
  const discoveryStart = new DiscoveryStartView(flowContainer, flowCallbacks);
  const discoveryWorkspace = new DiscoveryWorkspace(flowContainer, flowCallbacks);
  const specReview = new SpecReview(flowContainer, flowCallbacks);
  const flowViews = { discoveryStart, discoveryWorkspace, specReview };

  /**
   * Toggle the top-level surface from the current flow projection: when the
   * derived surface is "flow" the flow container is shown and the Build_Surface
   * panel hidden; when "build" the reverse. The individual flow views still
   * self-hide by phase, so exactly one flow view is visible within the flow
   * container. `buildContainer` holds the PanelRenderer's Build_Surface DOM.
   */
  const applySurface = (snapshot: FlowSnapshot | null): void => {
    const surface = selectShellSurface(snapshot);
    // Show the flow container and hide the Build_Surface panel when a flow phase
    // is active; reveal the Build_Surface otherwise. `buildContainer` and
    // `flowContainer` are independent siblings of `root`, so toggling one never
    // affects the other. The individual flow views still self-hide by phase, so
    // exactly one flow view is visible within the flow container.
    flowContainer.hidden = surface !== "flow";
    buildContainer.hidden = surface === "flow";
  };

  // Flow host -> store -> render. `hydrateFlow` replaces the projection
  // wholesale, decides the surface, and renders all three views (each self-hides
  // by phase). `flowNotice` has no dedicated notice sink on the flow views yet,
  // so it is a documented no-op forward here (the next `hydrateFlow` snapshot
  // carries the authoritative latest notice anyway).
  client.onHostFlowMessage((message) => {
    if (message.type === "hydrateFlow") {
      flowStore.apply(message.snapshot);
      applySurface(flowStore.current);
      discoveryStart.render(message.snapshot);
      discoveryWorkspace.render(message.snapshot);
      specReview.render(message.snapshot);
    }
    // message.type === "flowNotice": no-op (no flow-view notice API exists).
  });

  client.start();
  return { store, renderer, client, flowStore, flowViews };
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
