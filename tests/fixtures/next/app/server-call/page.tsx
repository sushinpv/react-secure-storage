// App Router server component calling the library directly on the server: every call must be a safe no-op
import secureLocalStorage from "react-secure-storage";

export const dynamic = "force-dynamic";

export default function Page() {
  secureLocalStorage.setItem("server", "should-not-persist");
  const value = secureLocalStorage.getItem("server");
  secureLocalStorage.removeItem("server");
  secureLocalStorage.clear();
  return <p data-testid="server-result">server value: {String(value)}</p>;
}
