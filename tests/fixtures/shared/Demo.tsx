/**
 * Shared demo component used by every e2e fixture app (copied into each fixture by scripts/setup-e2e.mjs).
 * Uses the documented SSR-safe pattern: storage is only read after mount.
 */
import { useEffect, useState } from "react";
import secureLocalStorage from "react-secure-storage";

type Values = { object: unknown; number: unknown; flag: unknown };

const read = (): Values => ({
  object: secureLocalStorage.getItem("object"),
  number: secureLocalStorage.getItem("number"),
  flag: secureLocalStorage.getItem("flag"),
});

export default function Demo() {
  const [values, setValues] = useState<Values | null>(null);

  useEffect(() => setValues(read()), []);

  return (
    <main>
      <p data-testid="status">{values === null ? "loading" : "hydrated"}</p>
      <pre data-testid="values">{values === null ? "loading" : JSON.stringify(values)}</pre>
      <button
        onClick={() => {
          secureLocalStorage.setItem("object", { text: "héllo", list: [1, 2] });
          secureLocalStorage.setItem("number", 42);
          secureLocalStorage.setItem("flag", true);
          setValues(read());
        }}
      >
        write
      </button>
      <button
        onClick={() => {
          secureLocalStorage.removeItem("object");
          setValues(read());
        }}
      >
        remove
      </button>
      <button
        onClick={() => {
          secureLocalStorage.clear();
          setValues(read());
        }}
      >
        clear
      </button>
    </main>
  );
}
