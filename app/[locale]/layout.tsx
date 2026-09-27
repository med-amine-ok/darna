import ClientOnly from "@/components/ClientOnly";
import Footer from "@/components/Footer";
import ToastContainerBar from "@/components/ToastContainerBar";
import LoginModal from "@/components/models/LoginModal";
import RegisterModal from "@/components/models/RegisterModal";
import RentModal from "@/components/models/RentModal";
import SearchModal from "@/components/models/SearchModal";
import FilterModal from "@/components/models/FilterModal";
import Navbar from "@/components/navbar/Navbar";
import BottomNav from "@/components/navbar/BottomNav";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n";
import AppContent from "@/components/AppContent";

export const dynamic = "force-dynamic";

export const viewport = {
  themeColor: "#C96F4F",
};

const font = Inter({
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const titles: Record<string, string> = {
    en: "DARNA | Vacation Homes & Condo Rentals",
    fr: "DARNA | Locations de vacances et appartements",
    ar: "DARNA | منازل وشقق للإيجار في العطلات",
  };
  const descriptions: Record<string, string> = {
    en: "Find vacation rentals, cabins, beach houses, unique homes and experiences with DARNA.",
    fr: "Trouvez des hébergements de vacances, cabanes, maisons de plage, logements uniques et expériences avec DARNA.",
    ar: "اعثر على أماكن إقامة للعطلات، وأكواخ، ومنازل شاطئية، وتجارب فريدة مع دارنا.",
  };

  return {
    title: {
      default: titles[locale] || titles.en,
      template: "%s | DARNA",
    },
    description: descriptions[locale] || descriptions.en,
    icons: {
      icon: [
        { url: "/assets/logo.png", type: "image/png" },
        { url: "/assets/logo.png", sizes: "32x32", type: "image/png" },
        { url: "/assets/logo.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: "/assets/logo.png",
      apple: [
        { url: "/assets/logo.png", sizes: "180x180", type: "image/png" }
      ],
    },
    manifest: "/manifest.json",
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      siteName: "DARNA",
      images: [
        {
          url: "/assets/logo-horizontal.png",
          width: 800,
          height: 600,
          alt: "DARNA",
        },
      ],
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const currentUser = await getCurrentUser();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="icon" href="/assets/logo.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/assets/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
      </head>
      <body className={font.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientOnly>
            <ToastContainerBar />
            <SearchModal />
            <FilterModal />
            <RegisterModal />
            <LoginModal />
            <RentModal />
            <Navbar currentUser={currentUser} />
            <BottomNav currentUser={currentUser} />
          </ClientOnly>
          <AppContent>{children}</AppContent>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
