"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/navigation";
import { BrandGlobeIcon } from "@/components/icons";
import { locales, Locale } from "@/i18n";
import { useDismiss, handleMenuKeyDown, focusFirstMenuItem } from "@/hook/useDismiss";

// Endonyms: each language is shown in its own language (and marked with `lang`).
const LOCALE_LABELS: Record<Locale, { label: string; code: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English (US)", code: "EN", dir: "ltr" },
  fr: { label: "Français (FR)", code: "FR", dir: "ltr" },
  ar: { label: "العربية (DZ)", code: "AR", dir: "rtl" },
};

export default function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuId = useId();

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
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-black/5 transition text-xs sm:text-sm font-semibold text-primary cursor-pointer select-none btn-press shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        <BrandGlobeIcon size={16} className="text-primary/80 shrink-0" />
        <span className="uppercase tracking-wider">{currentLocale}</span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t("language")}
          onKeyDown={handleMenuKeyDown}
          className="absolute end-0 mt-2 w-48 rounded-2xl bg-white shadow-darna-dropdown border border-tertiary/60 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div
            aria-hidden="true"
            className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-600 border-b border-tertiary/30"
          >
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-start transition cursor-pointer focus-visible:outline-none focus-visible:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 ${
                  isSelected
                    ? "bg-accent/10 text-accent-700 font-bold"
                    : "text-primary hover:bg-neutral-50 font-medium"
                }`}
              >
                <span>{info.label}</span>
                <span
                  aria-hidden="true"
                  className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600"
                >
                  {info.code}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
