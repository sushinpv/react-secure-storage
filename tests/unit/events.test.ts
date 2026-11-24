import { describe, expect, it, vi } from "vitest";
import { fireStorageEvent, loadFresh } from "../setup/helpers";

describe("onChange()", () => {
  it("is called after setItem, removeItem and clear complete", async () => {
    const { storage } = await loadFresh();
    const listener = vi.fn();
    storage.onChange(listener);
    await storage.setItem("a", 1);
    await storage.removeItem("a");
    await storage.clear();
    expect(listener.mock.calls).toEqual([["a"], ["a"], [null]]);
  });

  it("stops after unsubscribe", async () => {
    const { storage } = await loadFresh();
    const listener = vi.fn();
    storage.onChange(listener)();
    await storage.setItem("a", 1);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("other tabs", () => {
  const twoTabs = async () => {
    const thisTab = (await loadFresh()).storage;
    await thisTab.getItem("init"); // start listening, as the first call does
    const otherTab = (await loadFresh()).storage;
    return { thisTab, otherTab };
  };

  it("reads see values written by another tab, and listeners are notified", async () => {
    const { thisTab, otherTab } = await twoTabs();
    const listener = vi.fn();
    thisTab.onChange(listener);
    await thisTab.getItem("user"); // cached as missing

    await otherTab.setItem("user", { name: "Alice" });
    fireStorageEvent("@secure.2.user");

    expect(listener).toHaveBeenCalledWith("user");
    expect(await thisTab.getItem("user")).toEqual({ name: "Alice" });
  });

  it("notifies with null when another tab clears localStorage", async () => {
    const { thisTab } = await twoTabs();
    const listener = vi.fn();
    thisTab.onChange(listener);
    fireStorageEvent(null);
    expect(listener).toHaveBeenCalledWith(null);
  });

  it("ignores sessionStorage, v1 keys and keys the library does not own", async () => {
    const { thisTab } = await twoTabs();
    const listener = vi.fn();
    thisTab.onChange(listener);
    fireStorageEvent("@secure.2.k", sessionStorage);
    fireStorageEvent("@secure.s.k");
    fireStorageEvent("unrelated");
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("onError()", () => {
  it("rejected writes reject the promise when no listener is registered", async () => {
    const { storage } = await loadFresh();
    await storage.getItem("init");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    await expect(storage.setItem("k", "v")).rejects.toThrow("Quota exceeded");
    expect(await storage.getItem("k")).toBeNull();
  });

  it("rejected writes are reported instead when a listener is registered", async () => {
    const { storage } = await loadFresh();
    await storage.setItem("k", "old");
    const quota = new DOMException("Quota exceeded", "QuotaExceededError");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quota;
    });
    const listener = vi.fn();
    storage.onError(listener);
    await expect(storage.setItem("k", "new")).resolves.toBeUndefined();
    expect(listener).toHaveBeenCalledWith({ type: "write", key: "k", error: quota });
    expect(await storage.getItem("k")).toBe("old");
  });

  it("reports an unreadable value once, without the value", async () => {
    localStorage.setItem("@secure.2.k", "garbage");
    const { storage } = await loadFresh();
    const listener = vi.fn();
    storage.onError(listener);
    await storage.getItem("k");
    await storage.getItem("k");
    expect(listener.mock.calls).toEqual([[{ type: "decrypt", key: "k" }]]);
  });
});
