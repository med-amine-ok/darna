import { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Platform Settings",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function SettingsPage({ params }: Props) {
  return <SettingsClient locale={params.locale} />;
}
