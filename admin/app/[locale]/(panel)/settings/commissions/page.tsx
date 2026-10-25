import { getLocale } from "next-intl/server";
import PaymentsClient from "../../payments/PaymentsClient";

export default async function SettingsCommissionsPage() {
  const locale = await getLocale();
  return <PaymentsClient locale={locale} initialTab="commissions" />;
}
