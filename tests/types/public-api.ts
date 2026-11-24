/**
 * Compile-time checks of the public API. Checked by `npm run typecheck`; never executed.
 * `@ts-expect-error` lines must fail to compile.
 */
import secureLocalStorage, { configure, type SecureStorageError, type SecureStorageOptions, type SecureStorageValue } from "react-secure-storage";
import syncStorage, { configure as configureSync } from "react-secure-storage/sync";
import useSecureStorageDefault, { useSecureStorage, type SetSecureValue } from "react-secure-storage/react";

export async function asyncApi() {
  await secureLocalStorage.setItem("s", "text");
  await secureLocalStorage.setItem("o", { a: [1, 2] });
  await secureLocalStorage.setItem("removed", null);
  const value: SecureStorageValue | null = await secureLocalStorage.getItem("s");
  // @ts-expect-error getItem is async: a primitive annotation catches a missing await.
  // (`SecureStorageValue` includes `object`, and a Promise is an object, so that annotation would not.)
  const notAwaited: string | number | boolean | null = secureLocalStorage.getItem("s");
  await secureLocalStorage.removeItem("s");
  await secureLocalStorage.clear();
  return [value, notAwaited];
}

export function syncApi() {
  const ready: Promise<void> = syncStorage.ready();
  const isReady: boolean = syncStorage.isReady;
  syncStorage.setItem("n", 1);
  const value: SecureStorageValue | null = syncStorage.getItem("n");
  syncStorage.removeItem("n");
  syncStorage.clear();
  return [ready, isReady, value];
}

export function events() {
  const offChange: () => void = secureLocalStorage.onChange((key: string | null) => key);
  const offError: () => void = syncStorage.onError((error: SecureStorageError) => {
    const type: "decrypt" | "write" | "unavailable" | "fallback" | "config" = error.type;
    return [type, error.key];
  });
  offChange();
  offError();
}

export function configuration() {
  const options: SecureStorageOptions = { prefix: "app", migrate: true, fallback: false, hashKey: "x", disabledKeys: ["UserAgent"] };
  configure(options);
  configureSync({ migrate: false });
  // @ts-expect-error unknown option
  configure({ unknown: true });
}

export function Component() {
  const [theme, setTheme, removeTheme, { loading }] = useSecureStorage("theme", "light");
  const themeIsString: string = theme;
  const isLoading: boolean = loading;
  setTheme("dark");
  setTheme((previous) => previous + "!");
  setTheme(null);
  // @ts-expect-error value type follows the initial value
  setTheme(1);
  removeTheme();

  const [threeItems, setThree] = useSecureStorage("count", 0); // 1.4-style destructuring still works
  const [maybe] = useSecureStorage<{ id: number }>("user");
  const maybeUser: { id: number } | null = maybe;

  const setter: SetSecureValue<string> = setTheme;
  return [themeIsString, isLoading, threeItems, setThree, maybeUser, setter, useSecureStorageDefault === useSecureStorage];
}
