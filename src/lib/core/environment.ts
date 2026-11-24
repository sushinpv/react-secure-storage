/**
 * Returns the browser localStorage when it is usable, otherwise null.
 *
 * Returns null on the server (SSR), in workers, and when storage access is blocked
 * (sandboxed iframes, disabled cookies, some private modes), so callers can no-op
 * instead of throwing.
 */
export const getBrowserStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    return storage ?? null;
  } catch (ex) {
    return null;
  }
};
