/**
 * Compile-time checks of the published type declarations (dist/types.d.ts, dist/react.d.ts).
 * Checked by `npm run typecheck`; never executed. `@ts-expect-error` lines must fail to compile.
 */
import secureLocalStorage, { type SecureStorageError, type SecureStorageValue } from "react-secure-storage";
import useSecureStorageDefault, { useSecureStorage, type SetSecureValue } from "react-secure-storage/react";

// Core API
secureLocalStorage.setItem("s", "text");
secureLocalStorage.setItem("n", 1);
secureLocalStorage.setItem("b", true);
secureLocalStorage.setItem("o", { a: [1, 2] });
// @ts-expect-error undefined is not a storable value
secureLocalStorage.setItem("u", undefined);
const value: SecureStorageValue | null = secureLocalStorage.getItem("s");
secureLocalStorage.removeItem("s");
secureLocalStorage.clear();

const offChange: () => void = secureLocalStorage.onChange((key: string | null) => key);
const offError: () => void = secureLocalStorage.onError((error: SecureStorageError) => {
  const type: "decrypt" | "write" | "unavailable" = error.type;
  const key: string | null = error.key;
  return [type, key];
});
offChange();
offError();

// Hook
function Component() {
  const [theme, setTheme, removeTheme] = useSecureStorage("theme", "light");
  const themeIsString: string = theme;
  setTheme("dark");
  setTheme((previous) => previous + "!");
  setTheme(null);
  // @ts-expect-error value type follows the initial value
  setTheme(1);
  removeTheme();

  const [maybe] = useSecureStorage<{ id: number }>("user");
  const maybeUser: { id: number } | null = maybe;

  const setter: SetSecureValue<string> = setTheme;
  return [themeIsString, maybeUser, setter, useSecureStorageDefault === useSecureStorage, value];
}
Component;
