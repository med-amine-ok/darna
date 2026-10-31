"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { BrandPlusIcon, BrandTrashIcon } from "@/components/icons";
import { formatDate } from "@/lib/i18n/date-locale";
import Button, { IconButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LINK_BUTTON_CLASS, SectionHeader, SettingsCard } from "./settingsUi";

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

      <SettingsCard
        title={t("payments.savedMethods")}
        action={
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            leadingIcon={<BrandPlusIcon size={16} aria-hidden="true" />}
            onClick={() => toast.info(t("payments.addMethodSoon"))}
          >
            {t("payments.addMethod")}
          </Button>
        }
      >
        <ul className="divide-y divide-primary/[0.08]">
          <li className="flex items-center justify-between gap-4 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-primary-800 text-[11px] font-bold tracking-wide text-white shadow-e1">
                CIB
              </span>
              <div className="min-w-0">
                <div className="text-body font-medium text-primary-900">{t("payments.cibCard", { last4: "4242" })}</div>
                <div className="text-meta text-primary-600">
                  {t("payments.expiresDefault", { date: formatExpiry(9, 2028, locale) })}
                </div>
              </div>
            </div>
            <Badge tone="success" dot className="shrink-0">
              {t("payments.active")}
            </Badge>
          </li>

          <li className="flex items-center justify-between gap-4 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-tertiary-400 to-tertiary-700 text-[9px] font-bold tracking-wide text-white shadow-e1">
                EDAHABIA
              </span>
              <div className="min-w-0">
                <div className="text-body font-medium text-primary-900">{edahabiaLabel}</div>
                <div className="text-meta text-primary-600">
                  {t("payments.expires", { date: formatExpiry(11, 2027, locale) })}
                </div>
              </div>
            </div>
            <IconButton
              label={t("payments.removeCardLabel", { card: edahabiaLabel })}
              icon={<BrandTrashIcon size={18} />}
              onClick={() => onRemoveCard(edahabiaLabel)}
              aria-haspopup="dialog"
            />
          </li>
        </ul>
      </SettingsCard>

      <SettingsCard title={t("payments.payoutMethods")}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-body font-medium text-primary-900">{t("payments.bnaAccount")}</div>
            <div className="mt-0.5 text-meta text-primary-600">
              {t("payments.ribLabel")}{" "}
              <span className="font-mono tabular-nums" dir="ltr">
                001 00123 4567890123 45
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.info(t("payments.editRibSoon"))}
            aria-label={t("payments.editRibLabel")}
            className={`${LINK_BUTTON_CLASS} shrink-0`}
          >
            {t("edit")}
          </button>
        </div>
      </SettingsCard>
    </section>
  );
}
