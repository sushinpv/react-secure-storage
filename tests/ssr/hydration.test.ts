/**
 * Hydration: HTML rendered on the server (no storage) must hydrate in the browser (with stored data)
 * without a mismatch when the documented pattern is used (read storage in useEffect).
 *
 * The server phase runs in plain Node; the browser phase installs a jsdom window afterwards and loads a
 * fresh copy of the built package, mirroring a real SSR page load.
 */
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createElement, useEffect, useState, type FunctionComponent } from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);
type SecureStorage = typeof import("../../src/lib/index").default;

const loadDist = (): SecureStorage => {
  for (const id of Object.keys(require.cache)) if (id.includes("/dist/")) delete require.cache[id];
  return require("../../dist/index.js").default;
};

/** Documented pattern: read in useEffect, render a placeholder on the server and during hydration */
const makeSafe = (storage: SecureStorage) =>
  function Safe() {
    const [user, setUser] = useState<string | null>(null);
    useEffect(() => setUser(storage.getItem("user") as string | null), []);
    return createElement("span", null, user ?? "loading");
  };

/** Anti-pattern: read during render. Server renders "none", browser renders the stored value. */
const makeUnsafe = (storage: SecureStorage) =>
  function Unsafe() {
    return createElement("span", null, (storage.getItem("user") as string | null) ?? "none");
  };

const GLOBALS = ["window", "document", "navigator", "localStorage", "HTMLElement", "HTMLCanvasElement", "Node", "Event", "IS_REACT_ACT_ENVIRONMENT"];
const saved = new Map(GLOBALS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));

const installBrowser = (html: string) => {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root">${html}</div></body></html>`, { url: "https://example.test/" });
  const win = dom.window as unknown as Window & typeof globalThis;
  win.HTMLCanvasElement.prototype.getContext = (() => null) as never;
  const define = (k: string, v: unknown) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  define("window", win);
  define("document", win.document);
  define("navigator", win.navigator);
  define("localStorage", win.localStorage);
  define("HTMLElement", win.HTMLElement);
  define("HTMLCanvasElement", win.HTMLCanvasElement);
  define("Node", win.Node);
  define("Event", win.Event);
  define("IS_REACT_ACT_ENVIRONMENT", true);
  return win;
};

const hydrate = async (factory: (s: SecureStorage) => FunctionComponent) => {
  // 1. Server render (no browser globals)
  const serverHtml = renderToString(createElement(factory(loadDist())));

  // 2. Browser: data from a previous visit is in localStorage
  const win = installBrowser(serverHtml);
  loadDist().setItem("user", "Alice");

  // 3. Fresh page load in the browser, hydrate the server HTML
  const storage = loadDist();
  const { hydrateRoot } = require("react-dom/client");
  const { act } = require("react");
  const errors: unknown[] = [];
  const container = win.document.getElementById("root")!;
  await act(async () => {
    hydrateRoot(container, createElement(factory(storage)), { onRecoverableError: (e: unknown) => errors.push(e) });
  });
  return { serverHtml, text: container.textContent, errors };
};

afterEach(() => {
  for (const [k, d] of saved) {
    if (d) Object.defineProperty(globalThis, k, d);
    else delete (globalThis as Record<string, unknown>)[k];
  }
});

describe("hydration", () => {
  it("documented pattern hydrates without mismatch and shows the stored value", async () => {
    const result = await hydrate(makeSafe);
    expect(result.serverHtml).toBe("<span>loading</span>");
    expect(result.errors).toEqual([]);
    expect(result.text).toBe("Alice");
  });

  it("reading during render causes a hydration mismatch (test can detect it)", async () => {
    const result = await hydrate(makeUnsafe);
    expect(result.serverHtml).toBe("<span>none</span>");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
