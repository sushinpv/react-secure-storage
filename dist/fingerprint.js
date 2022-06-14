import clientJS from "./fingerprint.lib";
const HASH_KEY = "E86E2612010258B35137";
/**
 * Function to get browser finger print
 * @returns
 */

const getFingerprint = () => {
  return clientJS.getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || process.env.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
};

export default getFingerprint;