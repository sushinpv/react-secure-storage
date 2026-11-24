import { describe, expect, it, vi } from "vitest";
import { envelopeOf, loadFresh, storageKeys, switchBrowserProfile } from "../setup/helpers";

describe("async API: set / get round trip", () => {
  const cases: [string, string | number | boolean | object][] = [
    ["string", "hello"],
    ["empty string", ""],
    ["unicode", "héllo 👋 世界"],
    ["number", 42.5],
    ["zero", 0],
    ["infinity", Infinity],
    ["NaN", NaN],
    ["true", true],
    ["false", false],
    ["object", { a: 1, nested: { b: [1, 2, 3] } }],
    ["array", [1, "two", { three: 3 }]],
  ];

  it.each(cases)("%s: same session", async (key, value) => {
    const { storage } = await loadFresh();
    await storage.setItem(key, value);
    expect(await storage.getItem(key)).toEqual(value);
  });

  it.each(cases)("%s: after a page reload", async (key, value) => {
    await (await loadFresh()).storage.setItem(key, value);
    const { storage } = await loadFresh();
    expect(await storage.getItem(key)).toEqual(value);
  });

  it("resolves null for a missing key", async () => {
    const { storage } = await loadFresh();
    expect(await storage.getItem("missing")).toBeNull();
  });

  it("setItem with null or undefined removes the key", async () => {
    const { storage } = await loadFresh();
    await storage.setItem("a", "1");
    await storage.setItem("a", null);
    await storage.setItem("b", undefined);
    expect(await storage.getItem("a")).toBeNull();
    expect(storageKeys()).toEqual([]);
  });
});

describe("storage format", () => {
  it("stores an AES-GCM envelope under <prefix>2.<key>, with no plaintext", async () => {
    const { storage } = await loadFresh();
    await storage.setItem("token", "plain-text-secret");
    expect(storageKeys()).toEqual(["@secure.2.token"]);
    const envelope = envelopeOf("@secure.2.token");
    expect(envelope).toMatchObject({ v: 2, alg: "AES-GCM" });
    expect(typeof envelope.iv).toBe("string");
    expect(localStorage.getItem("@secure.2.token")).not.toContain("plain-text-secret");
  });

  it("keeps one entry per key when the value type changes", async () => {
    const { storage } = await loadFresh();
    await storage.setItem("k", "text");
    await storage.setItem("k", 5);
    await storage.setItem("k", { final: true });
    expect(storageKeys()).toEqual(["@secure.2.k"]);
    expect(await (await loadFresh()).storage.getItem("k")).toEqual({ final: true });
  });

  it("uses a new random IV for every write", async () => {
    const { storage } = await loadFresh();
    await storage.setItem("k", "same");
    const first = envelopeOf("@secure.2.k");
    await storage.setItem("k", "same");
    const second = envelopeOf("@secure.2.k");
    expect(second.iv).not.toBe(first.iv);
    expect(second.ct).not.toBe(first.ct);
  });
});

describe("encryption key", () => {
  it("is a non-extractable AES-GCM key kept in IndexedDB", async () => {
    await (await loadFresh()).storage.setItem("k", "v");
    const key = await new Promise<CryptoKey>((resolve, reject) => {
      const open = indexedDB.open("react-secure-storage");
      open.onsuccess = () => {
        const get = open.result.transaction("keys").objectStore("keys").get("default");
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      };
    });
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });

  it("values copied into another browser profile can't be decrypted", async () => {
    await (await loadFresh()).storage.setItem("secret", "value");
    switchBrowserProfile();
    const { storage } = await loadFresh();
    const errors = vi.fn();
    storage.onError(errors);
    expect(await storage.getItem("secret")).toBeNull();
    expect(errors).toHaveBeenCalledWith({ type: "decrypt", key: "secret" });
  });

  it("two tabs starting at the same time end up with the same key", async () => {
    const tabA = (await loadFresh()).storage;
    const tabB = (await loadFresh()).storage;
    await Promise.all([tabA.setItem("a", "from A"), tabB.setItem("b", "from B")]);
    const { storage } = await loadFresh();
    expect(await storage.getItem("a")).toBe("from A");
    expect(await storage.getItem("b")).toBe("from B");
  });
});

describe("tamper detection", () => {
  it("returns null and reports an error when the ciphertext is modified", async () => {
    const { storage } = await loadFresh();
    await storage.setItem("role", "user");
    const envelope = envelopeOf("@secure.2.role");
    const flipped = envelope.ct[0] === "A" ? "B" : "A";
    localStorage.setItem("@secure.2.role", JSON.stringify({ ...envelope, ct: flipped + envelope.ct.slice(1) }));

    const reloaded = (await loadFresh()).storage;
    const errors = vi.fn();
    reloaded.onError(errors);
    expect(await reloaded.getItem("role")).toBeNull();
    expect(errors).toHaveBeenCalledWith({ type: "decrypt", key: "role" });
  });

  it("rejects a valid value copied to a different key", async () => {
    const { storage } = await loadFresh();
    await storage.setItem("isAdmin", true);
    await storage.setItem("isGuest", false);
    localStorage.setItem("@secure.2.isGuest", localStorage.getItem("@secure.2.isAdmin")!);
    expect(await (await loadFresh()).storage.getItem("isGuest")).toBeNull();
  });

  it("returns null for values that are not envelopes", async () => {
    localStorage.setItem("@secure.2.a", "garbage");
    localStorage.setItem("@secure.2.b", JSON.stringify({ v: 2, alg: "AES-GCM", iv: "!!", ct: "!!" }));
    const { storage } = await loadFresh();
    expect(await storage.getItem("a")).toBeNull();
    expect(await storage.getItem("b")).toBeNull();
  });
});

describe("ordering", () => {
  it("applies writes in call order", async () => {
    const { storage } = await loadFresh();
    storage.setItem("k", 1);
    storage.setItem("k", 2);
    storage.removeItem("k");
    storage.setItem("k", 3);
    expect(await storage.getItem("k")).toBe(3);
    expect(await (await loadFresh()).storage.getItem("k")).toBe(3);
  });

  it("a read sees writes started before it", async () => {
    const { storage } = await loadFresh();
    storage.setItem("k", "written");
    expect(await storage.getItem("k")).toBe("written");
  });
});

describe("removeItem() and clear()", () => {
  it("removeItem removes only that key", async () => {
    localStorage.setItem("unrelated", "x");
    const { storage } = await loadFresh();
    await storage.setItem("a", 1);
    await storage.setItem("b", 2);
    await storage.removeItem("a");
    expect(await storage.getItem("a")).toBeNull();
    expect(storageKeys()).toEqual(["@secure.2.b", "unrelated"]);
  });

  it("clear removes v2 and v1 entries and keeps other keys", async () => {
    localStorage.setItem("unrelated", "x");
    localStorage.setItem("@secure.s.old", "v1 ciphertext");
    localStorage.setItem("@secure.j.older", "v1 ciphertext");
    const { storage } = await loadFresh();
    await storage.setItem("a", 1);
    await storage.clear();
    expect(storageKeys()).toEqual(["unrelated"]);
    expect(await storage.getItem("a")).toBeNull();
  });
});

describe("configuration", () => {
  it.each(["", "REACT_APP_", "NEXT_PUBLIC_", "VITE_"])("%sSECURE_LOCAL_STORAGE_PREFIX sets the prefix", async (envPrefix) => {
    vi.stubEnv(`${envPrefix}SECURE_LOCAL_STORAGE_PREFIX`, "myapp");
    const { storage } = await loadFresh();
    await storage.setItem("k", "v");
    expect(storageKeys()).toEqual(["myapp.2.k"]);
  });

  it("configure() overrides environment variables", async () => {
    vi.stubEnv("SECURE_LOCAL_STORAGE_PREFIX", "from-env");
    const { storage, configure } = await loadFresh();
    configure({ prefix: "from-configure." });
    await storage.setItem("k", "v");
    expect(storageKeys()).toEqual(["from-configure.2.k"]);
  });

  it("configure() after the first storage call is reported and ignored", async () => {
    const { storage, configure } = await loadFresh();
    const errors = vi.fn();
    storage.onError(errors);
    await storage.setItem("a", 1);
    configure({ prefix: "too-late" });
    await storage.setItem("b", 2);
    expect(errors).toHaveBeenCalledWith({ type: "config", key: null });
    expect(storageKeys()).toEqual(["@secure.2.a", "@secure.2.b"]);
  });

  it("reads configuration from Cypress.env inside Cypress", async () => {
    vi.stubGlobal("Cypress", { env: (key: string) => (key === "SECURE_LOCAL_STORAGE_PREFIX" ? "cy" : undefined) });
    await (await loadFresh()).storage.setItem("k", "v");
    expect(storageKeys()).toEqual(["cy.2.k"]);
  });
});

describe("loading", () => {
  it("does not touch localStorage or IndexedDB at import time", async () => {
    const storageAccess = vi.spyOn(window, "localStorage", "get");
    const open = vi.spyOn(indexedDB, "open");
    await loadFresh();
    expect(storageAccess).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("does not load the legacy cipher (crypto-js) when Web Crypto is available", async () => {
    vi.resetModules();
    const legacyLoaded = vi.fn();
    vi.doMock("../../src/lib/core/legacy", async (importOriginal) => {
      legacyLoaded();
      return importOriginal();
    });
    const storage = (await import("../../src/lib/index")).default;
    await storage.setItem("k", "v");
    expect(await storage.getItem("k")).toBe("v");
    expect(legacyLoaded).not.toHaveBeenCalled();
    vi.doUnmock("../../src/lib/core/legacy");
  });
});
