import { getListingById } from "@/lib/data/listings";
import { redirect } from "@/navigation";
import StayReviewClient from "@/app/[locale]/(panel)/stays/[id]/review/StayReviewClient";

export default async function ExperienceReviewPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const exp = await getListingById(params.id);

  if (!exp) {
    redirect("/experiences");
    return null;
  }

  return <StayReviewClient stay={exp} />;
}
