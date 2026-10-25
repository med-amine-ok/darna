import { getLocale } from "next-intl/server";
import MessagesClient from "../MessagesClient";

export default async function NotificationsPage() {
  const locale = await getLocale();
  return <MessagesClient locale={locale} initialTab="notifications" />;
}
