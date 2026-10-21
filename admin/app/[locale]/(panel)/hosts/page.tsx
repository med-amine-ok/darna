import { listHosts } from "@/lib/data/hosts";
import HostsClient from "./HostsClient";

export default async function HostsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const hostType = typeof searchParams.hostType === "string" ? searchParams.hostType : "all";
  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;

  const data = await listHosts({
    hostType,
    status,
    search,
    page: 1,
    pageSize: 12,
  });

  return (
    <HostsClient
      initialData={data}
      initialHostType={hostType}
      initialStatus={status}
    />
  );
}
