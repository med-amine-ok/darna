"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  Shield,
  Globe,
  Bell,
  Lock,
  User,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Server,
} from "lucide-react";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/data/settings";
import { PlatformSettings } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Props {
  locale: string;
}

export default function SettingsClient({ locale }: Props) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [platformName, setPlatformName] = useState("DARNA");
  const [serviceFeePercent, setServiceFeePercent] = useState(5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(120);

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlatformSettings();
      setSettings(data);
      setPlatformName(data.platformName);
      setServiceFeePercent(data.serviceFeePercent ?? data.guestServiceFeePercent ?? 5);
      setMaintenanceMode(data.maintenanceMode);
      setTwoFactorEnabled(data.security?.twoFactorRequired || false);
      setSessionTimeoutMinutes(data.security?.sessionTimeoutMinutes || 120);
    } catch (err: any) {
      error("Failed to load settings", err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      const updated = await updatePlatformSettings(
        {
          platformName,
          serviceFeePercent,
          maintenanceMode,
          security: {
            sessionTimeoutMinutes,
            twoFactorRequired: twoFactorEnabled,
          },
        },
        actor
      );

      setSettings(updated);
      success("Settings Saved", "Platform configuration updated successfully.");
    } catch (err: any) {
      error("Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-bold"
        >
          <CheckCircle className="w-3.5 h-3.5 me-1.5" />
          {saving ? t("saving") : t("saveSettings")}
        </Button>
      </div>

      {/* Main Settings Sections */}
      <div className="space-y-5">
        {/* General Marketplace */}
        <div className="bg-white p-5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <Sliders className="w-4 h-4 text-secondary" />
            <span>{t("general")}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {t("platformName")}
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {t("serviceFee")}
              </label>
              <input
                type="number"
                min={0}
                max={25}
                value={serviceFeePercent}
                onChange={(e) => setServiceFeePercent(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary font-bold"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-white p-5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <Server className="w-4 h-4 text-secondary" />
            <span>{t("maintenance")}</span>
          </h3>

          <div className="p-4 rounded-xl border border-tertiary/60 bg-darnaBg/30 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-primary">{t("maintenance")}</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {locale === "ar"
                  ? "عند التفعيل، يعرض الموقع العام للضيوف والمضيفين لافتة صيانة مع احتفاظ المسؤولين بكامل صلاحيات الدخول."
                  : locale === "fr"
                  ? "Lorsqu'il est activé, le site public affiche une bannière de maintenance tandis que les administrateurs conservent un accès complet."
                  : "When enabled, the public guest and host site displays a maintenance banner while admins retain full access."}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-white p-5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <Lock className="w-4 h-4 text-secondary" />
            <span>{t("security")}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                {t("sessionTimeout")}
              </label>
              <input
                type="number"
                min={15}
                max={1440}
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                {locale === "ar"
                  ? "تنتهي صلاحية ملف تعريف الارتباط الآمن تلقائياً بعد فترة الخمول المحددة."
                  : locale === "fr"
                  ? "Le cookie sécurisé expire automatiquement après la durée d'inactivité spécifiée."
                  : "Signed HTTP-only cookie automatically expires after inactive duration."}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-tertiary/60 bg-darnaBg/30 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-primary">{t("twoFactor")}</h4>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {locale === "ar"
                    ? "طلب رمز المصادقة الثنائية TOTP عند تسجيل دخول الموظفين."
                    : locale === "fr"
                    ? "Exiger un jeton TOTP d'authentificateur lors de la connexion du personnel."
                    : "Require authenticator TOTP token on staff login."}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Active Admin Profile */}
        <div className="bg-white p-5 rounded-2xl border border-tertiary/70 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <User className="w-4 h-4 text-secondary" />
            <span>
              {locale === "ar" ? "ملف الجلسة النشطة" : locale === "fr" ? "Profil de session active" : "Active Session Profile"}
            </span>
          </h3>

          <div className="p-3.5 rounded-xl border border-tertiary/60 bg-darnaBg/20 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">
                {locale === "ar" ? "المسؤول المسجل:" : locale === "fr" ? "Administrateur connecté :" : "Logged in Administrator:"}
              </span>
              <span className="font-bold text-primary">Amine Admin (adm_01)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">
                {locale === "ar" ? "مستوى التصريح الأمني:" : locale === "fr" ? "Niveau d'habilitation :" : "Security Clearance:"}
              </span>
              <span className="font-mono text-secondary font-semibold capitalize">{tRoles("super_admin")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">
                {locale === "ar" ? "نوع جلسة الأمان:" : locale === "fr" ? "Type de session sécurisée :" : "Session Cookie Type:"}
              </span>
              <span className="font-mono text-neutral-600">Signed JWT (jose) · httpOnly · SameSite=Strict</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
