/* eslint-disable no-undef */
import envHelper from "./envHelper";
import clientJS from "./fingerprint.lib";

const HASH_KEY = "E86E2612010258B35137";

let cachedFingerprint: string | null = null;

/**
 * Function to get browser finger print.
 * The browser fingerprint is computed once per page load and reused, since it is expensive
 * (canvas rendering) and the inputs do not change within a session.
 * @returns
 */
const getFingerprint = () => {
  let HASH_KEY_CUSTOM = envHelper.getHashKey() || HASH_KEY;

  if (typeof window === "undefined") return HASH_KEY_CUSTOM;
  if (cachedFingerprint === null) cachedFingerprint = clientJS.getFingerprint() + HASH_KEY_CUSTOM;
  return cachedFingerprint;
};

export default getFingerprint;
