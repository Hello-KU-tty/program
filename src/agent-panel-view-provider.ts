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

import { PanelController } from "./core/panel-controller";
import { SystemClock } from "./core/clock";
import { WebviewDispatcher } from "./webview/dispatcher";
import { parseWebviewToHost, type HostToWebview } from "./webview/messages";
import { createAgentAdapter } from "./adapter/adapter-factory";

/** The webview view id contributed in package.json (`contributes.views`). */
export const AGENT_PANEL_VIEW_ID = "builderHelperAgentPanel.view";

/**
 * Minimal transport surface the wiring depends on. Declaring it lets the pure
 * wiring helper ({@link wireWebviewMessaging}) be unit-tested with a fake
 * webview, independent of the VS Code runtime.
 */
export interface MessagingWebview {
  postMessage(message: HostToWebview): unknown;
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
 * @returns the wired {@link PanelController} and {@link WebviewDispatcher} plus
 *   the inbound-message {@link vscode.Disposable}.
 */
export function wireWebviewMessaging(webview: MessagingWebview): {
  controller: PanelController;
  dispatcher: WebviewDispatcher;
  messageSubscription: vscode.Disposable;
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

  const messageSubscription = webview.onDidReceiveMessage((raw) => {
    const intent = parseWebviewToHost(raw);
    if (intent === null) {
      // Untrusted/malformed payload from the webview: drop it defensively.
      return;
    }
    // `handle` is async (submit awaits the adapter); chain the interim
    // full-refresh so the conversation reflects any state the intent mutated.
    void dispatcher.handle(intent).then(() => {
      dispatcher.hydrateAll();
    });
  });

  // Render immediately from host state (first paint / re-wire after disposal).
  dispatcher.hydrateAll();

  return { controller, dispatcher, messageSubscription };
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
      cursor: pointer;
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
      color: var(--vscode-button-foreground, var(--accent-contrast));
      background: var(--accent);
      border: 1px solid transparent;
      border-radius: 50%;
      transition: background var(--transition), opacity var(--transition), filter var(--transition);
    }
    .send-button:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    .send-button:focus-visible {
      outline: 2px solid var(--vscode-focusBorder, var(--accent));
      outline-offset: 2px;
    }
    .send-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
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
  constructor(private readonly extensionUri: vscode.Uri) {}

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

    // Wire the message channel to a fresh controller/dispatcher for this view
    // instance. The initial hydrateAll() inside the helper performs first paint.
    const { dispatcher, messageSubscription } = wireWebviewMessaging(
      webviewView.webview,
    );
    webviewView.onDidDispose(() => messageSubscription.dispose());

    // On re-reveal after being hidden/disposed, push a fresh full hydrate so the
    // projection is restored from authoritative host state (Req 1.5).
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        dispatcher.hydrateAll();
      }
    });
  }
}
