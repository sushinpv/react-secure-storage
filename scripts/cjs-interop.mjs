#!/usr/bin/env node
/**
 * Post-build step: make each CommonJS entry export its default value directly, keeping named exports and `.default`.
 *
 * Babel emits `exports.default = value` with `__esModule`, which bundlers understand but native Node ESM does not:
 * `import s from "react-secure-storage"` in an unbundled SSR server (React Router, Remix, Astro) received `{ default }`.
 * After this step, for each entry:
 *   - `import x from` (native ESM), `require()` and `require().default` return the same value
 *   - named exports (e.g. `useSecureStorage`) still work with `import { name }` and `require().name`
 */
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENTRIES = ["index.js", "react.js"];
const marker = "// cjs-interop";

for (const file of ENTRIES) {
  const entry = resolve(import.meta.dirname, "../dist", file);
  if (readFileSync(entry, "utf8").includes(marker)) continue;
  appendFileSync(
    entry,
    `\n${marker}: one value for require(), require().default and native ESM default imports\n` +
      `var __named = exports;\n` +
      `module.exports = __named.default;\n` +
      `Object.keys(__named).forEach(function (name) {\n` +
      `  if (name !== "default" && name !== "__esModule") module.exports[name] = __named[name];\n` +
      `});\n` +
      `Object.defineProperty(module.exports, "default", { value: module.exports, enumerable: false });\n`
  );
}
