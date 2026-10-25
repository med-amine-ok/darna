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
  Save,
  Languages,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/data/settings";
import { PlatformSettings } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export interface SettingsClientProps {
  locale: string;
  initialTab?: "general" | "languages" | "notifications" | "security";
}

export default function SettingsClient({
  locale,
  initialTab = "general",
}: SettingsClientProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [platformName, setPlatformName] = useState("DARNA");
  const [serviceFeePercent, setServiceFeePercent] = useState(5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(120);

  // Notifications states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [instantBookingNotifications, setInstantBookingNotifications] = useState(true);

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
      error("Erreur de chargement", err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    const actor = { id: "adm_01", name: "Admin", role: "super_admin" as const };
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
      success("Paramètres enregistrés", "La configuration de la plateforme a été mise à jour.");
    } catch (err: any) {
      error("Échec de sauvegarde", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle="Configurez le nom de la plateforme, la sécurité, les langues et les règles globales."
        actions={[
          {
            label: saving ? "Enregistrement..." : "Enregistrer les modifications",
            icon: <Save className="w-4 h-4" />,
            variant: "primary",
            onClick: handleSave,
          },
        ]}
      />

      <Tabs
        items={[
          { id: "general", label: "Général", icon: <Sliders className="w-4 h-4" /> },
          { id: "languages", label: "Langues & traductions", icon: <Languages className="w-4 h-4" /> },
          { id: "notifications", label: "Notifications & alertes", icon: <Bell className="w-4 h-4" /> },
          { id: "security", label: "Sécurité & sessions", icon: <ShieldCheck className="w-4 h-4" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-tertiary/40 space-y-4">
            <h3 className="font-bold text-primary text-base">Identité de la plateforme</h3>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">Nom public de la plateforme</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full text-xs rounded-xl border border-tertiary/70 p-2.5 bg-darnaBg/30 text-primary font-bold focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Frais de service voyageur par défaut (%)
              </label>
              <input
                type="number"
                min="0"
                max="25"
                value={serviceFeePercent}
                onChange={(e) => setServiceFeePercent(Number(e.target.value))}
                className="w-32 text-xs rounded-xl border border-tertiary/70 p-2.5 font-mono font-bold text-primary focus:outline-none focus:border-secondary"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Appliqué au sous-total des réservations avant prélèvement de la commission prestataire.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-tertiary/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-primary text-sm">Mode maintenance</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verrouille l'accès public au marketplace tout en permettant aux administrateurs de naviguer.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Languages */}
      {activeTab === "languages" && (
        <div className="bg-white p-6 rounded-2xl border border-tertiary/40 space-y-4">
          <h3 className="font-bold text-primary text-base">Langues prises en charge</h3>
          <p className="text-xs text-neutral-500">
            La plateforme DARNA fonctionne en 3 langues officielles avec support RTL complet pour l'arabe.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/30 border border-tertiary/40">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-primary">Français (FR)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                  Source de vérité
                </span>
              </div>
              <span className="text-xs font-semibold text-secondary">100% traduit</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/30 border border-tertiary/40">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-primary">العربية (AR)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  RTL complet
                </span>
              </div>
              <span className="text-xs font-semibold text-secondary">100% traduit</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/30 border border-tertiary/40">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-primary">English (EN)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                  International
                </span>
              </div>
              <span className="text-xs font-semibold text-secondary">100% traduit</span>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === "notifications" && (
        <div className="bg-white p-6 rounded-2xl border border-tertiary/40 space-y-4">
          <h3 className="font-bold text-primary text-base">Canaux de notification</h3>
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <span className="font-bold text-xs text-primary block">Alertes par email</span>
                <span className="text-[11px] text-neutral-400">Pour chaque nouvelle demande de validation</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-secondary rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div>
                <span className="font-bold text-xs text-primary block">Notifications SMS urgentes</span>
                <span className="text-[11px] text-neutral-400">Pour les litiges critiques et incidents de sécurité</span>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 text-secondary rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-bold text-xs text-primary block">Alertes temps réel dans le panneau</span>
                <span className="text-[11px] text-neutral-400">Cloche de notification et badges de comptage</span>
              </div>
              <input
                type="checkbox"
                checked={instantBookingNotifications}
                onChange={(e) => setInstantBookingNotifications(e.target.checked)}
                className="w-4 h-4 text-secondary rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === "security" && (
        <div className="bg-white p-6 rounded-2xl border border-tertiary/40 space-y-4">
          <h3 className="font-bold text-primary text-base">Politique de sécurité</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Délai d'expiration de session administrateur (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="480"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                className="w-32 text-xs rounded-xl border border-tertiary/70 p-2.5 font-mono font-bold text-primary focus:outline-none focus:border-secondary"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <div>
                <span className="font-bold text-xs text-primary block">Authentification à deux facteurs (2FA)</span>
                <span className="text-[11px] text-neutral-400">Obligatoire pour les rôles Super Administrateur</span>
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
      )}
    </div>
  );
}
