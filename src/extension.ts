// Extension entry point.
//
// Activation registers the AgentPanelViewProvider as a webview view provider
// for the right-side Agent_Panel view contributed in package.json. The provider
// owns the per-view wiring of the webview to the pure PanelController core
// (see agent-panel-view-provider.ts). Registration is cheap so activation stays
// well within the 3s budget (Req 1.1); the controller/adapter are constructed
// lazily when the view is first resolved.

import * as vscode from "vscode";

import {
  AgentPanelViewProvider,
  AGENT_PANEL_VIEW_ID,
} from "./agent-panel-view-provider";

/**
 * Called by the Kiro/VS Code host when the extension activates. Registers the
 * webview view provider for the Agent_Panel and tracks the disposable so it is
 * cleaned up on deactivation (Req 1.1).
 */
export function activate(context: vscode.ExtensionContext): void {
  const provider = new AgentPanelViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AGENT_PANEL_VIEW_ID, provider),
  );
}

/**
 * Called by the host when the extension is deactivated. Cleanup is handled by
 * the disposables pushed onto `context.subscriptions`, so this is a no-op.
 */
export function deactivate(): void {
  // no-op: disposables handle cleanup
}
