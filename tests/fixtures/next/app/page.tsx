// App Router: a server component rendering a client component that uses secure storage (SSR + hydration)
import Client from "./Client";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Client />;
}
