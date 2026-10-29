import { Inter, Tajawal } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import { getMessages, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { localeAlternates, OG_LOCALE } from "@/lib/site";
import { locales, Locale } from "@/i18n";
import { getSessionUser } from "@/lib/server/session";
import ToastContainerBar from "@/components/ToastContainerBar";
import LoginModal from "@/components/models/LoginModal";
import RegisterModal from "@/components/models/RegisterModal";
import FilterModal from "@/components/models/FilterModal";
import SearchModal from "@/components/models/SearchModal";
import AppLayoutShell from "@/components/layout/AppLayoutShell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  preload: false,
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
  display: "swap",
});

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
      siteName: "DARNA",
      locale: OG_LOCALE[locale] ?? "en_US",
      type: "website",
      images: [{ url: "/assets/logo-vertical.png", width: 512, height: 512, alt: "DARNA" }],
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
  // Arabic uses Tajawal; body classes would otherwise override the [dir=rtl] font rule.
  const fontClass = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${tajawal.variable} ${fontClass} h-full`}>
      <body className={`min-h-[100dvh] flex flex-col bg-darnaBg text-primary antialiased ${fontClass} selection:bg-accent selection:text-white`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-full focus:bg-primary focus:text-white focus:shadow-darna-lg"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastContainerBar />
          <LoginModal />
          <RegisterModal />
          <FilterModal />
          <SearchModal />

          <AppLayoutShell currentUser={currentUser}>
            {children}
          </AppLayoutShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
