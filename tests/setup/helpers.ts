import { vi } from "vitest";
import type SecureLocalStorage from "../../src/lib/index";

export type SecureStorage = typeof SecureLocalStorage;

/**
 * Import a fresh copy of the library from source, as a new page load would.
 * Module state (cache, fingerprint, prefix) is reset.
 */
export const loadFresh = async (): Promise<SecureStorage> => {
  vi.resetModules();
  return (await import("../../src/lib/index")).default;
};

/** Keys currently in localStorage, sorted */
export const storageKeys = () => Object.keys({ ...localStorage }).sort();

/** Override navigator.userAgent, simulating a browser update */
export const setUserAgent = (userAgent: string) => {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
};
