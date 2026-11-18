"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { useTranslations } from "next-intl";
import { Bell, Save, Languages, ShieldCheck, Sliders } from "lucide-react";
import {
  getPlatformSettings,
  listSettingsVersions,
  updatePlatformSettings,
} from "@/lib/actions/settings";
import type { SettingsVersion } from "@/lib/types";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatNumber } from "@/lib/utils/format";

export interface SettingsClientProps {
  locale: string;
  initialTab?: "general" | "languages" | "notifications" | "security";
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const INPUT_CLASS = `text-xs rounded-xl border border-primary/[0.12] p-2.5 text-primary font-semibold focus:outline-none focus:border-primary-600 shadow-2xs hover:border-primary/25 ${FOCUS_RING}`;

/** Supported UI languages, names are autonyms, shown as-is in every locale. */
const LANGUAGES: {
  code: "fr" | "ar" | "en";
  autonym: string;
  badgeKey: string;
  badgeClass: string;
}[] = [
  {
    code: "fr",
    autonym: "Français (FR)",
    badgeKey: "languages.sourceOfTruth",
    badgeClass: "bg-secondary/15 text-secondary-700",
  },
  {
    code: "ar",
    autonym: "العربية (AR)",
    badgeKey: "languages.fullRtl",
    badgeClass: "bg-primary/10 text-primary",
  },
  {
    code: "en",
    autonym: "English (EN)",
    badgeKey: "languages.international",
    badgeClass: "bg-neutral-100 text-neutral-600",
  },
];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Accessible on/off switch: a real checkbox exposed as role="switch". */
function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  emphasized,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Larger text, used when the switch is the only control of its card. */
  emphasized?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label
          htmlFor={id}
          className={`font-semibold text-primary block cursor-pointer ${emphasized ? "text-sm" : "text-xs"}`}
        >
          {label}
        </label>
        <p
          id={hintId}
          className={`text-neutral-500 mt-0.5 ${emphasized ? "text-xs" : "text-[11px]"}`}
        >
          {hint}
        </p>
      </div>
      <span className="relative inline-flex items-center shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-describedby={hintId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <label
          htmlFor={id}
          aria-hidden="true"
          className="w-11 h-6 bg-neutral-300 rounded-full cursor-pointer relative transition-colors peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent-600 peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-700"
        />
      </span>
    </div>
  );
}

export default function SettingsClient({
  locale,
  initialTab = "general",
}: SettingsClientProps) {
  const t = useTranslations("settings");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [saving, setSaving] = useState(false);
  const ttlId = useId();
  const creditId = useId();
  const fourEyesId = useId();

  const [loaded, setLoaded] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [instantBooking, setInstantBooking] = useState(false);
  const [requestTtlHours, setRequestTtlHours] = useState(24);
  const [creditLimitDzd, setCreditLimitDzd] = useState(0);
  const [topupFourEyesDzd, setTopupFourEyesDzd] = useState(0);
  const [version, setVersion] = useState<{ n: number; at: string | null; by: string | null }>({ n: 0, at: null, by: null });
  const [history, setHistory] = useState<SettingsVersion[]>([]);

  const { success, error } = useToast();
  const can = useCan();

  const loadData = useCallback(async () => {
    try {
      const [data, versions] = await Promise.all([getPlatformSettings(), listSettingsVersions(1)]);
      const settings = unwrap(data);
      setMaintenanceMode(settings.maintenanceMode);
      setInstantBooking(settings.instantBookingPlatformWide);
      setRequestTtlHours(settings.requestTtlHours ?? 24);
      setCreditLimitDzd(settings.creditLimitDzd ?? 0);
      setTopupFourEyesDzd(settings.topupFourEyesDzd ?? 0);
      setVersion({ n: settings.settingsVersion ?? 0, at: settings.settingsUpdatedAt ?? null, by: settings.settingsUpdatedBy ?? null });
      if (versions.ok) setHistory(versions.data.rows);
      setLoaded(true);
    } catch (err) {
      error(t("toasts.loadFailed"), errorMessage(err));
    }
  }, [error, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      unwrap(
        await updatePlatformSettings({
          maintenanceMode,
          instantBookingPlatformWide: instantBooking,
          requestTtlHours,
          creditLimitDzd,
          topupFourEyesDzd,
        }),
      );
      success(t("toasts.saved"), t("toasts.savedHint"));
      loadData();
    } catch (err) {
      error(t("toasts.saveFailed"), errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          can("settings.manage") && loaded
            ? [
                {
                  label: saving ? t("saving") : t("saveSettings"),
                  icon: <Save className="w-4 h-4" aria-hidden="true" />,
                  variant: "primary",
                  onClick: handleSave,
                },
              ]
            : []
        }
      />

      <Tabs
        items={[
          {
            id: "general",
            label: t("tabs.general"),
            icon: <Sliders className="w-4 h-4" aria-hidden="true" />,
          },
          {
            id: "languages",
            label: t("tabs.languages"),
            icon: <Languages className="w-4 h-4" aria-hidden="true" />,
          },
          {
            id: "notifications",
            label: t("tabs.notifications"),
            icon: <Bell className="w-4 h-4" aria-hidden="true" />,
          },
          {
            id: "security",
            label: t("tabs.security"),
            icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
          },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <section className="bg-white p-6 rounded-2xl space-y-4 shadow-e1">
            <h2 className="font-semibold text-primary text-base">{t("platform.title")}</h2>
            <p className="text-[11px] text-neutral-500">
              {version.n > 0
                ? t("platform.version", {
                    version: version.n,
                    date: version.at ? formatDate(version.at, locale) : "-",
                    name: version.by ?? "-",
                  })
                : t("platform.defaults")}
            </p>
            <div>
              <label htmlFor={ttlId} className="block text-xs font-semibold text-primary mb-1">
                {t("platform.requestTtl")}
              </label>
              <input
                id={ttlId}
                type="number"
                min={1}
                max={168}
                value={requestTtlHours}
                onChange={(e) => setRequestTtlHours(Number(e.target.value))}
                className={`w-32 font-mono ${INPUT_CLASS}`}
              />
            </div>
            <div>
              <label htmlFor={creditId} className="block text-xs font-semibold text-primary mb-1">
                {t("platform.creditLimit")}
              </label>
              <input
                id={creditId}
                type="number"
                min={0}
                step={100}
                value={creditLimitDzd}
                onChange={(e) => setCreditLimitDzd(Number(e.target.value))}
                className={`w-40 font-mono ${INPUT_CLASS}`}
              />
              <p className="text-[11px] text-neutral-500 mt-1">{t("platform.creditLimitHint")}</p>
            </div>
            <div>
              <label htmlFor={fourEyesId} className="block text-xs font-semibold text-primary mb-1">
                {t("platform.fourEyes")}
              </label>
              <input
                id={fourEyesId}
                type="number"
                min={0}
                step={1000}
                value={topupFourEyesDzd}
                onChange={(e) => setTopupFourEyesDzd(Number(e.target.value))}
                className={`w-40 font-mono ${INPUT_CLASS}`}
              />
              <p className="text-[11px] text-neutral-500 mt-1">{t("platform.fourEyesHint")}</p>
            </div>
            <div>
              <p className="block text-xs font-semibold text-primary mb-1">{t("serviceFee")}</p>
              {/* Fixed policy: travellers never pay BLADUS; revenue comes from host commissions. */}
              <p className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 font-mono text-sm font-semibold text-secondary-700">
                0 %
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">{t("identity.serviceFeeHint")}</p>
            </div>
          </section>

          <div className="space-y-4">
            <section className="bg-white p-6 rounded-2xl space-y-4 shadow-e1">
              <SwitchRow
                emphasized
                label={t("maintenance")}
                hint={t("identity.maintenanceHint")}
                checked={maintenanceMode}
                onChange={setMaintenanceMode}
              />
              <div className="pt-4 border-t border-primary/[0.08]">
                <SwitchRow
                  label={t("platform.instantBooking")}
                  hint={t("platform.instantBookingHint")}
                  checked={instantBooking}
                  onChange={setInstantBooking}
                />
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl space-y-3 shadow-e1">
              <h2 className="font-semibold text-primary text-sm">{t("platform.history")}</h2>
              {history.length === 0 ? (
                <p className="text-xs text-neutral-500">{t("platform.noHistory")}</p>
              ) : (
                <ul className="divide-y divide-primary/[0.06] text-xs">
                  {history.map((v) => (
                    <li key={v.version} className="py-2 flex justify-between gap-3">
                      <span className="font-semibold text-primary">v{v.version}</span>
                      <span className="text-primary-600">
                        {v.createdBy ?? "-"} · {v.createdAt ? formatDate(v.createdAt, locale) : "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Languages */}
      {activeTab === "languages" && (
        <section className="bg-white p-6 rounded-2xl space-y-4 shadow-e1">
          <h2 className="font-semibold text-primary text-base">
            {t("languages.title")}
          </h2>
          <p className="text-xs text-neutral-500">
            {t("languages.description", { count: LANGUAGES.length })}
          </p>

          <ul className="space-y-3 pt-2">
            {LANGUAGES.map((lang) => (
              <li
                key={lang.code}
                className="flex items-center justify-between p-3 rounded-xl bg-darnaBg-100  "
              >
                <div className="flex items-center gap-3">
                  <span
                    lang={lang.code}
                    dir={lang.code === "ar" ? "rtl" : "ltr"}
                    className="font-semibold text-xs text-primary"
                  >
                    {lang.autonym}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${lang.badgeClass}`}
                  >
                    {t(lang.badgeKey)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-secondary-700">
                  {t("languages.translated", {
                    percent: formatNumber(100, locale),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Notifications */}
      {activeTab === "notifications" && (
        <section className="bg-white p-6 rounded-2xl space-y-2 shadow-e1">
          <h2 className="font-semibold text-primary text-base">{t("notifications.title")}</h2>
          <p className="text-xs text-neutral-600">{t("platform.notificationsInfo")}</p>
        </section>
      )}

      {/* Security */}
      {activeTab === "security" && (
        <section className="bg-white p-6 rounded-2xl space-y-3 shadow-e1">
          <h2 className="font-semibold text-primary text-base">{t("securityPolicy.title")}</h2>
          <ul className="space-y-2 text-xs text-primary-700 list-disc ps-5">
            <li>{t("platform.securityMfa")}</li>
            <li>{t("platform.securityIdle")}</li>
            <li>{t("platform.securityMax")}</li>
            <li>{t("platform.securityLock")}</li>
          </ul>
        </section>
      )}
    </div>
  );
}
