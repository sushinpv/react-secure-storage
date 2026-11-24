import { resolveConfig, type ResolvedConfig } from "./config";
import { getBrowserStorage } from "./environment";
import { listStorageKeys, parseV1Key, parseV2Key, v2StorageKey } from "./keys";
import type { LegacyCipher } from "./legacy";
import { fromPlaintext, fromV1Plaintext, parseEnvelope, toPlaintext } from "./payload";
import type { ChangeListener, Cipher, Envelope, ErrorListener, SecureStorageError, SecureStorageOptions, SecureStorageValue } from "./types";
import { createWebCryptoCipher, isWebCryptoAvailable, loadOrCreateKey } from "./webcrypto";

const isServer = () => typeof window === "undefined";

/**
 * The storage engine shared by every entry point (async default, /sync and /react).
 *
 * - Encryption: a non-extractable AES-GCM key in IndexedDB, or the v1 fingerprint key as a fallback.
 * - Reads decrypt one key on demand and cache the result until the stored ciphertext changes.
 * - Writes, removals and clears run one at a time in call order, so a later write always wins.
 * - On the server every operation is a no-op and reads resolve to null.
 */
class Store {
  private options: SecureStorageOptions = {};
  private config: ResolvedConfig | null = null;
  private initPromise: Promise<Cipher | null> | null = null;
  private legacyPromise: Promise<LegacyCipher> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private cache = new Map<string, { raw: string; value: SecureStorageValue | null }>();
  private changeListeners: ChangeListener[] = [];
  private errorListeners: ErrorListener[] = [];

  // ---- configuration -------------------------------------------------------------------------------------------

  configure(options: SecureStorageOptions) {
    if (this.config !== null) {
      this.reportError({ type: "config", key: null });
      return;
    }
    this.options = { ...this.options, ...options };
  }

  /** Resolve configuration; after the first storage call it can no longer change */
  getConfig(): ResolvedConfig {
    if (this.config === null) this.config = resolveConfig(this.options);
    return this.config;
  }

  // ---- events --------------------------------------------------------------------------------------------------

  onChange(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  hasErrorListeners() {
    return this.errorListeners.length > 0;
  }

  reportError(error: SecureStorageError) {
    this.errorListeners.slice().forEach((listener) => listener(error));
  }

  private emit(key: string | null) {
    this.changeListeners.slice().forEach((listener) => listener(key));
  }

  // ---- initialisation ------------------------------------------------------------------------------------------

  /** Choose the cipher, start listening for other tabs and run migration, once per page load */
  private init(): Promise<Cipher | null> {
    const config = this.getConfig();
    if (isServer()) return Promise.resolve(null);
    if (this.initPromise === null) {
      this.initPromise = this.createCipher(config).then(async (cipher) => {
        if (cipher !== null) {
          window.addEventListener("storage", this.onStorageEvent);
          if (config.migrate) await this.migrate(cipher, config);
        }
        return cipher;
      });
    }
    return this.initPromise;
  }

  private async createCipher(config: ResolvedConfig): Promise<Cipher | null> {
    if (getBrowserStorage() === null) {
      this.reportError({ type: "unavailable", key: null });
      return null;
    }
    let keyError: unknown;
    if (isWebCryptoAvailable()) {
      try {
        return createWebCryptoCipher(await loadOrCreateKey());
      } catch (error) {
        // IndexedDB can exist but refuse to open (some private modes): fall through to the fallback
        keyError = error;
      }
    }
    const reason = keyError === undefined ? {} : { error: keyError };
    if (!config.fallback) {
      this.reportError({ type: "unavailable", key: null, ...reason });
      return null;
    }
    this.reportError({ type: "fallback", key: null, ...reason });
    return this.legacy(config);
  }

  /** The v1 fingerprint cipher, loaded on demand so apps using Web Crypto never download crypto-js */
  private legacy(config: ResolvedConfig): Promise<LegacyCipher> {
    if (this.legacyPromise === null) {
      this.legacyPromise = import("./legacy.js").then((module) =>
        module.createLegacyCipher({ hashKey: config.hashKey, disabledKeys: config.disabledKeys })
      );
    }
    return this.legacyPromise;
  }

  /** Changes made by other tabs: cached values are re-validated on read, so only listeners need to know */
  private onStorageEvent = (event: StorageEvent) => {
    const storage = getBrowserStorage();
    if (storage === null || event.storageArea !== storage) return;
    if (event.key === null) {
      this.emit(null);
      return;
    }
    const key = parseV2Key(this.getConfig().prefix, event.key);
    if (key !== null) this.emit(key);
  };

  /**
   * Re-encrypt readable v1 entries into the v2 format. Each v1 entry is removed only after its v2 entry is saved,
   * so an interrupted migration resumes on the next page load. An existing v2 value is newer and wins.
   */
  private async migrate(cipher: Cipher, config: ResolvedConfig) {
    const storage = getBrowserStorage();
    if (storage === null) return;
    const legacy = await this.legacy(config);
    for (const storageKey of listStorageKeys(storage)) {
      const parsed = parseV1Key(config.prefix, storageKey);
      if (parsed === null) continue;
      const raw = storage.getItem(storageKey);
      if (raw === null) continue;

      const target = v2StorageKey(config.prefix, parsed.key);
      if (storage.getItem(target) !== null) {
        storage.removeItem(storageKey);
        continue;
      }
      const value = fromV1Plaintext(parsed.type, legacy.decryptRaw(raw));
      if (value === null) {
        this.reportError({ type: "decrypt", key: parsed.key });
        continue;
      }
      try {
        storage.setItem(target, JSON.stringify(await cipher.encrypt(toPlaintext(value), parsed.key)));
      } catch (error) {
        this.reportError({ type: "write", key: parsed.key, error });
        continue;
      }
      storage.removeItem(storageKey);
    }
  }

  // ---- operations ----------------------------------------------------------------------------------------------

  /** Run mutations one at a time, in call order */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async decryptEnvelope(envelope: Envelope, key: string, cipher: Cipher) {
    if (envelope.alg === cipher.alg) return cipher.decrypt(envelope, key);
    // Written in fallback mode, read with Web Crypto available
    if (envelope.alg === "legacy") return (await this.legacy(this.getConfig())).decrypt(envelope, key);
    return null;
  }

  private async read(key: string, cipher: Cipher): Promise<SecureStorageValue | null> {
    const storage = getBrowserStorage();
    if (storage === null) return null;
    const raw = storage.getItem(v2StorageKey(this.getConfig().prefix, key));
    if (raw === null) {
      this.cache.delete(key);
      return null;
    }
    const cached = this.cache.get(key);
    if (cached && cached.raw === raw) return cached.value;

    const envelope = parseEnvelope(raw);
    const plaintext = envelope === null ? null : await this.decryptEnvelope(envelope, key, cipher);
    const value = plaintext === null ? null : fromPlaintext(plaintext);
    if (value === null) this.reportError({ type: "decrypt", key });
    this.cache.set(key, { raw, value });
    return value;
  }

  /** Read one key. Waits for writes that were started earlier, so a read always sees them. */
  async getItem(key: string): Promise<SecureStorageValue | null> {
    const cipher = await this.init();
    if (cipher === null) return null;
    await this.queue;
    return this.read(key, cipher);
  }

  /** Read every v2 entry, in queue order (used by the sync entry's `ready()`) */
  getAllItems(): Promise<Map<string, SecureStorageValue>> {
    this.getConfig();
    if (isServer()) return Promise.resolve(new Map());
    return this.enqueue(async () => {
      const result = new Map<string, SecureStorageValue>();
      const cipher = await this.init();
      const storage = getBrowserStorage();
      if (cipher === null || storage === null) return result;
      const prefix = this.getConfig().prefix;
      for (const storageKey of listStorageKeys(storage)) {
        const key = parseV2Key(prefix, storageKey);
        if (key === null) continue;
        const value = await this.read(key, cipher);
        if (value !== null) result.set(key, value);
      }
      return result;
    });
  }

  /**
   * Encrypt and store a value.
   * @returns true when saved. A rejected write throws, or is reported to `onError` listeners when there are any.
   */
  setItem(key: string, value: SecureStorageValue | null | undefined): Promise<boolean> {
    if (value === null || value === undefined) return this.removeItem(key).then(() => true);
    this.getConfig();
    if (isServer()) return Promise.resolve(false);
    return this.enqueue(async () => {
      const cipher = await this.init();
      const storage = getBrowserStorage();
      if (cipher === null || storage === null) return false;
      const raw = JSON.stringify(await cipher.encrypt(toPlaintext(value), key));
      try {
        storage.setItem(v2StorageKey(this.getConfig().prefix, key), raw);
      } catch (error) {
        if (!this.hasErrorListeners()) throw error;
        this.reportError({ type: "write", key, error });
        return false;
      }
      this.cache.set(key, { raw, value });
      this.emit(key);
      return true;
    });
  }

  removeItem(key: string): Promise<void> {
    this.getConfig();
    if (isServer()) return Promise.resolve();
    return this.enqueue(async () => {
      await this.init();
      const storage = getBrowserStorage();
      if (storage === null) return;
      storage.removeItem(v2StorageKey(this.getConfig().prefix, key));
      this.cache.delete(key);
      this.emit(key);
    });
  }

  /** Remove every v2 and v1 entry written by this library. Other localStorage keys are kept. */
  clear(): Promise<void> {
    this.getConfig();
    if (isServer()) return Promise.resolve();
    return this.enqueue(async () => {
      await this.init();
      const storage = getBrowserStorage();
      if (storage === null) return;
      const prefix = this.getConfig().prefix;
      listStorageKeys(storage)
        .filter((storageKey) => parseV2Key(prefix, storageKey) !== null || parseV1Key(prefix, storageKey) !== null)
        .forEach((storageKey) => storage.removeItem(storageKey));
      this.cache.clear();
      this.emit(null);
    });
  }
}

const store = new Store();

export default store;
