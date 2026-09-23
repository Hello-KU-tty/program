import { describe, it, expect } from "vitest";

import { LocalCoreDiscoveryPort } from "../src/adapter/flow/local-core-port";
import type { LocalCoreClient } from "../vendor/frontend-client";
import {
  createFlowPortsAsync,
  isNativeFlowSupported,
} from "../src/adapter/flow/flow-port-factory";
import { MockDiscoveryPort } from "../src/adapter/flow/mock-flow-port";
import type { RequestEnvelope } from "../src/adapter/flow/discovery-port";
import type {
  CandidateRevisionReference,
  DiscoveryFeedback,
  DiscoveryInput,
} from "../src/core/flow/flow-types";

/**
 * Unit tests for the REAL SDK adapter (LocalCoreDiscoveryPort) and the
 * fail-closed native gating in the factory.
 *
 * The adapter is exercised against a HAND-WRITTEN fake LocalCoreClient that
 * returns canned contract-shaped values (or throws LocalClientError-like
 * errors). We never touch a live connection: there is no backend and this is
 * Windows, so only the fail-closed/mock path and the fake-client-driven adapter
 * are exercised.
 *
 * We assert:
 *   - each port method maps success -> ok(value) with correct program fields,
 *   - SDK errors -> err(PortError) with the right normalized code,
 *   - the adapter never throws,
 *   - isNativeFlowSupported() fails closed on the current platform (Windows),
 *   - createFlowPortsAsync({}) returns mock + reason + Mock ports on Windows.
 */

const ENV: RequestEnvelope = {
  correlationId: "corr_test",
  idempotencyKey: "idem_test",
  expectedRevision: 3,
};

const INPUT: DiscoveryInput = {
  learningGoal: "TypeScript로 작은 앱 만들기",
  personalNeed: "매일 쓰는 습관 도구",
  currentLevel: "BEGINNER",
};

// --- contract-shaped fixture builders (only the fields the mappers read) ---

const ISO = "2026-01-02T03:04:05.000Z";
const ISO_EPOCH = Date.parse(ISO);

function contractSession(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    id: "discovery_session_1",
    projectId: "project_1",
    correlationId: "corr_x",
    revision: 4,
    input: { learningGoal: INPUT.learningGoal, personalNeed: INPUT.personalNeed, currentLevel: "BEGINNER" },
    status: "ACTIVE",
    openedAt: ISO,
    updatedAt: ISO,
    source: { kind: "USER" },
    redactionStatus: "NOT_REQUIRED",
    ...overrides,
  };
}

function contractCandidate(id: string, revision: number) {
  return {
    schemaVersion: 1,
    id,
    discoverySessionId: "discovery_session_1",
    correlationId: "corr_c",
    revision,
    parentRevisions: [{ candidateId: "seed", revision: 1 }],
    title: "습관 트래커",
    summary: "매일 습관을 체크하는 앱",
    targetUsers: ["입문 개발자"],
    coreInteraction: "습관을 눌러 완료 표시",
    usageMoment: "아침에",
    appeal: "성취감",
    personalNeedRelationship: "매일 쓰는 도구 필요",
    technologyNecessity: "상태 관리 연습",
    coreConcepts: ["상태 관리"],
    mvpFeatures: ["습관 등록"],
    suggestedScope: { learnerFocus: ["상태 관리"], agentSupport: ["초기 설정"], excluded: ["로그인"] },
    risks: ["범위 과대"],
    generationTags: ["DIRECT", "EXPAND"],
    createdAt: ISO,
    source: { kind: "AGENT", role: "DISCOVERY" },
    redactionStatus: "NOT_REQUIRED",
  };
}

function contractPreviewRound() {
  return {
    schemaVersion: 1,
    id: "preview_round_1",
    finalRoundId: "round_1",
    discoverySessionId: "discovery_session_1",
    correlationId: "corr_p",
    inputSnapshot: { learningGoal: INPUT.learningGoal },
    previews: Array.from({ length: 10 }, (_, i) => ({
      title: `아이디어 ${i + 1}`,
      summary: "요약",
      coreInteraction: "상호작용",
      appeal: "매력",
      technologyNecessity: "필요성",
      generationTags: ["DIRECT"],
      candidateId: `cand_${i + 1}`,
      position: i + 1,
    })),
    generationRationale: "다양하게 구성",
    createdAt: ISO,
    source: { kind: "AGENT", role: "DISCOVERY" },
    redactionStatus: "NOT_REQUIRED",
  };
}

function contractRound(roundIndex: number, id: string) {
  return {
    schemaVersion: 1,
    id,
    discoverySessionId: "discovery_session_1",
    correlationId: "corr_r",
    roundIndex,
    inputSnapshot: { learningGoal: INPUT.learningGoal },
    appliedFeedbackIds: ["feedback_1"],
    candidates: [
      { candidateId: "cand_1", revision: 2 },
      { candidateId: "cand_2", revision: 1 },
    ],
    generationRationale: "피드백 반영",
    diversityCheck: { dimensionsReviewed: ["TARGET_USER"], modeCollapseDetected: false, rationale: "ok" },
    createdAt: ISO,
    source: { kind: "AGENT", role: "DISCOVERY" },
    redactionStatus: "NOT_REQUIRED",
  };
}

function contractSpec(revision: number, status: string, parentRevision?: number) {
  return {
    productPurpose: "습관 형성을 돕는다",
    targetUsers: ["입문 개발자"],
    primaryUsageMoment: "아침에",
    successMoment: "연속 달성이 보일 때",
    mvpFeatures: ["습관 등록", "체크"],
    scope: [
      { category: "LEARNER_FOCUS", title: "핵심", rationale: "직접 구현", conceptNames: ["상태 관리"] },
      { category: "AGENT_SUPPORT", title: "지원", rationale: "반복 보조", conceptNames: ["설정"] },
      { category: "EXCLUDED", title: "제외", rationale: "규모 유지", conceptNames: ["로그인"] },
    ],
    expectedDecisions: [
      { category: "PRODUCT_BEHAVIOR", description: "흐름 결정", whyUserInputMatters: "경험이 달라짐" },
    ],
    runtimeConstraint: "TYPESCRIPT",
    deploymentConstraints: ["로컬 실행"],
    schemaVersion: 1,
    id: "learning_spec_1",
    projectId: "project_1",
    correlationId: "corr_s",
    revision,
    parentRevision,
    selectedCandidate: { candidateId: "cand_1", revision: 2 },
    status,
    createdAt: ISO,
    updatedAt: ISO,
    source: { kind: "AGENT", role: "DISCOVERY" },
    redactionStatus: "NOT_REQUIRED",
  };
}

function contractSnapshot(parts: {
  discoverySession?: unknown;
  previewRound?: unknown;
  rounds?: unknown[];
  candidateEnrichments?: unknown[];
  selectedCandidate?: unknown;
  learningSpec?: unknown;
}) {
  const discoveryContext =
    parts.previewRound !== undefined ||
    parts.rounds !== undefined ||
    parts.candidateEnrichments !== undefined
      ? {
          previewRound: parts.previewRound ?? null,
          rounds: parts.rounds ?? [],
          candidateEnrichments: parts.candidateEnrichments ?? [],
          candidates: [],
        }
      : null;
  return {
    schemaVersion: 1,
    correlationId: "corr_snap",
    project: { id: "project_1", status: "DISCOVERY" },
    suggestedSurface: "DISCOVERY",
    discoverySession: "discoverySession" in parts ? parts.discoverySession : contractSession(),
    discoveryContext,
    selectedCandidate: parts.selectedCandidate ?? null,
    learningSpec: parts.learningSpec ?? null,
    activeTask: null,
    currentTask: null,
    liveContext: null,
    pendingDecisions: [],
    decisions: [],
    completionReport: null,
    helperConversations: [],
  };
}

function preparedTaskResponse() {
  return {
    schemaVersion: 1,
    correlationId: "corr_task",
    projectId: "project_1",
    workspacePath: "/generated/project_1",
    status: "READY",
    task: { id: "task_1", revision: 1 },
  };
}

/** A LocalClientError-like object (matches the duck-typed branch in the adapter). */
function clientError(code: string, status?: number, message = "boom") {
  return { code, status, message, name: "LocalClientError" };
}

/**
 * Build a fake LocalCoreClient. Only the methods the adapter calls are
 * implemented; each is overridable per test. Cast to LocalCoreClient at the
 * boundary (the adapter uses a narrow slice of the API).
 */
function fakeClient(overrides: Partial<Record<string, unknown>> = {}): LocalCoreClient {
  const base = {
    startDiscovery: async () => ({ projectId: "project_1", run: {} }),
    restoreProject: async () => contractSnapshot({}),
    startRun: async () => ({}),
    execute: async () => ({ accepted: true, resourceRevision: 5 }),
    getRun: async () => ({}),
    listRuns: async () => [],
    cancelRun: async () => ({}),
    watchRun: async () => ({}),
    health: async () => ({ protocolVersion: 1, backendInstanceId: "b1" }),
    listProjects: async () => ({ projects: [] }),
    ...overrides,
  };
  return base as unknown as LocalCoreClient;
}

describe("LocalCoreDiscoveryPort success mapping (guide \u00a76)", () => {
  it("startDiscovery -> ok(DiscoverySession) from the restored snapshot", async () => {
    const client = fakeClient({
      restoreProject: async () => contractSnapshot({ discoverySession: contractSession() }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.startDiscovery({ projectId: "ignored", input: INPUT }, ENV);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.id).toBe("discovery_session_1");
    expect(res.value.projectId).toBe("project_1"); // SDK-owned, not "ignored"
    expect(res.value.revision).toBe(4);
    expect(res.value.status).toBe("ACTIVE");
    expect(res.value.input.learningGoal).toBe(INPUT.learningGoal);
    expect(res.value.createdAt).toBe(ISO_EPOCH);
  });

  it("generatePreviewRound -> ok(PreviewRound) with 10 previews positions 1..10", async () => {
    const client = fakeClient({
      restoreProject: async () => contractSnapshot({ previewRound: contractPreviewRound() }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.generatePreviewRound({ discoverySessionId: "discovery_session_1" }, ENV);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.previews).toHaveLength(10);
    expect(res.value.previews.map((p) => p.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(res.value.discoverySessionId).toBe("discovery_session_1");
  });

  it("enrichCandidate -> ok(ProjectCandidateRevision) mapped from enrichment", async () => {
    const target: CandidateRevisionReference = { candidateId: "cand_7", revision: 2 };
    const client = fakeClient({
      restoreProject: async () =>
        contractSnapshot({
          candidateEnrichments: [
            {
              schemaVersion: 1,
              previewRoundId: "preview_round_1",
              discoverySessionId: "discovery_session_1",
              correlationId: "corr_e",
              candidate: contractCandidate("cand_7", 2),
              createdAt: ISO,
              source: { kind: "AGENT", role: "DISCOVERY" },
              redactionStatus: "NOT_REQUIRED",
            },
          ],
        }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.enrichCandidate({ discoverySessionId: "discovery_session_1", target }, ENV);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.candidateId).toBe("cand_7");
    expect(res.value.revision).toBe(2);
    expect(res.value.coreConcepts).toContain("상태 관리");
    expect(res.value.suggestedScope.excluded).toContain("로그인");
  });

  it("submitFeedback -> ok(CandidateRound) from the latest round", async () => {
    const feedback: DiscoveryFeedback = {
      id: "feedback_1",
      intent: "MORE",
      targets: [{ candidateId: "cand_1", revision: 2 }],
      message: "더 보여줘",
    };
    const client = fakeClient({
      restoreProject: async () =>
        contractSnapshot({ rounds: [contractRound(1, "round_1"), contractRound(2, "round_2")] }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.submitFeedback({ discoverySessionId: "discovery_session_1", feedback }, ENV);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.roundIndex).toBe(2);
    expect(res.value.appliedFeedbackIds).toEqual(["feedback_1"]);
    expect(res.value.candidates).toHaveLength(2);
  });

  it("generateSpecDraft -> ok(LearningSpecRevision) DRAFT", async () => {
    const client = fakeClient({
      restoreProject: async () =>
        contractSnapshot({
          discoverySession: contractSession(),
          learningSpec: contractSpec(1, "DRAFT"),
        }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.generateSpecDraft(
      { projectId: "project_1", selectedCandidate: { candidateId: "cand_1", revision: 2 } },
      ENV,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe("DRAFT");
    expect(res.value.runtimeConstraint).toBe("TYPESCRIPT");
    expect(res.value.scope).toHaveLength(3);
    expect(res.value.selectedCandidate.candidateId).toBe("cand_1");
  });

  it("refineSpec -> ok(LearningSpecRevision) with higher revision", async () => {
    const client = fakeClient({
      restoreProject: async () =>
        contractSnapshot({
          discoverySession: contractSession(),
          learningSpec: contractSpec(2, "DRAFT", 1),
        }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.refineSpec(
      { projectId: "project_1", learningSpecId: "learning_spec_1", message: "다듬어줘" },
      ENV,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.revision).toBe(2);
    expect(res.value.parentRevision).toBe(1);
  });

  it("confirmSpec -> ok(LearningSpecRevision) CONFIRMED", async () => {
    const client = fakeClient({
      restoreProject: async () => contractSnapshot({ learningSpec: contractSpec(3, "CONFIRMED", 2) }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.confirmSpec({ projectId: "project_1", learningSpecId: "learning_spec_1" }, ENV);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe("CONFIRMED");
  });

  it("prepareBuilderTask -> ok(PreparedBuilderTask) READY", async () => {
    const client = fakeClient({ execute: async () => preparedTaskResponse() });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.prepareBuilderTask(
      { projectId: "project_1", learningSpecId: "learning_spec_1" },
      ENV,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe("READY");
    expect(res.value.projectId).toBe("project_1");
    expect(res.value.workspacePath).toBe("/generated/project_1");
  });
});

describe("LocalCoreDiscoveryPort error mapping (never throws)", () => {
  it("maps STALE_*/409 -> revision_conflict", async () => {
    const client = fakeClient({
      execute: async () => {
        throw clientError("STALE_SPEC_REVISION", 409);
      },
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.confirmSpec({ projectId: "project_1", learningSpecId: "learning_spec_1" }, ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("revision_conflict");
  });

  it("maps CORE_CONNECTION_UNAVAILABLE -> unavailable", async () => {
    const client = fakeClient({
      startDiscovery: async () => {
        throw clientError("CORE_CONNECTION_UNAVAILABLE");
      },
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.startDiscovery({ projectId: "p", input: INPUT }, ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("unavailable");
  });

  it("maps a timeout code -> timeout", async () => {
    const client = fakeClient({
      restoreProject: async () => {
        throw clientError("REQUEST_TIMEOUT");
      },
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.generatePreviewRound({ discoverySessionId: "s" }, ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("timeout");
  });

  it("maps INVALID_* -> invalid", async () => {
    const client = fakeClient({
      execute: async () => {
        throw clientError("INVALID_REQUEST", 400);
      },
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.prepareBuilderTask({ projectId: "p", learningSpecId: "s" }, ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("invalid");
  });

  it("maps an unknown code -> unknown", async () => {
    const client = fakeClient({
      startDiscovery: async () => {
        throw clientError("WEIRD_UNMAPPED_CODE");
      },
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.startDiscovery({ projectId: "p", input: INPUT }, ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("unknown");
  });

  it("returns err (never throws) when the snapshot lacks the expected entity", async () => {
    const client = fakeClient({
      restoreProject: async () => contractSnapshot({ discoverySession: null }),
    });
    const port = new LocalCoreDiscoveryPort(client);
    const res = await port.startDiscovery({ projectId: "p", input: INPUT }, ENV);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("unavailable");
  });

  it("never throws even when a raw non-Error is thrown", async () => {
    const client = fakeClient({
      startDiscovery: async () => {
        throw "string failure";
      },
    });
    const port = new LocalCoreDiscoveryPort(client);
    await expect(port.startDiscovery({ projectId: "p", input: INPUT }, ENV)).resolves.toMatchObject({
      ok: false,
    });
  });
});

describe("fail-closed native gating (guide \u00a71/\u00a710)", () => {
  it("isNativeFlowSupported() fails closed on Windows", () => {
    // This suite runs on Windows; native/live is NO-GO.
    const support = isNativeFlowSupported();
    if (process.platform === "win32") {
      expect(support.supported).toBe(false);
      expect(support.experimental).toBe(false);
      expect(support.reason).toBe("UNSUPPORTED_OS_WINDOWS_FAIL_CLOSED");
    } else if (process.platform === "darwin" && process.arch === "arm64") {
      expect(support.supported).toBe(true);
      expect(support.experimental).toBe(true);
    } else {
      expect(support.supported).toBe(false);
      expect(support.reason).toContain("FAIL_CLOSED");
    }
  });

  it("createFlowPortsAsync({}) returns mock + reason + Mock ports (no live attempt)", async () => {
    const result = await createFlowPortsAsync({});
    expect(result.mode).toBe("mock");
    expect(typeof result.reason).toBe("string");
    expect(result.reason && result.reason.length).toBeGreaterThan(0);
    expect(result.ports.discovery).toBeInstanceOf(MockDiscoveryPort);
    expect(result.ports.spec).toBe(result.ports.discovery);
  });

  it("createFlowPortsAsync with a connectionFile on an unsupported OS still fails closed", async () => {
    const result = await createFlowPortsAsync({ connectionFile: "C:/nonexistent/connection.json" });
    if (process.platform !== "darwin") {
      // Unsupported OS: never attempts a connection; reason is the OS verdict.
      expect(result.mode).toBe("mock");
      expect(result.ports.discovery).toBeInstanceOf(MockDiscoveryPort);
      expect(result.reason).toContain("FAIL_CLOSED");
    } else {
      // On darwin the connect would be attempted; either way it must not throw.
      expect(result.mode === "mock" || result.mode === "live").toBe(true);
    }
  });
});
