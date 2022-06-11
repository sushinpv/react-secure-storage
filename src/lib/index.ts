import encrypt from "./encryption";
import getAllLocalStorageItems from "./localStorageHelpers";
import { LocalStorageItem } from "./types";

const KEY_PREFIX = "@secure.";

/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
const SecureLocalStorage = class {
  protected localStorageItems: LocalStorageItem = {};

  constructor() {
    this.localStorageItems = getAllLocalStorageItems();
  }

  /**
   * Function to set value to secure local storage
   * @param key
   * @param value
   */
  setItem(key: string, value: String | Object | Number | Boolean) {
    let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
    let keyType = typeof value === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
    let parsedKeyLocal = KEY_PREFIX + `${keyType}.` + key;
    let parsedKey = KEY_PREFIX + key;
    if (key != null) this.localStorageItems[parsedKey] = value;
    localStorage.setItem(parsedKeyLocal, encrypt.encrypt(parsedValue));
  }

  /**
   * Function to get value from secure local storage
   * @param key
   * @returns
   */
  getItem(key: string) {
    let parsedKey = KEY_PREFIX + key;
    return this.localStorageItems[parsedKey] || null;
  }
};

const secureLocalStorage = new SecureLocalStorage();

export default secureLocalStorage;
