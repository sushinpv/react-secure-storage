/**
 * Benchmark page driven by scripts/benchmark.mjs. Each mode runs on a fresh page load, so module state is cold.
 *   ?mode=seed&count=N&size=S  clear storage, then write N values of S characters
 *   ?mode=sync                 time `await ready()` of the sync entry (decrypts everything)
 *   ?mode=async&count=N        time the first `getItem` (includes loading the key) and the average of N reads
 */
import storage from "react-secure-storage";
import syncStorage from "react-secure-storage/sync";

const params = new URLSearchParams(location.search);
const result = (value: unknown) => ((window as unknown as { __result: unknown }).__result = value);

const run = async () => {
  const mode = params.get("mode");
  const count = Number(params.get("count") ?? 0);
  if (mode === "seed") {
    localStorage.clear();
    const value = "x".repeat(Number(params.get("size") ?? 100));
    for (let i = 0; i < count; i++) await storage.setItem(`item-${i}`, value);
    let chars = 0;
    for (let i = 0; i < localStorage.length; i++) chars += (localStorage.key(i) ?? "").length + (localStorage.getItem(localStorage.key(i) ?? "") ?? "").length;
    return result({ chars });
  }
  if (mode === "sync") {
    const start = performance.now();
    await syncStorage.ready();
    return result({ readyMs: performance.now() - start, loaded: syncStorage.getItem("item-0") !== null });
  }
  if (mode === "async") {
    let start = performance.now();
    await storage.getItem("item-0");
    const firstMs = performance.now() - start;
    start = performance.now();
    for (let i = 0; i < count; i++) await storage.getItem(`item-${i}`);
    return result({ firstMs, perReadMs: (performance.now() - start) / count });
  }
};

run().catch((error) => result({ error: String(error) }));
