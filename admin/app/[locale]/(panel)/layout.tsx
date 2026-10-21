import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getApprovalsInbox } from "@/lib/data/approvals";
import AdminLayoutClient from "@/components/layout/AdminLayoutClient";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const inbox = await getApprovalsInbox();

  return (
    <AdminLayoutClient currentUser={session} approvalsCount={inbox.counts.total}>
      {children}
    </AdminLayoutClient>
  );
}
