import { describe, expect, it } from "vitest";
import { parseWebviewToHostFlow } from "../src/webview/flow/flow-messages";

const ref = { candidateId: "candidate_1", revision: 1 };

describe("untrusted flow message boundary", () => {
  const valid: unknown[] = [
    { type: "startDiscovery", input: { learningGoal: " TypeScript 상태 전이 " } },
    { type: "startDiscovery", input: { learningGoal: "x".repeat(240), personalNeed: "x".repeat(4000), recentFriction: "문제", interestAreas: Array(12).fill("x".repeat(120)), currentLevel: "BEGINNER", freeContext: "선택 입력" } },
    { type: "toggleBasket", ref },
    { type: "selectCandidate", target: ref },
    ...["narrow", "merge", "new_direction", "show_more"].map((action) => ({ type: "submitRefinement", action, text: "", targets: [ref] })),
    { type: "refineSpec", message: "학습 범위를 줄여 주세요" },
    { type: "confirmSpec" },
    { type: "draftChangedFlow", field: "learningGoal", text: "" },
    { type: "refreshHistory" },
    { type: "openHistoryProject", projectId: "project_1" },
  ];

  it.each(valid.map((message, index) => ({ message, index })))("preserves valid payload $index without changing the UI contract", ({ message }) => {
    expect(parseWebviewToHostFlow(message)).toEqual(message);
  });

  const malformed: [string, unknown][] = [
    ["missing input", { type: "startDiscovery" }],
    ["null input", { type: "startDiscovery", input: null }],
    ["array input", { type: "startDiscovery", input: [] }],
    ["non-string goal", { type: "startDiscovery", input: { learningGoal: 42 } }],
    ["empty goal", { type: "startDiscovery", input: { learningGoal: " \n " } }],
    ["oversized goal", { type: "startDiscovery", input: { learningGoal: "x".repeat(241) } }],
    ["unknown input field", { type: "startDiscovery", input: { learningGoal: "goal", workspacePath: "/untrusted/path" } }],
    ["wrong optional field", { type: "startDiscovery", input: { learningGoal: "goal", personalNeed: {} } }],
    ["oversized optional field", { type: "startDiscovery", input: { learningGoal: "goal", freeContext: "x".repeat(4001) } }],
    ["invalid level", { type: "startDiscovery", input: { learningGoal: "goal", currentLevel: "ADMIN" } }],
    ["wrong interest list", { type: "startDiscovery", input: { learningGoal: "goal", interestAreas: "one" } }],
    ["too many interests", { type: "startDiscovery", input: { learningGoal: "goal", interestAreas: Array(13).fill("one") } }],
    ["non-string interest", { type: "startDiscovery", input: { learningGoal: "goal", interestAreas: [1] } }],
    ["sparse interests", { type: "startDiscovery", input: { learningGoal: "goal", interestAreas: Array(1) } }],
    ["oversized interest", { type: "startDiscovery", input: { learningGoal: "goal", interestAreas: ["x".repeat(121)] } }],
    ["missing reference", { type: "toggleBasket" }],
    ["wrong reference", { type: "selectCandidate", target: "candidate_1" }],
    ["zero revision", { type: "toggleBasket", ref: { ...ref, revision: 0 } }],
    ["fractional revision", { type: "toggleBasket", ref: { ...ref, revision: 1.5 } }],
    ["unsafe revision", { type: "toggleBasket", ref: { ...ref, revision: Number.MAX_SAFE_INTEGER + 1 } }],
    ["unknown reference field", { type: "selectCandidate", target: { ...ref, token: "not-a-real-token" } }],
    ["unknown action", { type: "submitRefinement", action: "execute", targets: [], text: "" }],
    ["missing text", { type: "submitRefinement", action: "show_more", targets: [] }],
    ["wrong targets", { type: "submitRefinement", action: "merge", targets: {}, text: "" }],
    ["null target", { type: "submitRefinement", action: "merge", targets: [null], text: "" }],
    ["sparse targets", { type: "submitRefinement", action: "merge", targets: Array(2), text: "" }],
    ["unbounded targets", { type: "submitRefinement", action: "merge", targets: Array(101).fill(ref), text: "" }],
    ["oversized text", { type: "submitRefinement", action: "show_more", targets: [], text: "x".repeat(4001) }],
    ["missing spec text", { type: "refineSpec" }],
    ["empty spec text", { type: "refineSpec", message: " " }],
    ["extra command fields", { type: "confirmSpec", kind: "builder/start" }],
    ["wrong draft field", { type: "draftChangedFlow", field: 1, text: "" }],
    ["missing project", { type: "openHistoryProject" }],
    ["project path", { type: "openHistoryProject", projectId: "../../other" }],
    ["inherited message", Object.create({ type: "confirmSpec" })],
    ["array message", Object.assign([], { type: "refreshHistory" })],
    ["unknown message", { type: "not-a-flow-message" }],
    ["null", null],
  ];

  it.each(malformed)("drops %s before dispatch", (_label, message) => {
    expect(parseWebviewToHostFlow(message)).toBeNull();
  });
});
