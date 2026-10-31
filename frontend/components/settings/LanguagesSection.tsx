"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { usePathname, useRouter } from "@/navigation";
import { BrandCheckIcon } from "@/components/icons";
import { FOCUS_RING, SectionHeader, SettingsCard } from "./settingsUi";

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
    `relative min-h-[64px] rounded-2xl p-3.5 text-start transition-[background-color,box-shadow,color] duration-fast ease-standard ${FOCUS_RING} ${
      active
        ? "bg-primary-800 text-white shadow-e2"
        : "bg-white text-primary-800 ring-1 ring-primary/10 hover:shadow-e2"
    }`;

  const check = (
    <span aria-hidden="true" className="absolute end-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-white/20 enter-pop">
      <BrandCheckIcon size={12} strokeWidth={2.5} />
    </span>
  );

  return (
    <section aria-labelledby="settings-languages-title" className="space-y-6">
      <SectionHeader
        id="settings-languages-title"
        title={t("languages.title")}
        description={t("languages.description")}
      />

      <SettingsCard>
        <div role="group" aria-labelledby="settings-display-language">
          <h3 id="settings-display-language" className="mb-3 text-title font-semibold text-primary-900">
            {t("languages.displayLanguage")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  {active && check}
                  <div className="text-body font-semibold" lang={l.code} dir={l.dir}>
                    {l.label}
                  </div>
                  <div className={`mt-0.5 text-meta ${active ? "text-white/85" : "text-primary-600"}`}>
                    {t(`languages.languageSub.${l.code}`)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </SettingsCard>

      <SettingsCard>
        <div role="group" aria-labelledby="settings-preferred-currency">
          <h3 id="settings-preferred-currency" className="mb-3 text-title font-semibold text-primary-900">
            {t("languages.preferredCurrency")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  {active && check}
                  <div className="text-body font-semibold tabular-nums">{code}</div>
                  <div className={`mt-0.5 text-meta ${active ? "text-white/85" : "text-primary-600"}`}>
                    {t(`languages.currencies.${code}`)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SettingsCard>
    </section>
  );
}
