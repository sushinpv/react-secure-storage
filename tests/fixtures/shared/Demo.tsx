/**
 * Shared demo component used by every e2e fixture app (copied into each fixture by scripts/setup-e2e.mjs).
 * Exercises all three entry points: async (default), /sync and /react. Storage is only read after mount.
 */
import { useEffect, useState } from "react";
import secureLocalStorage from "react-secure-storage";
import syncStorage from "react-secure-storage/sync";
import { useSecureStorage } from "react-secure-storage/react";

type Values = { object: unknown; number: unknown; flag: unknown };

// Subscribe to errors at startup, before any component uses storage (as the README recommends)
const errorLog: string[] = [];
const errorSubscribers = new Set<() => void>();
if (typeof window !== "undefined") {
  secureLocalStorage.onError((error) => {
    errorLog.push(`${error.type}:${error.key}`);
    if (error.error) console.warn(`secure storage ${error.type}:`, String(error.error));
    errorSubscribers.forEach((notify) => notify());
  });
}

const read = async (): Promise<Values> => ({
  object: await secureLocalStorage.getItem("object"),
  number: await secureLocalStorage.getItem("number"),
  flag: await secureLocalStorage.getItem("flag"),
});

/** Hook-based state: hydration-safe, synced across tabs */
function Counter() {
  const [count, setCount, resetCount, { loading }] = useSecureStorage("counter", 0);
  return (
    <section>
      <p data-testid="counter">{loading ? "loading" : count}</p>
      <button onClick={() => setCount((n) => n + 1)}>increment</button>
      <button onClick={resetCount}>reset counter</button>
    </section>
  );
}

/** Synchronous reads from memory after ready() */
function SyncReadout() {
  const [number, setNumber] = useState<string>("loading");
  useEffect(() => {
    const update = () => setNumber(JSON.stringify(syncStorage.getItem("number")));
    const unsubscribe = syncStorage.onChange(update);
    syncStorage.ready().then(update);
    return unsubscribe;
  }, []);
  return <p data-testid="sync-number">{number}</p>;
}

export default function Demo() {
  const [values, setValues] = useState<Values | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const update = () => setErrors([...errorLog]);
    errorSubscribers.add(update);
    update();
    read().then(setValues);
    return () => {
      errorSubscribers.delete(update);
    };
  }, []);

  return (
    <main>
      <p data-testid="status">{values === null ? "loading" : "hydrated"}</p>
      <pre data-testid="values">{values === null ? "loading" : JSON.stringify(values)}</pre>
      <pre data-testid="errors">{JSON.stringify(errors)}</pre>
      <button
        onClick={async () => {
          await secureLocalStorage.setItem("object", { text: "héllo", list: [1, 2] });
          await secureLocalStorage.setItem("number", 42);
          await secureLocalStorage.setItem("flag", true);
          setValues(await read());
        }}
      >
        write
      </button>
      <button
        onClick={async () => {
          await secureLocalStorage.removeItem("object");
          setValues(await read());
        }}
      >
        remove
      </button>
      <button
        onClick={async () => {
          await secureLocalStorage.clear();
          setValues(await read());
        }}
      >
        clear
      </button>
      <Counter />
      <SyncReadout />
    </main>
  );
}
