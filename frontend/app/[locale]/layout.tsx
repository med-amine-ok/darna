import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { locales, Locale } from "@/i18n";
import { getCurrentUser } from "@/lib/data/auth";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

import ToastContainerBar from "@/components/ToastContainerBar";
import LoginModal from "@/components/models/LoginModal";
import RegisterModal from "@/components/models/RegisterModal";
import FilterModal from "@/components/models/FilterModal";
import SearchModal from "@/components/models/SearchModal";
import AppLayoutShell from "@/components/layout/AppLayoutShell";

export const dynamic = "force-dynamic";

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
  const currentUser = await getCurrentUser();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} font-sans h-full`}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-darnaBg text-primary antialiased font-sans selection:bg-accent selection:text-white">
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
