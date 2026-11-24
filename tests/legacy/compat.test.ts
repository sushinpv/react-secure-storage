/**
 * Compatibility with data written by the published v1.3.2 package (installed as `react-secure-storage-legacy`).
 * Users upgrading must keep their stored data, and downgrading must not corrupt it.
 */
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { loadFresh, storageKeys, type SecureStorage } from "../setup/helpers";

const require = createRequire(import.meta.url);

/** Load a fresh copy of v1.3.2, as a page load with the old version would */
const loadLegacy = (): SecureStorage => {
  for (const id of Object.keys(require.cache)) if (id.includes("react-secure-storage-legacy")) delete require.cache[id];
  return require("react-secure-storage-legacy").default;
};

const values: Record<string, string | number | boolean | object> = {
  str: "hello",
  unicode: "héllo 👋",
  num: 3.14,
  zero: 0,
  yes: true,
  no: false,
  obj: { user: { id: 1, roles: ["admin"] } },
};

const configs: [string, Record<string, string>][] = [
  ["default config", {}],
  ["custom prefix", { SECURE_LOCAL_STORAGE_PREFIX: "legacy-app" }],
  ["custom hash key", { NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY: "my-hash" }],
  ["disabled keys", { VITE_SECURE_LOCAL_STORAGE_DISABLED_KEYS: "Plugins|Fonts|Canvas" }],
];

describe.each(configs)("v1.3.2 compatibility (%s)", (_name, env) => {
  const applyEnv = () => Object.entries(env).forEach(([k, v]) => vi.stubEnv(k, v));

  it("reads every value written by v1.3.2 (upgrade)", async () => {
    applyEnv();
    const legacy = loadLegacy();
    Object.entries(values).forEach(([k, v]) => legacy.setItem(k, v));
    const legacyKeys = storageKeys();

    const current = await loadFresh();
    for (const [k, v] of Object.entries(values)) expect(current.getItem(k)).toEqual(v);
    expect(storageKeys()).toEqual(legacyKeys); // reading does not rewrite storage
  });

  it("writes data v1.3.2 can read (downgrade)", async () => {
    applyEnv();
    const current = await loadFresh();
    Object.entries(values).forEach(([k, v]) => current.setItem(k, v));

    const legacy = loadLegacy();
    for (const [k, v] of Object.entries(values)) expect(legacy.getItem(k)).toEqual(v);
  });

  it("removes and clears entries written by v1.3.2", async () => {
    applyEnv();
    const legacy = loadLegacy();
    Object.entries(values).forEach(([k, v]) => legacy.setItem(k, v));
    localStorage.setItem("unrelated", "x");

    const current = await loadFresh();
    current.removeItem("str");
    expect(current.getItem("str")).toBeNull();
    current.clear();
    expect(storageKeys()).toEqual(["unrelated"]);
  });
});
