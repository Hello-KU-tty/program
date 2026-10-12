// Extension entry point.
//
// Activation registers the AgentPanelViewProvider as a webview view provider
// for the right-side Agent_Panel view contributed in package.json. The provider
// owns the per-view wiring of the webview to the pure PanelController core
// (see agent-panel-view-provider.ts). Registration is cheap so activation stays
// well within the 3s budget (Req 1.1); the controller/adapter are constructed
// lazily when the view is first resolved.

import * as vscode from "vscode";
import { join } from "node:path";
import type { FrontendHost } from "../vendor/frontend-host";
let managedHost: Promise<FrontendHost> | undefined;

import {
  AgentPanelViewProvider,
  AGENT_PANEL_VIEW_ID,
} from "./agent-panel-view-provider";

/**
 * Called by the Kiro/VS Code host when the extension activates. Registers the
 * webview view provider for the Agent_Panel and tracks the disposable so it is
 * cleaned up on deactivation (Req 1.1).
 */
export function activate(context: vscode.ExtensionContext): { backend: Promise<FrontendHost> } {
  // Dynamic absolute require keeps the native host outside the frontend bundle.
  managedHost = (async () => {
    const api: typeof import("../vendor/frontend-host") = require(join(context.extensionPath, "portable/bin/frontend-host.cjs"));
    return api.createFrontendHost(context);
  })();
  void managedHost.catch(() => {});
  const provider = new AgentPanelViewProvider(
    context.extensionUri,
    managedHost,
    // Thread the extension's persistent Memento so the live agent controller can
    // persist/read `bhlr.lastProjectId` for §3.1 window-switch recovery.
    context.globalState,
  );
  context.subscriptions.push(vscode.commands.registerCommand("vibeHelper.retryCore", async () => {
    try { await (await managedHost!).retry(); await vscode.commands.executeCommand("workbench.action.reloadWindow"); }
    catch { void vscode.window.showErrorMessage("Core 연결을 복구하지 못했습니다. 지원 버전과 Workspace Trust를 확인하세요."); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("vibeHelper.stopDiscovery", async () => {
    const host = await managedHost!;
    const history = await host.client.listProjects();
    for (const item of history.projects) for (const run of await host.client.listRuns(item.project.id))
      if (run.kind === "DISCOVERY" && ["ACCEPTED", "RUNNING"].includes(run.status)) await host.client.cancelRun(run.id);
  }));
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AGENT_PANEL_VIEW_ID, provider),
  );

  // Reveal the panel where it is: its own container on the activity bar (K17).
  // Earlier versions tried to move it to the secondary side bar; in Kiro the
  // only move command that existed moved the whole bottom panel (Terminal,
  // Output) into the side bar where Kiro chat lives, so long commands replaced
  // the chat. Never awaited: activation stays fast and never fails on this.
  void revealAgentPanel().catch(() => {});
  void offerLayoutRepair(context).catch(() => {});
  return { backend: managedHost };
}

/**
 * Best-effort: focus the Agent_Panel view in its own activity-bar container.
 * Never moves views; a missing command is skipped and the routine never rejects.
 */
export async function revealAgentPanel(): Promise<void> {
  try {
    if (!vscode.commands?.executeCommand) return;
    await vscode.commands.executeCommand("builderHelperAgentPanel.view.focus");
  } catch (error) {
    console.debug("revealAgentPanel: focus skipped", error);
  }
}

const LAYOUT_REPAIR_KEY = "vibeHelper.layoutRepairOffered";

/**
 * Asked once after upgrading from a version that moved the bottom panel into
 * the side bar (every earlier Kiro-native build did on each start). A fresh
 * install has nothing to repair and is not asked. The learner decides: the
 * reset also undoes their own view moves.
 */
export async function offerLayoutRepair(
  context: Pick<vscode.ExtensionContext, "globalState">,
): Promise<void> {
  const state = context.globalState;
  if (state.get(LAYOUT_REPAIR_KEY) === true) return;
  const upgraded = state.keys().some((key) => key.startsWith("vibeHelper.") || key.startsWith("bhlr."));
  await state.update(LAYOUT_REPAIR_KEY, true);
  if (!upgraded) return;
  const repair = "원래 배치로 되돌리기";
  const choice = await vscode.window.showInformationMessage(
    "이전 Vibe Helper가 터미널과 출력 창을 Kiro 채팅 자리로 옮겨서, 긴 명령이 돌 때 채팅이 가려졌을 수 있어요. Kiro 화면 배치를 처음 상태로 되돌릴까요?",
    repair,
  );
  if (choice === repair) await vscode.commands.executeCommand("workbench.action.resetViewLocations");
}

/**
 * Called by the host when the extension is deactivated. Cleanup is handled by
 * the disposables pushed onto `context.subscriptions`, so this is a no-op.
 */
export async function deactivate(): Promise<void> {
  const host = await managedHost?.catch(() => undefined);
  await host?.dispose();
  managedHost = undefined;
}
