"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import FooterColumn, { type FooterLink } from "@/components/FooterColumn";
import Logo from "@/components/navbar/Logo";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, Link } from "@/navigation";
import { Accordion, cn } from "@/components/ui";
import { POPULAR_DESTINATIONS } from "@/components/search/destinations";
import { BrandArrowRightIcon, BrandGlobeIcon, BrandCashIcon } from "@/components/icons";
import { locales, type Locale } from "@/i18n";

const linkFocus =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg";

const LOCALE_SHORT: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  fr: { short: "FR", name: "Français" },
  ar: { short: "ع", name: "العربية" },
};

/**
 * Site footer: ink band with the zellige rosette, then brand + four link columns
 * (accordion on phones), wilaya links, language and currency, legal row.
 */
export default function Footer() {
  const t = useTranslations("footer");
  const tSearch = useTranslations("search");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (
    pathname?.startsWith("/become-a-host") ||
    pathname?.startsWith("/host") ||
    (pathname?.startsWith("/messages/") && pathname !== "/messages")
  ) {
    return null;
  }

  const query = Object.fromEntries(searchParams?.entries() ?? []);

  const sections: { id: string; title: string; links: FooterLink[] }[] = [
    {
      id: "explore",
      title: t("exploreAlgeria"),
      links: POPULAR_DESTINATIONS.slice(0, 8).map((d) => ({
        label: tSearch(`destinations.${d.key}.name`),
        meta: String(d.wilaya).padStart(2, "0"),
        href: { pathname: "/search", query: { destination: d.name } },
      })),
    },
    {
      id: "support",
      title: t("support"),
      links: [
        { label: t("helpCenter"), href: "/help" },
        { label: t("darnaCover"), href: "/help" },
        { label: t("antiDiscrimination"), href: "/help" },
        { label: t("accessibility"), href: "/help" },
        { label: t("cancellation"), href: "/help" },
      ],
    },
    {
      id: "hosting",
      title: t("hosting"),
      links: [
        { label: t("hostHome"), href: "/become-a-host" },
        { label: t("hostVehicle"), href: "/become-a-host" },
        { label: t("hostExperience"), href: "/become-a-host" },
        { label: t("hostResources"), href: "/help" },
      ],
    },
    {
      id: "about",
      title: t("about"),
      links: [
        { label: t("aboutDarna"), href: "/help" },
        { label: t("emergency"), href: "/help" },
      ],
    },
  ];

  const languageSwitch = (
    <div role="group" aria-label={t("language")} className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-e1">
      <BrandGlobeIcon size={16} className="ms-2 me-1 text-primary-600" aria-hidden="true" />
      {locales.map((loc) => (
        <Link
          key={loc}
          href={{ pathname, query }}
          locale={loc}
          lang={loc}
          aria-current={loc === locale ? "true" : undefined}
          aria-label={LOCALE_SHORT[loc].name}
          className={cn(
            "flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-meta font-semibold transition-colors duration-fast ease-standard",
            loc === locale ? "bg-primary-800 text-white" : "text-primary-700 hover:bg-primary/[0.06] hover:text-primary-900",
            linkFocus
          )}
        >
          {LOCALE_SHORT[loc].short}
        </Link>
      ))}
    </div>
  );

  return (
    <footer className="mt-16 bg-darnaBg-300/70 text-primary-700">
      {/* Brand band */}
      <div className="relative overflow-hidden bg-primary-900 text-darnaBg">
        <div aria-hidden="true" className="texture-zellige absolute inset-0 opacity-[0.07] invert" />
        <Container className="relative flex flex-col gap-6 py-10 sm:py-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-eyebrow uppercase font-semibold text-tertiary-300">{t("bandEyebrow")}</p>
            <p className="mt-2 text-balance font-serif text-display-md text-darnaBg">{t("bandTitle")}</p>
            <p className="mt-2 max-w-[48ch] text-body text-tertiary-200">{t("bandText")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-full bg-cta px-6 text-sm font-semibold text-white shadow-glow transition-[filter] duration-fast hover:brightness-110",
                linkFocus,
                "focus-visible:ring-offset-primary-900"
              )}
            >
              {t("exploreStays")}
              <BrandArrowRightIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              href="/become-a-host"
              className={cn(
                "inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold text-darnaBg ring-1 ring-inset ring-darnaBg/30 transition-colors duration-fast hover:bg-white/10",
                linkFocus,
                "focus-visible:ring-offset-primary-900"
              )}
            >
              {t("hostHome")}
            </Link>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)] md:gap-8">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Logo variant="horizontal" />
            <p className="max-w-[34ch] text-body text-primary-600">{t("tagline")}</p>
            <div className="flex flex-wrap items-center gap-3">
              {languageSwitch}
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-meta font-semibold text-primary-800 shadow-e1">
                <BrandCashIcon size={16} className="text-secondary-600" aria-hidden="true" />
                {t("currency")}
              </span>
            </div>
          </div>

          {/* Desktop columns */}
          {sections.map((section) => (
            <div key={section.id} className="hidden md:block">
              <FooterColumn title={section.title} links={section.links} />
            </div>
          ))}

          {/* Phone: accordion */}
          <div className="md:hidden">
            <Accordion
              type="multiple"
              appearance="plain"
              headingLevel={2}
              items={sections.map((section) => ({
                id: section.id,
                title: section.title,
                content: <FooterColumn links={section.links} className="pb-4" />,
              }))}
            />
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-primary/[0.08] pt-6 text-meta text-primary-600 md:flex-row">
          <nav aria-label={t("legal")}>
            <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:justify-start">
              <li>{t("copyright", { year: new Date().getFullYear() })}</li>
              {[
                { label: t("privacy"), href: "/help" },
                { label: t("terms"), href: "/help" },
                { label: t("companyDetails"), href: "/help" },
              ].map((l) => (
                <li key={l.label} className="flex items-center gap-3">
                  <span aria-hidden="true">·</span>
                  <Link href={l.href} className={cn("hover:text-primary-900 hover:underline underline-offset-4", linkFocus)}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="flex items-center gap-3">
                <span aria-hidden="true">·</span>
                <a href="/sitemap.xml" className={cn("hover:text-primary-900 hover:underline underline-offset-4", linkFocus)}>
                  {t("sitemap")}
                </a>
              </li>
            </ul>
          </nav>
          <p className="text-meta text-primary-500">{t("pricesInDzd")}</p>
        </div>
      </Container>
      {/* Clears the phone bottom nav. */}
      <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />
    </footer>
  );
}
