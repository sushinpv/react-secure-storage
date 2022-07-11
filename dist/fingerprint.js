"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fingerprint = _interopRequireDefault(require("./fingerprint.lib"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-undef */
var HASH_KEY = "E86E2612010258B35137";
/**
 * Function to get browser finger print
 * @returns
 */

var getFingerprint = function getFingerprint() {
  var HASH_KEY_CUSTOM = HASH_KEY; // If Cypress is installed, then load env from cypress, adding support for cypress

  if (typeof Cypress != "undefined") HASH_KEY_CUSTOM = Cypress.env("SECURE_LOCAL_STORAGE_HASH_KEY") || Cypress.env("REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY") || HASH_KEY; //Load the custom HASH KEY from process.env
  else HASH_KEY_CUSTOM = process.env.SECURE_LOCAL_STORAGE_HASH_KEY || process.env.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY;
  if (typeof window === "undefined") return HASH_KEY_CUSTOM;
  return _fingerprint.default.getFingerprint() + HASH_KEY_CUSTOM;
};

var _default = getFingerprint;
exports.default = _default;