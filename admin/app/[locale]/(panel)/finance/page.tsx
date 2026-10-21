import { Metadata } from "next";
import FinanceClient from "./FinanceClient";

export const metadata: Metadata = {
  title: "Treasury & Finance",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function FinancePage({ params }: Props) {
  return <FinanceClient locale={params.locale} />;
}
