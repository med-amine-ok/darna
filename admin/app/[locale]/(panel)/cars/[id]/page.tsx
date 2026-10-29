import { notFound } from "next/navigation";
import { guardPage } from "@/lib/auth/page-guard";
import { getListingById } from "@/lib/data/listings";
import { pageMetadata } from "@/lib/metadata";
import StayDetailClient from "@/app/[locale]/(panel)/stays/[id]/StayDetailClient";

// Generic title on purpose: entity names are not exposed before the permission check.
export const generateMetadata = pageMetadata("listingDetail");

export default async function CarDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  const listing = await getListingById(params.id);
  if (!listing) notFound();

  return <StayDetailClient initialStay={listing} stayId={params.id} />;
}
