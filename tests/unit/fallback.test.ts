import { describe, expect, it, vi } from "vitest";
import { disableWebCrypto, envelopeOf, loadFresh, setUserAgent, storageKeys } from "../setup/helpers";

describe("fallback to the v1 fingerprint key", () => {
  it("is used when Web Crypto is unavailable (plain http)", async () => {
    disableWebCrypto();
    const { storage } = await loadFresh();
    const errors = vi.fn();
    storage.onError(errors);

    await storage.setItem("k", { works: true });
    expect(await storage.getItem("k")).toEqual({ works: true });
    expect(envelopeOf("@secure.2.k")).toMatchObject({ v: 2, alg: "legacy" });
    expect(errors.mock.calls).toEqual([[{ type: "fallback", key: null }]]); // reported once
    expect(await (await loadFresh()).storage.getItem("k")).toEqual({ works: true });
  });

  it("is used when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const { storage } = await loadFresh();
    await storage.setItem("k", "v");
    expect(await storage.getItem("k")).toBe("v");
    expect(envelopeOf("@secure.2.k").alg).toBe("legacy");
  });

  it("is used when IndexedDB exists but refuses to open (some private modes)", async () => {
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      const request = { error: new DOMException("denied", "InvalidStateError") } as unknown as IDBOpenDBRequest;
      setTimeout(() => request.onerror?.(new Event("error")), 0);
      return request;
    });
    const { storage } = await loadFresh();
    await storage.setItem("k", "v");
    expect(envelopeOf("@secure.2.k").alg).toBe("legacy");
  });

  it("loads the legacy cipher (crypto-js) only in fallback mode", async () => {
    disableWebCrypto();
    vi.resetModules();
    const legacyLoaded = vi.fn();
    vi.doMock("../../src/lib/core/legacy", async (importOriginal) => {
      legacyLoaded();
      return importOriginal();
    });
    await (await import("../../src/lib/index")).default.setItem("k", "v");
    expect(legacyLoaded).toHaveBeenCalledTimes(1);
    vi.doUnmock("../../src/lib/core/legacy");
  });

  it("values written in fallback mode stay readable once Web Crypto is available", async () => {
    disableWebCrypto();
    await (await loadFresh()).storage.setItem("k", 7);
    vi.unstubAllGlobals();
    const { storage } = await loadFresh();
    expect(await storage.getItem("k")).toBe(7);
  });

  it("depends on the hash key and the fingerprint, as in v1", async () => {
    disableWebCrypto();
    vi.stubEnv("SECURE_LOCAL_STORAGE_HASH_KEY", "one");
    await (await loadFresh()).storage.setItem("k", "v");

    vi.stubEnv("SECURE_LOCAL_STORAGE_HASH_KEY", "two");
    expect(await (await loadFresh()).storage.getItem("k")).toBeNull();

    vi.stubEnv("SECURE_LOCAL_STORAGE_HASH_KEY", "one");
    setUserAgent("Browser/2.0");
    expect(await (await loadFresh()).storage.getItem("k")).toBeNull();
  });

  it("disabledKeys (configure) keeps the key stable when those properties change", async () => {
    disableWebCrypto();
    setUserAgent("Browser/1.0");
    const first = await loadFresh();
    first.configure({ disabledKeys: ["UserAgent"] });
    await first.storage.setItem("k", "v");

    setUserAgent("Browser/2.0");
    const second = await loadFresh();
    second.configure({ disabledKeys: ["UserAgent"] });
    expect(await second.storage.getItem("k")).toBe("v");
  });

  it("rejects a value copied to a different key", async () => {
    disableWebCrypto();
    const { storage } = await loadFresh();
    await storage.setItem("isAdmin", true);
    await storage.setItem("isGuest", false);
    localStorage.setItem("@secure.2.isGuest", localStorage.getItem("@secure.2.isAdmin")!);
    expect(await (await loadFresh()).storage.getItem("isGuest")).toBeNull();
  });
});

describe("strict mode (fallback disabled)", () => {
  it.each([
    ["configure({ fallback: false })", () => undefined, { fallback: false }],
    ["SECURE_LOCAL_STORAGE_FALLBACK=false", () => vi.stubEnv("SECURE_LOCAL_STORAGE_FALLBACK", "false"), {}],
    ["VITE_SECURE_LOCAL_STORAGE_FALLBACK=0", () => vi.stubEnv("VITE_SECURE_LOCAL_STORAGE_FALLBACK", "0"), {}],
  ])("%s: storage is unavailable instead of using the weaker key", async (_name, setup, options) => {
    setup();
    disableWebCrypto();
    const { storage, configure } = await loadFresh();
    configure(options);
    const errors = vi.fn();
    storage.onError(errors);

    await storage.setItem("k", "v");
    expect(await storage.getItem("k")).toBeNull();
    expect(storageKeys()).toEqual([]);
    expect(errors.mock.calls).toEqual([[{ type: "unavailable", key: null }]]);
  });

  it("has no effect when Web Crypto is available", async () => {
    const { storage, configure } = await loadFresh();
    configure({ fallback: false });
    await storage.setItem("k", "v");
    expect(await storage.getItem("k")).toBe("v");
  });
});

describe("blocked localStorage", () => {
  it("every call is a no-op and the problem is reported once", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    const { storage } = await loadFresh();
    const errors = vi.fn();
    storage.onError(errors);
    await storage.setItem("k", "v");
    await storage.removeItem("k");
    await storage.clear();
    expect(await storage.getItem("k")).toBeNull();
    expect(errors.mock.calls).toEqual([[{ type: "unavailable", key: null }]]);
  });
});
