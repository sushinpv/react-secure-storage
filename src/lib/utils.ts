export const FINGERPRINT_KEYS = {
  USERAGENT: "UserAgent",
  SCREEN_PRINT: "ScreenPrint",
  PLUGINS: "Plugins",
  FONTS: "Fonts",
  LOCAL_STORAGE: "LocalStorage",
  SESSION_STORAGE: "SessionStorage",
  TIMEZONE: "TimeZone",
  LANGUAGE: "Language",
  SYSTEM_LANGUAGE: "SystemLanguage",
  COOKIE: "Cookie",
  CANVAS: "Canvas",
  HOSTNAME: "Hostname",
};

const ALL_FINGERPRINT_KEYS = Object.values(FINGERPRINT_KEYS);

/**
 * Normalise disabled fingerprint keys given as a `|`-separated string (environment variable) or an array (configure).
 * Unknown names are dropped with a warning.
 */
export const parseDisabledKeys = (value: string | string[] | null | undefined): string[] => {
  if (!value) return [];
  const names = Array.isArray(value) ? value : value.split("|");
  const response: string[] = [];
  names.forEach((key) => {
    if (key === "") return;
    if (ALL_FINGERPRINT_KEYS.includes(key)) response.push(key);
    else console.warn(`react-secure-storage : ${key} is not present in the available disabled keys options! Please go through the documentation`);
  });
  return response;
};

/** Normalise the storage prefix so it always ends with a dot */
export const normalizePrefix = (prefix: string): string => (prefix.endsWith(".") ? prefix : prefix + ".");
