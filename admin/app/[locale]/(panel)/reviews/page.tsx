import { guardPage } from "@/lib/auth/page-guard";
import ReviewsClient from "./ReviewsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("reviews");


interface Props {
  params: {
    locale: string;
  };
}

export default async function ReviewsPage({ params }: Props) {
  const denied = await guardPage("reviews.view");
  if (denied) return denied;

  return <ReviewsClient locale={params.locale} />;
}
