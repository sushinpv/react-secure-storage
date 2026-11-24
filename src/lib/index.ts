import { LocalStorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import { getBrowserStorage } from "./environment";
import getAllLocalStorageItems, { DATA_TYPES, parseStorageKey } from "./localStorageHelpers";
import { getSecurePrefix } from "./utils";

const KEY_PREFIX = getSecurePrefix();

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
 */
class SecureLocalStorage {
  private _localStorageItems: LocalStorageItem | null = null;

  /**
   * Returns the decrypted in-memory cache, loading it on first use in the browser.
   * Returns null when storage is unavailable (server, blocked storage); nothing is cached in that case.
   */
  private _getItems(): LocalStorageItem | null {
    if (getBrowserStorage() === null) return null;
    if (this._localStorageItems === null) this._localStorageItems = getAllLocalStorageItems();
    return this._localStorageItems;
  }

  /**
   * Function to set value to secure local storage
   * @param key to be added
   * @param value value to be added `use JSON.stringify(value) or value.toString() to save any other data type`
   */
  setItem(key: string, value: string | object | number | boolean) {
    if (value === null || value === undefined) {
      this.removeItem(key);
      return;
    }
    const storage = getBrowserStorage();
    const items = this._getItems();
    if (storage === null || items === null) return;

    let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
    let parsedKeyLocal = getLocalKey(key, value);
    let parsedKey = KEY_PREFIX + key;
    if (key != null) items[parsedKey] = value;
    const encrypt = new EncryptionService();
    storage.setItem(parsedKeyLocal, encrypt.encrypt(parsedValue));

    // A key keeps a single stored entry: drop entries written for the same key with another data type
    DATA_TYPES.forEach((type) => {
      const otherKey = KEY_PREFIX + `${type}.` + key;
      if (otherKey !== parsedKeyLocal) storage.removeItem(otherKey);
    });
  }

  /**
   * Function to get value from secure local storage
   * @param key to get
   * @returns
   */
  getItem(key: string): string | object | number | boolean | null {
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
  }

  /**
   * Function to clear secure local storage.
   * Only removes entries written by this library (matching the configured prefix); other localStorage keys are kept.
   */
  clear() {
    const storage = getBrowserStorage();
    if (storage === null) return;

    this._localStorageItems = {};
    const ownedKeys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const storageKey = storage.key(i);
      if (storageKey !== null && parseStorageKey(storageKey) !== null) ownedKeys.push(storageKey);
    }
    ownedKeys.forEach((storageKey) => storage.removeItem(storageKey));
  }
}

const secureLocalStorage = new SecureLocalStorage();

export default secureLocalStorage;
