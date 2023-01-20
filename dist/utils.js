"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSecurePrefix = void 0;

/**
 * Function which is used to get the secure prefix
 * @returns
 */
var getSecurePrefix = function getSecurePrefix() {
  var KEY_PREFIX = process.env.SECURE_LOCAL_STORAGE_PREFIX || process.env.REACT_APP_SECURE_LOCAL_STORAGE_PREFIX || "@secure.";
  if (typeof Cypress != "undefined") KEY_PREFIX = Cypress.env("SECURE_LOCAL_STORAGE_PREFIX") || Cypress.env("REACT_APP_SECURE_LOCAL_STORAGE_PREFIX") || KEY_PREFIX;
  if (!KEY_PREFIX.endsWith(".")) return KEY_PREFIX + ".";
  return KEY_PREFIX;
};

exports.getSecurePrefix = getSecurePrefix;