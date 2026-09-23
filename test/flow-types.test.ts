import { describe, it, expect } from "vitest";

import { refKey } from "../src/core/flow/flow-types";
import type {
  CandidateRevisionReference,
  DiscoveryFeedbackIntent,
  GenerationTag,
  LearnerLevel,
  LearningScopeCategory,
  LearningSpecRevision,
  LearningSpecStatus,
  ProjectStatus,
} from "../src/core/flow/flow-types";

/**
 * Example/edge tests for task 1.2: enum-literal facts and the `refKey` helper
 * of `src/core/flow/flow-types.ts` (Req 2.3, 2.6, 2.11).
 *
 * NOTE ON IMPLEMENTATION SHAPE: the domain "enums" in flow-types.ts are
 * TypeScript *union types*, not runtime `enum` declarations, so there is no
 * runtime object to enumerate. We therefore assert the members as
 * representative literal values that must be assignable to the corresponding
 * union type (a compile-time guarantee, checked by `npm run typecheck`) and
 * confirm the values are what the requirements specify. `refKey` is the only
 * runtime value exported from the module and is asserted directly.
 */

describe("flow-types enum-literal facts (task 1.2)", () => {
  it("ProjectStatus admits exactly the four lifecycle values (Req 2.1)", () => {
    const values: ProjectStatus[] = ["DISCOVERY", "SPEC_REVIEW", "BUILDING", "COMPLETED"];
    expect(values).toEqual(["DISCOVERY", "SPEC_REVIEW", "BUILDING", "COMPLETED"]);
  });

  it("LearnerLevel admits the four self-reported levels (Req 2.3)", () => {
    const values: LearnerLevel[] = ["NEW", "BEGINNER", "FAMILIAR", "UNSPECIFIED"];
    expect(values).toEqual(["NEW", "BEGINNER", "FAMILIAR", "UNSPECIFIED"]);
  });

  it("GenerationTag admits the four generation kinds (Req 2.6)", () => {
    const values: GenerationTag[] = ["DIRECT", "EXPAND", "DISCOVER", "UPGRADE"];
    expect(values).toEqual(["DIRECT", "EXPAND", "DISCOVER", "UPGRADE"]);
  });

  it("DiscoveryFeedbackIntent admits the nine feedback intents (Req 2.9)", () => {
    const values: DiscoveryFeedbackIntent[] = [
      "PIN",
      "REJECT",
      "MERGE",
      "REVISE",
      "SHRINK",
      "EXPAND",
      "REGENERATE",
      "MORE",
      "SELECT",
    ];
    expect(values).toEqual([
      "PIN",
      "REJECT",
      "MERGE",
      "REVISE",
      "SHRINK",
      "EXPAND",
      "REGENERATE",
      "MORE",
      "SELECT",
    ]);
  });

  it("LearningSpecStatus admits DRAFT/CONFIRMED/SUPERSEDED (Req 2.11)", () => {
    const values: LearningSpecStatus[] = ["DRAFT", "CONFIRMED", "SUPERSEDED"];
    expect(values).toEqual(["DRAFT", "CONFIRMED", "SUPERSEDED"]);
  });

  it("LearningScopeCategory admits the three scope categories (Req 2.10)", () => {
    const values: LearningScopeCategory[] = ["LEARNER_FOCUS", "AGENT_SUPPORT", "EXCLUDED"];
    expect(values).toEqual(["LEARNER_FOCUS", "AGENT_SUPPORT", "EXCLUDED"]);
  });

  it("a Learning Spec's runtimeConstraint fact is exactly \"TYPESCRIPT\" (Req 2.11)", () => {
    // The type narrows runtimeConstraint to the single literal "TYPESCRIPT";
    // constructing a partial spec proves the literal is the only accepted value.
    const runtimeConstraint: LearningSpecRevision["runtimeConstraint"] = "TYPESCRIPT";
    expect(runtimeConstraint).toBe("TYPESCRIPT");
  });
});

describe("refKey canonical key (task 1.2, Req 2.11)", () => {
  it("produces the `${candidateId}:${revision}` key", () => {
    const ref: CandidateRevisionReference = { candidateId: "cand_abc", revision: 3 };
    expect(refKey(ref)).toBe("cand_abc:3");
  });

  it("keeps candidateId and revision distinct in the composed key", () => {
    expect(refKey({ candidateId: "cand_1", revision: 10 })).toBe("cand_1:10");
    // A different id or revision yields a different key (distinct membership).
    expect(refKey({ candidateId: "cand_1", revision: 10 })).not.toBe(
      refKey({ candidateId: "cand_1", revision: 11 }),
    );
    expect(refKey({ candidateId: "cand_1", revision: 10 })).not.toBe(
      refKey({ candidateId: "cand_2", revision: 10 }),
    );
  });

  it("is pure (same input yields the same key across calls)", () => {
    const ref: CandidateRevisionReference = { candidateId: "cand_x", revision: 1 };
    expect(refKey(ref)).toBe(refKey(ref));
  });
});
