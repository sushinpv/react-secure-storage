import { useCallback, useEffect, useRef, useState } from "react";
import store from "./core/store";
import type { SecureStorageValue } from "./core/types";

export type { SecureStorageValue } from "./core/types";

/** Set a new value, or compute it from the previous one. Setting null removes the key. */
export type SetSecureValue<T> = (value: T | null | ((previous: T) => T | null)) => void;

export interface SecureStorageStatus {
  /** True on the server, during hydration and until the stored value has been decrypted */
  loading: boolean;
}

interface HookState<T> {
  key: string;
  loading: boolean;
  value: T | null;
}

/**
 * React hook for a single secure storage key.
 *
 * Returns `initialValue` on the server, during hydration and while the stored value is being decrypted (`loading` is
 * true), then the stored value. Re-renders when the key changes in this tab or another tab.
 *
 * @returns `[value, setValue, removeValue, { loading }]`; `setValue(null)` removes the key
 */
export function useSecureStorage<T = SecureStorageValue>(key: string, initialValue: T): [T, SetSecureValue<T>, () => void, SecureStorageStatus];
export function useSecureStorage<T = SecureStorageValue>(key: string): [T | null, SetSecureValue<T | null>, () => void, SecureStorageStatus];
export function useSecureStorage<T>(key: string, initialValue: T | null = null) {
  const [state, setState] = useState<HookState<T>>({ key, loading: true, value: null });
  const latest = useRef(state);
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;
  /** Incremented for every read and write; a read only applies if nothing newer happened meanwhile */
  const version = useRef(0);

  const apply = useCallback((next: HookState<T>) => {
    latest.current = next;
    setState(next);
  }, []);

  const load = useCallback(() => {
    const id = ++version.current;
    store.getItem(key).then((value) => {
      if (id === version.current) apply({ key, loading: false, value: value as T | null });
    });
  }, [key, apply]);

  useEffect(() => {
    if (latest.current.key !== key) apply({ key, loading: true, value: null });
    load();
    const unsubscribe = store.onChange((changed) => {
      if (changed === null || changed === key) load();
    });
    return () => {
      unsubscribe();
      version.current++;
    };
  }, [key, load, apply]);

  const setValue = useCallback(
    (next: T | null | ((previous: T | null) => T | null)) => {
      const current = latest.current.key === key ? latest.current.value : null;
      const previous = current ?? initialRef.current;
      const value = typeof next === "function" ? (next as (previous: T | null) => T | null)(previous) : next;
      version.current++; // discard reads that started before this write
      apply({ key, loading: false, value: value ?? null });
      const save = value === null || value === undefined ? store.removeItem(key) : store.setItem(key, value as SecureStorageValue);
      save.then(
        (saved) => {
          if (saved === false) load();
        },
        () => load()
      );
    },
    [key, apply, load]
  );
  const removeValue = useCallback(() => setValue(null), [setValue]);

  const current = state.key === key ? state : { key, loading: true, value: null };
  return [current.value ?? initialValue, setValue, removeValue, { loading: current.loading }];
}

export default useSecureStorage;
