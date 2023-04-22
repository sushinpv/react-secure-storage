"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var SUPPORTED_PREFIX = ["", "REACT_APP_", "NEXT_PUBLIC_", "VITE_"];

/**
 * Function to get data from .env
 */
var getEnvValue = function getEnvValue(key) {
  var value = null;

  if (typeof Cypress != "undefined") {
    SUPPORTED_PREFIX.forEach(function (keyPrefix) {
      value = Cypress.env(keyPrefix + key) || value;
      if (value) return value;
    });
  } else if (typeof process.env != "undefined") {
    SUPPORTED_PREFIX.forEach(function (keyPrefix) {
      value = process.env[keyPrefix + key] || value;
      if (value) return value;
    });
  } else {
    console.warn("react-secure-storage : process is not defined! Just a warning!");
  }

  return value;
};

var envHelper = {
  getEnvValue: getEnvValue
};
var _default = envHelper;
exports.default = _default;