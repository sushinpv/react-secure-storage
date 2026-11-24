/**
 * Hydration: HTML rendered on the server must hydrate in the browser (with stored data) without a mismatch.
 * The server phase runs in plain Node; the browser phase installs a jsdom window with IndexedDB afterwards and loads
 * a fresh copy of the built package, mirroring a real SSR page load.
 */
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { IDBFactory } from "fake-indexeddb";
import { createElement, useEffect, useState, type FunctionComponent } from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);

const loadDist = () => {
  for (const id of Object.keys(require.cache)) if (id.includes("/dist/")) delete require.cache[id];
  return { storage: require("../../dist/index.js"), useSecureStorage: require("../../dist/react.js").useSecureStorage };
};
type Dist = ReturnType<typeof loadDist>;

/** The hook: hydration-safe by design */
const makeHook = ({ useSecureStorage }: Dist) =>
  function WithHook() {
    const [user, , , { loading }] = useSecureStorage("user", "nobody");
    return createElement("span", null, loading ? "loading" : user);
  };

/** Core async API read after mount */
const makeEffect = ({ storage }: Dist) =>
  function WithEffect() {
    const [user, setUser] = useState<string | null>(null);
    useEffect(() => {
      storage.getItem("user").then(setUser);
    }, []);
    return createElement("span", null, user ?? "loading");
  };

/** Anti-pattern: render-time difference between server and browser */
const makeUnsafe = () =>
  function Unsafe() {
    return createElement("span", null, typeof window === "undefined" ? "server" : "browser");
  };

const GLOBALS = ["window", "document", "navigator", "localStorage", "indexedDB", "HTMLElement", "HTMLCanvasElement", "Node", "Event", "StorageEvent", "IS_REACT_ACT_ENVIRONMENT"];
const saved = new Map(GLOBALS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));

const installBrowser = (html: string) => {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root">${html}</div></body></html>`, { url: "https://example.test/" });
  const win = dom.window as unknown as Window & typeof globalThis;
  const define = (k: string, v: unknown) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  define("window", win);
  define("document", win.document);
  define("navigator", win.navigator);
  define("localStorage", win.localStorage);
  define("indexedDB", new IDBFactory());
  define("HTMLElement", win.HTMLElement);
  define("HTMLCanvasElement", win.HTMLCanvasElement);
  define("Node", win.Node);
  define("Event", win.Event);
  define("StorageEvent", win.StorageEvent);
  define("IS_REACT_ACT_ENVIRONMENT", true);
  return win;
};

const hydrate = async (factory: (dist: Dist) => FunctionComponent) => {
  // 1. Server render (no browser globals)
  const serverHtml = renderToString(createElement(factory(loadDist())));

  // 2. Browser: data stored on a previous visit
  const win = installBrowser(serverHtml);
  await loadDist().storage.setItem("user", "Alice");

  // 3. Fresh page load in the browser, hydrate the server HTML
  const dist = loadDist();
  const { hydrateRoot } = require("react-dom/client");
  const { act } = require("react");
  const errors: unknown[] = [];
  const container = win.document.getElementById("root")!;
  await act(async () => {
    hydrateRoot(container, createElement(factory(dist)), { onRecoverableError: (e: unknown) => errors.push(e) });
  });
  for (let i = 0; i < 50 && container.textContent === "loading"; i++) {
    await act(() => new Promise((r) => setTimeout(r, 10)));
  }
  return { serverHtml, text: container.textContent, errors };
};

afterEach(() => {
  for (const [k, d] of saved) {
    if (d) Object.defineProperty(globalThis, k, d);
    else delete (globalThis as Record<string, unknown>)[k];
  }
});

describe("hydration", () => {
  it("useSecureStorage hydrates without mismatch, then shows the stored value", async () => {
    const result = await hydrate(makeHook);
    expect(result.serverHtml).toBe("<span>loading</span>");
    expect(result.errors).toEqual([]);
    expect(result.text).toBe("Alice");
  });

  it("async API read in useEffect hydrates without mismatch", async () => {
    const result = await hydrate(makeEffect);
    expect(result.errors).toEqual([]);
    expect(result.text).toBe("Alice");
  });

  it("a render-time difference causes a hydration mismatch (test can detect it)", async () => {
    const result = await hydrate(makeUnsafe);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
