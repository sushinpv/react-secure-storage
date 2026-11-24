/** localStorage key formats. v2: `<prefix>2.<key>`. v1: `<prefix><type>.<key>` with type b, j, n or s. */

export const V1_TYPES = ["b", "j", "n", "s"] as const;
export type V1Type = typeof V1_TYPES[number];

export const v2StorageKey = (prefix: string, key: string) => `${prefix}2.${key}`;

/** @returns the user key, or null when the storage key is not a v2 entry */
export const parseV2Key = (prefix: string, storageKey: string): string | null =>
  storageKey.startsWith(`${prefix}2.`) ? storageKey.slice(prefix.length + 2) : null;

/** @returns the v1 data type and user key, or null when the storage key is not a v1 entry */
export const parseV1Key = (prefix: string, storageKey: string): { type: V1Type; key: string } | null => {
  if (!storageKey.startsWith(prefix)) return null;
  const rest = storageKey.slice(prefix.length);
  const type = rest[0] as V1Type;
  if (!V1_TYPES.includes(type) || rest[1] !== ".") return null;
  return { type, key: rest.slice(2) };
};

/** Snapshot of all localStorage keys (safe to remove keys while iterating the result) */
export const listStorageKeys = (storage: Storage): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null) keys.push(key);
  }
  return keys;
};
