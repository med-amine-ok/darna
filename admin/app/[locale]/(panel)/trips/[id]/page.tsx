import { getListingById } from "@/lib/data/listings";
import StayDetailClient from "@/app/[locale]/(panel)/stays/[id]/StayDetailClient";

export default async function TripDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const trip = await getListingById(params.id);

  return <StayDetailClient initialStay={trip} stayId={params.id} />;
}
