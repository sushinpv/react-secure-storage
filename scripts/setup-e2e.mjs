#!/usr/bin/env node
/**
 * Prepares the e2e fixture apps against the packed library, exactly as a consumer would install it:
 *   1. builds and packs the library into .pack/react-secure-storage.tgz
 *   2. for each fixture: copies the shared Demo component, installs dependencies, installs the tarball, builds the app
 *
 * Usage: node scripts/setup-e2e.mjs [next|vite|react-router ...]   (default: all)
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fixturesDir = join(root, "tests/fixtures");
export const FIXTURES = { next: "app", vite: "src", "react-router": "app" }; // fixture -> folder receiving Demo.tsx

const run = (cmd, cwd) => {
  console.log(`\n$ ${cmd}  (${cwd.replace(root, ".")})`);
  execSync(cmd, { cwd, stdio: "inherit" });
};

const selected = process.argv.slice(2);
const fixtures = selected.length ? selected : Object.keys(FIXTURES);
for (const f of fixtures) if (!(f in FIXTURES)) throw new Error(`Unknown fixture "${f}". Options: ${Object.keys(FIXTURES).join(", ")}`);

// 1. pack (npm pack runs the prepack build)
const packDir = join(root, ".pack");
rmSync(packDir, { recursive: true, force: true });
mkdirSync(packDir);
run(`npm pack --pack-destination "${packDir}"`, root);
const tarball = readdirSync(packDir).find((f) => f.endsWith(".tgz"));
renameSync(join(packDir, tarball), join(packDir, "react-secure-storage.tgz"));

// 2. fixtures
for (const fixture of fixtures) {
  const dir = join(fixturesDir, fixture);
  copyFileSync(join(fixturesDir, "shared/Demo.tsx"), join(dir, FIXTURES[fixture], "Demo.tsx"));
  run(existsSync(join(dir, "package-lock.json")) ? "npm ci --no-audit --no-fund" : "npm install --no-audit --no-fund", dir);
  run(`npm install --no-save --no-audit --no-fund "${join(packDir, "react-secure-storage.tgz")}"`, dir);
  run("npm run build", dir);
}
