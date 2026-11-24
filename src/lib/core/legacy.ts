/**
 * v1 fingerprint-key cipher (crypto-js AES with a key derived from browser properties).
 * Loaded with a dynamic import only when needed (fallback mode or migration), so most apps never download it.
 */
import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";
import clientJS from "./fingerprint.lib";
import type { Cipher } from "./types";

export interface LegacyCipher extends Cipher {
  /** Decrypt a raw v1 value */
  decryptRaw(value: string): string | null;
}

export const createLegacyCipher = (options: { hashKey: string; disabledKeys: string[] }): LegacyCipher => {
  const secret = clientJS.getFingerprint(options.disabledKeys) + options.hashKey;

  const decryptRaw = (value: string) => {
    try {
      return AES.decrypt(value, secret).toString(Utf8) || null;
    } catch (ex) {
      return null;
    }
  };

  return {
    alg: "legacy",
    decryptRaw,
    // The user key is encrypted with the value and checked on decrypt, so values can't be swapped between keys.
    // The JSON wrapper also rejects the random text crypto-js occasionally returns for a wrong key.
    async encrypt(plaintext, key) {
      return { v: 2, alg: "legacy", ct: AES.encrypt(JSON.stringify({ k: key, p: plaintext }), secret).toString() };
    },
    async decrypt(envelope, key) {
      if (envelope.alg !== "legacy") return null;
      const decrypted = decryptRaw(envelope.ct);
      if (decrypted === null) return null;
      try {
        const wrapped = JSON.parse(decrypted);
        return wrapped && wrapped.k === key && typeof wrapped.p === "string" ? wrapped.p : null;
      } catch (ex) {
        return null;
      }
    },
  };
};
