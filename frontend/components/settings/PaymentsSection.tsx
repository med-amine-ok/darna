"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { BrandPlusIcon, BrandTrashIcon } from "@/components/icons";
import { formatDate } from "@/lib/i18n/date-locale";
import { FOCUS_RING, LINK_BUTTON_CLASS, SectionHeader } from "./settingsUi";

/** Card expiry as a localized month/year (cards expire at the end of the month). */
function formatExpiry(month: number, year: number, locale: string) {
  return formatDate(new Date(Date.UTC(year, month - 1, 15)), locale, { month: "2-digit", year: "2-digit" });
}

export default function PaymentsSection({ onRemoveCard }: { onRemoveCard: (label: string) => void }) {
  const t = useTranslations("settings");
  const locale = useLocale();

  const edahabiaLabel = t("payments.edahabiaCard", { last4: "8890" });

  return (
    <section aria-labelledby="settings-payments-title" className="space-y-6">
      <SectionHeader
        id="settings-payments-title"
        title={t("payments.title")}
        description={t("payments.description")}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-primary text-sm">{t("payments.savedMethods")}</h3>
          <button
            type="button"
            onClick={() => toast.info(t("payments.addMethodSoon"))}
            className={`${LINK_BUTTON_CLASS} flex items-center gap-1`}
          >
            <BrandPlusIcon size={16} aria-hidden="true" />
            <span>{t("payments.addMethod")}</span>
          </button>
        </div>

        <ul className="space-y-2">
          <li className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-primary text-white rounded font-mono font-bold text-[10px]">
                CIB
              </span>
              <div>
                <div className="font-semibold text-primary">{t("payments.cibCard", { last4: "4242" })}</div>
                <div className="text-neutral-600">
                  {t("payments.expiresDefault", { date: formatExpiry(9, 2028, locale) })}
                </div>
              </div>
            </div>
            <span className="text-emerald-700 font-bold">{t("payments.active")}</span>
          </li>

          <li className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-amber-700 text-white rounded font-mono font-bold text-[10px]">
                EDAHABIA
              </span>
              <div>
                <div className="font-semibold text-primary">{edahabiaLabel}</div>
                <div className="text-neutral-600">
                  {t("payments.expires", { date: formatExpiry(11, 2027, locale) })}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemoveCard(edahabiaLabel)}
              aria-label={t("payments.removeCardLabel", { card: edahabiaLabel })}
              aria-haspopup="dialog"
              className={`p-1 text-neutral-500 hover:text-rose-600 transition rounded ${FOCUS_RING}`}
            >
              <BrandTrashIcon size={16} aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>

      <div className="pt-4 border-t border-tertiary/50 space-y-3">
        <h3 className="font-bold text-primary text-sm">{t("payments.payoutMethods")}</h3>
        <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-primary">{t("payments.bnaAccount")}</div>
            <div className="text-neutral-600 mt-0.5">
              {t("payments.ribLabel")}{" "}
              <span className="font-mono" dir="ltr">
                001 00123 4567890123 45
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.info(t("payments.editRibSoon"))}
            aria-label={t("payments.editRibLabel")}
            className={LINK_BUTTON_CLASS}
          >
            {t("edit")}
          </button>
        </div>
      </div>
    </section>
  );
}
