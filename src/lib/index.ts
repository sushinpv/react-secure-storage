import { LocalStorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import getAllLocalStorageItems from "./localStorageHelpers";

const KEY_PREFIX = "@secure.";

/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
class SecureLocalStorage {
  private _localStorageItems: LocalStorageItem = {};

  constructor() {
    this._localStorageItems = getAllLocalStorageItems();
  }

  /**
   * Function to set value to secure local storage
   * @param key to be added
   * @param value value to be added
   */
  setItem(key: string, value: string | object | number | boolean) {
    let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
    let keyType = typeof value === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
    let parsedKeyLocal = KEY_PREFIX + `${keyType}.` + key;
    let parsedKey = KEY_PREFIX + key;
    if (key != null) this._localStorageItems[parsedKey] = value;
    const encrypt = new EncryptionService();
    localStorage.setItem(parsedKeyLocal, encrypt.encrypt(parsedValue));
  }

  /**
   * Function to get value from secure local storage
   * @param key to get
   * @returns
   */
  getItem(key: string): string | object | number | boolean | null {
    let parsedKey = KEY_PREFIX + key;
    return this._localStorageItems[parsedKey] || null;
  }

  /**
   * Function to remove item from secure local storage
   * @param key to be removed
   */
  removeItem(key: string) {
    let parsedKey = KEY_PREFIX + key;
    this._localStorageItems[parsedKey] = null;
    localStorage.removeItem(key);
  }

  /**
   * Function to clear secure local storage
   */
  clear() {
    this._localStorageItems = {};
    localStorage.clear();
  }
}

const secureLocalStorage = new SecureLocalStorage();

export default secureLocalStorage;
