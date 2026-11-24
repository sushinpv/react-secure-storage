#!/usr/bin/env node
/**
 * Measures v2 startup and read costs in a real browser (Chromium, Web Crypto), using the Vite fixture's bench page.
 *
 * Prepare: node scripts/setup-e2e.mjs vite
 * Run:     node scripts/benchmark.mjs            (laptop speed, and 4x CPU slowdown as a mid-range phone stand-in)
 *          node scripts/benchmark.mjs --quick    (smoke test for CI: small data set, no slowdown)
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const quick = process.argv.includes("--quick");
const PORT = 3102;
const BASE = `http://127.0.0.1:${PORT}/bench.html`;
const RUNS = quick ? 1 : 5;

// [label, entries, characters per value]
const SCENARIOS = quick
  ? [["10 entries", 10, 100]]
  : [
      ["10 entries", 10, 100],
      ["100 entries", 100, 100],
      ["1,000 entries", 1000, 100],
      ["~4 MB (1,000 × 3 KB)", 1000, 3000],
    ];
const CPU = quick ? [["laptop", 1]] : [["laptop", 1], ["4× CPU slowdown", 4]];

const server = spawn("npm", ["start"], { cwd: resolve(import.meta.dirname, "../tests/fixtures/vite"), stdio: "ignore", detached: true });
const stopServer = () => {
  try {
    process.kill(-server.pid);
  } catch {}
};

const waitForServer = async () => {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("bench server did not start");
};

const median = (values) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  const visit = async (query) => {
    await page.goto(`${BASE}?${query}`);
    await page.waitForFunction(() => window.__result !== undefined, null, { timeout: 120_000 });
    const result = await page.evaluate(() => window.__result);
    if (result.error) throw new Error(result.error);
    return result;
  };

  const rows = [];
  for (const [cpuLabel, rate] of CPU) {
    for (const [label, count, size] of SCENARIOS) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      const { chars } = await visit(`mode=seed&count=${count}&size=${size}`);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      const ready = [];
      const first = [];
      const perRead = [];
      for (let run = 0; run < RUNS; run++) {
        const sync = await visit("mode=sync");
        if (!sync.loaded) throw new Error("sync ready() did not load data");
        ready.push(sync.readyMs);
        const async = await visit(`mode=async&count=${Math.min(count, 100)}`);
        first.push(async.firstMs);
        perRead.push(async.perReadMs);
      }
      rows.push([cpuLabel, label, `${(chars / 1e6).toFixed(2)} M`, median(ready), median(first), median(perRead)]);
    }
  }
  await browser.close();

  console.log(`\nChromium ${browser.version()} · median of ${RUNS} cold page loads\n`);
  console.log("| CPU | Stored data | localStorage chars | sync `ready()` | async first `getItem` | async per `getItem` |");
  console.log("|---|---|---|---|---|---|");
  for (const [cpu, label, chars, ready, first, per] of rows) {
    console.log(`| ${cpu} | ${label} | ${chars} | ${ready.toFixed(1)} ms | ${first.toFixed(1)} ms | ${per.toFixed(2)} ms |`);
  }
} finally {
  stopServer();
}
