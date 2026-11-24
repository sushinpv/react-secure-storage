import { describe, expect, it, vi } from "vitest";
import { loadFresh, storageKeys } from "../setup/helpers";

/** Simulate the browser notifying this tab that another tab changed localStorage */
const fireStorageEvent = (key: string | null, storageArea: Storage = localStorage) => {
  window.dispatchEvent(new StorageEvent("storage", { key, storageArea }));
};

describe("onChange()", () => {
  it("is called for setItem, removeItem and clear in this tab", async () => {
    const storage = await loadFresh();
    const listener = vi.fn();
    storage.onChange(listener);

    storage.setItem("a", 1);
    storage.removeItem("a");
    storage.clear();

    expect(listener.mock.calls).toEqual([["a"], ["a"], [null]]);
  });

  it("stops after unsubscribe", async () => {
    const storage = await loadFresh();
    const listener = vi.fn();
    const unsubscribe = storage.onChange(listener);
    unsubscribe();
    storage.setItem("a", 1);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("cross-tab sync", () => {
  /** This tab (already loaded) and another tab writing to the same localStorage */
  const twoTabs = async () => {
    const thisTab = await loadFresh();
    thisTab.getItem("init"); // load data and start listening, as any first call does
    const otherTab = await loadFresh();
    return { thisTab, otherTab };
  };

  it("picks up a value written in another tab", async () => {
    const { thisTab, otherTab } = await twoTabs();
    const listener = vi.fn();
    thisTab.onChange(listener);

    otherTab.setItem("user", { name: "Alice" });
    expect(thisTab.getItem("user")).toBeNull(); // not yet notified
    fireStorageEvent("@secure.j.user");

    expect(thisTab.getItem("user")).toEqual({ name: "Alice" });
    expect(listener).toHaveBeenCalledWith("user");
  });

  it("picks up removals and type changes from another tab", async () => {
    const { thisTab, otherTab } = await twoTabs();
    otherTab.setItem("k", "text");
    fireStorageEvent("@secure.s.k");
    expect(thisTab.getItem("k")).toBe("text");

    // type change: the other tab writes the number entry, then removes the string entry
    otherTab.setItem("k", 5);
    fireStorageEvent("@secure.n.k");
    fireStorageEvent("@secure.s.k");
    expect(thisTab.getItem("k")).toBe(5);

    otherTab.removeItem("k");
    fireStorageEvent("@secure.n.k");
    expect(thisTab.getItem("k")).toBeNull();
  });

  it("reloads everything when another tab calls localStorage.clear()", async () => {
    const { thisTab, otherTab } = await twoTabs();
    otherTab.setItem("a", 1);
    fireStorageEvent("@secure.n.a");
    const listener = vi.fn();
    thisTab.onChange(listener);

    localStorage.clear();
    fireStorageEvent(null);

    expect(thisTab.getItem("a")).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);
  });

  it("ignores sessionStorage and keys the library does not own", async () => {
    const { thisTab } = await twoTabs();
    const listener = vi.fn();
    thisTab.onChange(listener);

    fireStorageEvent("@secure.s.k", sessionStorage);
    fireStorageEvent("unrelated");
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("onError()", () => {
  it("reports values that cannot be decrypted, without the value", async () => {
    localStorage.setItem("@secure.s.token", "not-valid-ciphertext");
    const storage = await loadFresh();
    const listener = vi.fn();
    storage.onError(listener);

    expect(storage.getItem("token")).toBeNull();
    expect(listener).toHaveBeenCalledWith({ type: "decrypt", key: "token" });
  });

  it("reports rejected writes instead of throwing when a listener is registered", async () => {
    const storage = await loadFresh();
    storage.setItem("k", "old");
    const quota = new DOMException("Quota exceeded", "QuotaExceededError");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quota;
    });
    const listener = vi.fn();
    storage.onError(listener);

    expect(() => storage.setItem("k", "new")).not.toThrow();
    expect(listener).toHaveBeenCalledWith({ type: "write", key: "k", error: quota });
    expect(storage.getItem("k")).toBe("old"); // the value was not stored
  });

  it("throws rejected writes when no listener is registered (previous behaviour)", async () => {
    const storage = await loadFresh();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(() => storage.setItem("k", "v")).toThrow("Quota exceeded");
    expect(storage.getItem("k")).toBeNull();
  });

  it("reports blocked storage once", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    const storage = await loadFresh();
    const listener = vi.fn();
    storage.onError(listener);

    storage.getItem("a");
    storage.setItem("a", 1);
    expect(listener.mock.calls).toEqual([[{ type: "unavailable", key: null }]]);
    vi.restoreAllMocks();
    expect(storageKeys()).toEqual([]);
  });

  it("stops after unsubscribe", async () => {
    localStorage.setItem("@secure.s.k", "garbage");
    const storage = await loadFresh();
    const listener = vi.fn();
    storage.onError(listener)();
    storage.getItem("k");
    expect(listener).not.toHaveBeenCalled();
  });
});
