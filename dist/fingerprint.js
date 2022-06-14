"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fingerprint = _interopRequireDefault(require("./fingerprint.lib"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HASH_KEY = "E86E2612010258B35137";
/**
 * Function to get browser finger print
 * @returns
 */

var getFingerprint = function getFingerprint() {
  if (typeof window === "undefined") return process.env.SECURE_LOCAL_STORAGE_HASH_KEY || process.env.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY;
  return _fingerprint.default.getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || process.env.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
};

var _default = getFingerprint;
exports.default = _default;