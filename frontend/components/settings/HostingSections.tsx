"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { INPUT_CLASS, LINK_BUTTON_CLASS, FOCUS_RING, PRIMARY_BUTTON_CLASS, SectionHeader, SwitchRow } from "./settingsUi";

export function BookingPermissionsSection() {
  const t = useTranslations("settings");
  const [instantBook, setInstantBook] = useState(true);
  const [requireId, setRequireId] = useState(true);
  const [requireReviews, setRequireReviews] = useState(false);

  return (
    <section aria-labelledby="settings-booking-title" className="space-y-6">
      <SectionHeader id="settings-booking-title" title={t("booking.title")} description={t("booking.description")} />
      <div className="space-y-4">
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
      </div>
    </section>
  );
}

export function TaxesSection() {
  const t = useTranslations("settings");
  return (
    <section aria-labelledby="settings-taxes-title" className="space-y-6">
      <SectionHeader id="settings-taxes-title" title={t("taxes.title")} description={t("taxes.description")} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success(t("taxes.saved"));
        }}
        className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/60 space-y-4 text-xs"
      >
        <div>
          <label htmlFor="settings-nif" className="block font-semibold text-neutral-700 mb-1">
            {t("taxes.nifLabel")}
          </label>
          <input
            id="settings-nif"
            type="text"
            inputMode="numeric"
            dir="ltr"
            placeholder="001234567890123"
            className={`${INPUT_CLASS} text-start`}
          />
        </div>
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>
          {t("taxes.save")}
        </button>
      </form>
    </section>
  );
}

export function PrivacySection() {
  const t = useTranslations("settings");
  const [searchIndexing, setSearchIndexing] = useState(true);
  return (
    <section aria-labelledby="settings-privacy-title" className="space-y-6">
      <SectionHeader id="settings-privacy-title" title={t("privacy.title")} description={t("privacy.description")} />
      <div className="space-y-3 text-xs">
        <SwitchRow
          label={t("privacy.searchIndexing")}
          description={t("privacy.searchIndexingDescription")}
          checked={searchIndexing}
          onChange={setSearchIndexing}
        />
        <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-primary">{t("privacy.downloadData")}</div>
            <div className="text-neutral-600">{t("privacy.downloadDataDescription")}</div>
          </div>
          <button
            type="button"
            onClick={() => toast.info(t("privacy.exportRequested"))}
            className={`px-3 py-1.5 bg-white border border-tertiary rounded-xl font-semibold text-primary shrink-0 ${FOCUS_RING}`}
          >
            {t("privacy.exportZip")}
          </button>
        </div>
      </div>
    </section>
  );
}

export function TravelForWorkSection() {
  const t = useTranslations("settings");
  const [workTravelEnabled, setWorkTravelEnabled] = useState(false);
  return (
    <section aria-labelledby="settings-work-title" className="space-y-6">
      <SectionHeader id="settings-work-title" title={t("work.title")} description={t("work.description")} />
      <SwitchRow
        label={t("work.enable")}
        description={t("work.enableDescription")}
        checked={workTravelEnabled}
        onChange={setWorkTravelEnabled}
      />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {tools.map((tool) => (
          <div key={tool.key} className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/60 space-y-2">
            <h3 className="font-bold text-primary text-sm">{t(`pro.${tool.key}.title`)}</h3>
            <p className="text-neutral-600">{t(`pro.${tool.key}.description`)}</p>
            <button
              type="button"
              onClick={() => toast.info(t(`pro.${tool.toast}`))}
              className={`${LINK_BUTTON_CLASS} inline-flex items-center gap-1`}
            >
              <span>{t(`pro.${tool.key}.action`)}</span>
              <span aria-hidden="true" className="inline-block rtl:rotate-180">
                →
              </span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
