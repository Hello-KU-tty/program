/**
 * Host-side messaging dispatcher for the Builder / Helper agent surfaces
 * (design §B.16 / §B.17; Requirements 13.2, 13.3, 13.4).
 *
 * This is the agent-side analogue of the shipped {@link FlowDispatcher}: a thin
 * translation layer between the untrusted webview and the host-owned
 * {@link AgentSurfaceController}. It follows the EXACT same shape as
 * `FlowDispatcher` — a `post` callback, a full-refresh {@link hydrate}, an
 * inbound {@link handle}, and the forward-reference closure so
 * `controller.onChange -> hydrate()` re-hydrates after every state mutation.
 *
 * The dispatcher has two responsibilities:
 *
 * 1. **Outbound (controller -> webview):** rebuild the whole agent shell via
 *    {@link hydrate}, which posts a full `agent/hydrate` snapshot from
 *    `controller.getViewModel()`. Notices ride inside the hydrated `vm.notice`,
 *    so `handle` itself only posts the read-style responses (`agent/evidence`,
 *    `agent/finalUpgrade`); every state mutation drives a hydrate through the
 *    controller's `onChange` — exactly how `FlowDispatcher` lets `onChange`
 *    drive `hydrateFlow` (design §B.16).
 *
 * 2. **Inbound (webview -> controller):** validate every payload with
 *    {@link parseAgentAction} FIRST, dropping malformed / untrusted messages
 *    (Requirement 13.2), then map each {@link AgentAction} to the matching
 *    controller method (Requirement 13.3). The controller re-validates against
 *    the durable snapshot before calling Core (Requirement 13.4), so this stays
 *    a pure intent->call mapping.
 *
 * ## A note on wiring (self-registration is NOT done here)
 *
 * Like `FlowDispatcher`, this dispatcher does NOT register
 * `controller.onChange -> hydrate` in its constructor. The controller's
 * `onChange` option is set at *construction* time, so the wiring layer (task 8)
 * forwards to the dispatcher through a forward-reference closure (design §B.17):
 *
 * ```ts
 * let agentDispatcher: AgentDispatcher;
 * const agentController = new AgentSurfaceController({
 *   port, globalState, openFolder, openExternal,
 *   onChange: () => agentDispatcher.hydrate(),
 * });
 * agentDispatcher = new AgentDispatcher(agentController, (m) => webview.postMessage(m));
 * ```
 */

import type { AgentSurfaceController } from "../../core/agent/agent-controller";
import { type AgentHostMessage, parseAgentAction } from "./agent-messages";

/**
 * Translates the untrusted webview boundary into {@link AgentSurfaceController}
 * calls and posts {@link AgentHostMessage}s back to the webview. Constructed by
 * the provider wiring (task 8) with the live controller and a `post` sink.
 */
export class AgentDispatcher {
  constructor(
    private readonly controller: AgentSurfaceController,
    private readonly post: (message: AgentHostMessage) => void,
  ) {}

  // --------------------------------------------------------------------------
  // Outbound: controller -> webview
  // --------------------------------------------------------------------------

  /**
   * Post a full `agent/hydrate` snapshot built from the controller's
   * authoritative {@link AgentViewModel} (design §B.16). This is the canonical
   * "rebuild the agent shell from host state" path used on first render, on
   * re-reveal, and as the vehicle for every non-read mutation — the wiring layer
   * registers it as the controller's `onChange`. Notices ride inside
   * `vm.notice`, so no separate notice post is needed here.
   */
  hydrate(): void {
    this.post({ kind: "agent/hydrate", vm: this.controller.getViewModel() });
  }

  // --------------------------------------------------------------------------
  // Inbound: webview -> controller
  // --------------------------------------------------------------------------

  /**
   * Validate an inbound webview payload and route it to the controller.
   *
   * The webview is untrusted, so every message is parsed with
   * {@link parseAgentAction} first; a malformed / unexpected payload returns
   * `null` and is dropped silently without touching the controller
   * (Requirement 13.2). A valid {@link AgentAction} is mapped to its controller
   * method (Requirement 13.3); the controller re-validates against the durable
   * snapshot before invoking Core (Requirement 13.4).
   *
   * Most branches do not post here: the controller's `onChange` re-hydrates the
   * whole surface (with notices in `vm.notice`) after any state mutation. Only
   * the read-style responses post directly — `evidence/read` -> `agent/evidence`
   * and `finalUpgrade/list` -> `agent/finalUpgrade`.
   */
  async handle(raw: unknown): Promise<void> {
    const action = parseAgentAction(raw);
    if (action === null) {
      // Malformed / untrusted (Requirement 13.2): drop, do not act.
      return;
    }

    switch (action.kind) {
      case "builder/start": {
        await this.controller.startBuilder(action.message);
        return;
      }
      case "builder/stop": {
        await this.controller.cancelActive();
        return;
      }
      case "helper/start": {
        await this.controller.startHelper({
          message: action.message,
          origin: action.origin,
          decisionId: action.decisionId,
        });
        return;
      }
      case "decision/resolve": {
        await this.controller.resolveDecision({
          decisionId: action.decisionId,
          selection: action.selection,
          rationale: action.rationale,
          helperUsed: action.helperUsed,
        });
        return;
      }
      case "builder/resumeAfterDecision": {
        await this.controller.resumeAfterDecision();
        return;
      }
      case "native/answer": {
        // The webview cannot supply a trusted projectId; the controller binds
        // it host-side (§B.10) via submitNativeAnswerAction.
        await this.controller.submitNativeAnswerAction({
          requestId: action.requestId,
          nativeJobId: action.nativeJobId,
          answer: action.answer,
        });
        return;
      }
      case "workspace/open": {
        await this.controller.openGeneratedWorkspace(action.taskId);
        return;
      }
      case "result/launch": {
        await this.controller.launchResult();
        return;
      }
      case "evidence/read": {
        // Read-style response: post the projected view when present.
        const isCurrent = this.controller.captureBinding();
        const view = await this.controller.readEvidence(action.conceptId);
        if (view && isCurrent()) {
          this.post({ kind: "agent/evidence", view });
        }
        return;
      }
      case "evidence/retry": {
        const isCurrent = this.controller.captureBinding();
        const view = await this.controller.retryAnalysis(
          action.analysisJobId,
          action.expectedJobRevision,
        );
        if (view && isCurrent()) this.post({ kind: "agent/evidence", view });
        return;
      }
      case "finalUpgrade/list": {
        // Read-style response: post the eligible candidate list.
        const isCurrent = this.controller.captureBinding();
        const candidates = await this.controller.listFinalUpgradeCandidates();
        if (candidates !== null && isCurrent()) this.post({ kind: "agent/finalUpgrade", candidates });
        return;
      }
      case "finalUpgrade/prepare": {
        await this.controller.prepareFinalUpgrade({
          sourceTaskId: action.sourceTaskId,
          expectedSourceTaskRevision: action.expectedSourceTaskRevision,
          personalizationTraceId: action.personalizationTraceId,
          userGoal: action.userGoal,
        });
        return;
      }
      default: {
        // Exhaustiveness guard: a new AgentAction kind surfaces here at compile
        // time so the dispatcher stays in sync with the protocol.
        const _exhaustive: never = action;
        void _exhaustive;
        return;
      }
    }
  }
}
