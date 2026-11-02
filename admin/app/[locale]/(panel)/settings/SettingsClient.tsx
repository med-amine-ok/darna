"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { useTranslations } from "next-intl";
import { Bell, Save, Languages, ShieldCheck, Sliders } from "lucide-react";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/lib/actions/settings";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/utils/format";

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
  const platformNameId = useId();
  const serviceFeeId = useId();
  const sessionTimeoutId = useId();

  // Form states
  const [platformName, setPlatformName] = useState("BLADUS");
  const [serviceFeePercent, setServiceFeePercent] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(120);

  // Notifications states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [instantBookingNotifications, setInstantBookingNotifications] =
    useState(true);

  const { success, error } = useToast();
  const can = useCan();

  const loadData = useCallback(async () => {
    try {
      const data = unwrap(await getPlatformSettings());
      setPlatformName(data.platformName);
      setServiceFeePercent(
        0,
      );
      setMaintenanceMode(data.maintenanceMode);
      setTwoFactorEnabled(data.security?.twoFactorRequired || false);
      setSessionTimeoutMinutes(data.security?.sessionTimeoutMinutes || 120);
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
          platformName,
          serviceFeePercent,
          maintenanceMode,
          security: {
            sessionTimeoutMinutes,
            twoFactorRequired: twoFactorEnabled,
          },
        }),
      );
      success(t("toasts.saved"), t("toasts.savedHint"));
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
          can("settings.manage")
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
            <h2 className="font-semibold text-primary text-base">
              {t("identity.title")}
            </h2>

            <div>
              <label
                htmlFor={platformNameId}
                className="block text-xs font-semibold text-primary mb-1"
              >
                {t("platformName")}
              </label>
              <input
                id={platformNameId}
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className={`w-full bg-darnaBg/30 ${INPUT_CLASS}`}
              />
            </div>

            <div>
              <p className="block text-xs font-semibold text-primary mb-1">
                {t("serviceFee")}
              </p>
              {/* Fixed policy: travellers never pay BLADUS; revenue comes from host commissions. */}
              <p
                id={serviceFeeId}
                className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 font-mono text-sm font-semibold text-secondary-700"
              >
                0 %
              </p>
              <p
                id={`${serviceFeeId}-hint`}
                className="text-[11px] text-neutral-500 mt-1"
              >
                {t("identity.serviceFeeHint")}
              </p>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl space-y-3 shadow-e1">
            <SwitchRow
              emphasized
              label={t("maintenance")}
              hint={t("identity.maintenanceHint")}
              checked={maintenanceMode}
              onChange={setMaintenanceMode}
            />
          </section>
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
        <section className="bg-white p-6 rounded-2xl space-y-4 shadow-e1">
          <h2 className="font-semibold text-primary text-base">
            {t("notifications.title")}
          </h2>
          <div className="pt-1 divide-y divide-primary/[0.06]">
            <div className="py-3">
              <SwitchRow
                label={t("notifications.email")}
                hint={t("notifications.emailHint")}
                checked={emailAlerts}
                onChange={setEmailAlerts}
              />
            </div>
            <div className="py-3">
              <SwitchRow
                label={t("notifications.sms")}
                hint={t("notifications.smsHint")}
                checked={smsAlerts}
                onChange={setSmsAlerts}
              />
            </div>
            <div className="py-3">
              <SwitchRow
                label={t("notifications.panel")}
                hint={t("notifications.panelHint")}
                checked={instantBookingNotifications}
                onChange={setInstantBookingNotifications}
              />
            </div>
          </div>
        </section>
      )}

      {/* Security */}
      {activeTab === "security" && (
        <section className="bg-white p-6 rounded-2xl space-y-4 shadow-e1">
          <h2 className="font-semibold text-primary text-base">
            {t("securityPolicy.title")}
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor={sessionTimeoutId}
                className="block text-xs font-semibold text-primary mb-1"
              >
                {t("sessionTimeout")}
              </label>
              <input
                id={sessionTimeoutId}
                type="number"
                min="15"
                max="480"
                value={sessionTimeoutMinutes}
                onChange={(e) =>
                  setSessionTimeoutMinutes(Number(e.target.value))
                }
                className={`w-32 font-mono ${INPUT_CLASS}`}
              />
            </div>

            <div className="pt-4 border-t border-primary/[0.08]">
              <SwitchRow
                label={t("twoFactor")}
                hint={t("securityPolicy.twoFactorHint")}
                checked={twoFactorEnabled}
                onChange={setTwoFactorEnabled}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
