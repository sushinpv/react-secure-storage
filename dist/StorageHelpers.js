"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _encryption = _interopRequireDefault(require("./encryption"));
var _utils = require("./utils");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const KEY_PREFIX = (0, _utils.getSecurePrefix)();

/**
 * Function to preload all the storage data
 * @returns
 */
const getAllStorageItems = (storage, _encrypt) => {
  const storageItems = {};
  for (const [key, value] of Object.entries(storage)) {
    if (key.startsWith(KEY_PREFIX)) {
      let keyType = key.replace(KEY_PREFIX, "")[0];
      let parsedKey = key.replace(/[.][bjns][.]/, ".");
      let decryptedValue = _encryption.default.decrypt(value);
      let parsedValue = null;
      if (decryptedValue != null) switch (keyType) {
        case "b":
          parsedValue = decryptedValue === "true";
          break;
        case "j":
          try {
            parsedValue = JSON.parse(decryptedValue);
          } catch {
            parsedValue = null;
          }
          break;
        case "n":
          try {
            parsedValue = Number(decryptedValue);
          } catch {
            parsedValue = null;
          }
          break;
        default:
          parsedValue = decryptedValue;
      }
      storageItems[parsedKey] = parsedValue;
    }
  }
  return storageItems;
};
var _default = getAllStorageItems;
exports.default = _default;