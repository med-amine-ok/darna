"use client";

import React, { useState } from "react";
import ClientOnly from "./ClientOnly";
import Container from "./Container";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/navigation";
import { MdExpandMore, MdLanguage } from "react-icons/md";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<number[]>([]);

  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/become-a-host") ||
    pathname?.endsWith("/login") ||
    pathname?.startsWith("/messages")
  ) {
    return null;
  }

  const toggleSection = (idx: number) => {
    setOpenSections((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const sections = [
    {
      title: t("support"),
      links: [
        t("helpCenter"),
        t("airCover"),
        t("accessibility"),
        t("cancellation"),
        t("neighborhood"),
      ],
    },
    {
      title: t("community"),
      links: [
        t("disasterRelief"),
        t("antiDiscrimination"),
      ],
    },
    {
      title: t("hosting"),
      links: [
        t("hostHome"),
        t("hostAirCover"),
        t("hostResources"),
        t("hostForum"),
        t("hostResponsibly"),
      ],
    },
    {
      title: t("about"),
      links: [
        t("newsroom"),
        t("newFeatures"),
        t("letterFounders"),
        t("careers"),
        t("investors"),
        t("giftCards"),
      ],
    },
  ];

  return (
    <ClientOnly>
      <footer className="border-t border-tertiary bg-background text-neutral-600">
        <Container className="py-8 sm:py-12">
          {/* Desktop Multi-Column Grid */}
          <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-tertiary">
            {sections.map((section, idx) => (
              <div key={idx} className="flex flex-col space-y-3">
                <h4 className="font-semibold text-primary text-sm">
                  {section.title}
                </h4>
                <ul className="space-y-2 text-sm">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <span className="hover:underline cursor-pointer transition text-neutral-600 hover:text-neutral-900">
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile Accordion Sections */}
          <div className="md:hidden divide-y divide-neutral-200 border-b border-neutral-200 pb-4 mb-4">
            {sections.map((section, idx) => {
              const isOpen = openSections.includes(idx);
              return (
                <div key={idx} className="py-3">
                  <button
                    type="button"
                    onClick={() => toggleSection(idx)}
                    className="w-full min-h-[44px] flex items-center justify-between font-semibold text-neutral-900 text-sm py-2 cursor-pointer touch-manipulation"
                  >
                    <span>{section.title}</span>
                    <MdExpandMore
                      size={20}
                      className={`text-neutral-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <ul className="pt-2 pb-1 space-y-2.5 text-sm ps-1 animate-in fade-in duration-150">
                      {section.links.map((link, linkIdx) => (
                        <li key={linkIdx}>
                          <span className="hover:underline cursor-pointer text-neutral-600 hover:text-neutral-900 block py-0.5">
                            {link}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Bar: Legal + Language / Currency */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
              <span>{t("copyright")}</span>
              <span>·</span>
              <span className="hover:underline cursor-pointer">{t("privacy")}</span>
              <span>·</span>
              <span className="hover:underline cursor-pointer">{t("terms")}</span>
              <span>·</span>
              <span className="hover:underline cursor-pointer">{t("sitemap")}</span>
              <span>·</span>
              <span className="hover:underline cursor-pointer">{t("companyDetails")}</span>
            </div>

            <div className="flex items-center gap-4 font-semibold text-neutral-800">
              <span className="flex items-center gap-1.5 hover:underline cursor-pointer">
                <MdLanguage size={16} />
                <span className="uppercase">{locale}</span>
              </span>
              <span>$ USD</span>
            </div>
          </div>
        </Container>
      </footer>
    </ClientOnly>
  );
}
