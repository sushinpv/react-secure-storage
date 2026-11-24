import { useCallback, useRef, useSyncExternalStore } from "react";
import secureLocalStorage, { type SecureStorageValue } from "./index";

export type SetSecureValue<T> = (value: T | null | ((previous: T) => T | null)) => void;

const getServerSnapshot = () => null;

/**
 * React hook for a single secure storage key.
 *
 * Hydration-safe: during server rendering and hydration it returns `initialValue`, then the stored value once
 * the component is mounted in the browser. In client-only apps the stored value is returned on the first render.
 * Re-renders when the key changes in this tab or in another tab.
 *
 * @returns `[value, setValue, removeValue]`; `setValue(null)` removes the key
 */
export function useSecureStorage<T = SecureStorageValue>(key: string, initialValue: T): [T, SetSecureValue<T>, () => void];
export function useSecureStorage<T extends SecureStorageValue = SecureStorageValue>(key: string): [T | null, SetSecureValue<T | null>, () => void];
export function useSecureStorage<T>(key: string, initialValue: T | null = null) {
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  const subscribe = useCallback(
    (notify: () => void) =>
      secureLocalStorage.onChange((changed) => {
        if (changed === null || changed === key) notify();
      }),
    [key]
  );
  const getSnapshot = useCallback(() => secureLocalStorage.getItem(key) as T | null, [key]);
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | null | ((previous: T | null) => T | null)) => {
      const previous = (secureLocalStorage.getItem(key) as T | null) ?? initialRef.current;
      const value = typeof next === "function" ? (next as (previous: T | null) => T | null)(previous) : next;
      if (value === null || value === undefined) secureLocalStorage.removeItem(key);
      else secureLocalStorage.setItem(key, value as SecureStorageValue);
    },
    [key]
  );
  const removeValue = useCallback(() => secureLocalStorage.removeItem(key), [key]);

  return [stored ?? initialValue, setValue, removeValue];
}

export default useSecureStorage;
