import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { getApprovalsInbox } from "@/lib/data/approvals";
import { locales, defaultLocale, type Locale } from "@/i18n";
import AdminLayoutClient from "@/components/layout/AdminLayoutClient";

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Defense in depth: middleware only checks the JWT signature. Here the
  // session is resolved against the admin store, so revoked, deactivated or
  // deleted accounts are bounced even with a still-valid token.
  const admin = await getCurrentAdmin();
  if (!admin) {
    const locale = locales.includes(params.locale as Locale) ? params.locale : defaultLocale;
    redirect(`/${locale}/login`);
  }

  const approvalsCount = admin.permissions.includes("hosts.view")
    ? (await getApprovalsInbox()).counts.total
    : 0;

  return (
    <AdminLayoutClient currentAdmin={admin} approvalsCount={approvalsCount}>
      {children}
    </AdminLayoutClient>
  );
}
