import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import PaymentsClient from "./PaymentsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("payments");

export default async function PaymentsPage() {
  const denied = await guardPage("wallets.view");
  if (denied) return denied;

  const locale = await getLocale();
  return <PaymentsClient locale={locale} initialTab="overview" />;
}
