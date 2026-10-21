"use client";

import React from "react";
import { usePathname, useRouter } from "@/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

export const LocaleSwitcher: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (newLocale: "en" | "fr" | "ar") => {
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 bg-darnaBg/70 p-1 rounded-xl border border-tertiary/60">
      <Globe className="w-3.5 h-3.5 text-neutral-400 ms-1 shrink-0" />
      {[
        { code: "en", label: "EN" },
        { code: "fr", label: "FR" },
        { code: "ar", label: "عر" },
      ].map((lang) => {
        const isCurrent = locale === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleSelect(lang.code as any)}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer ${
              isCurrent
                ? "bg-primary text-white shadow-2xs"
                : "text-neutral-500 hover:text-primary hover:bg-white/60"
            }`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};
