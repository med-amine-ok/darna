"use client";

import React, { useId, useState } from "react";
import Container from "@/components/Container";
import FooterColumn, { type FooterLink } from "@/components/FooterColumn";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, Link } from "@/navigation";
import { BrandChevronDownIcon, BrandGlobeIcon } from "@/components/icons";

const linkFocus =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const destinations = ["Algiers", "Oran", "Djanet", "Constantine", "Taghit"] as const;

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();
  const baseId = useId();
  const [openSections, setOpenSections] = useState<number[]>([]);

  if (
    pathname?.startsWith("/become-a-host") ||
    pathname?.startsWith("/host") ||
    (pathname?.startsWith("/messages/") && pathname !== "/messages")
  ) {
    return null;
  }

  const toggleSection = (idx: number) => {
    setOpenSections((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const sections: { title: string; links: FooterLink[] }[] = [
    {
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
      title: t("hosting"),
      links: [
        { label: t("hostHome"), href: "/become-a-host" },
        { label: t("hostVehicle"), href: "/become-a-host" },
        { label: t("hostExperience"), href: "/become-a-host" },
        { label: t("hostResources"), href: "/help" },
      ],
    },
    {
      title: t("exploreAlgeria"),
      links: destinations.map((destination) => ({
        label: t(`destinations.${destination}`),
        href: { pathname: "/search", query: { destination } },
      })),
    },
    {
      title: t("about"),
      links: [
        { label: t("aboutDarna"), href: "/help" },
        { label: t("emergency"), href: "/help" },
      ],
    },
  ];

  return (
    <footer className="border-t border-tertiary/70 bg-[#F4F1E8] text-neutral-600 mt-12">
      <Container className="py-8 sm:py-12">
        {/* Desktop Multi-Column Grid */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-tertiary/50">
          {sections.map((section) => (
            <FooterColumn key={section.title} title={section.title} links={section.links} />
          ))}
        </div>

        {/* Mobile Accordion Sections */}
        <div className="md:hidden divide-y divide-tertiary/40 border-b border-tertiary/40 pb-4 mb-4">
          {sections.map((section, idx) => {
            const isOpen = openSections.includes(idx);
            const panelId = `${baseId}-footer-${idx}`;
            return (
              <div key={section.title} className="py-2.5">
                <h2>
                  <button
                    type="button"
                    onClick={() => toggleSection(idx)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className={`w-full min-h-[44px] flex items-center justify-between font-bold text-primary text-sm py-2 cursor-pointer touch-manipulation select-none ${linkFocus}`}
                  >
                    <span>{section.title}</span>
                    <BrandChevronDownIcon
                      size={20}
                      aria-hidden="true"
                      className={`text-neutral-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h2>
                {isOpen && (
                  <ul id={panelId} className="pt-2 pb-2 space-y-2.5 text-sm ps-1 animate-in fade-in duration-150">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className={`hover:underline text-neutral-600 hover:text-primary block py-0.5 ${linkFocus}`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <nav aria-label={t("legal")}>
            <ul className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
              <li>{t("copyright", { year: new Date().getFullYear() })}</li>
              <li aria-hidden="true">·</li>
              <li>
                <Link href="/help" className={`hover:underline ${linkFocus}`}>
                  {t("privacy")}
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <Link href="/help" className={`hover:underline ${linkFocus}`}>
                  {t("terms")}
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <a href="/sitemap.xml" className={`hover:underline ${linkFocus}`}>
                  {t("sitemap")}
                </a>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <Link href="/help" className={`hover:underline ${linkFocus}`}>
                  {t("companyDetails")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-5 font-semibold text-primary">
            <span className="flex items-center gap-1.5">
              <BrandGlobeIcon size={16} aria-hidden="true" />
              <span className="uppercase">{locale}</span>
            </span>
            <span>{t("currency")}</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
