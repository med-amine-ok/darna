import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HelpClient from "@/components/help/HelpClient";
import { OG_LOCALE, localeAlternates } from "@/lib/site";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "help" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: localeAlternates(params.locale, "/help"),
    openGraph: {
      title,
      description,
      url: `/${params.locale}/help`,
      locale: OG_LOCALE[params.locale],
      type: "website",
    },
  };
}

export default function HelpPage() {
  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg pb-20 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <HelpClient />
      </div>
    </div>
  );
}
