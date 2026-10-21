import { Metadata } from "next";
import NetworkClient from "./NetworkClient";

export const metadata: Metadata = {
  title: "Network Explorer",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function NetworkPage({ params }: Props) {
  return <NetworkClient locale={params.locale} />;
}
