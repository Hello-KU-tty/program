import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentSurfaceController } from "../src/core/agent/agent-controller";
import { ManagedAgentPort } from "../src/adapter/agent/managed-agent-port";
import { AgentDispatcher } from "../src/webview/agent/agent-dispatcher";
import type { AgentHostMessage } from "../src/webview/agent/agent-messages";
import { FakeCoreClient, clientError, fakeSnapshot } from "./support/fake-core-client";
import { FakeNativeWorker } from "./support/fake-native-worker";
import { FakeGlobalState } from "./support/fake-global-state";

const trace = { projectId: "project_1", concepts: [], analysis: [], personalization: [], emptyReason: "NO_EVIDENCE" };
const action = { kind: "evidence/retry", analysisJobId: "analysis_job_1", expectedJobRevision: 5 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("explicit evidence retry refresh", () => {
  const controllers: AgentSurfaceController[] = [];
  afterEach(() => { controllers.splice(0).forEach((controller) => controller.dispose()); vi.restoreAllMocks(); });
  function harness() {
    const client = new FakeCoreClient({ executeResultByKind: {
      UI_READ_ANALYSIS_JOBS: { resolve: [{ id: "analysis_job_1", status: "FAILED", revision: 5 }] },
      UI_RETRY_ANALYSIS: { resolve: { status: "PENDING", revision: 6 } },
      UI_READ_EVIDENCE_TRACE: { resolve: trace },
    } });
    const controller = new AgentSurfaceController({
      port: new ManagedAgentPort(client, new FakeNativeWorker()),
      globalState: new FakeGlobalState({ "bhlr.lastProjectId": "project_1" }),
      onChange: () => {}, openFolder: async () => {}, openExternal: async () => {},
    });
    controllers.push(controller);
    const posted: AgentHostMessage[] = [];
    return { client, controller, posted, dispatcher: new AgentDispatcher(controller, (message) => posted.push(message)) };
  }

  it("posts the fresh trace after success without inventing understanding", async () => {
    const h = harness();
    await h.dispatcher.handle(action);
    expect(h.client.executeKinds).toEqual(["UI_RETRY_ANALYSIS", "UI_READ_EVIDENCE_TRACE"]);
    expect(h.posted).toEqual([{ kind: "agent/evidence", view: {
      concepts: [], analysis: [], userUnderstandingTotal: 0, emptyReason: "NO_EVIDENCE",
    } }]);
  });

  it("refreshes a stale Helper analysis badge on an explicit Evidence read, without any model call", async () => {
    const h = harness();
    const conversation = { conversationId: "conversation_1", taskId: "task_1", status: "PENDING_ANALYSIS",
      redactedUserExcerpts: ["설명해 주세요"], helperResponseSummaries: ["합성 답변"] };
    const snapshot = vi.spyOn(h.client, "restoreProject").mockResolvedValue(fakeSnapshot({ helperConversations: [conversation] }));
    await h.controller.refreshProject();
    expect(h.controller.getViewModel().helper.conversations[0].status).toBe("PENDING_ANALYSIS");
    snapshot.mockResolvedValue(fakeSnapshot({ helperConversations: [{ ...conversation, status: "ANALYZED" }] }));
    await h.dispatcher.handle({ kind: "evidence/read" });
    expect(h.controller.getViewModel().helper.conversations[0].status).toBe("ANALYZED");
    expect(h.client.executeKinds).toEqual(["UI_READ_EVIDENCE_TRACE"]);
    expect(h.client.startRunInputs).toEqual([]);
    expect(h.posted[0]).toMatchObject({ kind: "agent/evidence", view: { userUnderstandingTotal: 0 } });
  });

  for (const transition of ["switch", "switch back", "dispose"] as const) {
    it(`drops Evidence and Helper refresh when its snapshot crosses ${transition}`, async () => {
      const h = harness();
      const pending = deferred<ReturnType<typeof fakeSnapshot>>();
      const snapshot = vi.spyOn(h.client, "restoreProject").mockReturnValue(pending.promise);
      const reading = h.dispatcher.handle({ kind: "evidence/read" });
      await vi.waitFor(() => expect(snapshot).toHaveBeenCalledOnce());
      if (transition === "dispose") h.controller.dispose();
      else {
        h.controller.bindProject("project_other");
        if (transition === "switch back") h.controller.bindProject("project_1");
      }
      pending.resolve(fakeSnapshot({ helperConversations: [{ conversationId: "old_conversation", taskId: "task_1",
        status: "ANALYZED", redactedUserExcerpts: [], helperResponseSummaries: [] }] }));
      await reading;
      expect(h.posted).toEqual([]);
      expect(h.controller.getViewModel().helper.conversations).toEqual([]);
    });
  }

  it("suppresses duplicate in-flight requests and posts once", async () => {
    const h = harness();
    const pending = deferred<unknown>();
    const execute = vi.spyOn(h.client, "execute").mockImplementationOnce(() => pending.promise as never);
    const first = h.dispatcher.handle(action);
    const duplicate = h.dispatcher.handle(action);
    expect(execute).toHaveBeenCalledTimes(1);
    pending.resolve({ status: "PENDING", revision: 6 });
    await Promise.all([first, duplicate]);
    expect(execute).toHaveBeenCalledTimes(2); // one mutation, one read
    expect(h.posted).toHaveLength(1);
  });

  it("resolves the real button's revision 0 from a durable failed job before retrying", async () => {
    const h = harness();
    const execute = vi.spyOn(h.client, "execute");
    await h.dispatcher.handle({ ...action, expectedJobRevision: 0 });
    expect(h.client.executeKinds).toEqual(["UI_READ_ANALYSIS_JOBS", "UI_RETRY_ANALYSIS", "UI_READ_EVIDENCE_TRACE"]);
    expect(execute).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: "UI_RETRY_ANALYSIS", expectedJobRevision: 5 }));
    expect(h.posted).toHaveLength(1);
  });

  it("does not mutate when revision lookup fails or the failed job is no longer available", async () => {
    const h = harness();
    const execute = vi.spyOn(h.client, "execute").mockRejectedValueOnce(clientError("BACKEND_UNAVAILABLE"));
    await h.dispatcher.handle({ ...action, expectedJobRevision: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
    execute.mockResolvedValueOnce([] as never);
    await h.dispatcher.handle({ ...action, expectedJobRevision: 0 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(h.posted).toEqual([]);
    expect(h.controller.getViewModel().notice?.message).toContain("새로 조회");
  });

  it("deduplicates revision lookups and detaches them on project change", async () => {
    const h = harness();
    const pending = deferred<unknown>();
    const execute = vi.spyOn(h.client, "execute").mockImplementationOnce(() => pending.promise as never);
    const first = h.dispatcher.handle({ ...action, expectedJobRevision: 0 });
    const duplicate = h.dispatcher.handle({ ...action, expectedJobRevision: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
    h.controller.bindProject("project_other");
    pending.resolve([{ id: "analysis_job_1", status: "FAILED", revision: 5 }]);
    await Promise.all([first, duplicate]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(h.posted).toEqual([]);
  });

  it("does not read or post after failure, then allows a new explicit retry", async () => {
    const h = harness();
    const execute = vi.spyOn(h.client, "execute").mockRejectedValueOnce(clientError("NATIVE_CREDIT_OBSERVATION_REQUIRED"));
    await h.dispatcher.handle(action);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(h.posted).toEqual([]);
    expect(h.controller.getViewModel().notice?.message).toContain("최신 계정 사용량");
    await h.dispatcher.handle(action);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(h.posted).toHaveLength(1);
  });

  it("does not retry the mutation when the follow-up read fails", async () => {
    const h = harness();
    vi.spyOn(h.client, "execute").mockResolvedValueOnce({ status: "PENDING" } as never)
      .mockRejectedValueOnce(clientError("BACKEND_UNAVAILABLE"));
    await h.dispatcher.handle(action);
    expect(h.posted).toEqual([]);
    expect(h.client.startRunInputs).toEqual([]);
  });

  for (const transition of ["switch", "switch back", "dispose"] as const) {
    it(`drops a retry refresh delayed across ${transition}`, async () => {
      const h = harness();
      const pending = deferred<unknown>();
      const execute = vi.spyOn(h.client, "execute").mockResolvedValueOnce({ status: "PENDING" } as never)
        .mockImplementationOnce(() => pending.promise as never);
      const retry = h.dispatcher.handle(action);
      await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
      if (transition === "dispose") h.controller.dispose();
      else {
        h.controller.bindProject("project_other");
        if (transition === "switch back") h.controller.bindProject("project_1");
      }
      pending.resolve(trace);
      await retry;
      expect(h.posted).toEqual([]);
    });
  }

  it("rechecks the binding between controller completion and dispatch", async () => {
    const h = harness();
    vi.spyOn(h.controller, "retryAnalysis").mockImplementation(async () => {
      queueMicrotask(() => h.controller.bindProject("project_other"));
      return { concepts: [], analysis: [], userUnderstandingTotal: 0, emptyReason: "OLD_PROJECT" };
    });
    await h.dispatcher.handle(action);
    expect(h.posted).toEqual([]);
  });
});
