"use client";

import React, { useState } from "react";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/data/admin";
import {
  BrandSettingsIcon,
  BrandCashIcon,
  BrandGlobeIcon,
  BrandShieldIcon,
  BrandPhoneIcon,
  BrandCheckIcon,
} from "@/components/icons";
import { toast } from "react-toastify";

interface AdminSettingsClientProps {
  initialSettings: {
    hostCommissionPercent: number;
    hostCommissionRates?: {
      individual: number;
      agency: number;
      hotel: number;
      hostel: number;
    };
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
  const [individualCommission, setIndividualCommission] = useState(
    initialSettings.hostCommissionRates?.individual ?? 12.0
  );
  const [agencyCommission, setAgencyCommission] = useState(
    initialSettings.hostCommissionRates?.agency ?? 15.0
  );
  const [hotelCommission, setHotelCommission] = useState(
    initialSettings.hostCommissionRates?.hotel ?? 18.0
  );
  const [hostelCommission, setHostelCommission] = useState(
    initialSettings.hostCommissionRates?.hostel ?? 10.0
  );
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
        hostCommissionPercent: Number(individualCommission),
        hostCommissionRates: {
          individual: Number(individualCommission),
          agency: Number(agencyCommission),
          hotel: Number(hotelCommission),
          hostel: Number(hostelCommission),
        },
        guestServiceFeePercent: Number(guestFee),
        instantBookingPlatformWide: instantBookAll,
        smsGatewaysEnabled: smsGateways,
        maintenanceMode: maintenance,
      });
      toast.success("Platform financial & per-host commission rates saved successfully!");
    } catch {
      toast.error("Failed to save platform settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <BrandSettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Platform Configuration & Fiscal Settings
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Configure per-host-type commission take rates, guest checkout service fees, and Algerian banking currency parameters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Commission fees box */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="pb-3 border-b border-tertiary/60 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <BrandCashIcon size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Per-Host-Type Commission Structure
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Independent take-rates automatically deducted against host deposit balances upon confirmed bookings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Individual Host */}
            <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Individual Host Commission</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-primary text-[10px] font-bold">Homes & Stays</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={individualCommission}
                  onChange={(e) => setIndividualCommission(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                  required
                />
                <span className="text-xs font-bold text-neutral-500">%</span>
              </div>
              <span className="text-[11px] text-neutral-500 block leading-tight">
                Standard independent homeowner rate (Default: 12.0%)
              </span>
            </div>

            {/* Tourism Agency */}
            <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Tourism Agency Commission</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold">Trips & Tours</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={agencyCommission}
                  onChange={(e) => setAgencyCommission(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                  required
                />
                <span className="text-xs font-bold text-neutral-500">%</span>
              </div>
              <span className="text-[11px] text-neutral-500 block leading-tight">
                Licensed tourism agencies & multi-day trips (Default: 15.0%)
              </span>
            </div>

            {/* Hotel & Resort */}
            <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Hotel & Resort Commission</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">Hotels & Palaces</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={hotelCommission}
                  onChange={(e) => setHotelCommission(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                  required
                />
                <span className="text-xs font-bold text-neutral-500">%</span>
              </div>
              <span className="text-[11px] text-neutral-500 block leading-tight">
                Commercial star-rated hotels and luxury resorts (Default: 18.0%)
              </span>
            </div>

            {/* Youth Hostel */}
            <div className="bg-neutral-50/80 p-4 rounded-2xl border border-tertiary/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Youth Hostel Commission</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">Dorms & Community</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={hostelCommission}
                  onChange={(e) => setHostelCommission(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                  required
                />
                <span className="text-xs font-bold text-neutral-500">%</span>
              </div>
              <span className="text-[11px] text-neutral-500 block leading-tight">
                Backpacker hostels and shared dorm accommodations (Default: 10.0%)
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-tertiary/60">
            <label className="text-xs font-bold text-neutral-600 block mb-1">
              Guest Service Fee (%)
            </label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={guestFee}
                onChange={(e) => setGuestFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                required
              />
              <span className="text-xs font-bold text-neutral-500">%</span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Checkout surcharge applied to guest bookings platform-wide (Default: 7.0%)
            </span>
          </div>
        </div>

        {/* Currency & Locales box */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="pb-2 border-b border-tertiary/60 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <BrandGlobeIcon size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Currency & Internationalization
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Supported currencies and multi-lingual platform localization standards.
              </p>
            </div>
          </div>

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
          <div className="pb-2 border-b border-tertiary/60 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <BrandShieldIcon size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Platform-Wide Operational Controls
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Real-time operational switches for instant bookings, Algerian SMS gateways, and maintenance.
              </p>
            </div>
          </div>

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
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs disabled:opacity-50"
            >
              <BrandCheckIcon size={16} />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
