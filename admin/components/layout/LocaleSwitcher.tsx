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
      className="flex items-center gap-1 bg-darnaBg/70 p-1 rounded-xl border border-tertiary/60"
    >
      <Globe className="w-3.5 h-3.5 text-neutral-400 ms-1 shrink-0" aria-hidden="true" />
      {LANGUAGES.map((lang) => {
        const isCurrent = locale === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleSelect(lang.code)}
            aria-pressed={isCurrent}
            title={t(`switchTo.${lang.code}`)}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
              isCurrent
                ? "bg-primary text-white shadow-2xs"
                : "text-neutral-600 hover:text-primary hover:bg-white/60"
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
