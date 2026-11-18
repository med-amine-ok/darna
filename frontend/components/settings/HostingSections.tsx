"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { BrandArrowRightIcon, BrandDownloadIcon } from "@/components/icons";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Surface";
import { requestDataAction } from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { LINK_BUTTON_CLASS, SectionHeader, SettingsCard } from "./settingsUi";

/** Privacy: ask for a copy of my data (POST /me/data-requests kind "access", answered within 30 days). */
export function PrivacySection() {
  const t = useTranslations("settings");
  const errorText = useActionError();
  const [busy, setBusy] = useState(false);

  const requestExport = async () => {
    setBusy(true);
    try {
      const result = await requestDataAction("access");
      if (!result.ok) toast.error(errorText(result));
      else toast.success(t("privacy.exportRequested"));
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="settings-privacy-title" className="space-y-6">
      <SectionHeader id="settings-privacy-title" title={t("privacy.title")} description={t("privacy.description")} />
      <SettingsCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-title font-semibold text-primary-900">{t("privacy.downloadData")}</h3>
            <p className="mt-1 text-meta text-primary-600">{t("privacy.downloadDataDescription")}</p>
          </div>
          <Button
            type="button"
            variant="tertiary"
            loading={busy}
            leadingIcon={<BrandDownloadIcon size={16} aria-hidden="true" />}
            onClick={requestExport}
            className="shrink-0"
          >
            {t("privacy.exportZip")}
          </Button>
        </div>
      </SettingsCard>
    </section>
  );
}

export function ProHostingSection() {
  const t = useTranslations("settings");
  const tools = [
    { key: "pricing", toast: "pricingSoon" },
    { key: "ical", toast: "icalSoon" },
  ] as const;
  return (
    <section aria-labelledby="settings-pro-title" className="space-y-6">
      <SectionHeader id="settings-pro-title" title={t("pro.title")} description={t("pro.description")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Card key={tool.key} className="flex flex-col gap-2">
            <h3 className="text-title font-semibold text-primary-900">{t(`pro.${tool.key}.title`)}</h3>
            <p className="flex-1 text-meta text-primary-600">{t(`pro.${tool.key}.description`)}</p>
            <div>
              <button
                type="button"
                onClick={() => toast.info(t(`pro.${tool.toast}`))}
                className={`group ${LINK_BUTTON_CLASS}`}
              >
                <span>{t(`pro.${tool.key}.action`)}</span>
                <BrandArrowRightIcon
                  size={15}
                  aria-hidden="true"
                  className="rtl:rotate-180 transition-transform duration-fast ease-out group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
