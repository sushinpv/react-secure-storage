"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.secureSessionStorage = exports.secureLocalStorage = void 0;
var _encryption = _interopRequireDefault(require("./encryption"));
var _StorageHelpers = _interopRequireDefault(require("./StorageHelpers"));
var _utils = require("./utils");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
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
 * Function to create storage key
 * @param key
 * @param value
 */
const getStorageKey = (key, value) => {
  let keyType = getDataType(value);
  return `${KEY_PREFIX}${keyType}.${key}`;
};

/**
 * This version of storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
class SecureStorage {
  _storageItems = {};
  constructor(storageType) {
    this._storage = storageType === 'local' ? localStorage : sessionStorage;
    this._encrypt = _encryption.default;
    this._storageItems = (0, _StorageHelpers.default)(this._storage, this._encrypt);
  }

  /**
   * Function to set value to secure storage
   * @param key to be added
   * @param value value to be added `use JSON.stringify(value) or value.toString() to save any other data type`
   */
  setItem(key, value) {
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
  getItem(key) {
    let parsedKey = `${KEY_PREFIX}${key}`;
    return this._storageItems[parsedKey] ?? null;
  }

  /**
   * Function to remove item from secure storage
   * @param key to be removed
   */
  removeItem(key) {
    let parsedKey = `${KEY_PREFIX}${key}`;
    let value = this._storageItems[parsedKey];
    let parsedKeyLocal = getStorageKey(key, value);
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
const secureLocalStorage = new SecureStorage('local');
exports.secureLocalStorage = secureLocalStorage;
const secureSessionStorage = new SecureStorage('session');
exports.secureSessionStorage = secureSessionStorage;