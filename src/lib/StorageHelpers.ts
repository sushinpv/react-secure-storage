import { StorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import { getSecurePrefix } from "./utils";

const KEY_PREFIX = getSecurePrefix();

/**
 * Function to preload all the storage data
 * @returns
 */
const getAllStorageItems = (storage: Storage, _encrypt: typeof EncryptionService): StorageItem => {
  const storageItems: StorageItem = {};
  for (const [key, value] of Object.entries(storage)) {
    if (key.startsWith(KEY_PREFIX)) {
      let keyType = key.replace(KEY_PREFIX, "")[0];
      let parsedKey = key.replace(/[.][bjns][.]/, ".");
      let decryptedValue = EncryptionService.decrypt(value);
      let parsedValue = null;
      if (decryptedValue != null)
        switch (keyType) {
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

export default getAllStorageItems;