"use client";

import React, { useState } from "react";
import Container from "@/components/Container";
import FooterColumn from "@/components/FooterColumn";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, Link } from "@/navigation";
import { BrandChevronDownIcon, BrandGlobeIcon } from "@/components/icons";

export default function Footer() {
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<number[]>([]);

  if (
    pathname?.startsWith("/admin") ||
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

  const sections = [
    {
      title: "Support",
      links: [
        { label: "Help Center" },
        { label: "DARNA Cover Protection" },
        { label: "Anti-discrimination" },
        { label: "Disability support" },
        { label: "Cancellation options" },
      ],
    },
    {
      title: "Hosting & Partners",
      links: [
        { label: "DARNA your home", href: "/become-a-host" },
        { label: "List your 4x4 or car", href: "/become-a-host" },
        { label: "Host a Sahara experience", href: "/become-a-host" },
        { label: "Hosting resources", href: "/become-a-host" },
        { label: "Community forum", href: "/become-a-host" },
      ],
    },
    {
      title: "Explore Algeria",
      links: [
        { label: "Algiers & Coastal Bays" },
        { label: "Oran & Western Coast" },
        { label: "Tassili & Djanet Expeditions" },
        { label: "Constantine Suspension Bridges" },
        { label: "Taghit Dunes & Oases" },
      ],
    },
    {
      title: "DARNA",
      links: [
        { label: "About DARNA" },
        { label: "Newsroom" },
        { label: "Careers" },
        { label: "Investors" },
        { label: "Emergency response" },
      ],
    },
  ];

  return (
    <footer className="border-t border-tertiary/70 bg-[#F4F1E8] text-neutral-600 mt-12">
      <Container className="py-8 sm:py-12">
        {/* Desktop Multi-Column Grid */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-tertiary/50">
          {sections.map((section, idx) => (
            <FooterColumn
              key={idx}
              title={section.title}
              links={section.links}
            />
          ))}
        </div>

        {/* Mobile Accordion Sections */}
        <div className="md:hidden divide-y divide-tertiary/40 border-b border-tertiary/40 pb-4 mb-4">
          {sections.map((section, idx) => {
            const isOpen = openSections.includes(idx);
            return (
              <div key={idx} className="py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection(idx)}
                  className="w-full min-h-[44px] flex items-center justify-between font-bold text-primary text-sm py-2 cursor-pointer touch-manipulation select-none"
                >
                  <span>{section.title}</span>
                  <BrandChevronDownIcon
                    size={20}
                    className={`text-neutral-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <ul className="pt-2 pb-2 space-y-2.5 text-sm ps-1 animate-in fade-in duration-150">
                    {section.links.map((link, linkIdx) => (
                      <li key={linkIdx}>
                        {"href" in link && link.href ? (
                          <Link
                            href={link.href as string}
                            className="hover:underline cursor-pointer text-neutral-600 hover:text-primary block py-0.5"
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <span className="hover:underline cursor-pointer text-neutral-600 hover:text-primary block py-0.5">
                            {link.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
            <span>© {new Date().getFullYear()} DARNA, Inc.</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Privacy</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Terms</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Sitemap</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Company details</span>
          </div>

          <div className="flex items-center gap-5 font-semibold text-primary">
            <span className="flex items-center gap-1.5 hover:underline cursor-pointer">
              <BrandGlobeIcon size={16} />
              <span className="uppercase">{locale}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>د.ج</span>
              <span>DZD</span>
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
