"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { BrandArrowRightIcon, BrandDownloadIcon } from "@/components/icons";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Surface";
import { LINK_BUTTON_CLASS, SectionHeader, SettingsCard, SettingsList, SwitchRow } from "./settingsUi";

export function BookingPermissionsSection() {
  const t = useTranslations("settings");
  const [instantBook, setInstantBook] = useState(true);
  const [requireId, setRequireId] = useState(true);
  const [requireReviews, setRequireReviews] = useState(false);

  return (
    <section aria-labelledby="settings-booking-title" className="space-y-6">
      <SectionHeader id="settings-booking-title" title={t("booking.title")} description={t("booking.description")} />
      <SettingsCard>
        <SettingsList>
          <SwitchRow
            label={t("booking.instantBook")}
            description={t("booking.instantBookDescription")}
            checked={instantBook}
            onChange={setInstantBook}
          />
          <SwitchRow
            label={t("booking.requireId")}
            description={t("booking.requireIdDescription")}
            checked={requireId}
            onChange={setRequireId}
          />
          <SwitchRow
            label={t("booking.requireReviews")}
            description={t("booking.requireReviewsDescription")}
            checked={requireReviews}
            onChange={setRequireReviews}
          />
        </SettingsList>
      </SettingsCard>
    </section>
  );
}

export function TaxesSection() {
  const t = useTranslations("settings");
  return (
    <section aria-labelledby="settings-taxes-title" className="space-y-6">
      <SectionHeader id="settings-taxes-title" title={t("taxes.title")} description={t("taxes.description")} />
      <SettingsCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success(t("taxes.saved"));
          }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start"
        >
          <Input
            id="settings-nif"
            label={t("taxes.nifLabel")}
            type="text"
            inputMode="numeric"
            dir="ltr"
            placeholder="001234567890123"
            className="text-start"
            containerClassName="sm:max-w-sm"
          />
          <Button type="submit" variant="secondary" className="sm:mt-1">
            {t("taxes.save")}
          </Button>
        </form>
      </SettingsCard>
    </section>
  );
}

export function PrivacySection() {
  const t = useTranslations("settings");
  const [searchIndexing, setSearchIndexing] = useState(true);
  return (
    <section aria-labelledby="settings-privacy-title" className="space-y-6">
      <SectionHeader id="settings-privacy-title" title={t("privacy.title")} description={t("privacy.description")} />
      <SettingsCard>
        <SwitchRow
          label={t("privacy.searchIndexing")}
          description={t("privacy.searchIndexingDescription")}
          checked={searchIndexing}
          onChange={setSearchIndexing}
        />
      </SettingsCard>
      <SettingsCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-title font-semibold text-primary-900">{t("privacy.downloadData")}</h3>
            <p className="mt-1 text-meta text-primary-600">{t("privacy.downloadDataDescription")}</p>
          </div>
          <Button
            type="button"
            variant="tertiary"
            leadingIcon={<BrandDownloadIcon size={16} aria-hidden="true" />}
            onClick={() => toast.info(t("privacy.exportRequested"))}
            className="shrink-0"
          >
            {t("privacy.exportZip")}
          </Button>
        </div>
      </SettingsCard>
    </section>
  );
}

export function TravelForWorkSection() {
  const t = useTranslations("settings");
  const [workTravelEnabled, setWorkTravelEnabled] = useState(false);
  return (
    <section aria-labelledby="settings-work-title" className="space-y-6">
      <SectionHeader id="settings-work-title" title={t("work.title")} description={t("work.description")} />
      <SettingsCard>
        <SwitchRow
          label={t("work.enable")}
          description={t("work.enableDescription")}
          checked={workTravelEnabled}
          onChange={setWorkTravelEnabled}
        />
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
