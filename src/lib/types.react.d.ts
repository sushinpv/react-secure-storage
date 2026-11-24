import type { SecureStorageValue } from "./types";

export type { SecureStorageValue };

/** Set a new value, or compute it from the previous one. Setting null removes the key. */
export type SetSecureValue<T> = (value: T | null | ((previous: T) => T | null)) => void;

/**
 * React hook for a single secure storage key.
 *
 * Hydration-safe: during server rendering and hydration it returns `initialValue`, then the stored value once
 * the component is mounted in the browser. In client-only apps the stored value is returned on the first render.
 * Re-renders when the key changes in this tab or in another tab.
 *
 * @example
 * const [theme, setTheme, removeTheme] = useSecureStorage("theme", "light");
 */
export declare function useSecureStorage<T = SecureStorageValue>(key: string, initialValue: T): [T, SetSecureValue<T>, () => void];
export declare function useSecureStorage<T extends SecureStorageValue = SecureStorageValue>(key: string): [T | null, SetSecureValue<T | null>, () => void];

export default useSecureStorage;
