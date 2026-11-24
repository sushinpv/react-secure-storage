import store from "./core/store";
import type { ChangeListener, ErrorListener, SecureStorageOptions, SecureStorageValue } from "./core/types";

export type { ChangeListener, ErrorListener, SecureStorageError, SecureStorageOptions, SecureStorageValue } from "./core/types";

/**
 * Encrypted localStorage with an async API.
 *
 * Values are encrypted with a non-extractable AES-GCM key kept in IndexedDB (or the v1 fingerprint key when Web Crypto
 * is unavailable). Each key is decrypted when it is read. On the server every method resolves without doing anything
 * and `getItem` resolves to null.
 */
export interface SecureStorage {
  /** The stored value with its original type, or null if missing, unreadable or on the server */
  getItem(key: string): Promise<SecureStorageValue | null>;
  /**
   * Encrypt and store a value. Passing null or undefined removes the key.
   * Rejects if localStorage refuses the write (e.g. quota exceeded), unless an `onError` listener is registered.
   */
  setItem(key: string, value: SecureStorageValue | null | undefined): Promise<void>;
  /** Remove a key */
  removeItem(key: string): Promise<void>;
  /** Remove every value written by this library, including v1 data. Other localStorage keys are kept. */
  clear(): Promise<void>;
  /** Subscribe to changes made in this tab and in other tabs. Returns an unsubscribe function. */
  onChange(listener: ChangeListener): () => void;
  /** Subscribe to storage errors; values are never included. Returns an unsubscribe function. */
  onError(listener: ErrorListener): () => void;
}

const secureLocalStorage: SecureStorage = {
  getItem: (key) => store.getItem(key),
  setItem: (key, value) => store.setItem(key, value).then(() => undefined),
  removeItem: (key) => store.removeItem(key),
  clear: () => store.clear(),
  onChange: (listener) => store.onChange(listener),
  onError: (listener) => store.onError(listener),
};

/**
 * Configure the library. Must run before the first storage call; later calls are reported as a `config` error and
 * ignored. Options override the matching environment variables.
 */
export const configure = (options: SecureStorageOptions): void => store.configure(options);

export default secureLocalStorage;
