import { guardPage } from "@/lib/auth/page-guard";
import NetworkClient from "./NetworkClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("network");


interface Props {
  params: {
    locale: string;
  };
}

export default async function NetworkPage({ params }: Props) {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  return <NetworkClient locale={params.locale} />;
}
