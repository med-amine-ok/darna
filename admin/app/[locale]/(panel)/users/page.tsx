import { guardPage } from "@/lib/auth/page-guard";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { listDataRequests, listUsers } from "@/lib/data/users";
import UsersClient from "./UsersClient";
import DataRequestsPanel from "./DataRequestsPanel";
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

  const admin = await getCurrentAdmin();
  const canHandleRequests = Boolean(admin?.permissions.includes("privacy.handle_requests"));

  const [data, requests] = await Promise.all([
    listUsers({ status, role, search, page: 1, pageSize: 12 }),
    canHandleRequests ? listDataRequests({ pageSize: 50 }) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <UsersClient initialData={data} initialStatus={status} initialRole={role} />
      {requests && <DataRequestsPanel initialRows={requests.rows} />}
    </div>
  );
}
