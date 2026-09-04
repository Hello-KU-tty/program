import { describe, it, expect } from "vitest";
import fc from "fast-check";

// Trivial smoke test to confirm the toolchain (Vitest + fast-check) runs.
describe("toolchain smoke test", () => {
  it("runs a basic unit assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("runs a basic fast-check property", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
      { numRuns: 100 }
    );
  });
});
