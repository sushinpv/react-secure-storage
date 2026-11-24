/**
 * Server-side rendering: the built package must import and run in plain Node without browser globals.
 * Uses the compiled `dist/` output (`npm test` builds it first).
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);

const loadDist = () => {
  for (const id of Object.keys(require.cache)) if (id.includes("/dist/")) delete require.cache[id];
  return {
    storage: require("../../dist/index.js"),
    syncStorage: require("../../dist/sync.js"),
    useSecureStorage: require("../../dist/react.js").useSecureStorage,
  };
};

describe("SSR (Node, no browser globals)", () => {
  it("runs without window or document", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("imports every entry without throwing", () => {
    expect(() => loadDist()).not.toThrow();
  });

  it("async API: reads resolve to null, writes resolve without storing anything", async () => {
    const { storage } = loadDist();
    await expect(storage.setItem("user", { name: "Alice" })).resolves.toBeUndefined();
    await expect(storage.getItem("user")).resolves.toBeNull(); // no state shared between requests
    await expect(storage.removeItem("user")).resolves.toBeUndefined();
    await expect(storage.clear()).resolves.toBeUndefined();
  });

  it("sync API: ready() resolves, reads return null, writes are no-ops", async () => {
    const { syncStorage } = loadDist();
    await expect(syncStorage.ready()).resolves.toBeUndefined();
    syncStorage.setItem("user", "Alice");
    expect(syncStorage.getItem("user")).toBeNull();
    expect(() => {
      syncStorage.removeItem("user");
      syncStorage.clear();
    }).not.toThrow();
  });

  it("hook renders the initial value with loading true", () => {
    const { useSecureStorage } = loadDist();
    const Component = () => {
      const [theme, , , { loading }] = useSecureStorage("theme", "light");
      return createElement("span", null, `${theme}:${loading}`);
    };
    expect(renderToString(createElement(Component))).toBe("<span>light:true</span>");
  });
});

describe("package exports (resolved by name, as consumers do)", () => {
  const root = resolve(import.meta.dirname, "../..");
  const run = (code: string, type: "module" | "commonjs") =>
    execFileSync(process.execPath, [`--input-type=${type}`, "-e", code], { encoding: "utf8", cwd: root }).trim();

  it("native ESM: default and named imports of every entry", () => {
    const out = run(
      `import storage, { configure } from "react-secure-storage";
       import syncStorage, { configure as configureSync } from "react-secure-storage/sync";
       import useDefault, { useSecureStorage } from "react-secure-storage/react";
       console.log([typeof storage.getItem, typeof configure, typeof syncStorage.ready, typeof configureSync, useDefault === useSecureStorage].join(","));`,
      "module"
    );
    expect(out).toBe("function,function,function,function,true");
  });

  it("CommonJS: require() and require().default of every entry", () => {
    const out = run(
      `const storage = require("react-secure-storage");
       const syncStorage = require("react-secure-storage/sync");
       const hook = require("react-secure-storage/react");
       console.log([storage.default === storage, typeof storage.configure, syncStorage.default === syncStorage, typeof hook.useSecureStorage, hook.default === hook].join(","));`,
      "commonjs"
    );
    expect(out).toBe("true,function,true,function,true");
  });

  it("does not expose internal paths", () => {
    expect(() => run(`require("react-secure-storage/dist/core/store.js")`, "commonjs")).toThrow();
  });
});
