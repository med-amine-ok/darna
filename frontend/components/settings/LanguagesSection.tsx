"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { usePathname, useRouter } from "@/navigation";
import { FOCUS_RING, SectionHeader } from "./settingsUi";

/** Language names are shown in their own language (autonyms), so they are not translated. */
const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
] as const;

const CURRENCIES = ["DZD", "EUR", "USD"] as const;

export default function LanguagesSection() {
  const t = useTranslations("settings");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const [currency, setCurrency] = useState<string>("DZD");

  const optionClass = (active: boolean) =>
    `p-3.5 rounded-2xl border text-start transition ${FOCUS_RING} ${
      active
        ? "bg-primary text-white border-primary shadow-xs"
        : "bg-neutral-50 text-neutral-700 border-tertiary/70 hover:bg-neutral-100"
    }`;

  return (
    <section aria-labelledby="settings-languages-title" className="space-y-6">
      <SectionHeader
        id="settings-languages-title"
        title={t("languages.title")}
        description={t("languages.description")}
      />

      <div className="space-y-4">
        <div role="group" aria-labelledby="settings-display-language">
          <div id="settings-display-language" className="block text-xs font-semibold text-neutral-700 mb-2">
            {t("languages.displayLanguage")}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {LANGUAGES.map((l) => {
              const active = currentLocale === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => router.replace(pathname, { locale: l.code })}
                  className={optionClass(active)}
                >
                  <div className="text-sm font-bold" lang={l.code} dir={l.dir}>
                    {l.label}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${active ? "text-white/90" : "text-neutral-600"}`}>
                    {t(`languages.languageSub.${l.code}`)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div role="group" aria-labelledby="settings-preferred-currency" className="pt-3">
          <div id="settings-preferred-currency" className="block text-xs font-semibold text-neutral-700 mb-2">
            {t("languages.preferredCurrency")}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CURRENCIES.map((code) => {
              const active = currency === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCurrency(code);
                    toast.success(t("languages.currencySet", { currency: t(`languages.currencies.${code}`) }));
                  }}
                  className={optionClass(active)}
                >
                  <div className="text-sm font-bold">{code}</div>
                  <div className={`text-[11px] mt-0.5 ${active ? "text-white/90" : "text-neutral-600"}`}>
                    {t(`languages.currencies.${code}`)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
