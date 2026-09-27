import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<
  Locale,
  { name: string; nativeName: string; flag: string; dir: "ltr" | "rtl" }
> = {
  en: { name: "English", nativeName: "English", flag: "US", dir: "ltr" },
  fr: { name: "French", nativeName: "Français", flag: "FR", dir: "ltr" },
  ar: { name: "Arabic", nativeName: "العربية", flag: "SA", dir: "rtl" },
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
