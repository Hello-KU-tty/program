import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    globals: false,
    // fast-check property suites exceed 5s under full parallel load on Windows.
    testTimeout: 30_000,
  },
});
