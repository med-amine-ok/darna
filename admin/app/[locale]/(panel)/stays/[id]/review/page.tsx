import { getListingById } from "@/lib/data/listings";
import { redirect } from "@/navigation";
import StayReviewClient from "./StayReviewClient";

export default async function StayReviewPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const stay = await getListingById(params.id);

  if (!stay) {
    redirect("/stays");
    return null;
  }

  return <StayReviewClient stay={stay} />;
}
