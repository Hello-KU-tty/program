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

  // Best-effort: move the Agent_Panel view to the secondary (right) side bar.
  //
  // VS Code/Kiro manifests cannot pin a custom view container to the secondary
  // side bar - only `activitybar` and `panel` are valid `viewsContainers`
  // contribution points, so the container is registered on the activity bar and
  // relocated here at runtime. This is intentionally NOT awaited: activation
  // must stay fast (Req 1.1) and must never fail because of this cosmetic move.
  // The routine catches all errors internally, but we also swallow here as a
  // final backstop so a rejected promise can never surface as an activation
  // error or an unhandled rejection.
  void revealAgentPanelOnRight().catch(() => {
    // no-op: relocation is best-effort and never affects activation success.
  });
}

/**
 * Best-effort attempt to reveal the Agent_Panel view and move it to the
 * secondary (right) side bar.
 *
 * IMPORTANT CAVEATS:
 * - The workbench commands used below are NOT guaranteed to exist across
 *   VS Code / Kiro versions. Each call is individually wrapped in try/catch and
 *   the whole function can never reject, so if a command is missing or rejects
 *   it is simply skipped.
 * - If none of the move commands are supported, this silently no-ops: the panel
 *   just remains on the activity bar and the user can drag it to the right
 *   manually. This must never affect the extension's core behavior or
 *   activation success.
 * - When `vscode.commands` is unavailable (e.g. a minimal host or a test mock),
 *   the routine no-ops immediately.
 */
async function revealAgentPanelOnRight(): Promise<void> {
  try {
    // Guard: if the host doesn't expose the commands API, there's nothing to do.
    if (!vscode.commands?.executeCommand) {
      return;
    }

    // 1. Focus/open the view first. VS Code auto-registers a `<viewId>.focus`
    //    command for contributed views.
    try {
      await vscode.commands.executeCommand("builderHelperAgentPanel.view.focus");
    } catch {
      // View focus command may not exist in this host - keep going.
    }

    // Small delay so the view is resolved before we try to move it. Kept short.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 2. Try, in order, to move the focused view to the secondary side bar.
    //    Stop at the first command that succeeds; each is wrapped so a missing
    //    or rejecting command is skipped.
    const moveCommands = [
      "workbench.action.moveFocusedViewToSecondarySideBar",
      "workbench.action.moveViewToSecondarySideBar",
      "workbench.action.movePanelToSecondarySideBar",
    ];
    for (const command of moveCommands) {
      try {
        await vscode.commands.executeCommand(command);
        break; // first success wins
      } catch {
        // Command unsupported/rejected in this host - try the next candidate.
      }
    }

    // Ensure the secondary side bar is visible. Prefer FOCUS (which reveals it)
    // over TOGGLE (which could hide it if it's already open). Never toggle
    // blindly.
    try {
      await vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
    } catch {
      // Auxiliary bar focus command may not exist - leave visibility as-is.
    }
  } catch (error) {
    // Final backstop: this routine must never reject. A single quiet debug log
    // only - no user-facing error.
    console.debug("revealAgentPanelOnRight: relocation skipped", error);
  }
}

/**
 * Called by the host when the extension is deactivated. Cleanup is handled by
 * the disposables pushed onto `context.subscriptions`, so this is a no-op.
 */
export function deactivate(): void {
  // no-op: disposables handle cleanup
}
