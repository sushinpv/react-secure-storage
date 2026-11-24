/** Values that keep their type when stored: string, number, boolean and objects (stored as JSON) */
export type SecureStorageValue = string | number | boolean | object;

/** Called with the changed key, or null when every key may have changed (clear) */
export type ChangeListener = (key: string | null) => void;

export interface SecureStorageError {
  /**
   * - `decrypt`: a stored value could not be decrypted or was tampered with; it reads as null
   * - `write`: localStorage rejected a write (e.g. quota exceeded)
   * - `unavailable`: storage can't be used in this browser (blocked localStorage, or no Web Crypto with `fallback: false`); calls are no-ops
   * - `fallback`: Web Crypto or IndexedDB is unavailable, so the weaker v1 fingerprint key is used
   * - `config`: `configure()` was called after storage was first used; the call was ignored
   */
  type: "decrypt" | "write" | "unavailable" | "fallback" | "config";
  /** The affected key, or null when not specific to one key */
  key: string | null;
  /** The underlying error: for `write` errors, and for `fallback`/`unavailable` when IndexedDB failed */
  error?: unknown;
}

export type ErrorListener = (error: SecureStorageError) => void;

export interface SecureStorageOptions {
  /** Prefix for every localStorage key the library writes. Default `@secure.` (`SECURE_LOCAL_STORAGE_PREFIX`) */
  prefix?: string;
  /** Move readable v1 data into the v2 format on first load. Default false (`SECURE_LOCAL_STORAGE_MIGRATE`) */
  migrate?: boolean;
  /** Use the v1 fingerprint key when Web Crypto or IndexedDB is unavailable. Default true (`SECURE_LOCAL_STORAGE_FALLBACK`) */
  fallback?: boolean;
  /** App-specific part of the fingerprint key; used for fallback mode and migration only (`SECURE_LOCAL_STORAGE_HASH_KEY`) */
  hashKey?: string;
  /** Fingerprint properties to leave out; fallback mode and migration only (`SECURE_LOCAL_STORAGE_DISABLED_KEYS`) */
  disabledKeys?: string[];
}

/** Stored value format */
export interface Envelope {
  v: 2;
  alg: "AES-GCM" | "legacy";
  /** base64 initialisation vector (AES-GCM only) */
  iv?: string;
  /** base64 ciphertext (AES-GCM) or crypto-js output (legacy) */
  ct: string;
}

export interface Cipher {
  alg: Envelope["alg"];
  /** @param key the user key, bound to the ciphertext so values can't be swapped between keys */
  encrypt(plaintext: string, key: string): Promise<Envelope>;
  /** @returns the plaintext, or null when the envelope can't be decrypted or authenticated */
  decrypt(envelope: Envelope, key: string): Promise<string | null>;
}
