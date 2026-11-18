"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader, SettingsCard } from "./settingsUi";

/**
 * Online payment and payouts are switched off on the platform (DEC-019):
 * guests pay the host directly, so there is no saved card or payout account
 * to show here. Hosts manage their commission wallet in the host space.
 */
export default function PaymentsSection() {
  const t = useTranslations("settings");

  return (
    <section aria-labelledby="settings-payments-title" className="space-y-6">
      <SectionHeader
        id="settings-payments-title"
        title={t("payments.title")}
        description={t("payments.description")}
      />

      <SettingsCard title={t("payments.savedMethods")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-meta text-primary-600">{t("payments.onlineOff")}</p>
          <Badge tone="sand" className="shrink-0">
            {t("payments.unavailable")}
          </Badge>
        </div>
      </SettingsCard>

      <SettingsCard title={t("payments.payoutMethods")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-meta text-primary-600">{t("payments.payoutsOff")}</p>
          <Badge tone="sand" className="shrink-0">
            {t("payments.unavailable")}
          </Badge>
        </div>
      </SettingsCard>
    </section>
  );
}
