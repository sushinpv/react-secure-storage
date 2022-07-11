/* eslint-disable no-undef */
import clientJS from "./fingerprint.lib";

const HASH_KEY = "E86E2612010258B35137";

/**
 * Function to get browser finger print
 * @returns
 */
const getFingerprint = () => {
  let HASH_KEY_CUSTOM = HASH_KEY;

  // If Cypress is installed, then load env from cypress, adding support for cypress
  if (typeof Cypress != "undefined") HASH_KEY_CUSTOM = Cypress.env("SECURE_LOCAL_STORAGE_HASH_KEY") || Cypress.env("REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY") || HASH_KEY;
  //Load the custom HASH KEY from process.env
  else HASH_KEY_CUSTOM = process.env.SECURE_LOCAL_STORAGE_HASH_KEY || process.env.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY;

  if (typeof window === "undefined") return HASH_KEY_CUSTOM;
  return clientJS.getFingerprint() + HASH_KEY_CUSTOM;
};

export default getFingerprint;
