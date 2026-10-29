import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
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
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <HelpClient />
      </Container>
    </div>
  );
}
