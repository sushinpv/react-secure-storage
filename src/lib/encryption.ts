import { enc } from "crypto-js";
import AES from "crypto-js/aes";
import getFingerprint from "./fingerprint";

const EncryptionService = class {
  private secureKey: string = "";
  constructor() {
    this.secureKey = getFingerprint();
  }
  encrypt(value: string) {
    return AES.encrypt(value, this.secureKey).toString();
  }

  decrypt(value: string) {
    var bytes = AES.decrypt(value, this.secureKey);
    return bytes.toString(enc.Utf8);
  }
};

const encryptService = new EncryptionService();

export default encryptService;
