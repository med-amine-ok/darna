import { getListingById } from "@/lib/data/listings";
import { redirect } from "@/navigation";
import StayReviewClient from "@/app/[locale]/(panel)/stays/[id]/review/StayReviewClient";

export default async function TripReviewPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const trip = await getListingById(params.id);

  if (!trip) {
    redirect("/trips");
    return null;
  }

  return <StayReviewClient stay={trip} />;
}
