/**
 * Ambient typing and acquisition of the VS Code webview API.
 *
 * A VS Code webview runs in a browser-like sandbox and is handed a single
 * `acquireVsCodeApi()` function on the global scope. That function may only be
 * called once per webview load; calling it again throws. This module wraps the
 * acquisition so the rest of the webview code depends on a small, typed handle
 * ({@link VsCodeApi}) rather than the untyped global, and so the single-call
 * contract is centralized in one place.
 *
 * The API is generic over the message shape we post to the host; for this panel
 * that is {@link WebviewToHost}. We deliberately do not use the `getState`/
 * `setState` persistence surface here — host-owned state plus `hydrate`
 * re-hydration (design.md) is the source of truth, so the webview stays a pure
 * projection.
 */

import type { WebviewToHost } from "./messages";

/**
 * The subset of the VS Code webview API this panel uses. Only `postMessage` is
 * required: the webview posts {@link WebviewToHost} intents and receives
 * host messages via the global `message` event (see client-messaging.ts).
 */
export interface VsCodeApi {
  postMessage(message: WebviewToHost): void;
}

/**
 * The shape of the global `acquireVsCodeApi` injected by the VS Code webview
 * runtime. Declared as an ambient global so this compiles under the DOM lib
 * without pulling in `@types/vscode-webview`.
 */
declare global {
  // eslint-disable-next-line no-var
  var acquireVsCodeApi: (() => VsCodeApi) | undefined;
}

/** Cached handle so the once-only `acquireVsCodeApi` contract is respected. */
let cachedApi: VsCodeApi | null = null;

/**
 * Acquires (once) and returns the VS Code webview API handle.
 *
 * When running outside a real webview (e.g. a DOM-based unit test), the global
 * is absent; in that case a no-op stub is returned so the UI can still mount
 * and be driven directly. The stub is cached too, keeping behavior consistent.
 */
export function getVsCodeApi(): VsCodeApi {
  if (cachedApi) {
    return cachedApi;
  }
  const acquire = globalThis.acquireVsCodeApi;
  if (typeof acquire === "function") {
    cachedApi = acquire();
  } else {
    // Fallback stub for non-webview environments (tests, standalone preview).
    cachedApi = { postMessage: () => undefined };
  }
  return cachedApi;
}
