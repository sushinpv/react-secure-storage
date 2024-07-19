import Utf8 from "crypto-js/enc-utf8";
import AES from "crypto-js/aes";
import getFingerprint from "./fingerprint";

/**
 * EncryptionService
 */
class EncryptionService {
  static secureKey: string = "";

  constructor() {
    EncryptionService.secureKey = getFingerprint();
  }

  /**
   * Function to encrypt data
   * @param value
   * @returns
   */
  static encrypt(value: string) {
    return AES.encrypt(value, this.secureKey).toString();
  }

  /**
   * Function to decrypt data
   * @param value
   * @returns
   */
  static decrypt(value: string) {
    try {
      var bytes = AES.decrypt(value, this.secureKey);
      return bytes.toString(Utf8) || null;
    } catch (ex) {
      return null;
    }
  }
};

export default EncryptionService;
