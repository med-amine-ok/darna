import { guardPage } from "@/lib/auth/page-guard";
import ApprovalsClient from "./ApprovalsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("approvals");


interface Props {
  params: {
    locale: string;
  };
  searchParams: {
    tab?: string;
  };
}

export default async function ApprovalsPage({ params, searchParams }: Props) {
  const denied = await guardPage("hosts.view");
  if (denied) return denied;

  return <ApprovalsClient initialTab={searchParams.tab || "hosts"} locale={params.locale} />;
}
