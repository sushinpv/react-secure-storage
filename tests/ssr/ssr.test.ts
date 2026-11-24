/**
 * Server-side rendering: the built package must import and run in plain Node without browser globals.
 * Uses the compiled `dist/` output (run `npm run build:lib` first; `npm test` does this).
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);
type SecureStorage = typeof import("../../src/lib/index").default;

const loadDist = (): SecureStorage => {
  for (const id of Object.keys(require.cache)) if (id.includes("/dist/")) delete require.cache[id];
  return require("../../dist/index.js").default;
};

describe("SSR (Node, no browser globals)", () => {
  it("runs without window or document", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("imports without throwing", () => {
    expect(() => loadDist()).not.toThrow();
  });

  it("getItem returns null", () => {
    expect(loadDist().getItem("anything")).toBeNull();
  });

  it("setItem, removeItem and clear are no-ops that do not throw", () => {
    const storage = loadDist();
    expect(() => {
      storage.setItem("k", "v");
      storage.setItem("o", { a: 1 });
      storage.removeItem("k");
      storage.clear();
    }).not.toThrow();
  });

  it("keeps no state between server requests", () => {
    const storage = loadDist();
    // request 1 writes user data
    storage.setItem("user", { name: "Alice" });
    // request 2 must not see it
    expect(storage.getItem("user")).toBeNull();
  });

  it("can be used while rendering a React tree to a string", () => {
    const storage = loadDist();
    const Component = () => createElement("span", null, String(storage.getItem("user") ?? "none"));
    expect(renderToString(createElement(Component))).toBe("<span>none</span>");
  });
});

describe("useSecureStorage on the server", () => {
  it("renders the initial value and setters are safe no-ops", () => {
    for (const id of Object.keys(require.cache)) if (id.includes("/dist/")) delete require.cache[id];
    const { useSecureStorage } = require("../../dist/react.js");
    let setter: ((v: unknown) => void) | undefined;
    const Component = () => {
      const [theme, setTheme] = useSecureStorage("theme", "light");
      setter = setTheme;
      return createElement("span", null, theme);
    };
    expect(renderToString(createElement(Component))).toBe("<span>light</span>");
    expect(() => setter!("dark")).not.toThrow();
  });
});

describe("package exports (resolved by name, as consumers do)", () => {
  const root = resolve(import.meta.dirname, "../..");
  const run = (code: string, type: "module" | "commonjs") =>
    execFileSync(process.execPath, [`--input-type=${type}`, "-e", code], { encoding: "utf8", cwd: root }).trim();

  it("ESM: root and /react entries resolve, and share one storage instance", () => {
    const out = run(
      `import s from "react-secure-storage";
       import { useSecureStorage } from "react-secure-storage/react";
       import hookDefault from "react-secure-storage/react";
       import { createRequire } from "node:module";
       const require = createRequire(import.meta.url);
       const deep = require("react-secure-storage/dist/index.js");
       console.log([typeof s.setItem, typeof useSecureStorage, hookDefault === useSecureStorage, deep === s].join(","));`,
      "module"
    );
    expect(out).toBe("function,function,true,true");
  });

  it("CommonJS: require of root, /react and deep dist paths", () => {
    const out = run(
      `const s = require("react-secure-storage");
       const { useSecureStorage } = require("react-secure-storage/react");
       console.log([typeof s.setItem, s.default === s, typeof useSecureStorage, require("react-secure-storage/dist/index.js") === s].join(","));`,
      "commonjs"
    );
    expect(out).toBe("function,true,function,true");
  });
});

describe("module formats (built package)", () => {
  const dist = resolve(import.meta.dirname, "../../dist/index.js");
  // Run in a real Node process: vitest's own module loader would hide Node's ESM/CommonJS interop behaviour.
  const node = (code: string, type: "module" | "commonjs") =>
    execFileSync(process.execPath, [`--input-type=${type}`, "-e", code], { encoding: "utf8" }).trim();
  const check = (expr: string) =>
    `const s = ${expr}; console.log([typeof s.setItem, typeof s.getItem, typeof s.removeItem, typeof s.clear, String(s.getItem("k"))].join(","));`;

  it("default import from native Node ESM (React Router / Remix / Astro SSR)", () => {
    expect(node(`import s0 from ${JSON.stringify(dist)}; ${check("s0")}`, "module")).toBe("function,function,function,function,null");
  });

  it("require() returns the instance", () => {
    expect(node(check(`require(${JSON.stringify(dist)})`), "commonjs")).toBe("function,function,function,function,null");
  });

  it("require().default still works (existing CommonJS and transpiled consumers)", () => {
    expect(node(check(`require(${JSON.stringify(dist)}).default`), "commonjs")).toBe("function,function,function,function,null");
  });

  it("all forms share one instance", () => {
    const out = node(`import s0 from ${JSON.stringify(dist)}; import { createRequire } from "node:module"; const r = createRequire(import.meta.url)(${JSON.stringify(dist)}); console.log(s0 === r && r === r.default);`, "module");
    expect(out).toBe("true");
  });
});

