import type { Cipher, Envelope } from "./types";

const DB_NAME = "react-secure-storage";
const STORE_NAME = "keys";
const KEY_ID = "default";

/** Web Crypto and IndexedDB are both needed: the key lives in IndexedDB because localStorage can't hold a CryptoKey */
export const isWebCryptoAvailable = () =>
  typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" && typeof indexedDB !== "undefined" && indexedDB !== null;

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/**
 * Store `candidate` unless a key already exists, in one transaction. IndexedDB serialises read-write transactions,
 * so two tabs creating a key at the same time end up using the same key.
 */
const storeKeyOnce = (db: IDBDatabase, candidate: CryptoKey | null) =>
  new Promise<CryptoKey | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, candidate ? "readwrite" : "readonly");
    const store = transaction.objectStore(STORE_NAME);
    let result: CryptoKey | null = null;
    const existing = store.get(KEY_ID);
    existing.onsuccess = () => {
      if (existing.result) result = existing.result as CryptoKey;
      else if (candidate) {
        store.add(candidate, KEY_ID);
        result = candidate;
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

/** Load this site's key from IndexedDB, creating a non-extractable AES-GCM key on first use */
export const loadOrCreateKey = async (): Promise<CryptoKey> => {
  const db = await openDatabase();
  try {
    const existing = await storeKeyOnce(db, null);
    if (existing) return existing;
    const created = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return (await storeKeyOnce(db, created)) as CryptoKey;
  } finally {
    db.close();
  }
};

/** AES-GCM with a random 96-bit IV per write; the user key is authenticated as additional data */
export const createWebCryptoCipher = (cryptoKey: CryptoKey): Cipher => ({
  alg: "AES-GCM",

  async encrypt(plaintext, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(key) },
      cryptoKey,
      new TextEncoder().encode(plaintext)
    );
    return { v: 2, alg: "AES-GCM", iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)) } as Envelope;
  },

  async decrypt(envelope, key) {
    if (envelope.alg !== "AES-GCM" || !envelope.iv) return null;
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(envelope.iv), additionalData: new TextEncoder().encode(key) },
        cryptoKey,
        fromBase64(envelope.ct)
      );
      return new TextDecoder().decode(plaintext);
    } catch (ex) {
      return null; // wrong key, tampered data or malformed base64
    }
  },
});
