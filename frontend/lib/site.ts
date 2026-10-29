import { locales } from "@/i18n";

/** Public origin for canonical URLs, sitemap and Open Graph (no trailing slash). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** `alternates` metadata for a locale-prefixed path such as "/listings/abc" ("" for home). */
export function localeAlternates(locale: string, path: string) {
  return {
    canonical: `/${locale}${path}`,
    languages: Object.fromEntries([
      ...locales.map((l) => [l, `/${l}${path}`]),
      ["x-default", `/en${path}`],
    ]),
  };
}

export const OG_LOCALE: Record<string, string> = { en: "en_US", fr: "fr_FR", ar: "ar_DZ" };
