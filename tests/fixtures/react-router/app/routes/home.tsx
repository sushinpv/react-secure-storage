import { useLoaderData } from "react-router";
import secureLocalStorage from "react-secure-storage";
import Demo from "../Demo";

// Runs on the server for the initial request: library calls must be safe no-ops
export async function loader() {
  await secureLocalStorage.setItem("server", "should-not-persist");
  const value = await secureLocalStorage.getItem("server");
  await secureLocalStorage.removeItem("server");
  await secureLocalStorage.clear();
  return { serverValue: String(value) };
}

export default function Home() {
  const { serverValue } = useLoaderData<typeof loader>();
  return (
    <>
      <p data-testid="server-result">server value: {serverValue}</p>
      <Demo />
    </>
  );
}
