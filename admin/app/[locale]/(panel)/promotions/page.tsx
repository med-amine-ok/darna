import { Metadata } from "next";
import PromotionsClient from "./PromotionsClient";

export const metadata: Metadata = {
  title: "Promotions & Campaigns",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function PromotionsPage({ params }: Props) {
  return <PromotionsClient locale={params.locale} />;
}
