"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.secureStorage = exports.secureSessionStorage = exports.secureLocalStorage = void 0;

var _encryption = _interopRequireDefault(require("./encryption"));

var _storageHelpers = _interopRequireDefault(require("./storageHelpers"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var KEY_PREFIX = (0, _utils.getSecurePrefix)();
/**
 * Function to return datatype of the value we stored
 * @param value
 * @returns
 */

var getDataType = function getDataType(value) {
  return _typeof(value) === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
};
/**
 * Function to create storage key
 * @param key
 * @param value
 */


var getLocalKey = function getLocalKey(key, value) {
  var keyType = getDataType(value);
  return KEY_PREFIX + "".concat(keyType, ".") + key;
};
/**
 * This version of storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */


var secureStorage = /*#__PURE__*/function () {
  function secureStorage(storage) {
    _classCallCheck(this, secureStorage);

    _defineProperty(this, "_storage", void 0);

    _defineProperty(this, "_storageItems", {});

    this._storage = storage;
    this._storageItems = (0, _storageHelpers.default)(storage);
  }
  /**
   * Function to set value to secure local storage
   * @param key to be added
   * @param value value to be added `use JSON.stringify(value) or value.toString() to save any other data type`
   */


  _createClass(secureStorage, [{
    key: "setItem",
    value: function setItem(key, value) {
      if (value === null || value === undefined) this.removeItem(key);else {
        var parsedValue = _typeof(value) === "object" ? JSON.stringify(value) : value + "";
        var parsedKeyLocal = getLocalKey(key, value);
        var parsedKey = KEY_PREFIX + key;
        if (key != null) this._storageItems[parsedKey] = value;
        var encrypt = new _encryption.default();

        this._storage.setItem(parsedKeyLocal, encrypt.encrypt(parsedValue));
      }
    }
    /**
     * Function to get value from secure storage
     * @param key to get
     * @returns
     */

  }, {
    key: "getItem",
    value: function getItem(key) {
      var _this$_storageItems$p;

      var parsedKey = KEY_PREFIX + key;
      return (_this$_storageItems$p = this._storageItems[parsedKey]) !== null && _this$_storageItems$p !== void 0 ? _this$_storageItems$p : null;
    }
    /**
     * Function to remove item from secure storage
     * @param key to be removed
     */

  }, {
    key: "removeItem",
    value: function removeItem(key) {
      var parsedKey = KEY_PREFIX + key;
      var value = this._storageItems[parsedKey];
      var parsedKeyLocal = getLocalKey(key, value);
      if (this._storageItems[parsedKey] !== undefined) delete this._storageItems[parsedKey];

      this._storage.removeItem(parsedKeyLocal);
    }
    /**
     * Function to clear secure storage
     */

  }, {
    key: "clear",
    value: function clear() {
      this._storageItems = {};

      this._storage.clear();
    }
  }]);

  return secureStorage;
}();

exports.secureStorage = secureStorage;
var secureLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? new secureStorage(window.localStorage) : null;
exports.secureLocalStorage = secureLocalStorage;
var secureSessionStorage = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined' ? new secureStorage(window.sessionStorage) : null;
exports.secureSessionStorage = secureSessionStorage;