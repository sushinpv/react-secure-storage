import { describe, expect, it, vi } from "vitest";
import { fireStorageEvent, loadFresh } from "../setup/helpers";

/** Store data in a previous page load */
const seed = async (values: Record<string, string | number | boolean | object>) => {
  const { storage } = await loadFresh();
  for (const [k, v] of Object.entries(values)) await storage.setItem(k, v);
};

describe("sync entry: ready()", () => {
  it("returns null before ready() and the stored values after", async () => {
    await seed({ a: "x", b: { y: 1 } });
    const { syncStorage } = await loadFresh();
    expect(syncStorage.isReady).toBe(false);
    expect(syncStorage.getItem("a")).toBeNull();

    await syncStorage.ready();
    expect(syncStorage.isReady).toBe(true);
    expect(syncStorage.getItem("a")).toBe("x");
    expect(syncStorage.getItem("b")).toEqual({ y: 1 });
  });

  it("ready() resolves once and can be called many times", async () => {
    const { syncStorage } = await loadFresh();
    const listener = vi.fn();
    syncStorage.onChange(listener);
    await Promise.all([syncStorage.ready(), syncStorage.ready()]);
    await syncStorage.ready();
    expect(listener.mock.calls).toEqual([[null]]);
  });
});

describe("sync entry: writes", () => {
  it("setItem is visible immediately and saved in the background", async () => {
    const { syncStorage, storage } = await loadFresh();
    await syncStorage.ready();
    syncStorage.setItem("k", 5);
    expect(syncStorage.getItem("k")).toBe(5);
    expect(await storage.getItem("k")).toBe(5); // async API waits for the background save
    expect(await (await loadFresh()).storage.getItem("k")).toBe(5);
  });

  it("removeItem and clear apply immediately and are saved", async () => {
    await seed({ a: 1, b: 2 });
    const { syncStorage, storage } = await loadFresh();
    await syncStorage.ready();
    syncStorage.removeItem("a");
    expect(syncStorage.getItem("a")).toBeNull();
    expect(await storage.getItem("a")).toBeNull();
    syncStorage.clear();
    expect(syncStorage.getItem("b")).toBeNull();
    expect(await storage.getItem("b")).toBeNull();
  });

  it("writes made before ready() resolves are not overwritten by the initial load", async () => {
    await seed({ a: "stored", b: "stored" });
    const { syncStorage } = await loadFresh();
    const ready = syncStorage.ready();
    syncStorage.setItem("a", "newer");
    syncStorage.removeItem("b");
    await ready;
    expect(syncStorage.getItem("a")).toBe("newer");
    expect(syncStorage.getItem("b")).toBeNull();
  });

  it("clear() during the initial load leaves only later writes", async () => {
    await seed({ a: 1, b: 2 });
    const { syncStorage } = await loadFresh();
    const ready = syncStorage.ready();
    syncStorage.clear();
    syncStorage.setItem("c", 3);
    await ready;
    expect([syncStorage.getItem("a"), syncStorage.getItem("b"), syncStorage.getItem("c")]).toEqual([null, null, 3]);
  });

  it("a failed background save is reported and memory is restored to the stored value", async () => {
    await seed({ k: "saved" });
    const { syncStorage, storage } = await loadFresh();
    await syncStorage.ready();
    const errors = vi.fn();
    syncStorage.onError(errors);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    syncStorage.setItem("k", "not saved");
    expect(syncStorage.getItem("k")).toBe("not saved");
    await vi.waitFor(() => expect(syncStorage.getItem("k")).toBe("saved"));
    expect(errors).toHaveBeenCalledWith(expect.objectContaining({ type: "write", key: "k" }));
    expect(await storage.getItem("k")).toBe("saved");
  });
});

describe("sync entry: staying in sync", () => {
  it("reflects writes made through the async API", async () => {
    const { syncStorage, storage } = await loadFresh();
    await syncStorage.ready();
    const listener = vi.fn();
    syncStorage.onChange(listener);
    await storage.setItem("k", "from async");
    await vi.waitFor(() => expect(syncStorage.getItem("k")).toBe("from async"));
    expect(listener).toHaveBeenCalledWith("k");
  });

  it("reflects writes and clears from other tabs", async () => {
    const { syncStorage } = await loadFresh();
    await syncStorage.ready();
    const otherTab = (await loadFresh()).storage;

    await otherTab.setItem("k", "from other tab");
    fireStorageEvent("@secure.2.k");
    await vi.waitFor(() => expect(syncStorage.getItem("k")).toBe("from other tab"));

    await otherTab.clear();
    fireStorageEvent(null);
    await vi.waitFor(() => expect(syncStorage.getItem("k")).toBeNull());
  });

  it("its own background saves do not cause stale values", async () => {
    const { syncStorage } = await loadFresh();
    await syncStorage.ready();
    for (let i = 1; i <= 20; i++) syncStorage.setItem("k", i);
    const seen: unknown[] = [];
    syncStorage.onChange(() => seen.push(syncStorage.getItem("k")));
    await vi.waitFor(async () => expect(await (await import("../../src/lib/index")).default.getItem("k")).toBe(20));
    expect(syncStorage.getItem("k")).toBe(20);
    expect(seen.every((v) => v === 20)).toBe(true);
  });
});
