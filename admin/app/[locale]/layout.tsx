import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { locales, Locale } from "@/i18n";
import { ToastProvider } from "@/components/ui/Toast";
import MotionProvider from "@/components/motion/MotionProvider";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2E3A2F",
};

// Icons come from the file conventions app/favicon.ico, app/icon.png and app/apple-icon.png.
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = locales.includes(params.locale as Locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: {
      template: t("titleTemplate"),
      default: t("defaultTitle"),
    },
    description: t("description"),
    // Back-office: never indexed (see also app/robots.ts).
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontVariables} font-sans h-full`}
    >
      <body className="min-h-[100dvh] flex flex-col bg-darnaBg text-primary antialiased font-sans selection:bg-accent-200 selection:text-primary-900">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MotionProvider>
            <ToastProvider>{children}</ToastProvider>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
