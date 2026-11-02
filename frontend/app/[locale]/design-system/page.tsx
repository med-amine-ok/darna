import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import DesignSystemGallery from "./DesignSystemGallery";

/**
 * Internal component gallery for the BLADUS kit (components/ui). Development only:
 * 404s in production builds and is never indexed.
 */

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "ui.gallery" });
  return {
    title: t("title"),
    robots: { index: false, follow: false, nocache: true },
  };
}

export default function DesignSystemPage({ params: { locale } }: { params: { locale: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  unstable_setRequestLocale(locale);
  return <DesignSystemGallery />;
}
