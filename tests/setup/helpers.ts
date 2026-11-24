import { vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

/**
 * Import every entry point from source with fresh module state, as a new page load would.
 * The entries share one store, as they do in an app.
 */
export const loadFresh = async () => {
  vi.resetModules();
  const asyncEntry = await import("../../src/lib/index");
  const syncEntry = await import("../../src/lib/sync");
  const reactEntry = await import("../../src/lib/react");
  const store = (await import("../../src/lib/core/store")).default;
  return {
    storage: asyncEntry.default,
    configure: asyncEntry.configure,
    syncStorage: syncEntry.default,
    useSecureStorage: reactEntry.useSecureStorage,
    store,
  };
};

/** localStorage keys, sorted */
export const storageKeys = () => Object.keys({ ...localStorage }).sort();

/** Parsed envelope stored for a key */
export const envelopeOf = (storageKey: string) => JSON.parse(localStorage.getItem(storageKey) ?? "null");

/** Simulate another browser profile: same localStorage contents, but no access to this profile's IndexedDB key */
export const switchBrowserProfile = () => {
  globalThis.indexedDB = new IDBFactory();
};

/** Simulate the browser notifying this tab that another tab changed localStorage */
export const fireStorageEvent = (key: string | null, storageArea: Storage = localStorage) => {
  window.dispatchEvent(new StorageEvent("storage", { key, storageArea }));
};

/** Override navigator.userAgent, simulating a browser update (affects the v1 fingerprint key only) */
export const setUserAgent = (userAgent: string) => {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
};

/** Make Web Crypto unavailable, as on plain http:// pages */
export const disableWebCrypto = () => {
  vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
};
