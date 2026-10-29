import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Localized <title> for a back-office page. The whole admin is noindex
 * (robots are set once in app/[locale]/layout.tsx and inherited).
 *
 * Usage in a server page: `export const generateMetadata = pageMetadata("payments_payouts");`
 * Keys live in the `meta.titles` namespace of messages/*.json.
 */
export function pageMetadata(key: string) {
  return async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale: params.locale, namespace: "meta.titles" });
    return { title: t(key) };
  };
}
