import { getLocale } from "next-intl/server";
import SettingsClient from "../SettingsClient";

export default async function SettingsLanguagesPage() {
  const locale = await getLocale();
  return <SettingsClient locale={locale} initialTab="languages" />;
}
