/**
 * Values that keep their type when stored: string, number, boolean and objects (stored as JSON).
 */
export type SecureStorageValue = string | object | number | boolean;

/** Called with the changed key, or null when every key may have changed (clear) */
export type ChangeListener = (key: string | null) => void;

export interface SecureStorageError {
  /**
   * - `decrypt`: a stored value could not be decrypted (e.g. after a browser fingerprint change); it reads as null
   * - `write`: localStorage rejected a write (e.g. quota exceeded)
   * - `unavailable`: localStorage is blocked in this browser (sandboxed iframe, blocked cookies); all calls are no-ops
   */
  type: "decrypt" | "write" | "unavailable";
  /** The affected key, or null when not specific to one key */
  key: string | null;
  /** The underlying error, for `write` errors */
  error?: unknown;
}

export type ErrorListener = (error: SecureStorageError) => void;

/**
 * Encrypted localStorage that keeps value types.
 * To change the custom secure key, set `SECURE_LOCAL_STORAGE_HASH_KEY` (or the `REACT_APP_`, `VITE_`, `NEXT_PUBLIC_` variant).
 *
 * On the server, or when localStorage is blocked, every method is a no-op and `getItem` returns `null`.
 */
export interface SecureLocalStorage {
  /**
   * Encrypt and store a value. Passing null or undefined removes the key.
   * Throws if localStorage rejects the write (e.g. quota exceeded), unless an `onError` listener is registered.
   */
  setItem(key: string, value: SecureStorageValue): void;

  /** The stored value with its original type, or null if missing or unreadable */
  getItem(key: string): SecureStorageValue | null;

  /** Remove a key */
  removeItem(key: string): void;

  /** Remove every value written by this library. Other localStorage keys are kept. */
  clear(): void;

  /**
   * Subscribe to changes made in this tab and in other tabs of the same site.
   * @returns a function that unsubscribes
   */
  onChange(listener: ChangeListener): () => void;

  /**
   * Subscribe to storage errors. While a listener is registered, write errors are reported instead of thrown.
   * Errors never include stored values.
   * @returns a function that unsubscribes
   */
  onError(listener: ErrorListener): () => void;
}

declare const secureLocalStorage: SecureLocalStorage;

export default secureLocalStorage;
