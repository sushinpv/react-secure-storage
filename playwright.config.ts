import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against real framework builds of the packed library.
 * Prepare first: `node scripts/setup-e2e.mjs` (or a subset, e.g. `node scripts/setup-e2e.mjs vite`).
 * Select fixtures with E2E_FIXTURES=next,vite,react-router (default: all).
 */
const fixtures = {
  next: { port: 3101, ssr: true, prefix: "next-e2e.", paths: ["/", "/pages-router"] },
  vite: { port: 3102, ssr: false, prefix: "vite-e2e.", paths: ["/"] },
  "react-router": { port: 3103, ssr: true, prefix: "@secure.", paths: ["/"] },
} as const;

export type FixtureName = keyof typeof fixtures;
export type FixtureOptions = { fixture: FixtureName; ssr: boolean; prefix: string; paths: readonly string[] };

const selected = (process.env.E2E_FIXTURES?.split(",") ?? Object.keys(fixtures)) as FixtureName[];
const browsers = { chromium: devices["Desktop Chrome"], firefox: devices["Desktop Firefox"], webkit: devices["Desktop Safari"] };
// All browser engines on the client-only app; Chromium on the SSR apps (SSR behaviour does not depend on the browser).
const browsersFor = (name: FixtureName) => (name === "vite" ? Object.keys(browsers) : ["chromium"]) as (keyof typeof browsers)[];

export default defineConfig<FixtureOptions>({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: selected.flatMap((name) =>
    browsersFor(name).map((browser) => ({
      name: `${name}-${browser}`,
      use: {
        ...browsers[browser],
        baseURL: `http://localhost:${fixtures[name].port}`,
        fixture: name,
        ssr: fixtures[name].ssr,
        prefix: fixtures[name].prefix,
        paths: fixtures[name].paths,
      },
    }))
  ),
  webServer: selected.map((name) => ({
    command: "npm start",
    cwd: `tests/fixtures/${name}`,
    url: `http://localhost:${fixtures[name].port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  })),
});
