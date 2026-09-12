/**
 * In-process host <-> webview harness for the Discovery -> Spec FLOW surface.
 *
 * This is the flow-side analogue of the `HostWebviewHarness` in
 * `test/integration.test.ts`. It wires a REAL {@link FlowController} (host) to
 * the REAL webview flow shell (built by {@link bootstrap}) over a
 * {@link WebviewClient}, so a flow intent flows end-to-end exactly like the
 * runtime wiring will:
 *
 *   webview intent  -> WebviewClient.postFlow -> VsCodeApi.postMessage
 *                    -> flowDispatcher.handle(intent) -> controller mutates
 *   controller change/notice -> FlowDispatcher (via the onChange/onNotice
 *                    forward-reference closure) -> post -> client.dispatch(msg)
 *                    -> WebviewClient.onHostFlowMessage -> flow views render
 *
 * The controller is driven with a {@link FakeClock}, {@link FakeIdSource}, and
 * (by default) {@link SpyFlowPorts}, so timing, ids, and port results are all
 * deterministic and inspectable. Pass `useMock: true` to instead drive a real
 * seeded {@link MockDiscoveryPort} via `createFlowPorts` when believable data
 * is wanted over controllable results.
 *
 * ## Determinism guarantees
 *
 * - All timing goes through the injected {@link FakeClock}; nothing fires until
 *   {@link FlowHostWebviewHarness.advanceClock} crosses a deadline. The spy's
 *   default `ok` payloads resolve on the microtask queue, so {@link settle}
 *   (a few awaited microtasks) is enough for the default happy path; use
 *   {@link FlowHostWebviewHarness.advanceClock} to fire the controller's 30s
 *   timeout timers or a `MockDiscoveryPort` latency.
 * - Ids are deterministic (`corr_1`, `idem_2`, `project_3`, ...), so envelope
 *   assertions are stable.
 */

import { FlowController } from "../../src/core/flow/flow-controller";
import { FlowDispatcher } from "../../src/webview/flow/flow-dispatcher";
import type { HostToWebviewFlow } from "../../src/webview/flow/flow-messages";
import { parseWebviewToHostFlow } from "../../src/webview/flow/flow-messages";
import type { FlowPorts } from "../../src/adapter/flow/discovery-port";
import { createFlowPorts } from "../../src/adapter/flow/flow-port-factory";
import { bootstrap } from "../../src/webview/main";
import { WebviewClient } from "../../src/webview/client-messaging";
import type { VsCodeApi } from "../../src/webview/vscode-api";
import type { WebviewToHost, HostToWebview } from "../../src/webview/messages";
import type { WebviewToHostFlow } from "../../src/webview/flow/flow-messages";
import type { FlowViewModelStore } from "../../src/webview/flow/flow-view-model";
import { installFakeDom, type FakeElement } from "./fake-dom";
import { FakeClock } from "./fake-clock";
import { FakeIdSource } from "./fake-id-source";
import { SpyFlowPorts } from "./spy-flow-ports";

/** Construction options for {@link FlowHostWebviewHarness}. */
export interface FlowHostWebviewHarnessOptions {
  /**
   * When true, drive a real seeded {@link MockDiscoveryPort} (via
   * {@link createFlowPorts}) for believable data instead of the controllable
   * {@link SpyFlowPorts}. `ports` is then a `FlowPorts`, not a spy — the `ports`
   * accessor still returns the spy only in the default case.
   */
  useMock?: boolean;
  /** Seed passed to {@link createFlowPorts} when `useMock` is true. */
  seed?: number;
}

/**
 * Wires a real FlowController + FlowDispatcher (host) to the real flow webview
 * shell (via {@link bootstrap}) over a {@link WebviewClient}, for deterministic
 * end-to-end flow tests.
 */
export class FlowHostWebviewHarness {
  /** The host-owned authoritative flow core. */
  readonly controller: FlowController;
  /** The host-side flow messaging dispatcher. */
  readonly flowDispatcher: FlowDispatcher;
  /** The spy ports (only when the default double is used; see `useMock`). */
  readonly ports: SpyFlowPorts | null;
  /** The deterministic clock driving the controller's timeout timers. */
  readonly clock: FakeClock;
  /** The deterministic id source stamped onto envelopes/entities. */
  readonly ids: FakeIdSource;
  /** The webview root element (fake DOM). */
  readonly root: FakeElement;
  /** The webview messaging client. */
  readonly client: WebviewClient;
  /** The webview-side flow projection store. */
  readonly flowStore: FlowViewModelStore;

  private readonly restore: () => void;

  constructor(options: FlowHostWebviewHarnessOptions = {}) {
    const dom = installFakeDom();
    this.restore = dom.restore;
    this.root = dom.createElement("div");

    this.clock = new FakeClock();
    this.ids = new FakeIdSource();

    let flowPorts: FlowPorts;
    if (options.useMock) {
      this.ports = null;
      flowPorts = createFlowPorts({ seed: options.seed });
    } else {
      const spy = new SpyFlowPorts({ clock: this.clock });
      this.ports = spy;
      flowPorts = spy;
    }

    // Webview side: a client whose postMessage (webview -> host intents) feeds
    // validated FLOW intents into the flow dispatcher, then re-hydrates so the
    // controller's resulting state reaches the webview. Build intents (if any)
    // are ignored by this flow-only harness.
    let dispatcherRef: FlowDispatcher;
    const api: VsCodeApi = {
      postMessage: (intent: WebviewToHost | WebviewToHostFlow) => {
        const flowIntent = parseWebviewToHostFlow(intent);
        if (flowIntent === null) {
          return; // not a flow intent; the flow-only harness ignores it
        }
        void dispatcherRef.handle(flowIntent).then(() => {
          dispatcherRef.hydrateFlow();
        });
      },
    };
    this.client = new WebviewClient(api);
    const booted = bootstrap(this.root as unknown as HTMLElement, this.client);
    this.flowStore = booted.flowStore;

    // Host side: controller + dispatcher. The controller's onNotice/onChange
    // are set at CONSTRUCTION, so we forward to the (later-assigned) dispatcher
    // through a forward-reference closure (the documented wiring pattern). The
    // dispatcher posts host -> webview flow messages straight into the client's
    // dispatch, which fans out to onHostFlowMessage.
    this.controller = new FlowController(flowPorts, {
      clock: this.clock,
      ids: this.ids,
      onNotice: (n) => this.flowDispatcher.forwardNotice(n),
      onChange: () => this.flowDispatcher.hydrateFlow(),
    });
    this.flowDispatcher = new FlowDispatcher(this.controller, (message: HostToWebviewFlow) => {
      // client.dispatch fans out: parseHostToWebview first, then
      // parseHostToWebviewFlow — flow messages reach onHostFlowMessage.
      this.client.dispatch(message as unknown as HostToWebview);
    });
    dispatcherRef = this.flowDispatcher;

    // First paint from host state (mirrors the runtime wiring layer).
    this.flowDispatcher.hydrateFlow();
  }

  /** Await a few microtasks so an async intent -> hydrate chain settles. */
  async settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  /**
   * Advance the controller's {@link FakeClock} by `ms`, firing any due timers
   * (e.g. the 30s per-op timeout, or a `MockDiscoveryPort` latency when
   * `useMock` is set).
   */
  advanceClock(ms: number): void {
    this.clock.advance(ms);
  }

  /** Tears down the installed fake DOM globals. */
  dispose(): void {
    this.restore();
  }

  // --- DOM query helpers scoped to the flow shell ---

  /** All elements in the flow subtree with an exact `className`. */
  byClass(className: string): FakeElement[] {
    return this.root.queryAll((e) => e.className === className);
  }

  /** The nth (0-based) candidate card in the workspace, or undefined. */
  card(index: number): FakeElement | undefined {
    return this.byClass("flow-candidate-card")[index];
  }

  /**
   * Whether the Agent_Run_Banner(s) are hidden. Returns true only when every
   * rendered `flow-agent-banner` is hidden (the visible surface's banner
   * reflects in-flight state). With no banners present, returns true.
   */
  bannerHidden(): boolean {
    return this.byClass("flow-agent-banner").every((b) => b.hidden);
  }

  /** True when the discovery_start surface (`flow-start`) is present and visible. */
  startSurfaceVisible(): boolean {
    const start = this.byClass("flow-start")[0];
    return start !== undefined && start.hidden === false;
  }

  /** True when the discovery_workspace surface (`flow-workspace`) is visible. */
  workspaceSurfaceVisible(): boolean {
    const ws = this.byClass("flow-workspace")[0];
    return ws !== undefined && ws.hidden === false;
  }

  /** True when the spec_review surface (`flow-spec`) is visible. */
  specSurfaceVisible(): boolean {
    const spec = this.byClass("flow-spec")[0];
    return spec !== undefined && spec.hidden === false;
  }
}
