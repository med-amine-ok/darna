import { getLocale } from "next-intl/server";
import PaymentsClient from "./PaymentsClient";

export default async function PaymentsPage() {
  const locale = await getLocale();
  return <PaymentsClient locale={locale} initialTab="overview" />;
}
