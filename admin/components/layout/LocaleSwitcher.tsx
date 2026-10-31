"use client";

import React from "react";
import { usePathname, useRouter } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";

type AppLocale = "en" | "fr" | "ar";

/** Short autonyms shown on the buttons (kept in their own language). */
const LANGUAGES: ReadonlyArray<{ code: AppLocale; label: string; dir: "ltr" | "rtl" }> = [
  { code: "en", label: "EN", dir: "ltr" },
  { code: "fr", label: "FR", dir: "ltr" },
  { code: "ar", label: "عر", dir: "rtl" },
];

export const LocaleSwitcher: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("layout.localeSwitcher");

  const handleSelect = (newLocale: AppLocale) => {
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div
      role="group"
      aria-label={t("groupLabel")}
      className="flex items-center gap-0.5 bg-white/70 p-1 rounded-xl shadow-e1"
    >
      <Globe className="w-3.5 h-3.5 text-primary-500 ms-1 me-0.5 shrink-0" aria-hidden="true" />
      {LANGUAGES.map((lang) => {
        const isCurrent = locale === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleSelect(lang.code)}
            aria-pressed={isCurrent}
            title={t(`switchTo.${lang.code}`)}
            className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-semibold transition-colors duration-fast ease-standard select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
              isCurrent
                ? "bg-primary-800 text-white shadow-e1"
                : "text-primary-600 hover:text-primary-900 hover:bg-primary/[0.05]"
            }`}
          >
            <span lang={lang.code} dir={lang.dir}>
              {lang.label}
            </span>
            <span className="sr-only"> {t(`switchTo.${lang.code}`)}</span>
          </button>
        );
      })}
    </div>
  );
};
