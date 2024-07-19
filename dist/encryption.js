"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _encUtf = _interopRequireDefault(require("crypto-js/enc-utf8"));
var _aes = _interopRequireDefault(require("crypto-js/aes"));
var _fingerprint = _interopRequireDefault(require("./fingerprint"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * EncryptionService
 */
class EncryptionService {
  static secureKey = "";
  constructor() {
    EncryptionService.secureKey = (0, _fingerprint.default)();
  }

  /**
   * Function to encrypt data
   * @param value
   * @returns
   */
  static encrypt(value) {
    return _aes.default.encrypt(value, this.secureKey).toString();
  }

  /**
   * Function to decrypt data
   * @param value
   * @returns
   */
  static decrypt(value) {
    try {
      var bytes = _aes.default.decrypt(value, this.secureKey);
      return bytes.toString(_encUtf.default) || null;
    } catch (ex) {
      return null;
    }
  }
}
;
var _default = EncryptionService;
exports.default = _default;