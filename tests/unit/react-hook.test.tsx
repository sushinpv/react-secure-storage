import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fireStorageEvent, loadFresh } from "../setup/helpers";

describe("useSecureStorage", () => {
  it("returns the initial value with loading true, then loading false", async () => {
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("theme", "light"));
    expect(result.current[0]).toBe("light");
    expect(result.current[3]).toEqual({ loading: true });
    await waitFor(() => expect(result.current[3].loading).toBe(false));
    expect(result.current[0]).toBe("light");
  });

  it("returns null without an initial value", async () => {
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("theme"));
    await waitFor(() => expect(result.current[3].loading).toBe(false));
    expect(result.current[0]).toBeNull();
  });

  it("returns the stored value once decrypted", async () => {
    await (await loadFresh()).storage.setItem("theme", "dark");
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("theme", "light"));
    await waitFor(() => expect(result.current[0]).toBe("dark"));
    expect(result.current[3].loading).toBe(false);
  });

  it("setValue updates immediately and is saved", async () => {
    const { useSecureStorage, storage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("settings", { size: 1 }));
    await waitFor(() => expect(result.current[3].loading).toBe(false));
    act(() => result.current[1]({ size: 2 }));
    expect(result.current[0]).toEqual({ size: 2 });
    expect(await storage.getItem("settings")).toEqual({ size: 2 });
  });

  it("updater functions see the previous update in the same tick", async () => {
    const { useSecureStorage, storage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("count", 0));
    await waitFor(() => expect(result.current[3].loading).toBe(false));
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(await storage.getItem("count")).toBe(2);
  });

  it("a write during the initial load is not overwritten by it", async () => {
    await (await loadFresh()).storage.setItem("count", 10);
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("count", 0));
    act(() => result.current[1](99));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current[0]).toBe(99);
  });

  it("setValue(null) and removeValue remove the key", async () => {
    const { useSecureStorage, storage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("count", 0));
    act(() => result.current[1](5));
    act(() => result.current[1](null));
    expect(result.current[0]).toBe(0);
    act(() => result.current[1](5));
    act(() => result.current[2]());
    expect(result.current[0]).toBe(0);
    expect(await storage.getItem("count")).toBeNull();
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
    await waitFor(() => expect(screen.getByTestId("reader").textContent).toBe("updated"));
  });

  it("updates when the async or sync API changes the key", async () => {
    const { useSecureStorage, storage, syncStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("flag", false));
    await act(() => storage.setItem("flag", true));
    await waitFor(() => expect(result.current[0]).toBe(true));
    act(() => syncStorage.clear());
    await waitFor(() => expect(result.current[0]).toBe(false));
  });

  it("updates when another tab changes the key", async () => {
    const { useSecureStorage } = await loadFresh();
    const { result } = renderHook(() => useSecureStorage("user", "nobody"));
    await waitFor(() => expect(result.current[3].loading).toBe(false));

    const otherTab = (await import("../../src/lib/index")).default; // same page store; simulate the event
    await otherTab.setItem("user", "Alice");
    act(() => fireStorageEvent("@secure.2.user"));
    await waitFor(() => expect(result.current[0]).toBe("Alice"));
  });

  it("follows a change of key", async () => {
    const { useSecureStorage, storage } = await loadFresh();
    await storage.setItem("a", "value a");
    await storage.setItem("b", "value b");
    const { result, rerender } = renderHook(({ k }) => useSecureStorage(k, "none"), { initialProps: { k: "a" } });
    await waitFor(() => expect(result.current[0]).toBe("value a"));
    rerender({ k: "b" });
    expect(result.current[3].loading).toBe(true);
    await waitFor(() => expect(result.current[0]).toBe("value b"));
  });

  it("unsubscribes on unmount", async () => {
    const { useSecureStorage, store } = await loadFresh();
    const listeners = () => (store as unknown as { changeListeners: unknown[] }).changeListeners.length;
    const { unmount } = renderHook(() => useSecureStorage("k", 0));
    expect(listeners()).toBe(1);
    unmount();
    expect(listeners()).toBe(0);
  });
});
