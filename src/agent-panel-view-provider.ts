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
