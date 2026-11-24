import { afterEach, beforeEach, vi } from "vitest";

// jsdom has no canvas implementation. Give the fingerprint a deterministic canvas so keys are stable across test runs.
export const FIXED_CANVAS = "data:image/png;base64,ZmFrZS1jYW52YXM=";
HTMLCanvasElement.prototype.getContext = function () {
  return { fillRect() {}, fillText() {} };
} as unknown as typeof HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.toDataURL = () => FIXED_CANVAS;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
