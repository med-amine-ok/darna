import { getRequestConfig } from "next-intl/server";
import { namespaces } from "./messages/namespaces";

export const locales = ["en", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, (await import(`./messages/${locale}/${ns}.json`)).default] as const)
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
