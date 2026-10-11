"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import { Globe } from "lucide-react";
import { locales, Locale } from "@/i18n";

const LOCALE_LABELS: Record<Locale, { label: string; code: string; dir: string }> = {
  en: { label: "English (US)", code: "EN", dir: "ltr" },
  fr: { label: "Français (FR)", code: "FR", dir: "ltr" },
  ar: { label: "العربية (DZ)", code: "AR", dir: "rtl" },
};

export default function LanguageSwitcher() {
  const params = useParams();
  const currentLocale = (params?.locale as Locale) || "en";
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLocale = (targetLocale: Locale) => {
    setIsOpen(false);
    if (targetLocale === currentLocale) return;
    router.replace(pathname, { locale: targetLocale });
  };

  return (
    <div className="relative inline-block text-start" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-black/5 transition text-xs sm:text-sm font-semibold text-primary cursor-pointer select-none btn-press"
        aria-label="Language selector"
      >
        <Globe size={16} className="text-primary/80" />
        <span className="uppercase tracking-wider">{currentLocale}</span>
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-48 rounded-2xl bg-white shadow-darna-dropdown border border-tertiary/60 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-tertiary/30">
            Language / Langue / اللغة
          </div>
          {locales.map((loc) => {
            const isSelected = loc === currentLocale;
            const info = LOCALE_LABELS[loc];
            return (
              <button
                key={loc}
                type="button"
                onClick={() => handleSelectLocale(loc)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-start transition cursor-pointer ${
                  isSelected
                    ? "bg-accent/10 text-accent font-bold"
                    : "text-primary hover:bg-neutral-50 font-medium"
                }`}
              >
                <span>{info.label}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
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
