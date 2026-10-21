import { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
  title: "Reports & Financial Statements",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function ReportsPage({ params }: Props) {
  return <ReportsClient locale={params.locale} />;
}
