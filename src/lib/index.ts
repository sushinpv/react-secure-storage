import { StorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import getAllStorageItems from "./StorageHelpers";
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
 * Function to create storage key
 * @param key
 * @param value
 */
const getStorageKey = (key: string, value: string | object | number | boolean | null) => {
  let keyType = getDataType(value);
  return `${KEY_PREFIX}${keyType}.${key}`;
};

/**
 * This version of storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
class SecureStorage {
  private _storageItems: StorageItem = {};
  private _storage: Storage;
  private _encrypt: typeof EncryptionService;

  constructor(storageType: 'local' | 'session') {
    this._storage = storageType === 'local' ? localStorage : sessionStorage;
    this._encrypt = EncryptionService;
    this._storageItems = getAllStorageItems(this._storage, this._encrypt);
  }

  /**
   * Function to set value to secure storage
   * @param key to be added
   * @param value value to be added `use JSON.stringify(value) or value.toString() to save any other data type`
   */
  setItem(key: string, value: string | object | number | boolean): void {
    if (value === null || value === undefined) {
      this.removeItem(key);
    } else {
      let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
      let parsedKey = getStorageKey(key, value);
      if (key != null) this._storageItems[parsedKey] = value;
      this._storage.setItem(parsedKey, this._encrypt.encrypt(parsedValue));
    }
  }

  /**
   * Function to get value from secure storage
   * @param key to get
   * @returns
   */
  getItem(key: string): string | object | number | boolean | null {
    let parsedKey = `${KEY_PREFIX}${key}`;
    return this._storageItems[parsedKey] ?? null;
  }

  /**
   * Function to remove item from secure storage
   * @param key to be removed
   */
  removeItem(key: string): void {
    let parsedKey = `${KEY_PREFIX}${key}`;
    let value = this._storageItems[parsedKey];
    let parsedKeyLocal = getStorageKey(key, value);
    if (this._storageItems[parsedKey] !== undefined) delete this._storageItems[parsedKey];
    this._storage.removeItem(parsedKeyLocal);
  }

  /**
   * Function to clear secure storage
   */
  clear(): void {
    this._storageItems = {};
    this._storage.clear();
  }
}

const secureLocalStorage = new SecureStorage('local');
const secureSessionStorage = new SecureStorage('session');

export { secureLocalStorage, secureSessionStorage };
