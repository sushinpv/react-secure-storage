"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _envHelper = _interopRequireDefault(require("./envHelper"));
var _fingerprint = _interopRequireDefault(require("./fingerprint.lib"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* eslint-disable no-undef */

const HASH_KEY = "E86E2612010258B35137";

/**
 * Function to get browser finger print
 * @returns
 */
const getFingerprint = () => {
  let HASH_KEY_CUSTOM = _envHelper.default.getHashKey() || HASH_KEY;
  if (typeof window === "undefined") return HASH_KEY_CUSTOM;
  return _fingerprint.default.getFingerprint() + HASH_KEY_CUSTOM;
};
var _default = exports.default = getFingerprint;