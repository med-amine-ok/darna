import { Metadata } from "next";
import ApprovalsClient from "./ApprovalsClient";

export const metadata: Metadata = {
  title: "Moderation Queue",
};

interface Props {
  params: {
    locale: string;
  };
  searchParams: {
    tab?: string;
  };
}

export default function ApprovalsPage({ params, searchParams }: Props) {
  return <ApprovalsClient initialTab={searchParams.tab || "hosts"} locale={params.locale} />;
}
