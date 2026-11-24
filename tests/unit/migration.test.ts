/**
 * v1 data (written by the published 1.3.2, same format as 1.4) next to v2.
 * Kept by default; moved into the v2 format only when `migrate` is enabled.
 */
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { loadFresh, setUserAgent, storageKeys } from "../setup/helpers";

const require = createRequire(import.meta.url);

type V1Storage = { setItem(key: string, value: unknown): void; getItem(key: string): unknown };

/** Write data with the published v1 package, as an app did before upgrading */
const writeV1 = (values: Record<string, string | number | boolean | object>) => {
  for (const id of Object.keys(require.cache)) if (id.includes("react-secure-storage-legacy")) delete require.cache[id];
  const v1: V1Storage = require("react-secure-storage-legacy").default;
  Object.entries(values).forEach(([k, v]) => v1.setItem(k, v));
};

const V1_VALUES = { str: "hello", num: 3.14, yes: true, no: false, obj: { user: { id: 1 } } };
const V1_KEYS = ["@secure.b.no", "@secure.b.yes", "@secure.j.obj", "@secure.n.num", "@secure.s.str"];

describe("v1 data without migration (default)", () => {
  it("is left untouched and not visible to v2", async () => {
    writeV1(V1_VALUES);
    const { storage } = await loadFresh();
    expect(await storage.getItem("str")).toBeNull();
    await storage.setItem("other", 1);
    expect(storageKeys()).toEqual(["@secure.2.other", ...V1_KEYS].sort());
  });

  it("can still be migrated in a later release", async () => {
    writeV1(V1_VALUES);
    await (await loadFresh()).storage.setItem("other", 1); // first v2 release, no migration
    vi.stubEnv("SECURE_LOCAL_STORAGE_MIGRATE", "true"); // a later release turns it on
    const { storage } = await loadFresh();
    expect(await storage.getItem("str")).toBe("hello");
  });

  it("is removed by clear()", async () => {
    writeV1(V1_VALUES);
    const { storage } = await loadFresh();
    await storage.clear();
    expect(storageKeys()).toEqual([]);
  });
});

describe("migration enabled", () => {
  it.each([
    ["configure({ migrate: true })", () => undefined, { migrate: true }],
    ["SECURE_LOCAL_STORAGE_MIGRATE=true", () => vi.stubEnv("SECURE_LOCAL_STORAGE_MIGRATE", "true"), {}],
    ["NEXT_PUBLIC_SECURE_LOCAL_STORAGE_MIGRATE=1", () => vi.stubEnv("NEXT_PUBLIC_SECURE_LOCAL_STORAGE_MIGRATE", "1"), {}],
  ])("%s: moves every readable v1 value into v2 and removes the v1 entries", async (_name, setup, options) => {
    setup();
    writeV1(V1_VALUES);
    const { storage, configure } = await loadFresh();
    configure(options);

    for (const [key, value] of Object.entries(V1_VALUES)) expect(await storage.getItem(key)).toEqual(value);
    expect(storageKeys()).toEqual(Object.keys(V1_VALUES).map((k) => `@secure.2.${k}`).sort());
    expect(await (await loadFresh()).storage.getItem("obj")).toEqual(V1_VALUES.obj);
  });

  it("works with a custom prefix and hash key", async () => {
    vi.stubEnv("SECURE_LOCAL_STORAGE_PREFIX", "app");
    vi.stubEnv("SECURE_LOCAL_STORAGE_HASH_KEY", "custom-hash");
    writeV1({ a: "x" });
    const { storage, configure } = await loadFresh();
    configure({ migrate: true });
    expect(await storage.getItem("a")).toBe("x");
    expect(storageKeys()).toEqual(["app.2.a"]);
  });

  it("leaves unreadable v1 entries in place and reports them", async () => {
    setUserAgent("Browser/1.0");
    writeV1({ drifted: "old" });
    setUserAgent("Browser/2.0"); // fingerprint changed since v1 wrote the data
    const { storage, configure } = await loadFresh();
    configure({ migrate: true });
    const errors = vi.fn();
    storage.onError(errors);

    expect(await storage.getItem("drifted")).toBeNull();
    expect(errors).toHaveBeenCalledWith({ type: "decrypt", key: "drifted" });
    expect(storageKeys()).toEqual(["@secure.s.drifted"]);
  });

  it("keeps an existing v2 value (newer) and removes the v1 entry", async () => {
    writeV1({ k: "old v1" });
    await (await loadFresh()).storage.setItem("k", "new v2");
    const { storage, configure } = await loadFresh();
    configure({ migrate: true });
    expect(await storage.getItem("k")).toBe("new v2");
    expect(storageKeys()).toEqual(["@secure.2.k"]);
  });

  it("resumes after an interruption: v1 entries are removed only once their v2 entry is saved", async () => {
    writeV1(V1_VALUES);
    const realSetItem = Storage.prototype.setItem;
    let writes = 0;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (++writes > 2) throw new DOMException("Quota exceeded", "QuotaExceededError");
      return realSetItem.call(this, key, value);
    });
    const first = await loadFresh();
    first.configure({ migrate: true });
    first.storage.onError(() => {});
    await first.storage.getItem("str");
    const afterInterruption = storageKeys();
    expect(afterInterruption.filter((k) => k.startsWith("@secure.2."))).toHaveLength(2);
    expect(afterInterruption.filter((k) => !k.startsWith("@secure.2."))).toHaveLength(3); // not yet migrated, still there

    setItem.mockRestore();
    const second = await loadFresh();
    second.configure({ migrate: true });
    for (const [key, value] of Object.entries(V1_VALUES)) expect(await second.storage.getItem(key)).toEqual(value);
    expect(storageKeys().every((k) => k.startsWith("@secure.2."))).toBe(true);
  });
});
