/**
 * Host-side messaging dispatcher for the Discovery -> Spec flow.
 *
 * This is the flow-side analogue of {@link file://../dispatcher.ts}
 * (`WebviewDispatcher`). The design deliberately adds a dedicated
 * `FlowDispatcher` rather than overloading `WebviewDispatcher`: the existing
 * dispatcher is tightly bound to `PanelController`'s tab/turn API, while the
 * flow domain is an entirely different state machine (rounds, basket, spec).
 * A parallel dispatcher following the *exact same shape* (`post` callback,
 * `handle(intent)`, `hydrateFlow()` full-refresh, `onNotice` forward-reference
 * closure) keeps the two surfaces cohesive without tangling them. See
 * design.md "FlowDispatcher (webview messaging; Req 12.4)".
 *
 * The dispatcher has two responsibilities:
 *
 * 1. **Outbound (controller -> webview):** forward controller
 *    {@link FlowNotice}s as `flowNotice` messages and (re)build the flow shell
 *    via {@link FlowDispatcher.hydrateFlow}, which posts a full
 *    {@link HostToWebviewFlow.hydrateFlow} snapshot (Req 12.4, 13.4). This is
 *    the interim full-refresh strategy, exactly as the existing provider does
 *    with `hydrateAll()`.
 *
 * 2. **Inbound (webview -> controller):** apply validated
 *    {@link WebviewToHostFlow} intents to the {@link FlowController} via
 *    {@link FlowDispatcher.handle}. The controller re-validates feedback, so
 *    the dispatcher only performs the intent->call mapping.
 *
 * ## A note on wiring (self-registration is NOT done here)
 *
 * Like {@link file://../dispatcher.ts}, this dispatcher does NOT register
 * `controller.onChange -> hydrateFlow` or `controller.onNotice ->
 * forwardNotice` in its constructor. The controller's `onNotice`/`onChange`
 * options are set at *construction* time, so the wiring/view-provider layer
 * (task 13.4) forwards to the dispatcher through a forward-reference closure,
 * e.g.:
 *
 * ```ts
 * let dispatcher: FlowDispatcher;
 * const controller = new FlowController(ports, {
 *   onNotice: (n) => dispatcher.forwardNotice(n),
 *   onChange: () => dispatcher.hydrateFlow(),
 * });
 * dispatcher = new FlowDispatcher(controller, post);
 * ```
 */

import type { FlowController, FlowNotice } from "../../core/flow/flow-controller";
import type {
  CandidateRevisionReference,
  DiscoveryFeedbackInput,
} from "../../core/flow/flow-types";
import type {
  HostToWebviewFlow,
  RefinementAction,
  WebviewToHostFlow,
} from "./flow-messages";

/** Sink the dispatcher pushes {@link HostToWebviewFlow} messages into. */
export type PostFlowMessage = (message: HostToWebviewFlow) => void;

/**
 * Translates {@link FlowController} state into {@link HostToWebviewFlow}
 * messages and applies {@link WebviewToHostFlow} intents back to the
 * controller.
 */
export class FlowDispatcher {
  constructor(
    private readonly controller: FlowController,
    private readonly post: PostFlowMessage,
  ) {}

  // --------------------------------------------------------------------------
  // Outbound: controller -> webview
  // --------------------------------------------------------------------------

  /**
   * Notice sink to hand to the controller as its `onNotice` option so every
   * emitted notice is forwarded to the webview as a `flowNotice` message
   * (Req 12.4). Bound as an arrow property so it can be passed by reference.
   * Because the controller's `onNotice` option is set at construction time,
   * the wiring layer forwards to the dispatcher via a closure, e.g.
   * `(n) => dispatcher.forwardNotice(n)` (mirrors `WebviewDispatcher`).
   */
  readonly onNotice = (notice: FlowNotice): void => {
    this.forwardNotice(notice);
  };

  /** Forwards a single controller {@link FlowNotice} to the webview. */
  forwardNotice(notice: FlowNotice): void {
    this.post({
      type: "flowNotice",
      surface: notice.surface,
      kind: notice.kind,
      message: notice.message,
    });
  }

  /**
   * Produces and posts a full {@link HostToWebviewFlow.hydrateFlow} built from
   * the controller's immutable {@link FlowSnapshot} projection (Req 13.2,
   * 13.4). This is the canonical "rebuild the flow shell from host state" path
   * used on first render, on re-reveal after disposal, and as the vehicle for
   * any async, non-intent-driven mutation (e.g. a timer-driven mock round
   * completing) — the wiring layer registers it as the controller's `onChange`.
   */
  hydrateFlow(): void {
    this.post({ type: "hydrateFlow", snapshot: this.controller.snapshot() });
  }

  // --------------------------------------------------------------------------
  // Inbound: webview -> controller
  // --------------------------------------------------------------------------

  /**
   * Applies a single {@link WebviewToHostFlow} intent to the controller. The
   * controller re-validates feedback and owns single-flight/lock state, so
   * this method is a thin intent->call mapping:
   *
   * - `startDiscovery`: begin discovery from the submitted input (Req 4).
   * - `toggleBasket`: toggle a candidate reference in the basket (Req 6.1/6.2).
   * - `submitRefinement`: map the composer {@link RefinementAction} to a
   *   Discovery_Feedback intent and submit it (Req 7):
   *     - `narrow`        -> `REVISE` with the provided targets (the composer
   *                          guarantees exactly one target)
   *     - `merge`         -> `MERGE` with the provided targets
   *     - `new_direction` -> `REGENERATE` with no targets
   *     - `show_more`     -> `MORE` with no targets
   *   Non-empty `text` is attached as the feedback `message` (Req 7.8).
   * - `selectCandidate`: submit a `SELECT` feedback for the chosen candidate
   *   (Req 8).
   * - `refineSpec`: refine the current spec draft (Req 10).
   * - `confirmSpec`: confirm the spec, advancing to Build (Req 11).
   * - `draftChangedFlow`: unsent input fields are **view-local** (design 13.2);
   *   there is no host-side state to mutate, so this is a documented no-op. The
   *   intent is still accepted at the boundary rather than silently dropped.
   */
  async handle(msg: WebviewToHostFlow): Promise<void> {
    switch (msg.type) {
      case "startDiscovery": {
        await this.controller.startDiscovery(msg.input);
        return;
      }
      case "toggleBasket": {
        this.controller.toggleBasket(msg.ref);
        return;
      }
      case "submitRefinement": {
        const feedback = this.buildRefinementFeedback(
          msg.action,
          msg.targets,
          msg.text,
        );
        await this.controller.submitFeedback(feedback);
        return;
      }
      case "selectCandidate": {
        this.controller.submitFeedback({ intent: "SELECT", targets: [msg.target] });
        return;
      }
      case "refineSpec": {
        await this.controller.refineSpec(msg.message);
        return;
      }
      case "confirmSpec": {
        await this.controller.confirmSpec();
        return;
      }
      case "draftChangedFlow": {
        // View-local (design 13.2): drafts are restored from the view model,
        // not host state. Intentionally a no-op on the controller so no flow
        // state is mutated.
        return;
      }
      case "refreshHistory": {
        // Read-only (guide §6/§10-2): (re)load the History list. No run/mutation.
        await this.controller.loadHistory();
        return;
      }
      case "openHistoryProject": {
        // Read-only (guide §6/§10-2): restore a safe summary only. No run is
        // started, nothing is mutated, discovery is NOT auto-triggered.
        await this.controller.restoreHistoryProject(msg.projectId);
        return;
      }
      default: {
        // Exhaustiveness guard: adding a new intent kind surfaces here at
        // compile time so the dispatcher is kept in sync with the protocol.
        const _exhaustive: never = msg;
        void _exhaustive;
        return;
      }
    }
  }

  /**
   * Maps a composer {@link RefinementAction} + targets + free text to a
   * {@link DiscoveryFeedbackInput}. `text` is attached as `message` only when
   * non-empty (Req 7.8). The controller re-validates the produced feedback.
   */
  private buildRefinementFeedback(
    action: RefinementAction,
    targets: CandidateRevisionReference[],
    text: string,
  ): DiscoveryFeedbackInput {
    const feedback: DiscoveryFeedbackInput = (() => {
      switch (action) {
        case "narrow":
          return { intent: "REVISE", targets };
        case "merge":
          return { intent: "MERGE", targets };
        case "new_direction":
          return { intent: "REGENERATE", targets: [] };
        case "show_more":
          return { intent: "MORE", targets: [] };
        default: {
          const _exhaustive: never = action;
          void _exhaustive;
          return { intent: "MORE", targets: [] };
        }
      }
    })();

    const trimmed = text.trim();
    if (trimmed.length > 0) {
      feedback.message = text;
    }
    return feedback;
  }
}
