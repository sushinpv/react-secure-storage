/**
 * Reads configuration from environment variables.
 *
 * Each variable is read with a literal `process.env.NAME` expression so bundlers (Next.js, Vite `define`, webpack
 * DefinePlugin) can inline it at build time. Supported name prefixes: none, REACT_APP_, NEXT_PUBLIC_, VITE_.
 * Inside Cypress, values come from `Cypress.env()`.
 */
type EnvName =
  | "SECURE_LOCAL_STORAGE_HASH_KEY"
  | "SECURE_LOCAL_STORAGE_PREFIX"
  | "SECURE_LOCAL_STORAGE_DISABLED_KEYS"
  | "SECURE_LOCAL_STORAGE_MIGRATE"
  | "SECURE_LOCAL_STORAGE_FALLBACK";

const FRAMEWORK_PREFIXES = ["", "REACT_APP_", "NEXT_PUBLIC_", "VITE_"];

const first = (read: () => (string | undefined)[]): string | null => {
  try {
    for (const value of read()) if (value) return value;
  } catch (ex) {
    // `process` is not defined (e.g. Vite without a `process.env` define)
  }
  return null;
};

const fromCypress = (name: EnvName): string | null => {
  for (const prefix of FRAMEWORK_PREFIXES) {
    const value = Cypress.env(prefix + name);
    if (value) return value;
  }
  return null;
};

const inCypress = () => typeof Cypress !== "undefined";

const getHashKey = () =>
  inCypress()
    ? fromCypress("SECURE_LOCAL_STORAGE_HASH_KEY")
    : first(() => [
        process.env.SECURE_LOCAL_STORAGE_HASH_KEY,
        process.env.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY,
        process.env.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY,
        process.env.VITE_SECURE_LOCAL_STORAGE_HASH_KEY,
      ]);

const getStoragePrefix = () =>
  inCypress()
    ? fromCypress("SECURE_LOCAL_STORAGE_PREFIX")
    : first(() => [
        process.env.SECURE_LOCAL_STORAGE_PREFIX,
        process.env.REACT_APP_SECURE_LOCAL_STORAGE_PREFIX,
        process.env.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_PREFIX,
        process.env.VITE_SECURE_LOCAL_STORAGE_PREFIX,
      ]);

const getDisabledKeys = () =>
  inCypress()
    ? fromCypress("SECURE_LOCAL_STORAGE_DISABLED_KEYS")
    : first(() => [
        process.env.SECURE_LOCAL_STORAGE_DISABLED_KEYS,
        process.env.REACT_APP_SECURE_LOCAL_STORAGE_DISABLED_KEYS,
        process.env.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_DISABLED_KEYS,
        process.env.VITE_SECURE_LOCAL_STORAGE_DISABLED_KEYS,
      ]);

const getMigrate = () =>
  inCypress()
    ? fromCypress("SECURE_LOCAL_STORAGE_MIGRATE")
    : first(() => [
        process.env.SECURE_LOCAL_STORAGE_MIGRATE,
        process.env.REACT_APP_SECURE_LOCAL_STORAGE_MIGRATE,
        process.env.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_MIGRATE,
        process.env.VITE_SECURE_LOCAL_STORAGE_MIGRATE,
      ]);

const getFallback = () =>
  inCypress()
    ? fromCypress("SECURE_LOCAL_STORAGE_FALLBACK")
    : first(() => [
        process.env.SECURE_LOCAL_STORAGE_FALLBACK,
        process.env.REACT_APP_SECURE_LOCAL_STORAGE_FALLBACK,
        process.env.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_FALLBACK,
        process.env.VITE_SECURE_LOCAL_STORAGE_FALLBACK,
      ]);

const envHelper = {
  getHashKey,
  getStoragePrefix,
  getDisabledKeys,
  getMigrate,
  getFallback,
};

export default envHelper;
