import { LocalStorageItem, SessionStorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import getAllStorageItems from "./storageHelpers";
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
const getLocalKey = (key: string, value: string | object | number | boolean | null) => {
  let keyType = getDataType(value);
  return KEY_PREFIX + `${keyType}.` + key;
};

/**
 * This version of storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
export class secureStorage {
  private _storage: Storage;
  private _storageItems: LocalStorageItem | SessionStorageItem = {};

  constructor(storage: Storage) {
    this._storage = storage;
    this._storageItems = getAllStorageItems(storage);
  }

  /**
   * Function to set value to secure local storage
   * @param key to be added
   * @param value value to be added `use JSON.stringify(value) or value.toString() to save any other data type`
   */
  setItem(key: string, value: string | object | number | boolean) {
    if (value === null || value === undefined) this.removeItem(key);
    else {
      let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
      let parsedKeyLocal = getLocalKey(key, value);
      let parsedKey = KEY_PREFIX + key;
      if (key != null) this._storageItems[parsedKey] = value;
      const encrypt = new EncryptionService();
      this._storage.setItem(parsedKeyLocal, encrypt.encrypt(parsedValue));
    }
  }

  /**
   * Function to get value from secure storage
   * @param key to get
   * @returns
   */
  getItem(key: string): string | object | number | boolean | null {
    let parsedKey = KEY_PREFIX + key;
    return this._storageItems[parsedKey] ?? null;
  }

  /**
   * Function to remove item from secure storage
   * @param key to be removed
   */
  removeItem(key: string) {
    let parsedKey = KEY_PREFIX + key;
    let value = this._storageItems[parsedKey]; 
    let parsedKeyLocal = getLocalKey(key, value);

    if (this._storageItems[parsedKey] !== undefined) delete this._storageItems[parsedKey];
    this._storage.removeItem(parsedKeyLocal);
  }

  /**
   * Function to clear secure storage
   */
  clear() {
    this._storageItems = {};
    this._storage.clear();
  }
}

const secureLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? new secureStorage(window.localStorage) : null;
const secureSessionStorage = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined' ? new secureStorage(window.sessionStorage) : null;

export { secureLocalStorage, secureSessionStorage };
