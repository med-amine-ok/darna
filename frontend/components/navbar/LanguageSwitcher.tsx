"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/navigation";
import { AnimatePresence, m } from "framer-motion";
import { BrandGlobeIcon, BrandCheckIcon } from "@/components/icons";
import { dur, ease } from "@/lib/motion";
import { useIsRtl } from "@/components/ui/hooks";
import { locales, Locale } from "@/i18n";
import { useDismiss, handleMenuKeyDown, focusFirstMenuItem } from "@/hook/useDismiss";

// Endonyms: each language is shown in its own language (and marked with `lang`).
// `short` is what the header shows: EN / FR / ع.
const LOCALE_LABELS: Record<Locale, { label: string; short: string; region: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English", short: "EN", region: "US", dir: "ltr" },
  fr: { label: "Français", short: "FR", region: "FR", dir: "ltr" },
  ar: { label: "العربية", short: "ع", region: "DZ", dir: "rtl" },
};

export default function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuId = useId();
  const isRtl = useIsRtl();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismiss(isOpen, dropdownRef, () => setIsOpen(false), triggerRef);

  useEffect(() => {
    if (isOpen) focusFirstMenuItem(menuRef.current);
  }, [isOpen]);

  const handleSelectLocale = (targetLocale: Locale) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    if (targetLocale === currentLocale) return;
    // Keep the current query string (search filters, dates…) when switching language.
    const query = searchParams?.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: targetLocale });
  };

  const current = LOCALE_LABELS[currentLocale];

  return (
    <div className="relative inline-block text-start" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={t("selectLanguage")}
        className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-primary-900 cursor-pointer select-none shrink-0 transition-colors duration-fast ease-standard hover:bg-primary/[0.06] aria-expanded:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        <BrandGlobeIcon size={18} className="hidden shrink-0 text-primary-700 sm:block" />
        <span lang={currentLocale} className={currentLocale === "ar" ? "font-sans text-base leading-none" : "tracking-wide"}>
          {current.short}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={t("language")}
            onKeyDown={handleMenuKeyDown}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: dur.fast, ease: ease.out } }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14, ease: ease.standard } }}
            style={{ transformOrigin: isRtl ? "top left" : "top right" }}
            className="absolute end-0 top-full z-dropdown mt-2 w-56 rounded-3xl bg-white p-2 shadow-e4"
          >
            <div aria-hidden="true" className="px-3 pb-1 pt-1.5 text-eyebrow uppercase font-semibold text-primary-500">
              {t("language")}
            </div>
            {locales.map((loc) => {
              const isSelected = loc === currentLocale;
              const info = LOCALE_LABELS[loc];
              return (
                <button
                  key={loc}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  lang={loc}
                  dir={info.dir}
                  onClick={() => handleSelectLocale(loc)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 ${
                    isSelected ? "bg-primary/[0.05] font-semibold text-primary-900" : "font-medium text-primary-800 hover:bg-primary/[0.04]"
                  }`}
                >
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-100 text-meta font-semibold text-primary-800">
                    {info.short}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{info.label}</span>
                    <span className="block text-meta font-normal text-primary-500">{info.region}</span>
                  </span>
                  {isSelected && <BrandCheckIcon size={16} className="shrink-0 text-accent-600" aria-hidden="true" />}
                </button>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
