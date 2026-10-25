import { getLocale } from "next-intl/server";
import SettingsClient from "../SettingsClient";

export default async function SettingsNotificationsPage() {
  const locale = await getLocale();
  return <SettingsClient locale={locale} initialTab="notifications" />;
}
