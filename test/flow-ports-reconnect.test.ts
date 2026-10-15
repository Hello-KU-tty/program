/**
 * Flow ports after Core comes back, through {@link wireWebviewMessaging} with
 * a fake Managed_Host.
 *
 * If Core cannot be prepared when the panel opens (for example right after the
 * PC wakes), the flow ports are stand-ins that fail every call. The 0.2.10 host
 * retries Core itself and publishes CORE_CONNECTED; the panel must then build
 * real ports, or Discovery and History keep failing until a window reload.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => {
  class Disposable {
    constructor(private readonly fn: () => void) {}
    dispose(): void {
      this.fn();
    }
  }
  return {
    Disposable,
    Uri: {
      joinPath: (...parts: unknown[]) => ({ parts }),
      file: (p: string) => ({ fsPath: p }),
      parse: (s: string) => ({ toString: () => s }),
    },
    window: { registerWebviewViewProvider: vi.fn() },
    commands: { executeCommand: vi.fn() },
    env: { openExternal: vi.fn() },
    workspace: {
      getConfiguration: () => ({ get: () => undefined }),
    },
  };
});

import { wireWebviewMessaging, type MessagingWebview } from "../src/agent-panel-view-provider";
import type { FrontendHost, HostStatus } from "../vendor/frontend-host";
import { FakeCoreClient } from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

class FakeWebview implements MessagingWebview {
  postMessage(): unknown {
    return true;
  }
  onDidReceiveMessage() {
    return { dispose: () => {} };
  }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

/** A host whose Core is down until the test brings it back. */
function hostWithCoreDown() {
  const client = new FakeCoreClient();
  const listProjects = vi.spyOn(client, "listProjects");
  const listeners = new Set<(status: HostStatus) => void>();
  let status: HostStatus = { phase: "FAILED", native: "NOT_READY", errorCode: "CORE_START_TIMEOUT" };
  let coreUp = false;
  const publish = (next: HostStatus) => { status = next; for (const listener of listeners) listener(status); };
  const prepare = vi.fn(async () => {
    if (!coreUp) throw new Error("CORE_START_TIMEOUT");
    return { client };
  });
  const host = {
    client,
    worker: new FakeNativeWorker(),
    prepare,
    retry: async () => ({ client }),
    assertAgentReady: () => {},
    getStatus: () => status,
    subscribeStatus: (listener: (status: HostStatus) => void) => {
      listeners.add(listener);
      listener(status);
      return () => listeners.delete(listener);
    },
    onDidRotate: () => () => {},
    dispose: async () => {},
  } as unknown as FrontendHost;
  const coreBack = () => {
    coreUp = true;
    publish({ phase: "CORE_CONNECTED", native: "WORKER_READY", errorCode: null });
  };
  return { host, prepare, listProjects, publish, coreBack };
}

function wire(host: FrontendHost) {
  return wireWebviewMessaging(new FakeWebview(), {
    managedHost: Promise.resolve(host),
    globalState: new FakeGlobalState({}),
  });
}

describe("flow ports after Core reconnects", () => {
  it("builds real ports once the host reconnects Core", async () => {
    const fake = hostWithCoreDown();
    const wired = wire(fake.host);
    await wired.ready;
    await settle();
    // Stand-in ports never reach the client.
    expect(fake.prepare).toHaveBeenCalledTimes(1);
    expect(fake.listProjects).not.toHaveBeenCalled();

    fake.coreBack();
    await settle();
    expect(fake.prepare).toHaveBeenCalledTimes(2);
    expect(fake.listProjects).toHaveBeenCalled();
    expect(wired.flowController.snapshot().flowSupport.mode).toBe("live");

    // Later reconnects keep the real ports.
    fake.publish({ phase: "CORE_CONNECTED", native: "WORKER_READY", errorCode: null });
    await settle();
    expect(fake.prepare).toHaveBeenCalledTimes(2);
    wired.messageSubscription.dispose();
  });

  it("keeps real ports when Core was up from the start", async () => {
    const fake = hostWithCoreDown();
    fake.coreBack();
    const wired = wire(fake.host);
    await wired.ready;
    await settle();
    fake.publish({ phase: "CORE_CONNECTED", native: "WORKER_READY", errorCode: null });
    await settle();
    expect(fake.prepare).toHaveBeenCalledTimes(1);
    wired.messageSubscription.dispose();
  });

  it("rebuilds once even if the host reports CORE_CONNECTED twice during the rebuild", async () => {
    const fake = hostWithCoreDown();
    const wired = wire(fake.host);
    await wired.ready;
    await settle();
    fake.coreBack();
    fake.publish({ phase: "CORE_CONNECTED", native: "WORKER_READY", errorCode: null });
    await settle();
    expect(fake.prepare).toHaveBeenCalledTimes(2);
    wired.messageSubscription.dispose();
  });
});
