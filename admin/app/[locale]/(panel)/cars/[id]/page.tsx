import { getListingById } from "@/lib/data/listings";
import StayDetailClient from "@/app/[locale]/(panel)/stays/[id]/StayDetailClient";

export default async function CarDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const car = await getListingById(params.id);

  return <StayDetailClient initialStay={car} stayId={params.id} />;
}
