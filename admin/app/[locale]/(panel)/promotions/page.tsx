import { guardPage } from "@/lib/auth/page-guard";
import PromotionsClient from "./PromotionsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("promotions");


interface Props {
  params: {
    locale: string;
  };
}

export default async function PromotionsPage({ params }: Props) {
  const denied = await guardPage("promotions.manage");
  if (denied) return denied;

  return <PromotionsClient locale={params.locale} />;
}
