import { getListingById } from "@/lib/data/listings";
import StayDetailClient from "./StayDetailClient";

export default async function StayDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const stay = await getListingById(params.id);

  return <StayDetailClient initialStay={stay} stayId={params.id} />;
}
