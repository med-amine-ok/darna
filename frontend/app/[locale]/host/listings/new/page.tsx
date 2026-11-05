import { hostPageMetadata } from "@/components/host/hostMetadata";
import { requireHostContext } from "@/lib/server/host-context";
import BecomeHostFlow from "@/components/host/BecomeHostFlow";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "newListing");
}

/**
 * "Create a listing" for existing hosts (inside host mode). Reuses the listing
 * wizard steps but only offers what the active workspace may publish
 * (lib/catalog-types.ts HOST_ALLOWED_OFFERS): individuals a home or a vehicle,
 * agencies an experience or a trip, hotels/hostels a property with room types.
 * The server action re-checks the rule.
 */
export default async function NewHostListingPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { offer?: string | string[] };
}) {
  const ctx = await requireHostContext(params?.locale || "en", "/host/listings/new");
  const offer = typeof searchParams?.offer === "string" ? searchParams.offer : null;

  return (
    <BecomeHostFlow
      mode="create"
      workspaceType={ctx.hostType}
      initialOffer={offer}
      currentUserId={ctx.user.id}
    />
  );
}
