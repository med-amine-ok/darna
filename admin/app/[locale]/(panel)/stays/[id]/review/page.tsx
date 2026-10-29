import { notFound } from "next/navigation";
import { guardPage } from "@/lib/auth/page-guard";
import { getListingById } from "@/lib/data/listings";
import { pageMetadata } from "@/lib/metadata";
import StayReviewClient from "./StayReviewClient";

export const generateMetadata = pageMetadata("listingReview");

export default async function StayReviewPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  const listing = await getListingById(params.id);
  if (!listing) notFound();

  return <StayReviewClient stay={listing} />;
}
