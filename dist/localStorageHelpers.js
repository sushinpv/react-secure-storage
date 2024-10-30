"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _encryption = _interopRequireDefault(require("./encryption"));
var _utils = require("./utils");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const KEY_PREFIX = (0, _utils.getSecurePrefix)();

/**
 * Function to preload all the local storage data
 * @returns
 */
const getAllLocalStorageItems = () => {
  const localStorageItems = {};
  if (typeof window !== "undefined") {
    const encrypt = new _encryption.default();
    for (const [key, value] of Object.entries(localStorage)) {
      if (key.startsWith(KEY_PREFIX)) {
        let keyType = key.replace(KEY_PREFIX, "")[0];
        let parsedKey = key.replace(/[.][bjns][.]/, ".");
        let decryptedValue = encrypt.decrypt(value);
        let parsedValue = null;
        if (decryptedValue != null) switch (keyType) {
          case "b":
            parsedValue = decryptedValue === "true";
            break;
          case "j":
            try {
              parsedValue = JSON.parse(decryptedValue);
            } catch (ex) {
              parsedValue = null;
            }
            break;
          case "n":
            try {
              parsedValue = Number(decryptedValue);
            } catch (ex) {
              parsedValue = null;
            }
            break;
          default:
            parsedValue = decryptedValue;
        }
        localStorageItems[parsedKey] = parsedValue;
      }
    }
  }
  return localStorageItems;
};
var _default = exports.default = getAllLocalStorageItems;