import { getLocale } from "next-intl/server";
import PaymentsClient from "../payments/PaymentsClient";

export default async function FinancePage() {
  const locale = await getLocale();
  return <PaymentsClient locale={locale} initialTab="overview" />;
}
