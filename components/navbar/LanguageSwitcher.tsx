"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import React, { useState, useRef, useEffect, useTransition } from "react";
import { TbWorld } from "react-icons/tb";
import { IoCheckmark } from "react-icons/io5";

interface LanguageOption {
  code: "en" | "fr" | "ar";
  label: string;
  nativeLabel: string;
  region: string;
  dir: "ltr" | "rtl";
  flag: string;
}

const languages: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    region: "United States",
    dir: "ltr",
    flag: "🇺🇸",
  },
  {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    region: "France",
    dir: "ltr",
    flag: "🇫🇷",
  },
  {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    region: "العالم العربي",
    dir: "rtl",
    flag: "🇸🇦",
  },
];

export default function LanguageSwitcher() {
  const currentLocale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLanguage = (newLocale: "en" | "fr" | "ar") => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    startTransition(() => {
      // Re-apply query parameters if any
      const queryString = searchParams?.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { locale: newLocale });
      setIsOpen(false);
    });
  };

  const activeLang =
    languages.find((l) => l.code === currentLocale) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language and region"
        className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-neutral-100 transition cursor-pointer text-neutral-700 text-sm font-medium border border-transparent hover:border-neutral-200 touch-manipulation"
      >
        <TbWorld size={18} className="text-neutral-600" />
        <span className="hidden lg:inline uppercase text-xs font-semibold tracking-wider">
          {activeLang.code}
        </span>
      </button>

      {isOpen && (
        <div className="absolute end-0 top-12 z-50 w-72 bg-white rounded-2xl shadow-xl border border-neutral-100 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-neutral-100">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Language & Region
            </p>
          </div>
          <div className="py-1">
            {languages.map((lang) => {
              const isSelected = lang.code === currentLocale;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  disabled={isPending}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-start transition cursor-pointer ${
                    isSelected
                      ? "bg-accent/10 text-accent font-semibold"
                      : "hover:bg-neutral-50 text-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" role="img" aria-label={lang.label}>
                      {lang.flag}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-tight">
                        {lang.nativeLabel}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {lang.region}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <IoCheckmark size={18} className="text-accent ms-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
