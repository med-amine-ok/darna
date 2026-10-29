import { guardPage } from "@/lib/auth/page-guard";
import { listUsers } from "@/lib/data/users";
import UsersClient from "./UsersClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("users");

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const denied = await guardPage("users.view");
  if (denied) return denied;

  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  const role = typeof searchParams.role === "string" ? searchParams.role : "all";
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;

  const data = await listUsers({
    status,
    role,
    search,
    page: 1,
    pageSize: 12,
  });

  return (
    <UsersClient
      initialData={data}
      initialStatus={status}
      initialRole={role}
    />
  );
}
