import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import PaymentsClient from "../../payments/PaymentsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("settings_commissions");

export default async function SettingsCommissionsPage() {
  const denied = await guardPage("commissions.manage");
  if (denied) return denied;

  const locale = await getLocale();
  return <PaymentsClient locale={locale} initialTab="commissions" />;
}
