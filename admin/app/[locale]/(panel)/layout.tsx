import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/current-admin";
import { getApprovalsCount } from "@/lib/data/approvals";
import { locales, defaultLocale, type Locale } from "@/i18n";
import AdminLayoutClient from "@/components/layout/AdminLayoutClient";
import { SessionUnavailableView } from "@/components/auth/SessionUnavailableView";

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Middleware only checks that the cookie exists. Here the backend confirms
  // the staff session (GET /admin/auth/session): expired, idle, revoked or
  // deactivated sessions go back to the login page.
  const session = await getAdminSession();
  if (session.state === "unavailable") {
    return (
      <main className="min-h-[100dvh] bg-darnaBg p-4">
        <SessionUnavailableView />
      </main>
    );
  }
  if (session.state === "signed_out") {
    const locale = locales.includes(params.locale as Locale) ? params.locale : defaultLocale;
    redirect(`/${locale}/login?expired=1`);
  }
  const admin = session.admin;

  const approvalsCount = admin.permissions.includes("hosts.view") ? await getApprovalsCount() : 0;

  return (
    <AdminLayoutClient currentAdmin={admin} approvalsCount={approvalsCount}>
      {children}
    </AdminLayoutClient>
  );
}
