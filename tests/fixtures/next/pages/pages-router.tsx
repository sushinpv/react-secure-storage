// Pages Router: server-rendered on every request, then hydrated
import Demo from "../app/Demo";

export const getServerSideProps = async () => ({ props: {} });

export default function Page() {
  return <Demo />;
}
