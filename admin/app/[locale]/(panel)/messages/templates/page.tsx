import { getLocale } from "next-intl/server";
import MessagesClient from "../MessagesClient";

export default async function TemplatesPage() {
  const locale = await getLocale();
  return <MessagesClient locale={locale} initialTab="templates" />;
}
