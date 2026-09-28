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
import {
  AgentSurfaceView,
  type AgentRenderCallbacks,
} from "./agent/agent-render";
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
  agentView: AgentSurfaceView;
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

  // Project navigation bar, always the first child of `root`. It appears once a
  // project is open on any surface (Discovery, Spec or Build) and returns to the
  // start form + History. Screen-only: the project stays durable in Core.
  const nav = root.ownerDocument.createElement("div");
  nav.className = "panel-nav";
  nav.hidden = true;
  const navHome = root.ownerDocument.createElement("button");
  navHome.type = "button";
  navHome.className = "panel-nav-home";
  navHome.textContent = "← 처음으로";
  navHome.setAttribute("aria-label", "처음 화면과 이전 프로젝트 목록으로 이동");
  navHome.addEventListener("click", () => client.postFlow({ type: "goToStart" }));
  const navTitle = root.ownerDocument.createElement("span");
  navTitle.className = "panel-nav-title";
  nav.appendChild(navHome);
  nav.appendChild(navTitle);
  root.appendChild(nav);
  const renderNav = (snapshot: FlowSnapshot): void => {
    nav.hidden = snapshot.project === null;
    navTitle.textContent = snapshot.project?.title ?? "";
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

  const flowNotice = root.ownerDocument.createElement("div");
  flowNotice.className = "flow-notice agent-notice";
  flowNotice.setAttribute("role", "status");
  flowNotice.setAttribute("aria-live", "polite");
  flowNotice.hidden = true;
  flowContainer.appendChild(flowNotice);
  const renderFlowNotice = (notice: { kind: string; message: string } | null): void => {
    flowNotice.textContent = notice?.message ?? "";
    flowNotice.hidden = !notice?.message;
    flowNotice.setAttribute("data-kind", notice?.kind ?? "info");
  };

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
    onReturnToDiscovery: () => {
      client.postFlow({ type: "returnToDiscovery" });
    },
    onDraftChanged: (field, text) => {
      client.postFlow({ type: "draftChangedFlow", field, text });
    },
    onRefreshHistory: () => {
      // Read-only (guide §6/§10-2): (re)load the History list.
      client.postFlow({ type: "refreshHistory" });
    },
    onOpenHistoryProject: (projectId) => {
      // Read-only (guide §6/§10-2): restore a safe summary only.
      client.postFlow({ type: "openHistoryProject", projectId });
    },
  };

  // Constructing the views appends their (self-hiding) containers to
  // `flowContainer`; they only become visible when their phase is active.
  const discoveryStart = new DiscoveryStartView(flowContainer, flowCallbacks);
  const discoveryWorkspace = new DiscoveryWorkspace(flowContainer, flowCallbacks);
  const specReview = new SpecReview(flowContainer, flowCallbacks);
  const flowViews = { discoveryStart, discoveryWorkspace, specReview };


  // The live agent container is created here (appended after `flowContainer`)
  // so `applySurface` can arbitrate it too. It starts hidden and stays hidden
  // until the first `agent/hydrate` switches the panel into live agent mode.
  const agentContainer = root.ownerDocument.createElement("div");
  agentContainer.className = "agent-shell";
  agentContainer.hidden = true;
  root.appendChild(agentContainer);
  let agentActive = false;

  /**
   * Toggle the top-level surface from the current flow projection: when the
   * derived surface is "flow" the flow container is shown and the Build_Surface
   * panel hidden; when "build" the reverse. The individual flow views still
   * self-hide by phase, so exactly one flow view is visible within the flow
   * container. `buildContainer` holds the PanelRenderer's Build_Surface DOM.
   *
   * In product mode (after the first `agent/hydrate`) the live agent surface
   * replaces the Demo Build_Surface for the "build" surface, and it is hidden
   * during Discovery/Spec so it never squeezes the flow shell.
   */
  const applySurface = (snapshot: FlowSnapshot | null): void => {
    const surface = selectShellSurface(snapshot);
    flowContainer.hidden = surface !== "flow";
    buildContainer.hidden = surface === "flow" || agentActive;
    agentContainer.hidden = surface === "flow" || !agentActive;
  };

  // Flow host -> store -> render. `hydrateFlow` replaces the projection
  // wholesale, decides the surface, and renders all three views (each self-hides
  // by phase). Notices use the same text-only sink for live messages and reload.
  client.onHostFlowMessage((message) => {
    if (message.type === "hydrateFlow") {
      if (flowStore.current?.project?.id !== message.snapshot.project?.id) {
        agentView.resetProject();
      }
      flowStore.apply(message.snapshot);
      applySurface(flowStore.current);
      discoveryStart.render(message.snapshot);
      discoveryWorkspace.render(message.snapshot);
      specReview.render(message.snapshot);
      renderNav(message.snapshot);
      renderFlowNotice(message.snapshot.notice);
    }
    if (message.type === "flowNotice") renderFlowNotice(message);
  });

  // ---- Additive LIVE Builder/Helper agent surface (Req 13, 14) -------------
  //
  // The agent surface renders into its own child container of `root` (a sibling
  // of `buildContainer` / `flowContainer`) and is wired symmetrically to the
  // flow surface: gestures post `AgentAction`s via `client.postAgent`, and
  // host→webview agent messages update the view. It is INERT until an
  // `agent/hydrate` arrives (product mode only, when a Managed_Host is present);
  // in dev/tests no agent host message is ever posted, so this branch never
  // fires and the existing Build/flow bootstrap behavior is unchanged.
  //
  // The agent container (created above) starts hidden. The first
  // `agent/hydrate` marks live agent mode, and `applySurface` then shows it in
  // place of the Demo Build_Surface whenever the flow phase is "building".
  const agentCallbacks: AgentRenderCallbacks = {
    onBuilderStart: (message) => {
      client.postAgent({ kind: "builder/start", message });
    },
    onBuilderStop: () => {
      client.postAgent({ kind: "builder/stop" });
    },
    onHelperStart: (message, origin, decisionId) => {
      client.postAgent({
        kind: "helper/start",
        message,
        origin,
        ...(decisionId !== undefined ? { decisionId } : {}),
      });
    },
    onResolveDecision: (decisionId, selection, rationale, helperUsed) => {
      client.postAgent({
        kind: "decision/resolve",
        decisionId,
        selection,
        helperUsed,
        ...(rationale !== undefined ? { rationale } : {}),
      });
    },
    onResumeAfterDecision: () => {
      client.postAgent({ kind: "builder/resumeAfterDecision" });
    },
    onNativeAnswer: (requestId, nativeJobId, answer) => {
      client.postAgent({ kind: "native/answer", requestId, nativeJobId, answer });
    },
    onOpenWorkspace: (taskId) => {
      client.postAgent({ kind: "workspace/open", taskId });
    },
    onLaunchResult: () => {
      client.postAgent({ kind: "result/launch" });
    },
    onReadEvidence: (conceptId) => {
      client.postAgent({
        kind: "evidence/read",
        ...(conceptId !== undefined ? { conceptId } : {}),
      });
    },
    onRetryAnalysis: (analysisJobId, expectedJobRevision) => {
      client.postAgent({ kind: "evidence/retry", analysisJobId, expectedJobRevision });
    },
    onListFinalUpgrade: () => {
      client.postAgent({ kind: "finalUpgrade/list" });
    },
    onPrepareFinalUpgrade: (input) => {
      client.postAgent({ kind: "finalUpgrade/prepare", ...input });
    },
  };

  const agentView = new AgentSurfaceView(agentContainer, agentCallbacks);

  // Agent host → view. The surface renders when `agent/hydrate` arrives (which
  // also reveals the container); targeted read-style responses update their
  // dedicated regions. Notices ride inside the hydrated `vm.notice`, so
  // `agent/notice` triggers a re-render only if a standalone notice is ever
  // posted (the host currently hydrates for state changes).
  client.onHostAgentMessage((message) => {
    switch (message.kind) {
      case "agent/hydrate": {
        agentActive = true;
        applySurface(flowStore.current);
        agentView.render(message.vm);
        return;
      }
      case "agent/evidence": {
        agentView.renderEvidence(message.view);
        return;
      }
      case "agent/finalUpgrade": {
        agentView.renderFinalUpgrade(message.candidates);
        return;
      }
      // agent/patch/* and agent/notice: the host drives full `agent/hydrate`
      // snapshots for state changes (design §B.16), so these are no-ops here.
      default:
        return;
    }
  });

  client.start();
  return { store, renderer, client, flowStore, flowViews, agentView };
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
