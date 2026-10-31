import { notFound } from "next/navigation";
import { getPublicListingById } from "@/lib/data/listings";
import { getHostContext } from "@/lib/server/host-context";
import { hostOwnsListing } from "@/lib/server/authz";

/**
 * Existence check above the loading.tsx Suspense boundary: a missing (or hidden) listing
 * calls notFound() before anything streams, so the response keeps its 404 status while
 * real listings still show the skeleton instantly.
 */
export default async function ListingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string; listingId: string };
}) {
  const hostCtx = await getHostContext();
  const listing = await getPublicListingById(params.listingId, (l) => Boolean(hostCtx && hostOwnsListing(hostCtx, l)));
  if (!listing) notFound();
  return children;
}
