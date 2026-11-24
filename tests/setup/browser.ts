import { afterEach, beforeEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

// jsdom has no canvas implementation. Give the v1 fingerprint a deterministic canvas so fallback/migration keys are stable.
export const FIXED_CANVAS = "data:image/png;base64,ZmFrZS1jYW52YXM=";
HTMLCanvasElement.prototype.getContext = function () {
  return { fillRect() {}, fillText() {} };
} as unknown as typeof HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.toDataURL = () => FIXED_CANVAS;

beforeEach(() => {
  localStorage.clear();
  // A fresh IndexedDB per test: equivalent to a new browser profile with no key yet
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
