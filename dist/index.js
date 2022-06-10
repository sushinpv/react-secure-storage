"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _encryption = _interopRequireDefault(require("./encryption"));

var _localStorageHelpers = _interopRequireDefault(require("./localStorageHelpers"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var KEY_PREFIX = "@secure.";
/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */

var SecureLocalStorage = /*#__PURE__*/function () {
  function SecureLocalStorage() {
    _classCallCheck(this, SecureLocalStorage);

    _defineProperty(this, "localStorageItems", {});

    this.localStorageItems = (0, _localStorageHelpers.default)();
  }

  _createClass(SecureLocalStorage, [{
    key: "setItem",
    value: function setItem(key, value) {
      var parsedValue = _typeof(value) === "object" ? JSON.stringify(value) : value + "";
      var keyType = _typeof(value) === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
      var parsedKey = KEY_PREFIX + "".concat(keyType, ".") + key;
      if (key != null) this.localStorageItems[parsedKey] = value;
      localStorage.setItem(parsedKey, _encryption.default.encrypt(parsedValue));
    }
  }]);

  return SecureLocalStorage;
}();

var secureLocalStorage = new SecureLocalStorage();
var _default = secureLocalStorage;
exports.default = _default;