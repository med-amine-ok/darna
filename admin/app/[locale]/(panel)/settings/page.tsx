import { guardPage } from "@/lib/auth/page-guard";
import SettingsClient from "./SettingsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("settings");


interface Props {
  params: {
    locale: string;
  };
}

export default async function SettingsPage({ params }: Props) {
  const denied = await guardPage("settings.manage");
  if (denied) return denied;

  return <SettingsClient locale={params.locale} />;
}
