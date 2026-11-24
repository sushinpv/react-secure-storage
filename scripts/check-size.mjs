#!/usr/bin/env node
/**
 * Fails when the library's own built code (dist/*.js, gzip, excluding dependencies) exceeds the budget.
 * Raise the budget deliberately, in the same PR as the change that needs it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 11 * 1024; // v1.3.3: 10.6 KB
const dist = resolve(import.meta.dirname, "../dist");
const files = readdirSync(dist).filter((f) => f.endsWith(".js"));
let total = 0;
for (const file of files) {
  const size = gzipSync(readFileSync(join(dist, file))).length;
  total += size;
  console.log(`${file.padEnd(26)} ${String(size).padStart(6)} B gzip`);
}
console.log(`${"total".padEnd(26)} ${String(total).padStart(6)} B gzip (budget ${BUDGET_BYTES} B)`);
if (total > BUDGET_BYTES) {
  console.error(`Size budget exceeded by ${total - BUDGET_BYTES} B`);
  process.exit(1);
}
