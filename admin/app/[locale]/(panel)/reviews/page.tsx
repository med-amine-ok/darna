import { Metadata } from "next";
import ReviewsClient from "./ReviewsClient";

export const metadata: Metadata = {
  title: "Guest & Host Reviews",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function ReviewsPage({ params }: Props) {
  return <ReviewsClient locale={params.locale} />;
}
