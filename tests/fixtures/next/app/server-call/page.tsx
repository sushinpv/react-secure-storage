// App Router server component calling the library directly on the server: every call must be a safe no-op
import secureLocalStorage from "react-secure-storage";
import syncStorage from "react-secure-storage/sync";

export const dynamic = "force-dynamic";

export default async function Page() {
  await secureLocalStorage.setItem("server", "should-not-persist");
  const value = await secureLocalStorage.getItem("server");
  await secureLocalStorage.removeItem("server");
  await secureLocalStorage.clear();
  await syncStorage.ready();
  syncStorage.setItem("server", "should-not-persist");
  return <p data-testid="server-result">server value: {String(value ?? syncStorage.getItem("server"))}</p>;
}
