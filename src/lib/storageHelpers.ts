import { SessionStorageItem, LocalStorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import { getSecurePrefix } from "./utils";

const KEY_PREFIX = getSecurePrefix();

/**
 * Function to preload all the storage data
 * @returns
 */
const getAllStorageItems = (storage : Storage) => {
  let sessionStorageItems: SessionStorageItem = {};
  let localStorageItems: LocalStorageItem = {};
  if (typeof window !== "undefined") {
    const encrypt = new EncryptionService();
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith(KEY_PREFIX)) {
        let keyType = key.replace(KEY_PREFIX, "")[0];
        let parsedKey = key.replace(/[.][bjns][.]/, ".");
        let decryptedValue = encrypt.decrypt(value);
        let parsedValue = null;
        if (decryptedValue != null)
          switch (keyType) {
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
          if (storage === sessionStorage) {
            sessionStorageItems[parsedKey] = parsedValue;
          } else {
            localStorageItems[parsedKey] = parsedValue;
          }
      }
    }
  }
  if (storage === sessionStorage) {
    return sessionStorageItems;
  } else {
    return localStorageItems;
  }
};

export default getAllStorageItems;
