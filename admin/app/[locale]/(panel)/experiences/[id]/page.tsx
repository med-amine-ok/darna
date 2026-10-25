import { getListingById } from "@/lib/data/listings";
import StayDetailClient from "@/app/[locale]/(panel)/stays/[id]/StayDetailClient";

export default async function ExperienceDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const exp = await getListingById(params.id);

  return <StayDetailClient initialStay={exp} stayId={params.id} />;
}
