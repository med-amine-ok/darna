import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import { getMessages, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { localeAlternates, OG_LOCALE } from "@/lib/site";
import { locales, Locale } from "@/i18n";
import { getSessionUser } from "@/lib/server/session";
import ToastContainerBar from "@/components/ToastContainerBar";
import AppLayoutShell from "@/components/layout/AppLayoutShell";
import LazyModals from "@/components/layout/LazyModals";
import MotionProvider from "@/components/motion/MotionProvider";
import { fontVariables } from "@/lib/fonts";
import { GLOBAL_NAMESPACES, pickMessages } from "@/components/i18n/ScopedIntlProvider";
import { TopProgressBar } from "@/components/ui/Loader";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    alternates: localeAlternates(locale, ""),
    openGraph: {
      title: t("ogTitle"),
      description: t("description"),
      siteName: "BLADUS",
      locale: OG_LOCALE[locale] ?? "en_US",
      type: "website",
      images: [{ url: "/assets/og-logo.png", width: 1200, height: 630, alt: "BLADUS" }],
    },
  };
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "meta" });
  const currentUser = await getSessionUser();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    // font-sans / font-serif resolve to the Arabic faces under dir="rtl" (styles/globals.css).
    <html lang={locale} dir={dir} className={`${fontVariables} font-sans h-full`}>
      <body className="min-h-[100dvh] flex flex-col bg-darnaBg text-primary-800 antialiased font-sans selection:bg-accent-200 selection:text-primary-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-full focus:bg-primary focus:text-white focus:shadow-darna-lg"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={pickMessages(messages, GLOBAL_NAMESPACES)}>
          <MotionProvider>
          <TopProgressBar />
          <ToastContainerBar />
          <LazyModals />

          <AppLayoutShell currentUser={currentUser}>
            {children}
          </AppLayoutShell>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
