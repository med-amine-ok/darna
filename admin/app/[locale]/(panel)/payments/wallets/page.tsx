import { getLocale } from "next-intl/server";
import PaymentsClient from "../PaymentsClient";

export default async function WalletsPage() {
  const locale = await getLocale();
  return <PaymentsClient locale={locale} initialTab="wallets" />;
}
