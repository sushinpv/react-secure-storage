// import { ClientJS } from "clientjs";

import clientJS from "./finger-print";

const HASH_KEY = "E86E2612010258B35137";

export function hashCode(str: string): number {
  return str.split("").reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}

const getFingerprint = () => {
  return clientJS.getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
  // return new ClientJS().getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
};

export default getFingerprint;
