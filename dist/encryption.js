function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import Utf8 from "crypto-js/enc-utf8";
import AES from "crypto-js/aes";
import getFingerprint from "./fingerprint";
/**
 * EncryptionService
 */

const EncryptionService = class EncryptionService {
  constructor() {
    _defineProperty(this, "secureKey", "");

    this.secureKey = getFingerprint();
  }
  /**
   * Function to encrypt data
   * @param value
   * @returns
   */


  encrypt(value) {
    return AES.encrypt(value, this.secureKey).toString();
  }
  /**
   * Function to decrypt data
   * @param value
   * @returns
   */


  decrypt(value) {
    try {
      var bytes = AES.decrypt(value, this.secureKey);
      return bytes.toString(Utf8) || null;
    } catch (ex) {
      return null;
    }
  }

};
const encryptService = new EncryptionService();
export default encryptService;