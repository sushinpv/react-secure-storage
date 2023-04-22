const SUPPORTED_PREFIX = ["", "REACT_APP_", "NEXT_PUBLIC_", "VITE_"];

export type SECURE_LOCAL_STORAGE_KEYS = "SECURE_LOCAL_STORAGE_DISABLED_KEYS" | "SECURE_LOCAL_STORAGE_PREFIX" | "SECURE_LOCAL_STORAGE_HASH_KEY";

/**
 * Function to get data from .env
 */
const getEnvValue = (key: SECURE_LOCAL_STORAGE_KEYS) => {
  let value: string | null | undefined = null;

  if (typeof Cypress != "undefined") {
    SUPPORTED_PREFIX.forEach((keyPrefix) => {
      value = Cypress.env(keyPrefix + key) || value;
      if (value) return value;
    });
  } else if (typeof process.env != "undefined") {
    SUPPORTED_PREFIX.forEach((keyPrefix) => {
      value = process.env[keyPrefix + key] || value;
      if (value) return value;
    });
  } else {
    console.warn(`react-secure-storage : process is not defined! Just a warning!`);
  }
  return value;
};

const envHelper = {
  getEnvValue,
};

export default envHelper;
