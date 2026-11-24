#!/usr/bin/env node
/**
 * Post-build step: make the CommonJS entry export the storage instance itself, with `.default` pointing to the same instance.
 *
 * Babel emits `exports.default = instance` with `__esModule`, which bundlers understand but native Node ESM does not:
 * `import s from "react-secure-storage"` in an unbundled SSR server (React Router, Remix, Astro) received `{ default }`.
 * After this step `import s from`, `require()` and `require().default` all return the same single instance.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const entry = resolve(import.meta.dirname, "../dist/index.js");
const marker = "// cjs-interop";
if (!readFileSync(entry, "utf8").includes(marker)) {
  appendFileSync(
    entry,
    `\n${marker}: one instance for require(), require().default and native ESM default imports\n` +
      `module.exports = exports.default;\n` +
      `Object.defineProperty(module.exports, "default", { value: module.exports, enumerable: false });\n`
  );
}
