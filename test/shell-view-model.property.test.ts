import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { selectShellSurface } from "../src/webview/shell-view-model";
import { derivePhase } from "../src/core/flow/flow-snapshot";
import type { FlowPhase, FlowSnapshot } from "../src/core/flow/flow-snapshot";

/**
 * Property-based test for task 13.3.
 *
 * // Feature: discovery-spec-flow, Property 15: Phase derives deterministically from project status
 *
 * Property: `selectShellSurface` (and the underlying phase derivation) is a
 * pure, total function of its input:
 *   - a `null` snapshot -> "build"
 *   - phases discovery_start / discovery_workspace / spec_review -> "flow"
 *   - phase building -> "build"
 * and the same input always yields the same output.
 *
 * We generate arbitrary FlowSnapshots varying the phase across ALL FlowPhase
 * values (the other fields are irrelevant to the mapping and are held minimal),
 * and separately confirm `derivePhase` is deterministic and total over all
 * ProjectStatus values plus null.
 *
 * Validates: Requirements 12.2, 12.3.
 */

const NUM_RUNS = 100;

const ALL_PHASES: readonly FlowPhase[] = [
  "discovery_start",
  "discovery_workspace",
  "spec_review",
  "building",
];

const phaseArb: fc.Arbitrary<FlowPhase> = fc.constantFrom(...ALL_PHASES);

/** Build a minimal-but-valid FlowSnapshot with the given phase. */
function snapshotWithPhase(phase: FlowPhase): FlowSnapshot {
  return {
    phase,
    project: null,
    input: null,
    previewRound: null,
    rounds: [],
    enrichedCandidates: [],
    basket: [],
    selectedCandidate: null,
    spec: null,
    preparedTask: null,
    discoveryInProgress: false,
    specInProgress: false,
    notice: null,
  };
}

/** The expected shell surface for a phase, per Req 12.2/12.3. */
function expectedSurface(phase: FlowPhase): "flow" | "build" {
  return phase === "building" ? "build" : "flow";
}

describe("Property 15: Phase derives deterministically from project status (task 13.3)", () => {
  it("null snapshot always maps to build", () => {
    expect(selectShellSurface(null)).toBe("build");
  });

  it("selectShellSurface maps every phase per Req 12.2/12.3 and is pure", () => {
    fc.assert(
      fc.property(phaseArb, (phase) => {
        const snapshot = snapshotWithPhase(phase);
        const surface = selectShellSurface(snapshot);

        // Mapping holds for all phases.
        expect(surface).toBe(expectedSurface(phase));

        // Pure function: same input -> same output across repeated calls.
        expect(selectShellSurface(snapshot)).toBe(surface);
        expect(selectShellSurface(snapshotWithPhase(phase))).toBe(surface);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("derivePhase is deterministic and total over ProjectStatus x hasPreviewRound", () => {
    const statusArb = fc.constantFrom(
      "DISCOVERY" as const,
      "SPEC_REVIEW" as const,
      "BUILDING" as const,
      "COMPLETED" as const,
      null,
    );
    fc.assert(
      fc.property(statusArb, fc.boolean(), (status, hasPreviewRound) => {
        const phase = derivePhase(status, hasPreviewRound);
        // Total: always one of the four phases.
        expect(ALL_PHASES).toContain(phase);
        // Deterministic: identical inputs give identical outputs.
        expect(derivePhase(status, hasPreviewRound)).toBe(phase);

        // Spot-check the documented mapping (Req 12.2/12.3).
        if (status === "SPEC_REVIEW") {
          expect(phase).toBe("spec_review");
        } else if (status === "BUILDING" || status === "COMPLETED") {
          expect(phase).toBe("building");
        } else {
          expect(phase).toBe(hasPreviewRound ? "discovery_workspace" : "discovery_start");
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
