import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "browser",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}", "tests/legacy/**/*.test.ts"],
          setupFiles: ["tests/setup/browser.ts"],
        },
      },
      {
        test: {
          name: "ssr",
          environment: "node",
          include: ["tests/ssr/**/*.test.ts"],
          // each file gets its own Node process so browser globals installed by one test never leak into another
          isolate: true,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.d.ts"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 90, statements: 85, functions: 90, branches: 70 },
    },
  },
});
