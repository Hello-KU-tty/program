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
 */

import {
  parseHostToWebview,
  type HostToWebview,
  type WebviewToHost,
} from "./messages";
import { getVsCodeApi, type VsCodeApi } from "./vscode-api";

/** Listener invoked with each validated host message. */
export type HostMessageListener = (message: HostToWebview) => void;

/**
 * Wraps the VS Code webview API and the global `message` event into a small,
 * typed pub/sub surface for the UI.
 */
export class WebviewClient {
  private readonly api: VsCodeApi;
  private readonly listeners = new Set<HostMessageListener>();

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
    if (message === null) {
      return;
    }
    for (const listener of this.listeners) {
      listener(message);
    }
  }
}
