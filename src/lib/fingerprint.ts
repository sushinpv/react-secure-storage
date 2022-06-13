import clientJS from "./fingerprint.lib";

const HASH_KEY = "E86E2612010258B35137";

export function hashCode(str: string): number {
  return str.split("").reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}

/**
 * Function to get browser finger print
 * @returns
 */
const getFingerprint = () => {
  return clientJS.getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || process.env.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
};

export default getFingerprint;
