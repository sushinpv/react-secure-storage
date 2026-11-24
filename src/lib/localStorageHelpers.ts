import { LocalStorageItem } from "./coreTypes";
import EncryptionService from "./encryption";
import { getBrowserStorage } from "./environment";
import { getSecurePrefix } from "./utils";

const KEY_PREFIX = getSecurePrefix();

export const DATA_TYPES = ["b", "j", "n", "s"] as const;
export type DataType = typeof DATA_TYPES[number];

/** Called with the user key when a stored entry exists but cannot be decrypted or parsed */
export type UnreadableHandler = (key: string) => void;

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
 * Decrypt and parse one stored entry.
 * @returns the value, or null when it cannot be decrypted or does not match its data type
 */
const decodeEntry = (type: DataType, encrypted: string, encrypt: InstanceType<typeof EncryptionService>) => {
  const decryptedValue = encrypt.decrypt(encrypted);
  if (decryptedValue == null) return null;
  switch (type) {
    // Decrypting with the wrong key (e.g. after a fingerprint change) occasionally yields random text
    // instead of failing; for booleans and numbers anything other than a valid value is treated as unreadable.
    case "b":
      return decryptedValue === "true" ? true : decryptedValue === "false" ? false : null;
    case "j":
      try {
        return JSON.parse(decryptedValue);
      } catch (ex) {
        return null;
      }
    case "n":
      return isNumericString(decryptedValue) ? Number(decryptedValue) : null;
    default:
      return decryptedValue;
  }
};

/**
 * Read a single user key from storage, whichever data type it was stored with.
 * @returns undefined when no entry exists, null when it exists but is unreadable, otherwise the value
 */
export const readStoredKey = (storage: Storage, key: string, onUnreadable?: UnreadableHandler) => {
  const encrypt = new EncryptionService();
  for (let i = 0; i < DATA_TYPES.length; i++) {
    const encrypted = storage.getItem(KEY_PREFIX + `${DATA_TYPES[i]}.` + key);
    if (encrypted === null) continue;
    const value = decodeEntry(DATA_TYPES[i], encrypted, encrypt);
    if (value === null && onUnreadable) onUnreadable(key);
    return value;
  }
  return undefined;
};

/**
 * Function to preload all the local storage data
 * @returns
 */
const getAllLocalStorageItems = (onUnreadable?: UnreadableHandler) => {
  const localStorageItems: LocalStorageItem = {};
  const storage = getBrowserStorage();
  if (storage === null) return localStorageItems;

  const encrypt = new EncryptionService();
  for (let i = 0; i < storage.length; i++) {
    const storageKey = storage.key(i);
    if (storageKey === null) continue;
    const parsed = parseStorageKey(storageKey);
    if (parsed === null) continue;
    const encrypted = storage.getItem(storageKey);
    if (encrypted === null) continue;

    const value = decodeEntry(parsed.type, encrypted, encrypt);
    if (value === null && onUnreadable) onUnreadable(parsed.key);
    localStorageItems[KEY_PREFIX + parsed.key] = value;
  }
  return localStorageItems;
};

export default getAllLocalStorageItems;
