import { listUsers } from "@/lib/data/users";
import UsersClient from "../UsersClient";

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;

  const data = await listUsers({
    status,
    role: "guest",
    search,
    page: 1,
    pageSize: 10,
  });

  return (
    <UsersClient
      initialData={data}
      initialStatus={status}
      initialRole="guest"
    />
  );
}
