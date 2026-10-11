"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User, Organization } from "@/types";
import {
  HiOutlineCreditCard,
  HiOutlineOfficeBuilding,
  HiOutlineAdjustments,
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlinePlus,
  HiOutlineDownload,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
} from "react-icons/hi";
import { toast } from "react-toastify";

interface HostSettingsClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
}

export default function HostSettingsClient({
  currentUser,
  organization,
}: HostSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"payouts" | "identity" | "defaults" | "notifications">("payouts");

  // Payout state
  const [payoutMethods, setPayoutMethods] = useState([
    {
      id: "payout_ccp",
      type: "Algérie Poste CCP",
      details: "0018492041 Clé 35",
      holder: currentUser?.name || "Amina Benali",
      isDefault: true,
    },
    {
      id: "payout_bna",
      type: "Banque Nationale d'Algérie (BNA)",
      details: "RIB: 001 00234 1234567890 44",
      holder: currentUser?.name || "Amina Benali",
      isDefault: false,
    },
  ]);

  // Booking default settings
  const [instantBookDefault, setInstantBookDefault] = useState(true);
  const [advanceNotice, setAdvanceNotice] = useState("1_day");
  const [prepTime, setPrepTime] = useState("none");
  const [checkInTime, setCheckInTime] = useState("15:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [cancellationPolicy, setCancellationPolicy] = useState("flexible");

  // Notification settings
  const [smsBookings, setSmsBookings] = useState(true);
  const [emailInquiries, setEmailInquiries] = useState(true);
  const [autoWelcomeMessage, setAutoWelcomeMessage] = useState(
    "Salam alaykoum! Thank you for booking our stay in Algeria. We look forward to welcoming you. Please let us know your estimated arrival time."
  );

  // Add payout modal
  const [isAddPayoutOpen, setIsAddPayoutOpen] = useState(false);
  const [newAccountType, setNewAccountType] = useState<"CCP" | "BNA" | "BEA">("CCP");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountCle, setNewAccountCle] = useState("");

  const handleAddPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountNumber) {
      toast.error("Please enter account details.");
      return;
    }
    const newMethod = {
      id: `payout_${Date.now()}`,
      type: newAccountType === "CCP" ? "Algérie Poste CCP" : `${newAccountType} Bank RIB`,
      details: newAccountType === "CCP" ? `${newAccountNumber} Clé ${newAccountCle || "00"}` : `RIB: ${newAccountNumber}`,
      holder: currentUser?.name || "Host",
      isDefault: false,
    };
    setPayoutMethods((prev) => [...prev, newMethod]);
    toast.success("Payout method added successfully!");
    setIsAddPayoutOpen(false);
    setNewAccountNumber("");
    setNewAccountCle("");
  };

  const handleSetDefaultPayout = (id: string) => {
    setPayoutMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
      }))
    );
    toast.info("Default payout account updated.");
  };

  const handleSaveDefaults = () => {
    toast.success("Default booking parameters saved for all new listings!");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
          Host Settings & Payout Preferences
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Configure Algerian banking payouts (CCP / Bank RIB), booking rules, host identity, and communication channels.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-tertiary/60 overflow-x-auto pb-1 mb-8 scrollbar-none">
        {[
          { id: "payouts", label: "Payout Accounts & History", icon: HiOutlineCreditCard },
          { id: "identity", label: "Host Type & Legal Status", icon: HiOutlineOfficeBuilding },
          { id: "defaults", label: "Booking Defaults", icon: HiOutlineAdjustments },
          { id: "notifications", label: "Guest Communication", icon: HiOutlineBell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                  : "border-transparent text-neutral-500 hover:text-primary hover:border-tertiary"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAYOUTS */}
      {activeTab === "payouts" && (
        <div className="space-y-8 animate-in fade-in">
          {/* Active Payout Accounts Card */}
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-tertiary/60 mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary">
                  Algerian Payout Accounts (DZD)
                </h3>
                <p className="text-xs text-neutral-500">
                  Earnings are automatically disbursed in Algerian Dinars (DZD) 24 hours after guest check-in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPayoutOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
              >
                <HiOutlinePlus size={16} />
                <span>Add Payout Method</span>
              </button>
            </div>

            {/* Methods list */}
            <div className="space-y-3">
              {payoutMethods.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-tertiary/60 bg-neutral-50/60 hover:bg-white transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {m.type.includes("CCP") ? "CCP" : "RIB"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary text-sm">{m.type}</span>
                        {m.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Default Payout
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-neutral-600 mt-0.5">
                        {m.details} • {m.holder}
                      </div>
                    </div>
                  </div>

                  <div>
                    {!m.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultPayout(m.id)}
                        className="text-xs font-bold text-secondary hover:text-primary transition"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payout History Table */}
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
            <h3 className="font-serif text-lg font-bold text-primary mb-1">
              Disbursement & Payout History
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              All transfers processed via Algérie Poste CCP or BNA Interbank Clearing.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-start">Date</th>
                    <th className="py-2.5 px-3 text-start">Reference ID</th>
                    <th className="py-2.5 px-3 text-start">Transfer Method</th>
                    <th className="py-2.5 px-3 text-end">Amount (DZD)</th>
                    <th className="py-2.5 px-3 text-end">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40 font-semibold">
                  {[
                    { date: "2026-10-02", id: "PAY-2026-10-02", method: "Algérie Poste CCP", amount: 89725, status: "Transferred" },
                    { date: "2026-09-18", id: "PAY-2026-09-18", method: "Algérie Poste CCP", amount: 62000, status: "Transferred" },
                    { date: "2026-08-25", id: "PAY-2026-08-25", method: "BNA Bank RIB", amount: 106700, status: "Transferred" },
                  ].map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/50">
                      <td className="py-3 px-3 text-neutral-600">{row.date}</td>
                      <td className="py-3 px-3 font-mono text-neutral-400">{row.id}</td>
                      <td className="py-3 px-3 text-primary">{row.method}</td>
                      <td className="py-3 px-3 font-mono font-bold text-primary text-end">
                        {row.amount.toLocaleString()} DZD
                      </td>
                      <td className="py-3 px-3 text-end">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IDENTITY & AGENCY STATUS */}
      {activeTab === "identity" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">
              Hosting Account Type & Verification
            </h3>
            <p className="text-xs text-neutral-500">
              Manage individual host registration or enterprise tourism agency workspace credentials.
            </p>
          </div>

          {/* Current Status Box */}
          <div className="bg-neutral-50 rounded-2xl p-5 border border-tertiary/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center">
                {organization ? <HiOutlineOfficeBuilding size={24} /> : <HiOutlineShieldCheck size={24} />}
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Current Status
                </span>
                <h4 className="font-serif font-black text-primary text-base">
                  {organization ? organization.name : "Individual Certified Host"}
                </h4>
                <div className="text-xs text-neutral-500">
                  {organization
                    ? `Verified Agency • RC: ${organization.businessRegistrationNumber}`
                    : "Individual Algerian National Identity Verified (CNI)"}
                </div>
              </div>
            </div>

            {organization ? (
              <Link
                href="/host/agency/team"
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <HiOutlineUserGroup size={16} />
                <span>Manage Agency Team</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  toast.info("Agency transition requested. Our team will verify your Trade Register (RC).");
                }}
                className="px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary/90 transition self-start sm:self-auto"
              >
                Upgrade to Agency Workspace
              </button>
            )}
          </div>

          <div className="border-t border-tertiary/40 pt-4">
            <h4 className="font-bold text-primary text-sm mb-2">Legal Compliance in Algeria</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Hosting activities on DARNA comply with Algerian tourism and fiscal guidelines.
              Individual hosts are registered under auto-entrepreneur or individual status.
              Agencies must supply their Registre de Commerce (RC) and NIF tax identification.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKING DEFAULTS */}
      {activeTab === "defaults" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">
              Global Booking Parameters
            </h3>
            <p className="text-xs text-neutral-500">
              Set standard rules that apply across your existing and future listings.
            </p>
          </div>

          <div className="space-y-4">
            {/* Instant Book Toggle */}
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-tertiary/60">
              <div>
                <span className="block font-bold text-sm text-primary">Instant Book Default</span>
                <span className="text-xs text-neutral-500">
                  Allows guests who meet requirements to book automatically without waiting for host review.
                </span>
              </div>
              <input
                type="checkbox"
                checked={instantBookDefault}
                onChange={(e) => setInstantBookDefault(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
            </div>

            {/* Advance Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Required Advance Notice
                </label>
                <select
                  value={advanceNotice}
                  onChange={(e) => setAdvanceNotice(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                >
                  <option value="same_day">Same day allowed</option>
                  <option value="1_day">At least 1 day before arrival</option>
                  <option value="2_days">At least 2 days before arrival</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Preparation Time Between Stays
                </label>
                <select
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                >
                  <option value="none">None (same day check-in allowed)</option>
                  <option value="1_night">Block 1 night between reservations</option>
                </select>
              </div>
            </div>

            {/* Check-in / check-out times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Standard Check-in Time
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Standard Check-out Time
                </label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Cancellation Policy */}
            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Default Cancellation Policy
              </label>
              <select
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
              >
                <option value="flexible">Flexible: Full refund 1 day prior to check-in</option>
                <option value="moderate">Moderate: Full refund 5 days prior to check-in</option>
                <option value="strict">Strict: 50% refund up to 7 days prior to check-in</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-tertiary/40 flex justify-end">
            <button
              type="button"
              onClick={handleSaveDefaults}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs"
            >
              Save Parameters
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS & GUEST COMMUNICATION */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">
              Guest Communication & SMS Alerts
            </h3>
            <p className="text-xs text-neutral-500">
              Configure automated check-in welcome notes and mobile notifications for Algerian networks (Mobilis, Djezzy, Ooredoo).
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-tertiary/60">
              <div>
                <span className="block font-bold text-sm text-primary">SMS Booking Alerts</span>
                <span className="text-xs text-neutral-500">
                  Receive instant SMS alerts when a traveler books or cancels on your listing.
                </span>
              </div>
              <input
                type="checkbox"
                checked={smsBookings}
                onChange={(e) => setSmsBookings(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-tertiary/60">
              <div>
                <span className="block font-bold text-sm text-primary">Email Notifications</span>
                <span className="text-xs text-neutral-500">
                  Receive inquiry summaries and weekly earnings digests.
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailInquiries}
                onChange={(e) => setEmailInquiries(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Automated Welcome Message (Sent immediately upon confirmed booking)
              </label>
              <textarea
                rows={4}
                value={autoWelcomeMessage}
                onChange={(e) => setAutoWelcomeMessage(e.target.value)}
                className="w-full p-3 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-tertiary/40 flex justify-end">
            <button
              type="button"
              onClick={() => toast.success("Communication preferences saved!")}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Add Payout Account Modal */}
      {isAddPayoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/60 mb-4">
              <h3 className="font-serif text-lg font-black text-primary">
                Add Algerian Payout Account
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPayoutOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPayout} className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Payout Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CCP", "BNA", "BEA"] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setNewAccountType(ch)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        newAccountType === ch
                          ? "bg-primary text-white border-primary"
                          : "border-tertiary/80 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {newAccountType === "CCP" ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-neutral-600 block mb-1">
                      Account Number (Compte CCP)
                    </label>
                    <input
                      type="text"
                      placeholder="0012345678"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-600 block mb-1">
                      Clé
                    </label>
                    <input
                      type="text"
                      placeholder="45"
                      value={newAccountCle}
                      onChange={(e) => setNewAccountCle(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1">
                    20-Digit Bank RIB Number
                  </label>
                  <input
                    type="text"
                    placeholder="001 00234 1234567890 44"
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddPayoutOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
