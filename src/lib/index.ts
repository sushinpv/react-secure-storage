import { LocalStorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import { getBrowserStorage } from "./environment";
import getAllLocalStorageItems, { DATA_TYPES, parseStorageKey, readStoredKey } from "./localStorageHelpers";
import { getSecurePrefix } from "./utils";

const KEY_PREFIX = getSecurePrefix();

export type SecureStorageValue = string | object | number | boolean;

/** `key` is the changed key, or null when every key may have changed (clear) */
export type ChangeListener = (key: string | null) => void;

export interface SecureStorageError {
  /**
   * - `decrypt`: a stored value could not be decrypted (e.g. after a browser fingerprint change); it reads as null
   * - `write`: localStorage rejected a write (e.g. quota exceeded)
   * - `unavailable`: localStorage is blocked in this browser (sandboxed iframe, blocked cookies); all calls are no-ops
   */
  type: "decrypt" | "write" | "unavailable";
  key: string | null;
  error?: unknown;
}

export type ErrorListener = (error: SecureStorageError) => void;

/**
 * Function to return datatype of the value we stored
 * @param value
 * @returns
 */
const getDataType = (value: string | object | number | boolean | null) => {
  return typeof value === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
};

/**
 * Function to create local storage key
 * @param key
 * @param value
 */
const getLocalKey = (key: string, value: string | object | number | boolean | null) => {
  let keyType = getDataType(value);
  return KEY_PREFIX + `${keyType}.` + key;
};

/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 *
 * SSR: on the server (or when localStorage is blocked) every method is a no-op and `getItem` returns `null`.
 * Nothing is read from storage at import time; data is loaded on the first call in the browser.
 * Changes made in other tabs are picked up through the browser `storage` event.
 */
class SecureLocalStorage {
  private _localStorageItems: LocalStorageItem | null = null;
  private _changeListeners: ChangeListener[] = [];
  private _errorListeners: ErrorListener[] = [];
  private _unavailableReported = false;

  /**
   * Returns the decrypted in-memory cache, loading it on first use in the browser.
   * Returns null when storage is unavailable (server, blocked storage); nothing is cached in that case.
   */
  private _getItems(): LocalStorageItem | null {
    if (getBrowserStorage() === null) {
      if (typeof window !== "undefined" && !this._unavailableReported) {
        this._unavailableReported = true;
        this._reportError({ type: "unavailable", key: null });
      }
      return null;
    }
    if (this._localStorageItems === null) {
      this._localStorageItems = getAllLocalStorageItems(this._reportUnreadable);
      window.addEventListener("storage", this._onStorageEvent);
    }
    return this._localStorageItems;
  }

  private _reportUnreadable = (key: string) => this._reportError({ type: "decrypt", key });

  private _reportError(error: SecureStorageError) {
    this._errorListeners.slice().forEach((listener) => listener(error));
  }

  private _emitChange(key: string | null) {
    this._changeListeners.slice().forEach((listener) => listener(key));
  }

  /** Keeps the cache in sync with writes made by other tabs and windows of the same site */
  private _onStorageEvent = (event: StorageEvent) => {
    const storage = getBrowserStorage();
    if (storage === null || this._localStorageItems === null || event.storageArea !== storage) return;

    if (event.key === null) {
      // localStorage.clear() in another tab
      this._localStorageItems = getAllLocalStorageItems(this._reportUnreadable);
      this._emitChange(null);
      return;
    }
    const parsed = parseStorageKey(event.key);
    if (parsed === null) return;
    const value = readStoredKey(storage, parsed.key, this._reportUnreadable);
    if (value === undefined) delete this._localStorageItems[KEY_PREFIX + parsed.key];
    else this._localStorageItems[KEY_PREFIX + parsed.key] = value;
    this._emitChange(parsed.key);
  };

  /**
   * Function to set value to secure local storage
   * @param key to be added
   * @param value value to be added `use JSON.stringify(value) or value.toString() to save any other data type`
   */
  setItem(key: string, value: SecureStorageValue) {
    if (value === null || value === undefined) {
      this.removeItem(key);
      return;
    }
    const storage = getBrowserStorage();
    const items = this._getItems();
    if (storage === null || items === null) return;

    let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
    let parsedKeyLocal = getLocalKey(key, value);
    const encrypt = new EncryptionService();
    try {
      storage.setItem(parsedKeyLocal, encrypt.encrypt(parsedValue));
    } catch (error) {
      // Report to error listeners when there are any; otherwise keep the previous behaviour of throwing
      if (this._errorListeners.length === 0) throw error;
      this._reportError({ type: "write", key, error });
      return;
    }
    if (key != null) items[KEY_PREFIX + key] = value;

    // A key keeps a single stored entry: drop entries written for the same key with another data type
    DATA_TYPES.forEach((type) => {
      const otherKey = KEY_PREFIX + `${type}.` + key;
      if (otherKey !== parsedKeyLocal) storage.removeItem(otherKey);
    });
    this._emitChange(key);
  }

  /**
   * Function to get value from secure local storage
   * @param key to get
   * @returns
   */
  getItem(key: string): SecureStorageValue | null {
    const items = this._getItems();
    if (items === null) return null;
    let parsedKey = KEY_PREFIX + key;
    return items[parsedKey] ?? null;
  }

  /**
   * Function to remove item from secure local storage
   * @param key to be removed
   */
  removeItem(key: string) {
    const storage = getBrowserStorage();
    const items = this._getItems();
    if (storage === null || items === null) return;

    let parsedKey = KEY_PREFIX + key;
    if (items[parsedKey] !== undefined) delete items[parsedKey];
    // Remove every data-type variant, so the entry is removed even if the cached value is missing
    DATA_TYPES.forEach((type) => storage.removeItem(KEY_PREFIX + `${type}.` + key));
    this._emitChange(key);
  }

  /**
   * Function to clear secure local storage.
   * Only removes entries written by this library (matching the configured prefix); other localStorage keys are kept.
   */
  clear() {
    const storage = getBrowserStorage();
    if (storage === null || this._getItems() === null) return;

    this._localStorageItems = {};
    const ownedKeys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const storageKey = storage.key(i);
      if (storageKey !== null && parseStorageKey(storageKey) !== null) ownedKeys.push(storageKey);
    }
    ownedKeys.forEach((storageKey) => storage.removeItem(storageKey));
    this._emitChange(null);
  }

  /**
   * Subscribe to changes made in this tab (setItem, removeItem, clear) and in other tabs.
   * @param listener called with the changed key, or null when every key may have changed
   * @returns a function that unsubscribes
   */
  onChange(listener: ChangeListener): () => void {
    this._changeListeners.push(listener);
    return () => {
      this._changeListeners = this._changeListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Subscribe to storage errors: unreadable values, rejected writes and blocked storage.
   * While at least one listener is registered, write errors are reported here instead of thrown.
   * Errors never include stored values.
   * @returns a function that unsubscribes
   */
  onError(listener: ErrorListener): () => void {
    this._errorListeners.push(listener);
    return () => {
      this._errorListeners = this._errorListeners.filter((l) => l !== listener);
    };
  }
}

const secureLocalStorage = new SecureLocalStorage();

export default secureLocalStorage;
