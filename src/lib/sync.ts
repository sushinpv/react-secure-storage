import store from "./core/store";
import type { ChangeListener, ErrorListener, SecureStorageOptions, SecureStorageValue } from "./core/types";

export type { ChangeListener, ErrorListener, SecureStorageError, SecureStorageOptions, SecureStorageValue } from "./core/types";

/**
 * Encrypted localStorage with synchronous reads from memory.
 *
 * `await ready()` decrypts every stored value into memory once; after that `getItem` is synchronous. Writes update
 * memory immediately and are encrypted and saved in the background, in order. Reads before `ready()` resolves return
 * null. Startup cost grows with the amount of stored data; for large data sets use the async default entry.
 */
export interface SyncSecureStorage {
  /** Decrypt all stored values into memory. Resolves once; safe to call many times. */
  ready(): Promise<void>;
  /** True once `ready()` has finished */
  readonly isReady: boolean;
  /** The value from memory, or null if missing, not loaded yet, or on the server */
  getItem(key: string): SecureStorageValue | null;
  /** Store a value. Memory updates immediately; saving happens in the background. null or undefined removes the key. */
  setItem(key: string, value: SecureStorageValue | null | undefined): void;
  /** Remove a key */
  removeItem(key: string): void;
  /** Remove every value written by this library, including v1 data. Other localStorage keys are kept. */
  clear(): void;
  /** Subscribe to changes, including values loaded by `ready()` and changes from other tabs. */
  onChange(listener: ChangeListener): () => void;
  /** Subscribe to storage errors, including failed background saves. */
  onError(listener: ErrorListener): () => void;
}

const isServer = () => typeof window === "undefined";

class MemoryStorage implements SyncSecureStorage {
  private memory = new Map<string, SecureStorageValue>();
  private readyPromise: Promise<void> | null = null;
  private loaded = false;
  private loading = false;
  /** Keys written locally while the initial load runs; their loaded values are stale */
  private touchedWhileLoading = new Set<string>();
  private clearedWhileLoading = false;
  /** Background saves in flight per key; store events for these keys are our own and already applied */
  private pending = new Map<string, number>();
  private listeners: ChangeListener[] = [];

  get isReady() {
    return this.loaded;
  }

  ready(): Promise<void> {
    if (isServer()) return Promise.resolve();
    if (this.readyPromise === null) this.readyPromise = this.load();
    return this.readyPromise;
  }

  private async load() {
    this.loading = true;
    store.onChange((key) => this.onStoreChange(key));
    const stored = await store.getAllItems();
    if (!this.clearedWhileLoading) {
      stored.forEach((value, key) => {
        if (!this.touchedWhileLoading.has(key)) this.memory.set(key, value);
      });
    }
    this.loading = false;
    this.loaded = true;
    this.touchedWhileLoading.clear();
    this.emit(null);
  }

  /** Changes from other tabs or from the async API: refresh memory from storage */
  private onStoreChange(key: string | null) {
    if (!this.loaded) return;
    if (key === null) {
      store.getAllItems().then((stored) => {
        this.memory.forEach((_, k) => {
          if (!this.pending.has(k) && !stored.has(k)) this.memory.delete(k);
        });
        stored.forEach((value, k) => {
          if (!this.pending.has(k)) this.memory.set(k, value);
        });
        this.emit(null);
      });
      return;
    }
    if (this.pending.has(key)) return;
    store.getItem(key).then((value) => this.applyStored(key, value));
  }

  private applyStored(key: string, value: SecureStorageValue | null) {
    if (this.pending.has(key)) return;
    if (value === null) this.memory.delete(key);
    else this.memory.set(key, value);
    this.emit(key);
  }

  private touch(key: string | null) {
    if (!this.loading) return;
    if (key === null) this.clearedWhileLoading = true;
    else this.touchedWhileLoading.add(key);
  }

  /** Track a background save; if it fails, report it and restore memory from what is actually stored */
  private persist(key: string, save: Promise<boolean | void>) {
    this.pending.set(key, (this.pending.get(key) ?? 0) + 1);
    const settle = () => {
      const count = (this.pending.get(key) ?? 1) - 1;
      if (count === 0) this.pending.delete(key);
      else this.pending.set(key, count);
    };
    save.then(
      (saved) => {
        settle();
        if (saved === false) store.getItem(key).then((value) => this.applyStored(key, value));
      },
      (error) => {
        settle();
        store.reportError({ type: "write", key, error });
        if (!store.hasErrorListeners()) console.warn(`react-secure-storage: failed to save "${key}"`, error);
        store.getItem(key).then((value) => this.applyStored(key, value));
      }
    );
  }

  private emit(key: string | null) {
    this.listeners.slice().forEach((listener) => listener(key));
  }

  getItem(key: string): SecureStorageValue | null {
    return this.memory.get(key) ?? null;
  }

  setItem(key: string, value: SecureStorageValue | null | undefined) {
    if (value === null || value === undefined) {
      this.removeItem(key);
      return;
    }
    if (isServer()) return;
    this.memory.set(key, value);
    this.touch(key);
    this.emit(key);
    this.persist(key, store.setItem(key, value));
  }

  removeItem(key: string) {
    if (isServer()) return;
    this.memory.delete(key);
    this.touch(key);
    this.emit(key);
    this.persist(key, store.removeItem(key));
  }

  clear() {
    if (isServer()) return;
    this.memory.clear();
    this.touch(null);
    this.emit(null);
    store.clear().catch((error) => store.reportError({ type: "write", key: null, error }));
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  onError(listener: ErrorListener): () => void {
    return store.onError(listener);
  }
}

const secureLocalStorage: SyncSecureStorage = new MemoryStorage();

/**
 * Configure the library (shared with the async and React entries). Must run before the first storage call.
 */
export const configure = (options: SecureStorageOptions): void => store.configure(options);

export default secureLocalStorage;
