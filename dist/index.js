"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _encryption = _interopRequireDefault(require("./encryption"));
var _localStorageHelpers = _interopRequireDefault(require("./localStorageHelpers"));
var _utils = require("./utils");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const KEY_PREFIX = (0, _utils.getSecurePrefix)();

/**
 * Function to return datatype of the value we stored
 * @param value
 * @returns
 */
const getDataType = value => {
  return typeof value === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
};

/**
 * Function to create local storage key
 * @param key
 * @param value
 */
const getLocalKey = (key, value) => {
  let keyType = getDataType(value);
  return KEY_PREFIX + `${keyType}.` + key;
};

/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
class SecureLocalStorage {
  _localStorageItems = {};
  constructor() {
    this._localStorageItems = (0, _localStorageHelpers.default)();
  }

  /**
   * Function to set value to secure local storage
   * @param key to be added
   * @param value value to be added `use JSON.stringify(value) or value.toString() to save any other data type`
   */
  setItem(key, value) {
    if (value === null || value === undefined) this.removeItem(key);else {
      let parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
      let parsedKeyLocal = getLocalKey(key, value);
      let parsedKey = KEY_PREFIX + key;
      if (key != null) this._localStorageItems[parsedKey] = value;
      const encrypt = new _encryption.default();
      localStorage.setItem(parsedKeyLocal, encrypt.encrypt(parsedValue));
    }
  }

  /**
   * Function to get value from secure local storage
   * @param key to get
   * @returns
   */
  getItem(key) {
    let parsedKey = KEY_PREFIX + key;
    return this._localStorageItems[parsedKey] ?? null;
  }

  /**
   * Function to remove item from secure local storage
   * @param key to be removed
   */
  removeItem(key) {
    let parsedKey = KEY_PREFIX + key;
    let value = this._localStorageItems[parsedKey];
    let parsedKeyLocal = getLocalKey(key, value);
    if (this._localStorageItems[parsedKey] !== undefined) delete this._localStorageItems[parsedKey];
    localStorage.removeItem(parsedKeyLocal);
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
var _default = exports.default = secureLocalStorage;