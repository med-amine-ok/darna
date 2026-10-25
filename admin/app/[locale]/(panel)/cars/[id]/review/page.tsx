import { getListingById } from "@/lib/data/listings";
import { redirect } from "@/navigation";
import StayReviewClient from "@/app/[locale]/(panel)/stays/[id]/review/StayReviewClient";

export default async function CarReviewPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const car = await getListingById(params.id);

  if (!car) {
    redirect("/cars");
    return null;
  }

  return <StayReviewClient stay={car} />;
}
