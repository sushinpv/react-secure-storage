import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/** Fresh core instance and the hook bound to it, as on a new page load */
const loadFresh = async () => {
  vi.resetModules();
  const storage = (await import("../../src/lib/index")).default;
  const { useSecureStorage } = await import("../../src/lib/react");
  return { storage, useSecureStorage };
};

describe("useSecureStorage", () => {
  it("returns the initial value when nothing is stored", async () => {
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("theme", "light"));
    expect(result.current[0]).toBe("light");
  });

  it("returns null without an initial value", async () => {
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("theme"));
    expect(result.current[0]).toBeNull();
  });

  it("returns the stored value on the first render in a client-only app", async () => {
    (await loadFresh()).storage.setItem("theme", "dark");
    const { useSecureStorage } = await loadFresh();
    const renders: unknown[] = [];
    renderHook(() => {
      const [value] = useSecureStorage("theme", "light");
      renders.push(value);
    });
    expect(renders[0]).toBe("dark");
  });

  it("setValue stores the value and re-renders", async () => {
    const { storage, useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("settings", { size: 1 }));

    act(() => result.current[1]({ size: 2 }));
    expect(result.current[0]).toEqual({ size: 2 });
    expect(storage.getItem("settings")).toEqual({ size: 2 });
  });

  it("setValue accepts an updater function", async () => {
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("count", 0));

    act(() => result.current[1]((n) => n + 1));
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(2);
  });

  it("setValue(null) and removeValue remove the key and fall back to the initial value", async () => {
    const { storage, useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("count", 0));

    act(() => result.current[1](5));
    act(() => result.current[1](null));
    expect(result.current[0]).toBe(0);

    act(() => result.current[1](5));
    act(() => result.current[2]());
    expect(result.current[0]).toBe(0);
    expect(storage.getItem("count")).toBeNull();
  });

  it("keeps components using the same key in sync", async () => {
    const { useSecureStorage } = await loadFresh();
    function Reader() {
      const [value] = useSecureStorage("shared", "none");
      return <span data-testid="reader">{value}</span>;
    }
    function Writer() {
      const [, setValue] = useSecureStorage("shared", "none");
      return <button onClick={() => setValue("updated")}>write</button>;
    }
    render(
      <>
        <Reader />
        <Writer />
      </>
    );
    act(() => screen.getByText("write").click());
    expect(screen.getByTestId("reader").textContent).toBe("updated");
  });

  it("updates when the core API changes the key or clears storage", async () => {
    const { storage, useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("flag", false));

    act(() => storage.setItem("flag", true));
    expect(result.current[0]).toBe(true);
    act(() => storage.clear());
    expect(result.current[0]).toBe(false);
  });

  it("updates when another tab changes the key", async () => {
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("user", "nobody"));

    const otherTab = (await import("../setup/helpers")).loadFresh;
    (await otherTab()).setItem("user", "Alice");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "@secure.s.user", storageArea: localStorage }));
    });
    expect(result.current[0]).toBe("Alice");
  });

  it("follows a change of key", async () => {
    const { storage, useSecureStorage } = await loadFresh();
    storage.setItem("a", "value a");
    storage.setItem("b", "value b");
    const { result, rerender } = renderHook(({ k }) => useSecureStorage(k, "none"), { initialProps: { k: "a" } });
    expect(result.current[0]).toBe("value a");
    rerender({ k: "b" });
    expect(result.current[0]).toBe("value b");
  });

  it("unsubscribes on unmount", async () => {
    const { storage, useSecureStorage } = await loadFresh();
    const listeners = () => (storage as unknown as { _changeListeners: unknown[] })._changeListeners.length;
    const { unmount } = renderHook(() => useSecureStorage("k", 0));
    expect(listeners()).toBe(1);
    unmount();
    expect(listeners()).toBe(0);
  });
});
