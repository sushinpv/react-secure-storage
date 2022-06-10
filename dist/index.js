"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _localStorageHelpers = _interopRequireDefault(require("./localStorageHelpers"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var SecureLocalStorage = /*#__PURE__*/_createClass(function SecureLocalStorage() {
  _classCallCheck(this, SecureLocalStorage);

  _defineProperty(this, "localStorageItems", []);

  this.localStorageItems = (0, _localStorageHelpers.default)();
  console.log("this.localStorageItems", this.localStorageItems);
});

var secureLocalStorage = new SecureLocalStorage();
var _default = secureLocalStorage;
exports.default = _default;