/**
 * Client-side messaging wrapper for the webview.
 *
 * This is the thin boundary between the DOM/UI code and the VS Code webview
 * transport. It provides two things:
 *
 * - {@link WebviewClient.post}: post a typed {@link WebviewToHost} intent to the
 *   host (validated by construction — callers can only build the union).
 * - {@link WebviewClient.onHostMessage}: subscribe to validated
 *   {@link HostToWebview} messages arriving on the global `message` event. Each
 *   incoming payload is run through {@link parseHostToWebview} so malformed or
 *   unexpected messages are dropped rather than propagated (the host is
 *   untrusted input from the webview's perspective, mirroring the dispatcher's
 *   inbound validation).
 *
 * Keeping this separate from rendering means the view model / render layer can
 * be unit-tested by feeding it {@link HostToWebview} messages directly, without
 * a live VS Code API.
 *
 * ## Additive flow transport (Req 12, 13)
 *
 * The Discovery -> Spec flow shares this single transport without widening the
 * Build_Surface unions. Two parallel, symmetric paths are provided:
 *
 * - {@link WebviewClient.postFlow}: posts a typed {@link WebviewToHostFlow}
 *   intent, mirroring {@link WebviewClient.post}.
 * - {@link WebviewClient.onHostFlowMessage}: subscribes to validated
 *   {@link HostToWebviewFlow} messages, validated via
 *   {@link parseHostToWebviewFlow}.
 *
 * A single global `message` listener (attached by {@link WebviewClient.start})
 * fans each incoming payload out to BOTH validators: Build messages match
 * {@link parseHostToWebview} and flow messages match
 * {@link parseHostToWebviewFlow}; a payload that matches neither is dropped.
 * This keeps the flow branch inert until a `hydrateFlow` arrives — no flow
 * listener fires and the Build_Surface path is untouched.
 */

import {
  parseHostToWebview,
  type HostToWebview,
  type WebviewToHost,
} from "./messages";
import {
  parseHostToWebviewFlow,
  type HostToWebviewFlow,
  type WebviewToHostFlow,
} from "./flow/flow-messages";
import type {
  AgentAction,
  AgentHostMessage,
} from "./agent/agent-messages";
import { getVsCodeApi, type VsCodeApi } from "./vscode-api";

/** Listener invoked with each validated host message. */
export type HostMessageListener = (message: HostToWebview) => void;

/** Listener invoked with each validated flow host message (Req 12, 13). */
export type HostFlowMessageListener = (message: HostToWebviewFlow) => void;

/** Listener invoked with each validated agent host message (Req 13, 14). */
export type HostAgentMessageListener = (message: AgentHostMessage) => void;

/**
 * The set of {@link AgentHostMessage} discriminators. Used by
 * {@link parseHostToWebviewAgent} to recognize an agent host message on the
 * shared transport. The agent union is `kind`-keyed and all discriminators are
 * prefixed `agent/`, disjoint from the Build (`type`-keyed) and flow
 * (`type`-keyed) unions, so a Build/flow payload never matches here.
 */
const AGENT_HOST_MESSAGE_KINDS: ReadonlySet<string> = new Set([
  "agent/hydrate",
  "agent/patch/builder",
  "agent/patch/helper",
  "agent/patch/worker",
  "agent/evidence",
  "agent/finalUpgrade",
  "agent/notice",
]);

/**
 * Recognizes an inbound {@link AgentHostMessage} by its `kind` discriminator.
 * The host is untrusted input from the webview's perspective, so any payload
 * whose `kind` is not a known `agent/*` discriminator is rejected (returns
 * `null`), mirroring the defensive style of `parseHostToWebviewFlow`. The host
 * builds these messages from safe DTOs already (Requirement 13.1), so this
 * boundary check narrows the type without re-validating every nested field.
 */
function parseHostToWebviewAgent(raw: unknown): AgentHostMessage | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const kind = (raw as { kind?: unknown }).kind;
  if (typeof kind !== "string" || !AGENT_HOST_MESSAGE_KINDS.has(kind)) {
    return null;
  }
  return raw as AgentHostMessage;
}

/**
 * Wraps the VS Code webview API and the global `message` event into a small,
 * typed pub/sub surface for the UI.
 */
export class WebviewClient {
  private readonly api: VsCodeApi;
  private readonly listeners = new Set<HostMessageListener>();
  private readonly flowListeners = new Set<HostFlowMessageListener>();
  private readonly agentListeners = new Set<HostAgentMessageListener>();

  /**
   * @param api VS Code API handle; defaults to the acquired singleton. Injected
   *   for tests so a stub can capture posted intents.
   */
  constructor(api: VsCodeApi = getVsCodeApi()) {
    this.api = api;
  }

  /** Posts a {@link WebviewToHost} intent to the host. */
  post(message: WebviewToHost): void {
    this.api.postMessage(message);
  }

  /**
   * Posts a {@link WebviewToHostFlow} flow intent to the host. Mirrors
   * {@link post} but for the additive Discovery -> Spec flow union, so flow
   * intents travel the same `postMessage` transport without widening the
   * Build_Surface union (Req 12, 13).
   */
  postFlow(message: WebviewToHostFlow): void {
    this.api.postMessage(message);
  }

  /**
   * Posts an {@link AgentAction} agent intent to the host. Mirrors {@link post}
   * / {@link postFlow} but for the additive Builder/Helper agent surface, so
   * agent gestures travel the same `postMessage` transport without widening the
   * Build/flow unions (Req 13, 14). The host re-validates every inbound payload
   * with `parseAgentAction` before acting (Requirement 13.2).
   */
  postAgent(message: AgentAction): void {
    this.api.postMessage(message);
  }

  /**
   * Subscribes to validated host messages. Returns an unsubscribe function.
   * The first subscription attaches the single global `message` listener; it
   * stays attached for the lifetime of the webview (unsubscribing individual
   * listeners does not detach it, which is fine for a long-lived panel).
   */
  onHostMessage(listener: HostMessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribes to validated {@link HostToWebviewFlow} messages. Returns an
   * unsubscribe function. Symmetric with {@link onHostMessage}: the same global
   * `message` listener (attached by {@link start}) fans each payload through
   * {@link parseHostToWebviewFlow} and notifies flow subscribers on a match.
   * Build messages never reach flow listeners (and vice versa) because each
   * validator rejects the other union's discriminators.
   */
  onHostFlowMessage(listener: HostFlowMessageListener): () => void {
    this.flowListeners.add(listener);
    return () => {
      this.flowListeners.delete(listener);
    };
  }

  /**
   * Subscribes to validated {@link AgentHostMessage} messages. Returns an
   * unsubscribe function. Symmetric with {@link onHostMessage} /
   * {@link onHostFlowMessage}: the same global `message` listener (attached by
   * {@link start}) fans each payload through {@link parseHostToWebviewAgent} and
   * notifies agent subscribers on a match. Build/flow messages never reach
   * agent listeners (and vice versa) because each validator rejects the other
   * unions' discriminators (Req 13, 14).
   */
  onHostAgentMessage(listener: HostAgentMessageListener): () => void {
    this.agentListeners.add(listener);
    return () => {
      this.agentListeners.delete(listener);
    };
  }

  /**
   * Attaches the global `message` event listener that fans validated host
   * messages out to subscribers. Call once during bootstrap. Separated from the
   * constructor so tests can drive {@link dispatch} directly without a DOM.
   */
  start(): void {
    if (typeof addEventListener !== "function") {
      return;
    }
    addEventListener("message", (event: MessageEvent) => {
      this.dispatch(event.data);
    });
  }

  /**
   * Validates a raw payload and, if it is a known {@link HostToWebview} message,
   * notifies every subscriber. Exposed (rather than private) so tests can feed
   * messages without synthesizing DOM events.
   */
  dispatch(raw: unknown): void {
    const message = parseHostToWebview(raw);
    if (message !== null) {
      for (const listener of this.listeners) {
        listener(message);
      }
      return;
    }
    // Not a Build_Surface message: try the additive flow union.
    const flowMessage = parseHostToWebviewFlow(raw);
    if (flowMessage !== null) {
      for (const listener of this.flowListeners) {
        listener(flowMessage);
      }
      return;
    }
    // Not a flow message: try the additive agent union (Req 13, 14). A payload
    // that matches none of the three validators is dropped (untrusted-input
    // contract).
    const agentMessage = parseHostToWebviewAgent(raw);
    if (agentMessage !== null) {
      for (const listener of this.agentListeners) {
        listener(agentMessage);
      }
    }
  }
}
