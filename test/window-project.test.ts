/**
 * K23: which Project the panel opens when it starts. A Project folder window opens
 * its own Project; any other window opens the last Project seen in any window.
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
    env: { openExternal: vi.fn(), clipboard: { writeText: vi.fn() } },
    workspace: {
      getConfiguration: () => ({ get: () => undefined }),
    },
  };
});

import { wireWebviewMessaging, type MessagingWebview } from "../src/agent-panel-view-provider";
import { FlowController } from "../src/core/flow/flow-controller";
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

function host(windowProject?: () => Promise<string | null>): FrontendHost {
  const client = new FakeCoreClient();
  const status: HostStatus = { phase: "CORE_CONNECTED", native: "WORKER_READY", errorCode: null };
  return {
    client,
    worker: new FakeNativeWorker(),
    prepare: async () => ({ client }),
    retry: async () => ({ client }),
    assertAgentReady: () => {},
    getStatus: () => status,
    subscribeStatus: (listener: (status: HostStatus) => void) => { listener(status); return () => {}; },
    onDidRotate: () => () => {},
    dispose: async () => {},
    ...(windowProject ? { windowProject } : {}),
  } as unknown as FrontendHost;
}

/** Records which Projects the panel tries to open; `opens` decides which ones succeed. */
async function start(h: FrontendHost, last: string | undefined, opens: (projectId: string) => boolean) {
  const tried: string[] = [];
  let opened: string | null = null;
  const restore = vi.spyOn(FlowController.prototype, "restoreSavedProject").mockImplementation(async (projectId: string) => {
    tried.push(projectId);
    if (opens(projectId)) opened = projectId;
    return opens(projectId);
  });
  const getProject = vi.spyOn(FlowController.prototype, "getProject").mockImplementation(() =>
    (opened ? { id: opened } : null) as ReturnType<FlowController["getProject"]>);
  const wired = wireWebviewMessaging(new FakeWebview(), {
    managedHost: Promise.resolve(h),
    globalState: new FakeGlobalState(last ? { "bhlr.lastProjectId": last } : {}),
  });
  await wired.ready;
  restore.mockRestore();
  getProject.mockRestore();
  wired.messageSubscription.dispose();
  return tried;
}

describe("the Project the panel opens on start (K23)", () => {
  it("opens this window's Project before the last one seen anywhere", async () => {
    expect(await start(host(async () => "project_window"), "project_last", () => true)).toEqual(["project_window"]);
  });

  it("opens the last Project in a window that is no Project's folder, or with an older host", async () => {
    expect(await start(host(async () => null), "project_last", () => true)).toEqual(["project_last"]);
    expect(await start(host(), "project_last", () => true)).toEqual(["project_last"]);
    expect(await start(host(async () => { throw new Error("x"); }), "project_last", () => true)).toEqual(["project_last"]);
  });

  it("falls back to the last Project when this window's Project cannot be opened", async () => {
    expect(await start(host(async () => "project_gone"), "project_last", (id) => id !== "project_gone"))
      .toEqual(["project_gone", "project_last"]);
    expect(await start(host(async () => "project_window"), undefined, () => true)).toEqual(["project_window"]);
  });
});
