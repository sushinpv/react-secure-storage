import envHelper from "../envHelper";
import { normalizePrefix, parseDisabledKeys } from "../utils";
import type { SecureStorageOptions } from "./types";

export interface ResolvedConfig {
  prefix: string;
  migrate: boolean;
  fallback: boolean;
  hashKey: string;
  disabledKeys: string[];
}

/** v1 default; only used for fallback mode and for reading v1 data */
export const DEFAULT_HASH_KEY = "E86E2612010258B35137";

const parseBoolean = (value: string | null, defaultValue: boolean) => {
  if (value === null || value.trim() === "") return defaultValue;
  return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
};

/** Merge `configure()` options over environment variables over defaults */
export const resolveConfig = (options: SecureStorageOptions): ResolvedConfig => ({
  prefix: normalizePrefix(options.prefix ?? envHelper.getStoragePrefix() ?? "@secure."),
  migrate: options.migrate ?? parseBoolean(envHelper.getMigrate(), false),
  fallback: options.fallback ?? parseBoolean(envHelper.getFallback(), true),
  hashKey: options.hashKey ?? envHelper.getHashKey() ?? DEFAULT_HASH_KEY,
  disabledKeys: parseDisabledKeys(options.disabledKeys ?? envHelper.getDisabledKeys()),
});
