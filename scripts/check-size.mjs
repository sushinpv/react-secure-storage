#!/usr/bin/env node
/**
 * Fails when the library's own built code (gzip, excluding dependencies) exceeds its budget.
 * Budgets follow what an app actually loads: the core always; the sync and React entries only when imported;
 * the legacy cipher only in fallback mode or during migration (dynamic import, together with crypto-js).
 * Raise a budget deliberately, in the same PR as the change that needs it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const GROUPS = {
  "core (always loaded)": { budget: 10.5 * 1024, files: ["index.js", "envHelper.js", "utils.js", "core/config.js", "core/environment.js", "core/keys.js", "core/payload.js", "core/store.js", "core/types.js", "core/webcrypto.js"] }, // v2.0.0: 9.9 KB
  "sync entry": { budget: 2.5 * 1024, files: ["sync.js"] }, // v2.0.0: 1.9 KB
  "react entry": { budget: 1.5 * 1024, files: ["react.js"] }, // v2.0.0: 1.1 KB
  "legacy (lazy)": { budget: 5.5 * 1024, files: ["core/legacy.js", "core/fingerprint.lib.js"] }, // v2.0.0: 4.5 KB
};

const dist = resolve(import.meta.dirname, "../dist");
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk(dist).filter((f) => f.endsWith(".js")).map((f) => relative(dist, f));
const sizes = Object.fromEntries(files.map((f) => [f, gzipSync(readFileSync(join(dist, f))).length]));

const grouped = new Set(Object.values(GROUPS).flatMap((g) => g.files));
const ungrouped = files.filter((f) => !grouped.has(f));
if (ungrouped.length) {
  console.error(`Files missing from a size group: ${ungrouped.join(", ")}`);
  process.exit(1);
}

let failed = false;
for (const [name, { budget, files: groupFiles }] of Object.entries(GROUPS)) {
  const total = groupFiles.reduce((sum, f) => sum + (sizes[f] ?? 0), 0);
  const ok = total <= budget;
  failed ||= !ok;
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(22)} ${String(total).padStart(6)} B gzip (budget ${budget} B)`);
}
if (failed) {
  console.error("Size budget exceeded");
  process.exit(1);
}
