import { getLocale } from "next-intl/server";
import ReviewsClient from "../ReviewsClient";

export default async function DisputesPage() {
  const locale = await getLocale();
  return <ReviewsClient locale={locale} initialTab="disputes" />;
}
