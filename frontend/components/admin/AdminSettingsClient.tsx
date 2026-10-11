"use client";

import React, { useState } from "react";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/data/admin";
import {
  HiOutlineCog,
  HiOutlineCurrencyDollar,
  HiOutlineGlobe,
  HiOutlineShieldCheck,
  HiOutlineDeviceMobile,
} from "react-icons/hi";
import { toast } from "react-toastify";

interface AdminSettingsClientProps {
  initialSettings: {
    hostCommissionPercent: number;
    guestServiceFeePercent: number;
    supportedCurrencies: string[];
    primaryCurrency: string;
    supportedLocales: string[];
    defaultLocale: string;
    instantBookingPlatformWide: boolean;
    smsGatewaysEnabled: boolean;
    maintenanceMode: boolean;
  };
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const [hostCommission, setHostCommission] = useState(initialSettings.hostCommissionPercent);
  const [guestFee, setGuestFee] = useState(initialSettings.guestServiceFeePercent);
  const [instantBookAll, setInstantBookAll] = useState(initialSettings.instantBookingPlatformWide);
  const [smsGateways, setSmsGateways] = useState(initialSettings.smsGatewaysEnabled);
  const [maintenance, setMaintenance] = useState(initialSettings.maintenanceMode);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updatePlatformSettings({
        hostCommissionPercent: Number(hostCommission),
        guestServiceFeePercent: Number(guestFee),
        instantBookingPlatformWide: instantBookAll,
        smsGatewaysEnabled: smsGateways,
        maintenanceMode: maintenance,
      });
      toast.success("Platform financial & operational settings saved!");
    } catch {
      toast.error("Failed to save platform settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
          Platform Configuration & Fiscal Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1">
          Configure commission split percentages, supported Algerian banking currencies, and trilingual locales.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Commission fees box */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-primary pb-2 border-b border-tertiary/60">
            Marketplace Fee Structure
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Host Commission Fee (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={hostCommission}
                onChange={(e) => setHostCommission(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                required
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Standard host payout deduction (Default: 3.0%)
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Guest Service Fee (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={guestFee}
                onChange={(e) => setGuestFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                required
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Checkout surcharge applied to guest bookings (Default: 7.0%)
              </span>
            </div>
          </div>
        </div>

        {/* Currency & Locales box */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-primary pb-2 border-b border-tertiary/60">
            Currency & Internationalization
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/60">
              <span className="block font-bold text-primary mb-2">Supported Currencies</span>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-primary text-white font-bold font-mono">
                  DZD (د.ج - Primary)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white border border-tertiary/80 font-mono text-neutral-700">
                  EUR (€)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white border border-tertiary/80 font-mono text-neutral-700">
                  USD ($)
                </span>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/60">
              <span className="block font-bold text-primary mb-2">Active Trilingual Locales</span>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-white border border-tertiary/80 font-bold text-neutral-800">
                  Français (fr)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white border border-tertiary/80 font-bold text-neutral-800">
                  English (en)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white border border-tertiary/80 font-bold text-neutral-800">
                  العربية (ar - RTL)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Toggles */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-primary pb-2 border-b border-tertiary/60">
            Platform-Wide Operational Controls
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-tertiary/60">
              <div>
                <span className="block font-bold text-xs text-primary">Allow Instant Bookings</span>
                <span className="text-[11px] text-neutral-500">Enable one-click booking without requiring prior host review</span>
              </div>
              <input
                type="checkbox"
                checked={instantBookAll}
                onChange={(e) => setInstantBookAll(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-tertiary/60">
              <div>
                <span className="block font-bold text-xs text-primary">Algerian SMS Gateway Routing</span>
                <span className="text-[11px] text-neutral-500">Send OTPs and arrival instructions via Mobilis, Djezzy, and Ooredoo (+213)</span>
              </div>
              <input
                type="checkbox"
                checked={smsGateways}
                onChange={(e) => setSmsGateways(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-rose-50 rounded-2xl border border-rose-200">
              <div>
                <span className="block font-bold text-xs text-rose-900">Platform Maintenance Mode</span>
                <span className="text-[11px] text-rose-700">Display friendly maintenance banner to guests while preserving host portal</span>
              </div>
              <input
                type="checkbox"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
                className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-tertiary/40">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
