import { describe, expect, it } from "vitest";

import { builderTaskLabel } from "../src/core/agent/agent-view-model";
import { fakeSnapshot } from "./support/fake-core-client";

/** K23: how the panel names the current Task ("이번 작업"). Synthetic Projects only. */
describe("builderTaskLabel", () => {
  const goal = "동아리 물품을 누가 빌려 갔는지 기록하는 간단한 API를 만들어 보고 싶어.";
  const base = fakeSnapshot().currentTask!;
  const snapshot = (task: Record<string, unknown>, project: Record<string, unknown> = {}) => fakeSnapshot({
    project: { ...fakeSnapshot().project, title: goal, learningGoal: goal, ...project },
    selectedCandidate: { title: "동아리 물품 대여 기록 API" },
    currentTask: { ...base, ...task },
  });

  it("names the first Task by the chosen product when it only repeats the goal", () => {
    expect(builderTaskLabel(snapshot({ title: goal, sequence: 1 }))).toBe("동아리 물품 대여 기록 API");
  });

  it("names a follow-up started from a Next Move by that suggestion", () => {
    expect(builderTaskLabel(snapshot({ title: `${goal} 후속 작업`, sequence: 2,
      nextMove: { nextMoveJobId: "next_move_job_1", number: 2, title: "빌린 물품 기간 조회", summary: "s", source: { kind: "AGENT", role: "DISCOVERY" } } })))
      .toBe("빌린 물품 기간 조회");
  });

  it("names any other follow-up by the product, not by the whole learning goal", () => {
    expect(builderTaskLabel(snapshot({ title: `${goal} 후속 작업`, sequence: 3 }))).toBe("동아리 물품 대여 기록 API 후속 작업");
    // A title Core did not derive from the goal stays as it is.
    expect(builderTaskLabel(snapshot({ title: "로그인 추가", sequence: 2 }))).toBe("로그인 추가");
  });
});
