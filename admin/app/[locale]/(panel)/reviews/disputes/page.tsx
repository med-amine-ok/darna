import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import ReviewsClient from "../ReviewsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("reviews_disputes");

export default async function DisputesPage() {
  const denied = await guardPage("reviews.view");
  if (denied) return denied;

  const locale = await getLocale();
  return <ReviewsClient locale={locale} initialTab="disputes" />;
}
