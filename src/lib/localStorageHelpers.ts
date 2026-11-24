import { LocalStorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import { getBrowserStorage } from "./environment";
import { getSecurePrefix } from "./utils";

const KEY_PREFIX = getSecurePrefix();

export const DATA_TYPES = ["b", "j", "n", "s"] as const;
export type DataType = typeof DATA_TYPES[number];

/**
 * Parse a raw localStorage key of the form `<prefix><type>.<key>`
 * @returns the data type and the user key, or null when the key is not owned by this library
 */
export const parseStorageKey = (storageKey: string): { type: DataType; key: string } | null => {
  if (!storageKey.startsWith(KEY_PREFIX)) return null;
  const rest = storageKey.slice(KEY_PREFIX.length);
  const type = rest[0] as DataType;
  if (!DATA_TYPES.includes(type) || rest[1] !== ".") return null;
  return { type, key: rest.slice(2) };
};

/** True for strings produced by `String(number)`, including NaN and Infinity */
const isNumericString = (value: string) => value.trim() !== "" && (!Number.isNaN(Number(value)) || value === "NaN");

/**
 * Function to preload all the local storage data
 * @returns
 */
const getAllLocalStorageItems = () => {
  const localStorageItems: LocalStorageItem = {};
  const storage = getBrowserStorage();
  if (storage === null) return localStorageItems;

  const encrypt = new EncryptionService();
  for (let i = 0; i < storage.length; i++) {
    const storageKey = storage.key(i);
    if (storageKey === null) continue;
    const parsed = parseStorageKey(storageKey);
    if (parsed === null) continue;
    const value = storage.getItem(storageKey);
    if (value === null) continue;

    let decryptedValue = encrypt.decrypt(value);
    let parsedValue = null;
    if (decryptedValue != null)
      switch (parsed.type) {
        // Decrypting with the wrong key (e.g. after a fingerprint change) occasionally yields random text
        // instead of failing; for booleans and numbers anything other than a valid value is treated as unreadable.
        case "b":
          parsedValue = decryptedValue === "true" ? true : decryptedValue === "false" ? false : null;
          break;
        case "j":
          try {
            parsedValue = JSON.parse(decryptedValue);
          } catch (ex) {
            parsedValue = null;
          }
          break;
        case "n":
          parsedValue = isNumericString(decryptedValue) ? Number(decryptedValue) : null;
          break;
        default:
          parsedValue = decryptedValue;
      }
    localStorageItems[KEY_PREFIX + parsed.key] = parsedValue;
  }
  return localStorageItems;
};

export default getAllLocalStorageItems;
