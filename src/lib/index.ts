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

  setItem(key: string, value: String | Object | Number | Boolean) {
    let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
    let keyType = typeof value === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
    let parsedKey = KEY_PREFIX + `${keyType}.` + key;
    if (key != null) this.localStorageItems[parsedKey] = value;
    localStorage.setItem(parsedKey, encrypt.encrypt(parsedValue));
  }
};

const secureLocalStorage = new SecureLocalStorage();

export default secureLocalStorage;
