"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
exports.hashCode = hashCode;

var _fingerPrint = _interopRequireDefault(require("./finger-print"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import { ClientJS } from "clientjs";
var HASH_KEY = "E86E2612010258B35137";

function hashCode(str) {
  return str.split("").reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}

var getFingerprint = function getFingerprint() {
  return _fingerPrint.default.getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY); // return new ClientJS().getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
};

var _default = getFingerprint;
exports.default = _default;