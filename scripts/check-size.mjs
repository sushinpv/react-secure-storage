#!/usr/bin/env node
/**
 * Fails when the library's own built code (dist/*.js, gzip, excluding dependencies) exceeds its budget.
 * The core and the optional React entry are budgeted separately: apps that don't use the hook never load react.js.
 * Raise a budget deliberately, in the same PR as the change that needs it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGETS = {
  core: { budget: 12.5 * 1024, files: (f) => f !== "react.js" }, // v1.4.0: 11.7 KB
  "react entry": { budget: 1.5 * 1024, files: (f) => f === "react.js" }, // v1.4.0: 1.0 KB
};

const dist = resolve(import.meta.dirname, "../dist");
const files = readdirSync(dist).filter((f) => f.endsWith(".js"));
const sizes = Object.fromEntries(files.map((f) => [f, gzipSync(readFileSync(join(dist, f))).length]));
for (const [file, size] of Object.entries(sizes)) console.log(`${file.padEnd(26)} ${String(size).padStart(6)} B gzip`);

let failed = false;
for (const [name, { budget, files: match }] of Object.entries(BUDGETS)) {
  const total = Object.entries(sizes).filter(([f]) => match(f)).reduce((sum, [, size]) => sum + size, 0);
  const ok = total <= budget;
  failed ||= !ok;
  console.log(`${(ok ? "✓ " : "✗ ") + name.padEnd(24)} ${String(total).padStart(6)} B gzip (budget ${budget} B)`);
}
if (failed) {
  console.error("Size budget exceeded");
  process.exit(1);
}
