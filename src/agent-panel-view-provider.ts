/**
 * AgentPanelViewProvider — wires the VS Code webview view to the pure
 * {@link PanelController} core via the {@link WebviewDispatcher} (task 13.2).
 *
 * Responsibilities on {@link AgentPanelViewProvider.resolveWebviewView}:
 *
 * 1. Configure the webview: enable scripts and constrain `localResourceRoots`
 *    to the extension's `dist/` (compiled webview bundle) and `media/` dirs.
 * 2. Inject the HTML shell that loads the compiled webview bundle
 *    (`dist/webview/main.js`) via {@link Webview.asWebviewUri}, with a
 *    nonce-based Content-Security-Policy and a `<div id="app">` root that
 *    `main.ts`'s auto-bootstrap mounts into.
 * 3. Construct the {@link PanelController} with a real {@link SystemClock} and an
 *    adapter obtained from the swappable {@link createAgentAdapter} factory
 *    (task 15 replaces the factory body, not this file).
 * 4. Wire messaging: inbound `postMessage`s are validated with
 *    {@link parseWebviewToHost} and forwarded to {@link WebviewDispatcher.handle};
 *    the dispatcher's `post` calls {@link Webview.postMessage}; the controller's
 *    `onNotice` forwards to the dispatcher per its documented closure pattern.
 * 5. Re-hydrate: push a full {@link WebviewDispatcher.hydrateAll} on resolve and
 *    whenever the view becomes visible again after disposal (Req 1.5).
 *
 * ## Interim full-refresh strategy
 *
 * The current {@link PanelController} does not emit granular change events for
 * streamed content, so the dispatcher's fine-grained content patches
 * (`entryAdded`/`chunkAppended`/`workItemAdded`/`responseState`) are not driven
 * yet. To keep the conversation view current after an inbound intent mutates
 * host state, this provider calls {@link WebviewDispatcher.hydrateAll} after each
 * handled inbound message (in addition to the precise `tabActivated`/
 * `submissionState` patches the dispatcher already posts). This is a pragmatic
 * full-refresh until granular host→webview patches are wired (follow-up); it is
 * correct (the webview is a pure projection of host state) if coarse.
 *
 * The controller's `onChange` callback (wired below to `hydrateAll`) now also
 * triggers a full refresh whenever the controller mutates state outside an
 * inbound intent — most importantly asynchronous/streamed updates such as
 * DemoAdapter's timer-driven message chunks. This ensures streamed content
 * renders immediately instead of only appearing after the user switches tabs or
 * sends another message (which was the trigger for the earlier missing-refresh
 * bug).
 *
 * Because a webview bundler is not part of this task, the HTML references the
 * per-file compiled `dist/webview/main.js`. Proper browser bundling of the
 * webview entry (e.g. via esbuild) is a documented follow-up; the wiring,
 * validation, and hydrate-on-reveal contract here are what task 13.2 delivers.
 */

import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import type { FrontendHost } from "../vendor/frontend-host";

import { PanelController } from "./core/panel-controller";
import { SystemClock } from "./core/clock";
import { WebviewDispatcher } from "./webview/dispatcher";
import { parseWebviewToHost, type HostToWebview } from "./webview/messages";
import { createAgentAdapter } from "./adapter/adapter-factory";
import { FlowController } from "./core/flow/flow-controller";
import { FlowDispatcher } from "./webview/flow/flow-dispatcher";
import {
  createFlowPorts,
  createManagedFlowPorts,
  unavailableFlowPorts,
  createFlowPortsAsync,
  isNativeFlowSupported,
} from "./adapter/flow/flow-port-factory";
import {
  parseWebviewToHostFlow,
  type HostToWebviewFlow,
} from "./webview/flow/flow-messages";

/** The webview view id contributed in package.json (`contributes.views`). */
export const AGENT_PANEL_VIEW_ID = "builderHelperAgentPanel.view";

/**
 * Minimal transport surface the wiring depends on. Declaring it lets the pure
 * wiring helper ({@link wireWebviewMessaging}) be unit-tested with a fake
 * webview, independent of the VS Code runtime.
 */
export interface MessagingWebview {
  // Widened to accept flow messages too (Req 12, 13): the additive
  // Discovery -> Spec flow posts {@link HostToWebviewFlow} over the same
  // channel. VS Code's real `postMessage` accepts `any`, so accepting the union
  // is safe and keeps flow hydration type-checking without a second transport.
  postMessage(message: HostToWebview | HostToWebviewFlow): unknown;
  onDidReceiveMessage(listener: (message: unknown) => unknown): vscode.Disposable;
}

/**
 * Pure wiring of a webview's message channel to a controller/dispatcher pair.
 * Extracted from {@link AgentPanelViewProvider.resolveWebviewView} so the
 * validate → forward → refresh behavior can be exercised without a live VS Code
 * webview (see the unit test with a fake webview shim).
 *
 * Behavior:
 * - Constructs a {@link PanelController} with a real {@link SystemClock} and the
 *   factory adapter, forwarding controller notices to the dispatcher.
 * - Registers an inbound listener that validates each payload with
 *   {@link parseWebviewToHost}, forwards valid intents to the dispatcher, and
 *   then re-hydrates the webview (interim full-refresh strategy).
 * - Pushes an initial {@link WebviewDispatcher.hydrateAll} so the webview renders
 *   from host state immediately on wire-up (Req 1.5).
 *
 * ## Additive Discovery -> Spec flow host side (Req 12, 13)
 *
 * This helper ALSO constructs the flow host side additively: a
 * {@link FlowController} (with {@link createFlowPorts}) paired with a
 * {@link FlowDispatcher} via the same forward-reference closure pattern the
 * Build_Surface dispatcher uses. The inbound listener routes each payload by
 * discriminator — Build intents ({@link parseWebviewToHost}) are handled exactly
 * as before, while flow intents ({@link parseWebviewToHostFlow}) are applied via
 * {@link FlowDispatcher.handle} (the controller's `onChange` re-hydrates the
 * flow automatically). An initial {@link FlowDispatcher.hydrateFlow} pushes the
 * first flow snapshot so the webview's flow store can decide the surface.
 *
 * This is purely additive: no Build (`HostToWebview`) message or
 * {@link PanelController} state changes — only extra `hydrateFlow`/`flowNotice`
 * messages are posted — so existing Builder/Helper behavior is unchanged.
 *
 * @returns the wired {@link PanelController} and {@link WebviewDispatcher} plus
 *   the inbound-message {@link vscode.Disposable}, and the additive
 *   {@link FlowController} / {@link FlowDispatcher} pair.
 */
export function wireWebviewMessaging(
  webview: MessagingWebview,
  options: { connectionFile?: string; managedHost?: Promise<FrontendHost> } = {},
): {
  controller: PanelController;
  dispatcher: WebviewDispatcher;
  messageSubscription: vscode.Disposable;
  flowController: FlowController;
  flowDispatcher: FlowDispatcher;
} {
  // The dispatcher and controller reference each other: the controller's
  // onNotice must forward to the dispatcher, but the dispatcher needs the
  // controller. Resolve the cycle with a forward reference captured in a
  // closure, exactly as the dispatcher's docs prescribe.
  let dispatcher: WebviewDispatcher;
  const controller = new PanelController(createAgentAdapter(), {
    clock: new SystemClock(),
    onNotice: (notice) => dispatcher.forwardNotice(notice),
    // Asynchronous controller mutations (e.g. DemoAdapter's timer-driven stream
    // chunks) invoke this so the webview re-hydrates immediately, without
    // waiting for a tab switch or another inbound intent. `dispatcher` is
    // assigned right below via the documented forward-reference closure; it is
    // defined before any async stream event can fire, so referencing it lazily
    // inside this arrow is safe.
    onChange: () => dispatcher.hydrateAll(),
  });
  dispatcher = new WebviewDispatcher(controller, (message) => {
    webview.postMessage(message);
  });

  // Additive flow host side (Req 12, 13). Same forward-reference closure the
  // FlowDispatcher docs prescribe: the controller's onNotice/onChange are set at
  // construction, so they forward to `flowDispatcher` (assigned right below).
  // `onChange` triggers a full flow re-hydrate, so async/non-intent-driven
  // mutations (e.g. a timer-driven mock round settling) push a fresh snapshot.
  let flowDispatcher: FlowDispatcher;
  const flowController = new FlowController(options.managedHost ? unavailableFlowPorts() : createFlowPorts(), {
    ...(options.managedHost ? { timeoutMs: 15 * 60_000,
      ids: { correlationId: () => "corr_" + randomUUID(), idempotencyKey: () => "idem_" + randomUUID(), id: (prefix: string) => prefix + "_" + randomUUID() } } : {}),
    clock: new SystemClock(),
    onNotice: (n) => flowDispatcher.forwardNotice(n),
    onChange: () => flowDispatcher.hydrateFlow(),
  });
  flowDispatcher = new FlowDispatcher(flowController, (message) => {
    webview.postMessage(message);
  });

  let disposed = false;
  let unsubscribeStatus: (() => void) | undefined;
  let unsubscribeRotation: (() => void) | undefined;
  const experimental = options.managedHost ? false : isNativeFlowSupported().experimental;
  const refreshPorts = async () => {
    const result = options.managedHost ? await createManagedFlowPorts(options.managedHost)
      : await createFlowPortsAsync({ connectionFile: options.connectionFile });
    if (disposed) return;
    flowController.applyPortResult(result, experimental);
    await flowController.loadHistory();
  };
  if (options.managedHost) {
    flowController.setFlowSupport({ mode: "unavailable", experimental: false, reason: "CORE_PREPARING" });
    void options.managedHost.then(host => {
      if (disposed) return;
      unsubscribeStatus = host.subscribeStatus(status => {
        if (disposed) return;
        flowController.setFlowSupport({ mode: status.phase === "CORE_CONNECTED" && status.native === "WORKER_READY" ? "live" : "unavailable",
          experimental: false, reason: status.nativeErrorCode ?? status.errorCode ?? status.phase });
      });
      unsubscribeRotation = host.onDidRotate(() => {
        // Restore durable History only. Never restart a command after rotation.
        if (!disposed) void flowController.loadHistory();
      });
    }).catch(() => {});
  }
  void refreshPorts();

  const inboundSubscription = webview.onDidReceiveMessage((raw) => {
    // Route by discriminator. Build_Surface intents are handled exactly as
    // before; anything else is tried against the additive flow union.
    const intent = parseWebviewToHost(raw);
    if (intent !== null) {
      if (options.managedHost && intent.type === "submit") {
        webview.postMessage({ type: "notice", tab: intent.tab, kind: "error", message: "Builder/Helper 화면 연결은 다음 단계입니다. 현재 Discovery·Spec·History는 실제 Core를 사용합니다." });
        return;
      }
      // `handle` is async (submit awaits the adapter); chain the interim
      // full-refresh so the conversation reflects any state the intent mutated.
      void dispatcher.handle(intent).then(() => {
        dispatcher.hydrateAll();
      });
      return;
    }
    const flowIntent = parseWebviewToHostFlow(raw);
    if (flowIntent !== null) {
      // FlowDispatcher.handle applies the intent to the FlowController, whose
      // onChange (wired above) triggers flowDispatcher.hydrateFlow(), so the
      // webview re-hydrates automatically — no manual re-hydrate needed here.
      void flowDispatcher.handle(flowIntent);
      return;
    }
    // Untrusted/malformed payload from the webview: drop it defensively.
  });

  const messageSubscription = { dispose() { disposed = true; inboundSubscription.dispose(); unsubscribeStatus?.(); unsubscribeRotation?.(); } };
  // Render immediately from host state (first paint / re-wire after disposal).
  dispatcher.hydrateAll();
  // Push the initial flow snapshot so the webview's flow store hydrates and
  // `selectShellSurface` can decide the top-level surface (Req 12, 13).
  flowDispatcher.hydrateFlow();

  return { controller, dispatcher, messageSubscription, flowController, flowDispatcher };
}

/**
 * Generates a random nonce for the Content-Security-Policy `script-src`, so the
 * only script permitted to run is the injected bundle tag carrying this nonce.
 */
function makeNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

/**
 * Builds the HTML shell for the panel webview. Loads the compiled webview
 * bundle (`dist/webview/main.js`) as a module script guarded by a nonce-based
 * CSP, and provides the `<div id="app">` root that `main.ts` mounts into.
 *
 * @param scriptUri the `asWebviewUri`-resolved location of the compiled bundle.
 * @param cspSource the webview's `cspSource` (origin allowed for resources).
 * @param nonce the per-load nonce shared by the CSP and the script tag.
 */
export function buildWebviewHtml(
  scriptUri: string,
  cspSource: string,
  nonce: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Builder &amp; Helper Agent Panel</title>
  <style>
    :root {
      /* 8px-based spacing scale */
      --sp-1: 4px;
      --sp-2: 8px;
      --sp-3: 12px;
      --sp-4: 16px;
      --sp-5: 24px;
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 10px;
      --radius-pill: 999px;
      /* Per-agent accents; defaults fall back to a builder-blue. Overridden
         by the [data-agent] scopes below so the whole panel re-themes on tab
         switch. */
      --accent: var(--vscode-charts-blue, #4f8cff);
      --accent-contrast: #ffffff;
      --transition: 140ms ease;
    }

    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }

    #app {
      height: 100vh;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    /* ---------------------------------------------------------------------
       Top-level surface wrappers. main.ts renders the Build_Surface into
       '.build-shell' and the Discovery -> Spec flow into '.flow-shell', both
       siblings under #app, and toggles their 'hidden' attribute to switch
       surfaces. They must fill the flex column and MUST fully collapse when
       hidden so the inactive surface can never overlap the active one.
       --------------------------------------------------------------------- */
    .build-shell,
    .flow-shell {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    .build-shell[hidden],
    .flow-shell[hidden] {
      display: none;
    }

    /* ---------------------------------------------------------------------
       Root panel: full-height flex column. The active accent is scoped by the
       root's data-agent (set by render.ts) so switching tabs re-themes.
       --------------------------------------------------------------------- */
    .agent-panel {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      gap: var(--sp-2);
      padding: var(--sp-3);
      box-sizing: border-box;
    }

    /* Per-agent accent identity */
    [data-agent="builder"] {
      --accent: var(--vscode-charts-blue, #4f8cff);
      --accent-soft: color-mix(in srgb, var(--vscode-charts-blue, #4f8cff) 18%, transparent);
      --accent-contrast: #ffffff;
    }
    [data-agent="helper"] {
      --accent: var(--vscode-charts-purple, #a78bfa);
      --accent-soft: color-mix(in srgb, var(--vscode-charts-purple, #a78bfa) 18%, transparent);
      --accent-contrast: #ffffff;
    }

    /* ---------------------------------------------------------------------
       Tab bar — modern segmented tabs
       --------------------------------------------------------------------- */
    .tab-bar {
      display: flex;
      gap: var(--sp-1);
      padding: var(--sp-1);
      background: color-mix(in srgb, var(--vscode-foreground) 6%, transparent);
      border: 1px solid var(--vscode-panel-border, transparent);
      border-radius: var(--radius-lg);
      flex: 0 0 auto;
    }

    .tab-button {
      flex: 1 1 0;
      appearance: none;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--vscode-descriptionForeground, var(--vscode-foreground));
      font-family: inherit;
      font-size: inherit;
      font-weight: 500;
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--radius-md);
      position: relative;
      transition: background var(--transition), color var(--transition);
    }

    .tab-button:hover {
      background: var(--vscode-list-hoverBackground, color-mix(in srgb, var(--vscode-foreground) 8%, transparent));
      color: var(--vscode-foreground);
    }

    .tab-button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: -1px;
    }

    /* Give each inactive tab a subtle hint of its own accent on hover. */
    .tab-button[data-tab="builder"] { --tab-accent: var(--vscode-charts-blue, #4f8cff); }
    .tab-button[data-tab="helper"]  { --tab-accent: var(--vscode-charts-purple, #a78bfa); }

    .tab-button.active {
      color: var(--vscode-foreground);
      font-weight: 700;
      background: color-mix(in srgb, var(--tab-accent, var(--accent)) 16%, transparent);
      box-shadow: inset 0 -2px 0 0 var(--tab-accent, var(--accent));
    }

    /* Active-agent label as a small subtitle/badge under the tabs. */
    .active-agent-label {
      flex: 0 0 auto;
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      padding: 0 var(--sp-1);
      letter-spacing: 0.02em;
    }

    /* ---------------------------------------------------------------------
       Tab panels — only the active one shown; fills remaining height.
       --------------------------------------------------------------------- */
    .tab-panel {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      gap: var(--sp-2);
    }
    .tab-panel[hidden] { display: none; }

    /* ---------------------------------------------------------------------
       Conversation — scrollable chat area with slim custom scrollbar.
       --------------------------------------------------------------------- */
    .conversation {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      padding: var(--sp-2) var(--sp-1);
    }
    .conversation::-webkit-scrollbar { width: 10px; }
    .conversation::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background, rgba(120,120,120,0.4));
      border-radius: var(--radius-pill);
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    .conversation::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground, rgba(120,120,120,0.6));
      background-clip: padding-box;
      border: 2px solid transparent;
    }

    /* ---------------------------------------------------------------------
       Chat bubbles
       --------------------------------------------------------------------- */
    .entry {
      display: flex;
      flex-direction: column;
      max-width: 88%;
      gap: var(--sp-1);
    }

    .entry-user {
      align-self: flex-end;
      align-items: flex-end;
    }
    .entry-agent {
      align-self: flex-start;
      align-items: flex-start;
    }

    .entry-body {
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--radius-lg);
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .entry-user .entry-body {
      background: color-mix(in srgb, var(--accent) 22%, var(--vscode-editor-background));
      color: var(--vscode-foreground);
      border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
      border-bottom-right-radius: var(--radius-sm);
    }

    .entry-agent .entry-body {
      background: color-mix(in srgb, var(--vscode-foreground) 6%, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      border-bottom-left-radius: var(--radius-sm);
    }

    /* Additive identity header inside agent bubbles. */
    .entry-role {
      display: flex;
      align-items: center;
      gap: var(--sp-1);
      font-size: 0.8em;
      font-weight: 600;
      color: var(--accent);
      padding-left: var(--sp-1);
    }
    .entry-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: var(--radius-pill);
      background: color-mix(in srgb, var(--accent) 20%, transparent);
      font-size: 0.85em;
    }
    .entry-role-name { letter-spacing: 0.02em; }

    /* Failed response marker as a small error chip/row. */
    .entry-failed {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-1);
      align-self: flex-start;
      font-size: 0.85em;
      color: var(--vscode-errorForeground, #f14c4c);
      background: color-mix(in srgb, var(--vscode-errorForeground, #f14c4c) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--vscode-errorForeground, #f14c4c) 40%, transparent);
      padding: var(--sp-1) var(--sp-2);
      border-radius: var(--radius-pill);
    }

    /* ---------------------------------------------------------------------
       In-progress indicator — pulsing shimmer text.
       --------------------------------------------------------------------- */
    .in-progress {
      flex: 0 0 auto;
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      padding: var(--sp-1) var(--sp-2);
      animation: bhap-pulse 1.4s ease-in-out infinite;
    }
    .in-progress[hidden] { display: none; }
    @keyframes bhap-pulse {
      0%, 100% { opacity: 0.45; }
      50% { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .in-progress { animation: none; opacity: 0.75; }
    }

    /* ---------------------------------------------------------------------
       Composer — input row.
       --------------------------------------------------------------------- */
    .composer {
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-areas:
        "input  send"
        "notice notice";
      gap: var(--sp-2);
      align-items: end;
    }

    .message-input {
      grid-area: input;
      resize: none;
      box-sizing: border-box;
      width: 100%;
      font-family: inherit;
      font-size: inherit;
      line-height: 1.4;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 20%, transparent));
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-3);
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .message-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent);
    }
    .message-input:read-only {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .send-button {
      grid-area: send;
      align-self: end;
      appearance: none;
      /* Not "ready to send" by default: dim/inactive look. The lit state is
         opted into via the additive .can-send class (see below). */
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      line-height: 1;
      font-family: inherit;
      font-size: 16px;
      font-weight: 700;
      /* Muted foreground + muted surface so the arrow reads as "not ready". */
      color: var(--vscode-descriptionForeground, var(--vscode-foreground));
      background: color-mix(in srgb, var(--vscode-foreground) 12%, var(--vscode-editor-background));
      border: 1px solid transparent;
      border-radius: 50%;
      transition: background var(--transition), opacity var(--transition), filter var(--transition), box-shadow var(--transition), transform var(--transition), color var(--transition);
    }
    /* "Ready to send": accent-colored, emphasized, interactive. */
    .send-button.can-send {
      cursor: pointer;
      color: var(--vscode-button-foreground, var(--accent-contrast));
      background: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent);
      transform: scale(1.04);
    }
    .send-button:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    .send-button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 2px;
    }
    /* Locked state takes precedence and clearly dims. Because canSend is false
       while locked, .can-send is never present here, so the button is not lit. */
    .send-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .send-button, .send-button.can-send { transform: none; }
    }

    /* Length / notice caption. */
    .length-indicator {
      grid-area: notice;
      font-size: 0.8em;
      color: var(--vscode-descriptionForeground);
      padding: 0 var(--sp-1);
    }
    .length-indicator[hidden] { display: none; }
    .length-indicator.notice-length_limit {
      color: var(--vscode-descriptionForeground);
    }
    .length-indicator.notice-error,
    .length-indicator.notice-unavailable {
      color: var(--vscode-errorForeground, #f14c4c);
    }

    /* ---------------------------------------------------------------------
       Work stream (Builder) — compact cards.
       --------------------------------------------------------------------- */
    .work-stream {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      margin-top: var(--sp-1);
      width: 100%;
    }

    .work-item {
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      border-left: 3px solid var(--accent);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--vscode-foreground) 4%, var(--vscode-editor-background));
      padding: var(--sp-2);
    }
    .work-item-failed {
      border-left-color: var(--vscode-errorForeground, #f14c4c);
    }

    .work-item-header {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex-wrap: wrap;
    }

    .work-item-type {
      font-size: 0.7em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 16%, transparent);
      border-radius: var(--radius-pill);
      padding: 2px var(--sp-2);
    }

    .work-item-title {
      font-weight: 700;
      flex: 1 1 auto;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .work-item-failed-badge {
      font-size: 0.7em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--vscode-errorForeground, #f14c4c);
      background: color-mix(in srgb, var(--vscode-errorForeground, #f14c4c) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--vscode-errorForeground, #f14c4c) 40%, transparent);
      border-radius: var(--radius-pill);
      padding: 1px var(--sp-2);
    }

    .work-item-toggle {
      appearance: none;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--accent);
      font-family: inherit;
      font-size: 0.85em;
      font-weight: 600;
      padding: var(--sp-1) var(--sp-2);
      border-radius: var(--radius-sm);
      transition: background var(--transition);
    }
    .work-item-toggle:hover {
      background: var(--vscode-list-hoverBackground, color-mix(in srgb, var(--vscode-foreground) 8%, transparent));
    }
    .work-item-toggle:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 1px;
    }

    .work-item-detail {
      margin-top: var(--sp-2);
      font-family: var(--vscode-editor-font-family, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
      font-size: 0.85em;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: var(--vscode-foreground);
      background: var(--vscode-textCodeBlock-background, color-mix(in srgb, var(--vscode-foreground) 8%, var(--vscode-editor-background)));
      border-radius: var(--radius-sm);
      padding: var(--sp-2);
    }
    .work-item-detail[hidden] { display: none; }

    /* =====================================================================
       Discovery -> Spec flow (task 14.1)
       Class hooks emitted by src/webview/flow/flow-render.ts. Reuses the
       existing design tokens (--sp-*, --radius-*, --accent, --accent-soft,
       --transition), the VS Code theme vars, and the bhap-pulse animation.
       Chat-like, card-based, rounded, theme-adaptive.
       ===================================================================== */

    /* ---- Shared flow scaffolding ---- */
    .flow-start,
    .flow-workspace,
    .flow-spec {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      gap: var(--sp-3);
      /* A touch more horizontal breathing room so flow content doesn't hug the
         panel's left/right edges (vertical padding unchanged). */
      padding: var(--sp-2) var(--sp-3);
      overflow-y: auto;
    }
    .flow-start[hidden],
    .flow-workspace[hidden],
    .flow-spec[hidden] { display: none; }

    .flow-start-heading,
    .flow-workspace-heading,
    .flow-spec-heading {
      margin: 0;
      font-size: 1.2em;
      font-weight: 700;
      color: var(--vscode-foreground);
      letter-spacing: 0.01em;
    }

    .flow-start-intro {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }

    /* Native-support banner (guide §10-1) — a small, non-intrusive caption
       showing the mode/experimental verdict (never a path/token). Reuses the
       muted description color + small font tokens. */
    .flow-support-banner {
      flex: 0 0 auto;
      font-size: 0.8em;
      color: var(--vscode-descriptionForeground);
      letter-spacing: 0.02em;
      padding: var(--sp-1) 0;
    }
    .flow-support-banner[hidden] { display: none; }

    /* ---- Read-only Project History (guide §6/§10-2) ---- */
    .flow-history {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--vscode-foreground) 3%, var(--vscode-editor-background));
      padding: var(--sp-3);
    }
    .flow-history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
    }
    .flow-history-title {
      margin: 0;
      font-size: 0.95em;
      font-weight: 700;
      color: var(--vscode-foreground);
    }
    .flow-history-refresh {
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.8em;
      font-weight: 600;
      color: var(--accent);
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
      border-radius: var(--radius-pill);
      padding: var(--sp-1) var(--sp-3);
      transition: background var(--transition), border-color var(--transition);
    }
    .flow-history-refresh:hover {
      background: var(--accent-soft, color-mix(in srgb, var(--accent) 16%, transparent));
    }
    .flow-history-refresh:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 1px;
    }
    .flow-history-loading {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      animation: bhap-pulse 1.4s ease-in-out infinite;
    }
    .flow-history-loading[hidden] { display: none; }
    @media (prefers-reduced-motion: reduce) {
      .flow-history-loading { animation: none; opacity: 0.75; }
    }
    .flow-history-empty {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
    }
    .flow-history-empty[hidden] { display: none; }
    .flow-history-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
    }
    .flow-history-row {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--vscode-foreground) 4%, var(--vscode-editor-background));
      padding: var(--sp-2) var(--sp-3);
    }
    .flow-history-row-title {
      font-weight: 700;
      color: var(--vscode-foreground);
      overflow-wrap: anywhere;
    }
    .flow-history-row-goal {
      margin: 0;
      font-size: 0.88em;
      line-height: 1.45;
      color: var(--vscode-descriptionForeground);
      overflow-wrap: anywhere;
    }
    .flow-history-row-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-1);
    }
    .flow-history-row-status {
      display: inline-flex;
      align-items: center;
      font-size: 0.72em;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--accent);
      background: var(--accent-soft, color-mix(in srgb, var(--accent) 16%, transparent));
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      border-radius: var(--radius-pill);
      padding: 1px var(--sp-2);
    }
    .flow-history-open {
      align-self: flex-start;
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.82em;
      font-weight: 600;
      color: var(--vscode-foreground);
      background: transparent;
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 24%, transparent));
      border-radius: var(--radius-pill);
      padding: var(--sp-1) var(--sp-3);
      transition: background var(--transition), border-color var(--transition);
    }
    .flow-history-open:hover {
      border-color: color-mix(in srgb, var(--accent) 40%, transparent);
      background: var(--vscode-list-hoverBackground, color-mix(in srgb, var(--vscode-foreground) 8%, transparent));
    }
    .flow-history-open:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 1px;
    }

    /* Agent_Run_Banner — subtle pulsing status banner reusing bhap-pulse. */
    .flow-agent-banner {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      font-size: 0.9em;
      color: var(--accent);
      background: var(--accent-soft, color-mix(in srgb, var(--accent) 16%, transparent));
      border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-3);
      animation: bhap-pulse 1.4s ease-in-out infinite;
    }
    .flow-agent-banner[hidden] { display: none; }
    @media (prefers-reduced-motion: reduce) {
      .flow-agent-banner { animation: none; opacity: 0.85; }
    }

    /* ---- Discovery Start form ---- */
    .flow-field {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }
    .flow-field-label {
      font-size: 0.85em;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      letter-spacing: 0.02em;
    }

    .flow-goal-input,
    .flow-optional-input,
    .flow-level-select {
      box-sizing: border-box;
      width: 100%;
      font-family: inherit;
      font-size: inherit;
      line-height: 1.4;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 20%, transparent));
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-3);
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .flow-goal-input { resize: vertical; min-height: 60px; }
    .flow-goal-input:focus,
    .flow-optional-input:focus,
    .flow-level-select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent);
    }
    .flow-goal-input:disabled,
    .flow-optional-input:disabled,
    .flow-level-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .flow-length-indicator {
      font-size: 0.8em;
      color: var(--vscode-errorForeground, #f14c4c);
      padding: 0 var(--sp-1);
    }
    .flow-length-indicator[hidden] { display: none; }

    /* Accent-filled primary submit button. */
    .flow-start-submit {
      align-self: flex-start;
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
      font-weight: 700;
      color: var(--vscode-button-foreground, var(--accent-contrast));
      background: var(--accent);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-5);
      transition: filter var(--transition), opacity var(--transition), box-shadow var(--transition);
    }
    .flow-start-submit:hover:not(:disabled) { filter: brightness(1.08); }
    .flow-start-submit:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 2px;
    }
    .flow-start-submit:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    /* ---- Discovery Workspace ---- */
    .flow-rounds {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }
    .flow-round {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
    }
    .flow-round-header {
      font-size: 0.75em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      border-radius: var(--radius-pill);
      padding: 2px var(--sp-2);
      align-self: flex-start;
    }
    .flow-round-rationale {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }

    /* Candidate card — surface, border, radius, subtle hover lift. */
    .flow-candidate-card {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--vscode-foreground) 4%, var(--vscode-editor-background));
      padding: var(--sp-3);
      transition: border-color var(--transition), background var(--transition);
    }
    .flow-candidate-card:hover {
      border-color: color-mix(in srgb, var(--accent) 40%, transparent);
      background: var(--vscode-list-hoverBackground, color-mix(in srgb, var(--vscode-foreground) 7%, var(--vscode-editor-background)));
    }
    .flow-candidate-title {
      margin: 0;
      font-size: 1.02em;
      font-weight: 700;
      color: var(--vscode-foreground);
      overflow-wrap: anywhere;
    }
    .flow-candidate-summary {
      margin: 0;
      line-height: 1.5;
      color: var(--vscode-foreground);
    }
    .flow-candidate-appeal,
    .flow-candidate-interaction {
      margin: 0;
      font-size: 0.9em;
      line-height: 1.45;
      color: var(--vscode-descriptionForeground);
    }

    .flow-candidate-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-1);
      margin-top: var(--sp-1);
    }
    /* Small pill chip using the accent-soft surface. */
    .flow-tag {
      display: inline-flex;
      align-items: center;
      font-size: 0.72em;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--accent);
      background: var(--accent-soft, color-mix(in srgb, var(--accent) 16%, transparent));
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      border-radius: var(--radius-pill);
      padding: 1px var(--sp-2);
    }

    .flow-candidate-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
      margin-top: var(--sp-2);
    }

    /* Neutral outlined basket toggle. */
    .flow-basket-toggle {
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85em;
      font-weight: 600;
      color: var(--vscode-foreground);
      background: transparent;
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 24%, transparent));
      border-radius: var(--radius-pill);
      padding: var(--sp-1) var(--sp-3);
      transition: background var(--transition), border-color var(--transition);
    }
    .flow-basket-toggle:hover:not(:disabled) {
      background: var(--vscode-list-hoverBackground, color-mix(in srgb, var(--vscode-foreground) 8%, transparent));
    }
    .flow-basket-toggle[aria-pressed="true"] {
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 50%, transparent);
      background: var(--accent-soft, color-mix(in srgb, var(--accent) 16%, transparent));
    }
    .flow-basket-toggle:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 1px;
    }

    /* Accent select-to-proceed button. */
    .flow-select-button {
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85em;
      font-weight: 700;
      color: var(--vscode-button-foreground, var(--accent-contrast));
      background: var(--accent);
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      padding: var(--sp-1) var(--sp-3);
      transition: filter var(--transition), opacity var(--transition);
    }
    .flow-select-button:hover:not(:disabled) { filter: brightness(1.08); }
    .flow-select-button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 2px;
    }

    /* Enriched nested block with a left accent border. */
    .flow-enriched {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      margin-top: var(--sp-2);
      padding: var(--sp-2) var(--sp-3);
      border-left: 3px solid var(--accent);
      border-radius: var(--radius-sm);
      background: var(--vscode-textCodeBlock-background, color-mix(in srgb, var(--vscode-foreground) 6%, var(--vscode-editor-background)));
    }
    .flow-enriched-label {
      font-size: 0.78em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--vscode-descriptionForeground);
    }
    .flow-enriched-scope {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }

    /* Refinement_Composer. */
    .flow-composer {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      margin-top: var(--sp-2);
      border-top: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      padding-top: var(--sp-3);
    }
    .flow-composer-input {
      box-sizing: border-box;
      width: 100%;
      resize: vertical;
      min-height: 56px;
      font-family: inherit;
      font-size: inherit;
      line-height: 1.4;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 20%, transparent));
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-3);
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .flow-composer-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent);
    }
    .flow-composer-input:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Composer guard/hint message — error/hint color. */
    .flow-composer-message {
      font-size: 0.82em;
      line-height: 1.4;
      color: var(--vscode-errorForeground, #f14c4c);
      padding: 0 var(--sp-1);
    }
    .flow-composer-message[hidden] { display: none; }

    .flow-composer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
    }
    .flow-composer-action {
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85em;
      font-weight: 600;
      color: var(--vscode-foreground);
      background: color-mix(in srgb, var(--vscode-foreground) 8%, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 20%, transparent));
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-3);
      transition: background var(--transition), border-color var(--transition), filter var(--transition);
    }
    .flow-composer-action:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--accent) 40%, transparent);
      background: var(--vscode-list-hoverBackground, color-mix(in srgb, var(--vscode-foreground) 12%, transparent));
    }
    .flow-composer-action:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 1px;
    }

    /* ---- Spec Review ---- */
    .flow-spec-content {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }

    /* Prominent, larger product-purpose one-liner. */
    .flow-spec-purpose {
      margin: 0;
      font-size: 1.15em;
      font-weight: 700;
      line-height: 1.45;
      color: var(--vscode-foreground);
      border-left: 3px solid var(--accent);
      padding-left: var(--sp-3);
    }

    .flow-spec-fact {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
      margin: 0;
      line-height: 1.5;
    }
    .flow-spec-fact-label {
      font-weight: 700;
      color: var(--vscode-descriptionForeground);
    }
    .flow-spec-fact-value { color: var(--vscode-foreground); }

    .flow-spec-chips-section,
    .flow-spec-list-section {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }
    .flow-spec-section-label {
      font-size: 0.85em;
      font-weight: 700;
      color: var(--vscode-descriptionForeground);
      letter-spacing: 0.02em;
    }
    .flow-spec-section-heading {
      margin: 0 0 var(--sp-1);
      font-size: 1em;
      font-weight: 700;
      color: var(--vscode-foreground);
    }

    .flow-spec-list {
      margin: 0;
      padding-left: var(--sp-5);
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }
    .flow-spec-list-item {
      line-height: 1.5;
      color: var(--vscode-foreground);
    }

    .flow-spec-scope,
    .flow-spec-decisions,
    .flow-spec-constraints {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
    }

    .flow-spec-scope-group {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
      border-left: 3px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 20%, transparent));
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--vscode-foreground) 4%, var(--vscode-editor-background));
      padding: var(--sp-2) var(--sp-3);
    }
    /* Distinct left-border accent colors per scope category (optional). */
    .flow-spec-scope-group[data-category="LEARNER_FOCUS"] {
      border-left-color: var(--vscode-charts-blue, #4f8cff);
    }
    .flow-spec-scope-group[data-category="AGENT_SUPPORT"] {
      border-left-color: var(--vscode-charts-purple, #a78bfa);
    }
    .flow-spec-scope-group[data-category="EXCLUDED"] {
      border-left-color: var(--vscode-descriptionForeground, #8a8a8a);
    }
    .flow-spec-scope-title {
      margin: 0;
      font-size: 0.92em;
      font-weight: 700;
      color: var(--vscode-foreground);
    }
    .flow-spec-scope-entry {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }
    .flow-spec-scope-entry-title {
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .flow-spec-scope-entry-rationale {
      margin: 0;
      font-size: 0.9em;
      line-height: 1.45;
      color: var(--vscode-descriptionForeground);
    }

    /* Expected-decision card. */
    .flow-decision {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--vscode-foreground) 4%, var(--vscode-editor-background));
      padding: var(--sp-3);
    }
    .flow-decision-category {
      align-self: flex-start;
      font-size: 0.7em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 16%, transparent);
      border-radius: var(--radius-pill);
      padding: 2px var(--sp-2);
    }
    .flow-decision-description {
      margin: 0;
      line-height: 1.5;
      color: var(--vscode-foreground);
    }
    .flow-decision-why {
      margin: 0;
      font-size: 0.9em;
      line-height: 1.45;
      color: var(--vscode-descriptionForeground);
    }

    /* Spec refine + confirm composer. */
    .flow-spec-composer {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      margin-top: var(--sp-2);
      border-top: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 14%, transparent));
      padding-top: var(--sp-3);
    }
    .flow-spec-refine-input {
      box-sizing: border-box;
      width: 100%;
      resize: vertical;
      min-height: 56px;
      font-family: inherit;
      font-size: inherit;
      line-height: 1.4;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 20%, transparent));
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-3);
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .flow-spec-refine-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent);
    }
    .flow-spec-refine-input:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Neutral outlined refine button. */
    .flow-spec-refine-button {
      align-self: flex-start;
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
      font-weight: 600;
      color: var(--vscode-foreground);
      background: color-mix(in srgb, var(--vscode-foreground) 8%, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, color-mix(in srgb, var(--vscode-foreground) 20%, transparent));
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-4);
      transition: background var(--transition), border-color var(--transition), filter var(--transition);
    }
    .flow-spec-refine-button:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--accent) 40%, transparent);
      background: var(--vscode-list-hoverBackground, color-mix(in srgb, var(--vscode-foreground) 12%, transparent));
    }
    .flow-spec-refine-button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 2px;
    }

    /* Prominent accent confirm ("이걸로 시작") button. */
    .flow-spec-confirm {
      align-self: flex-start;
      appearance: none;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
      font-weight: 700;
      color: var(--vscode-button-foreground, var(--accent-contrast));
      background: var(--accent);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      padding: var(--sp-2) var(--sp-5);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
      transition: filter var(--transition), opacity var(--transition), box-shadow var(--transition);
    }
    .flow-spec-confirm:hover:not(:disabled) { filter: brightness(1.08); }
    .flow-spec-confirm:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 2px;
    }

    .flow-spec-loading {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      animation: bhap-pulse 1.4s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .flow-spec-loading { animation: none; opacity: 0.75; }
    }

    /* Consistent disabled treatment for all flow buttons (mirrors
       .send-button:disabled): dim + not-allowed cursor. */
    .flow-start-submit:disabled,
    .flow-basket-toggle:disabled,
    .flow-select-button:disabled,
    .flow-composer-action:disabled,
    .flow-spec-refine-button:disabled,
    .flow-spec-confirm:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
      filter: none;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * VS Code webview view provider that hosts the Agent_Panel. Registered in
 * {@link activate} against {@link AGENT_PANEL_VIEW_ID}.
 */
export class AgentPanelViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri, private readonly managedHost?: Promise<FrontendHost>) {}

  /**
   * Called by VS Code when the view is first shown (and again after disposal).
   * Configures the webview, injects the HTML shell, wires messaging to a fresh
   * controller/dispatcher pair, and re-hydrates on (re-)reveal (Req 1.5).
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    const distRoot = vscode.Uri.joinPath(this.extensionUri, "dist");
    const mediaRoot = vscode.Uri.joinPath(this.extensionUri, "media");

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [distRoot, mediaRoot],
    };

    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "main.js"),
    );
    const nonce = makeNonce();
    webviewView.webview.html = buildWebviewHtml(
      scriptUri.toString(),
      webviewView.webview.cspSource,
      nonce,
    );

    // Read the HOST-ONLY connection descriptor path from the machine setting
    // (guide §4: an absolute file path only, never a token). It is passed into
    // the wiring so the async gated factory can attempt a live connection on
    // supported builds; it is NEVER forwarded to the webview (guide §9).
    const connectionFile = vscode.workspace
      .getConfiguration("vibeHelper")
      .get<string>("connectionFile");

    // Wire the message channel to a fresh controller/dispatcher for this view
    // instance. The initial hydrateAll() inside the helper performs first paint.
    const { dispatcher, flowDispatcher, messageSubscription } = wireWebviewMessaging(
      webviewView.webview,
      { connectionFile: this.managedHost ? undefined : connectionFile || undefined, managedHost: this.managedHost },
    );
    webviewView.onDidDispose(() => messageSubscription.dispose());

    // On re-reveal after being hidden/disposed, push a fresh full hydrate so the
    // projection is restored from authoritative host state (Req 1.5), and a
    // fresh flow hydrate so the flow shell re-hydrates too (Req 13.2).
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        dispatcher.hydrateAll();
        flowDispatcher.hydrateFlow();
      }
    });
  }
}
