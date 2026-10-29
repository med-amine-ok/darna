import { hostPageMetadata } from "@/components/host/hostMetadata";
import { requireHostContext, hostOwnerKey } from "@/lib/server/host-context";
import { getHostListings } from "@/lib/data/listings";
import HostListingsClient from "@/components/host/HostListingsClient";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return hostPageMetadata(params.locale, "listings");
}

export default async function HostListingsPage({ params }: { params: { locale: string } }) {
  const ctx = await requireHostContext(params?.locale || "en", "/host/listings");
  const listings = await getHostListings(hostOwnerKey(ctx));

  return <HostListingsClient initialListings={listings} currentUser={{ ...ctx.user, hostType: ctx.hostType }} />;
}
