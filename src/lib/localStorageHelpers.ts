import encryptService from "./encryption";
import { LocalStorageItem } from "./types";

/**
 * Function to preload all the local storage data
 * @returns
 */
const getAllLocalStorageItems = () => {
  const localStorageItems: LocalStorageItem = {};
  for (const [key, value] of Object.entries(localStorage)) {
    if (key.startsWith("@secure.")) {
      let keyType = key.replace("@secure.", "")[0];
      let parsedKey = key.replace(/[.][bjns][.]/, ".");
      let decryptedValue = encryptService.decrypt(value);
      let parsedValue = null;
      if (decryptedValue != null)
        switch (keyType) {
          case "b":
            parsedValue = decryptedValue === "true";
            break;
          case "j":
            parsedValue = JSON.parse(decryptedValue);
            break;
          case "n":
            parsedValue = Number(decryptedValue);
            break;
          default:
            parsedValue = decryptedValue;
        }
      localStorageItems[parsedKey] = parsedValue;
    }
  }
  return localStorageItems;
};

export default getAllLocalStorageItems;