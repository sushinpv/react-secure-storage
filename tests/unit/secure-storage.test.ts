import { describe, expect, it, vi } from "vitest";
import { loadFresh, setUserAgent, storageKeys } from "../setup/helpers";

describe("set / get round trip", () => {
  const cases: [string, string | number | boolean | object][] = [
    ["string", "hello"],
    ["unicode", "héllo 👋 世界"],
    ["number", 42.5],
    ["zero", 0],
    ["negative", -7],
    ["large number", 1e21],
    ["infinity", Infinity],
    ["true", true],
    ["false", false],
    ["object", { a: 1, nested: { b: [1, 2, 3] } }],
    ["array", [1, "two", { three: 3 }]],
  ];

  it.each(cases)("%s: returns the value in the same session", async (key, value) => {
    const storage = await loadFresh();
    storage.setItem(key, value);
    expect(storage.getItem(key)).toEqual(value);
  });

  it.each(cases)("%s: returns the value after a page reload", async (key, value) => {
    (await loadFresh()).setItem(key, value);
    const reloaded = await loadFresh();
    expect(reloaded.getItem(key)).toEqual(value);
  });

  it("returns null for a missing key", async () => {
    const storage = await loadFresh();
    expect(storage.getItem("missing")).toBeNull();
  });

  it("stores values encrypted under <prefix><type>.<key>", async () => {
    const storage = await loadFresh();
    storage.setItem("token", "plain-text-secret");
    expect(storageKeys()).toEqual(["@secure.s.token"]);
    expect(localStorage.getItem("@secure.s.token")).not.toContain("plain-text-secret");
  });

  it("setItem with null or undefined removes the key", async () => {
    const storage = await loadFresh();
    storage.setItem("a", "1");
    storage.setItem("b", "2");
    storage.setItem("a", null as unknown as string);
    storage.setItem("b", undefined as unknown as string);
    expect(storage.getItem("a")).toBeNull();
    expect(storage.getItem("b")).toBeNull();
    expect(storageKeys()).toEqual([]);
  });

  // Known v1 limitation: the decryptor treats an empty plaintext as a failed decrypt.
  it("empty string survives the session but reads as null after reload (known v1 limitation)", async () => {
    const storage = await loadFresh();
    storage.setItem("empty", "");
    expect(storage.getItem("empty")).toBe("");
    expect((await loadFresh()).getItem("empty")).toBeNull();
  });
});

describe("clear()", () => {
  it("removes only entries written by the library", async () => {
    localStorage.setItem("unrelated", "keep me");
    localStorage.setItem("@secure-lookalike", "keep me too");
    const storage = await loadFresh();
    storage.setItem("a", "1");
    storage.setItem("b", { x: 1 });

    storage.clear();

    expect(storage.getItem("a")).toBeNull();
    expect(storage.getItem("b")).toBeNull();
    expect(storageKeys()).toEqual(["@secure-lookalike", "unrelated"]);
  });

  it("stays empty after reload", async () => {
    const storage = await loadFresh();
    storage.setItem("a", "1");
    storage.clear();
    expect((await loadFresh()).getItem("a")).toBeNull();
  });
});

describe("type changes on the same key", () => {
  it("keeps a single stored entry and the latest value after reload", async () => {
    const storage = await loadFresh();
    storage.setItem("k", "text");
    storage.setItem("k", 5);
    storage.setItem("k", true);
    storage.setItem("k", { final: true });

    expect(storageKeys()).toEqual(["@secure.j.k"]);
    expect((await loadFresh()).getItem("k")).toEqual({ final: true });
  });

  it("cleans up duplicate entries left by older versions on the next write", async () => {
    const storage = await loadFresh();
    storage.setItem("k", "old");
    const stale = localStorage.getItem("@secure.s.k")!;
    storage.setItem("k", 1);
    localStorage.setItem("@secure.s.k", stale); // simulate a duplicate left by v1.3.2

    const reloaded = await loadFresh();
    reloaded.setItem("k", 2);
    expect(storageKeys()).toEqual(["@secure.n.k"]);
    expect((await loadFresh()).getItem("k")).toBe(2);
  });
});

describe("removeItem()", () => {
  it("removes the value and its stored entry", async () => {
    const storage = await loadFresh();
    storage.setItem("k", 10);
    storage.removeItem("k");
    expect(storage.getItem("k")).toBeNull();
    expect(storageKeys()).toEqual([]);
  });

  it("removes the stored entry even when the value could not be decrypted", async () => {
    localStorage.setItem("@secure.s.k", "not-valid-ciphertext");
    const storage = await loadFresh();
    expect(storage.getItem("k")).toBeNull();
    storage.removeItem("k");
    expect(storageKeys()).toEqual([]);
  });

  it("removes the stored entry when it was written in a previous session", async () => {
    (await loadFresh()).setItem("k", false);
    const storage = await loadFresh();
    storage.removeItem("k");
    expect(storageKeys()).toEqual([]);
  });

  it("does not touch other keys", async () => {
    localStorage.setItem("unrelated", "x");
    const storage = await loadFresh();
    storage.setItem("a", "1");
    storage.setItem("b", "2");
    storage.removeItem("a");
    expect(storage.getItem("b")).toBe("2");
    expect(storageKeys()).toEqual(["@secure.s.b", "unrelated"]);
  });
});

describe("corrupted and undecryptable data", () => {
  it("returns null for malformed ciphertext without throwing", async () => {
    localStorage.setItem("@secure.s.a", "garbage");
    localStorage.setItem("@secure.j.b", "");
    localStorage.setItem("@secure.n.c", "U2FsdGVkX1+garbage");
    const storage = await loadFresh();
    expect(storage.getItem("a")).toBeNull();
    expect(storage.getItem("b")).toBeNull();
    expect(storage.getItem("c")).toBeNull();
  });

  it("ignores keys with the prefix but an unknown type marker", async () => {
    localStorage.setItem("@secure.x.a", "whatever");
    localStorage.setItem("@secure.noformat", "whatever");
    const storage = await loadFresh();
    expect(storage.getItem("a")).toBeNull();
    storage.clear();
    expect(storageKeys()).toEqual(["@secure.noformat", "@secure.x.a"]);
  });

  it.each([
    ["b", "\u0007x"],
    ["n", "\u0007x"],
    ["n", ""],
  ])("treats a wrong-key decrypt that yields random text as unreadable (type %s)", async (type, garbage) => {
    localStorage.setItem(`@secure.${type}.k`, "anything");
    const storage = await loadFresh(); // data is loaded lazily on first call, after the spy is installed
    const EncryptionService = (await import("../../src/lib/encryption")).default;
    const decrypt = vi.spyOn(EncryptionService.prototype, "decrypt").mockReturnValue(garbage);
    expect(storage.getItem("k")).toBeNull();
    expect(decrypt).toHaveBeenCalled();
  });

  it("returns null when the browser fingerprint changes (e.g. browser update)", async () => {
    setUserAgent("Browser/1.0");
    (await loadFresh()).setItem("k", "value");
    setUserAgent("Browser/2.0");
    expect((await loadFresh()).getItem("k")).toBeNull();
  });
});

describe("configuration via environment variables", () => {
  it.each(["", "REACT_APP_", "NEXT_PUBLIC_", "VITE_"])("%sSECURE_LOCAL_STORAGE_PREFIX sets the prefix", async (envPrefix) => {
    vi.stubEnv(`${envPrefix}SECURE_LOCAL_STORAGE_PREFIX`, "myapp");
    const storage = await loadFresh();
    storage.setItem("k", "v");
    expect(storageKeys()).toEqual(["myapp.s.k"]);
    expect((await loadFresh()).getItem("k")).toBe("v");
  });

  it("accepts a prefix that already ends with a dot", async () => {
    vi.stubEnv("SECURE_LOCAL_STORAGE_PREFIX", "myapp.");
    (await loadFresh()).setItem("k", "v");
    expect(storageKeys()).toEqual(["myapp.s.k"]);
  });

  it("handles prefixes that contain type-like segments", async () => {
    vi.stubEnv("SECURE_LOCAL_STORAGE_PREFIX", "a.b.c");
    (await loadFresh()).setItem("k", "v");
    expect(storageKeys()).toEqual(["a.b.c.s.k"]);
    expect((await loadFresh()).getItem("k")).toBe("v");
  });

  it.each(["", "REACT_APP_", "NEXT_PUBLIC_", "VITE_"])("%sSECURE_LOCAL_STORAGE_HASH_KEY changes the encryption key", async (envPrefix) => {
    vi.stubEnv(`${envPrefix}SECURE_LOCAL_STORAGE_HASH_KEY`, "key-one");
    (await loadFresh()).setItem("k", "v");
    expect((await loadFresh()).getItem("k")).toBe("v");

    vi.stubEnv(`${envPrefix}SECURE_LOCAL_STORAGE_HASH_KEY`, "key-two");
    expect((await loadFresh()).getItem("k")).toBeNull();
  });

  it.each(["", "REACT_APP_", "NEXT_PUBLIC_", "VITE_"])("%sSECURE_LOCAL_STORAGE_DISABLED_KEYS removes inputs from the fingerprint", async (envPrefix) => {
    vi.stubEnv(`${envPrefix}SECURE_LOCAL_STORAGE_DISABLED_KEYS`, "UserAgent|Canvas");
    setUserAgent("Browser/1.0");
    (await loadFresh()).setItem("k", "v");
    setUserAgent("Browser/2.0");
    expect((await loadFresh()).getItem("k")).toBe("v");
  });

  it("reads configuration from Cypress.env when running inside Cypress", async () => {
    const env: Record<string, string> = { SECURE_LOCAL_STORAGE_PREFIX: "cy", SECURE_LOCAL_STORAGE_HASH_KEY: "cy-key", SECURE_LOCAL_STORAGE_DISABLED_KEYS: "UserAgent" };
    vi.stubGlobal("Cypress", { env: (key: string) => env[key] });
    setUserAgent("Browser/1.0");
    (await loadFresh()).setItem("k", "v");
    expect(storageKeys()).toEqual(["cy.s.k"]);
    setUserAgent("Browser/2.0");
    expect((await loadFresh()).getItem("k")).toBe("v");
    vi.unstubAllGlobals();
  });

  it("warns about unknown disabled keys", async () => {
    vi.stubEnv("SECURE_LOCAL_STORAGE_DISABLED_KEYS", "UserAgent|NotAKey");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    (await loadFresh()).setItem("k", "v");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("NotAKey"));
  });
});

describe("loading and performance", () => {
  it("does not read localStorage at import time", async () => {
    const access = vi.spyOn(window, "localStorage", "get");
    await loadFresh();
    expect(access).not.toHaveBeenCalled();
  });

  it("computes the browser fingerprint once per page load", async () => {
    const storage = await loadFresh();
    const clientJS = (await import("../../src/lib/fingerprint.lib")).default;
    const spy = vi.spyOn(clientJS, "getFingerprint");
    storage.setItem("a", 1);
    storage.setItem("b", 2);
    storage.getItem("a");
    storage.removeItem("b");
    storage.setItem("c", 3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not crash when canvas is unavailable", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const storage = await loadFresh();
    storage.setItem("k", "v");
    expect((await loadFresh()).getItem("k")).toBe("v");
  });
});

describe("blocked storage", () => {
  it("is a no-op when accessing localStorage throws (sandboxed iframe, blocked cookies)", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    const storage = await loadFresh();
    expect(() => {
      storage.setItem("k", "v");
      storage.removeItem("k");
      storage.clear();
    }).not.toThrow();
    expect(storage.getItem("k")).toBeNull();
  });
});
