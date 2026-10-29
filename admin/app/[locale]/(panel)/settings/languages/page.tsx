import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import SettingsClient from "../SettingsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("settings_languages");

export default async function SettingsLanguagesPage() {
  const denied = await guardPage("settings.manage");
  if (denied) return denied;

  const locale = await getLocale();
  return <SettingsClient locale={locale} initialTab="languages" />;
}
