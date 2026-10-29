"use client";

import React, { useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { User, Organization } from "@/types";
import {
  BrandCreditCardIcon,
  BrandBuildingIcon,
  BrandAdjustmentsIcon,
  BrandBellIcon,
  BrandPlusIcon,
  BrandShieldIcon,
  BrandUsersIcon,
  BrandClockIcon,
  BrandLightningIcon,
  BrandCrossIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import { setBookingApprovalModeAction } from "@/app/actions/host";
import Dialog from "@/components/ui/Dialog";
import { formatDate } from "@/lib/i18n/date-locale";
import { formatDzd } from "@/lib/currency";
import { useActionError } from "@/hook/useActionError";

interface HostSettingsClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
}

type TabId = "payouts" | "identity" | "defaults" | "notifications";
type PayoutChannel = "CCP" | "BNA" | "BEA";

interface PayoutMethod {
  id: string;
  channel: PayoutChannel;
  accountNumber: string;
  accountKey?: string;
  holder: string;
  isDefault: boolean;
}

const TABS: { id: TabId; icon: typeof BrandCreditCardIcon }[] = [
  { id: "payouts", icon: BrandCreditCardIcon },
  { id: "identity", icon: BrandBuildingIcon },
  { id: "defaults", icon: BrandAdjustmentsIcon },
  { id: "notifications", icon: BrandBellIcon },
];

const PAYOUT_HISTORY: { date: string; id: string; channel: PayoutChannel; amount: number }[] = [
  { date: "2026-10-02", id: "PAY-2026-10-02", channel: "CCP", amount: 89725 },
  { date: "2026-09-18", id: "PAY-2026-09-18", channel: "CCP", amount: 62000 },
  { date: "2026-08-25", id: "PAY-2026-08-25", channel: "BNA", amount: 106700 },
];

const FIELD_CLASS =
  "w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function HostSettingsClient({
  currentUser,
  organization,
}: HostSettingsClientProps) {
  const t = useTranslations("hostSettings");
  const errorText = useActionError();
  const locale = useLocale();
  const baseId = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    payouts: null,
    identity: null,
    defaults: null,
    notifications: null,
  });
  const [activeTab, setActiveTab] = useState<TabId>("payouts");

  // Payout state
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([
    {
      id: "payout_ccp",
      channel: "CCP",
      accountNumber: "0018492041",
      accountKey: "35",
      holder: currentUser?.name || "",
      isDefault: true,
    },
    {
      id: "payout_bna",
      channel: "BNA",
      accountNumber: "001 00234 1234567890 44",
      holder: currentUser?.name || "",
      isDefault: false,
    },
  ]);

  // Booking default settings
  const [approvalMode, setApprovalMode] = useState<"instant" | "request">(
    currentUser?.bookingApprovalMode || "instant"
  );
  const [advanceNotice, setAdvanceNotice] = useState("1_day");
  const [prepTime, setPrepTime] = useState("none");
  const [checkInTime, setCheckInTime] = useState("15:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [cancellationPolicy, setCancellationPolicy] = useState("flexible");

  // Notification settings
  const [smsBookings, setSmsBookings] = useState(true);
  const [emailInquiries, setEmailInquiries] = useState(true);
  const [autoWelcomeMessage, setAutoWelcomeMessage] = useState(() => t("notifications.welcomeDefault"));

  // Add payout modal
  const [isAddPayoutOpen, setIsAddPayoutOpen] = useState(false);
  const [newAccountType, setNewAccountType] = useState<PayoutChannel>("CCP");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountCle, setNewAccountCle] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);

  const closeAddPayout = () => {
    setIsAddPayoutOpen(false);
    setAccountError(null);
  };

  const handleAddPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountNumber.trim()) {
      setAccountError(t("addPayout.errorRequired"));
      return;
    }
    setAccountError(null);
    const newMethod: PayoutMethod = {
      id: `payout_${Date.now()}`,
      channel: newAccountType,
      accountNumber: newAccountNumber,
      accountKey: newAccountType === "CCP" ? newAccountCle || "00" : undefined,
      holder: currentUser?.name || t("payouts.holderFallback"),
      isDefault: false,
    };
    setPayoutMethods((prev) => [...prev, newMethod]);
    toast.success(t("toasts.payoutAdded"));
    closeAddPayout();
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
    toast.info(t("toasts.defaultPayoutUpdated"));
  };

  const handleSaveDefaults = async () => {
    const result = await setBookingApprovalModeAction(approvalMode);
    if (!result.ok) {
      toast.error(errorText(result));
      return;
    }
    toast.success(t("toasts.defaultsSaved"));
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const isRtl = locale === "ar";
    let next: number | null = null;
    if (e.key === "ArrowRight") next = isRtl ? index - 1 : index + 1;
    else if (e.key === "ArrowLeft") next = isRtl ? index + 1 : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const target = TABS[(next + TABS.length) % TABS.length].id;
    setActiveTab(target);
    tabRefs.current[target]?.focus();
  };

  const tabId = (id: TabId) => `${baseId}-tab-${id}`;
  const panelId = (id: TabId) => `${baseId}-panel-${id}`;

  const payoutDetails = (m: PayoutMethod) =>
    m.channel === "CCP"
      ? t("payouts.ccpDetails", { number: m.accountNumber, key: m.accountKey || "00" })
      : t("payouts.ribDetails", { number: m.accountNumber });

  const ids = {
    advanceNotice: `${baseId}-advance-notice`,
    prepTime: `${baseId}-prep-time`,
    checkIn: `${baseId}-check-in`,
    checkOut: `${baseId}-check-out`,
    cancellation: `${baseId}-cancellation`,
    approvalLabel: `${baseId}-approval-label`,
    sms: `${baseId}-sms`,
    smsDesc: `${baseId}-sms-desc`,
    email: `${baseId}-email`,
    emailDesc: `${baseId}-email-desc`,
    welcome: `${baseId}-welcome`,
    channelLabel: `${baseId}-channel-label`,
    accountNumber: `${baseId}-account-number`,
    accountKey: `${baseId}-account-key`,
    accountError: `${baseId}-account-error`,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">{t("title")}</h1>
        <p className="text-sm text-neutral-600 mt-1">{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t("tabs.ariaLabel")}
        className="flex items-center gap-2 border-b border-tertiary/60 overflow-x-auto pb-1 mb-8 scrollbar-none"
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={isActive}
              aria-controls={panelId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${FOCUS_RING} ${
                isActive
                  ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                  : "border-transparent text-neutral-600 hover:text-primary hover:border-tertiary"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{t(`tabs.${tab.id}`)}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAYOUTS */}
      {activeTab === "payouts" && (
        <div
          role="tabpanel"
          id={panelId("payouts")}
          aria-labelledby={tabId("payouts")}
          className="space-y-8 animate-in fade-in"
        >
          {/* Active Payout Accounts Card */}
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-tertiary/60 mb-6">
              <div>
                <h2 className="font-serif text-lg font-bold text-primary">{t("payouts.title")}</h2>
                <p className="text-xs text-neutral-600">{t("payouts.description")}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPayoutOpen(true)}
                aria-haspopup="dialog"
                className={`px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto ${FOCUS_RING}`}
              >
                <BrandPlusIcon size={16} aria-hidden="true" />
                <span>{t("payouts.add")}</span>
              </button>
            </div>

            {/* Methods list */}
            <ul className="space-y-3">
              {payoutMethods.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-tertiary/60 bg-neutral-50/60 hover:bg-white transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm"
                    >
                      {m.channel === "CCP" ? t("payouts.badgeCcp") : t("payouts.badgeRib")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary text-sm">{t(`channels.${m.channel}`)}</span>
                        {m.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {t("payouts.defaultBadge")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-neutral-600 mt-0.5">
                        <bdi dir="ltr">{payoutDetails(m)}</bdi>
                        {m.holder && <> • {m.holder}</>}
                      </div>
                    </div>
                  </div>

                  <div>
                    {!m.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultPayout(m.id)}
                        aria-label={t("payouts.setDefaultFor", { method: t(`channels.${m.channel}`) })}
                        className={`text-xs font-bold text-secondary hover:text-primary transition rounded ${FOCUS_RING}`}
                      >
                        {t("payouts.setDefault")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent Payout History Table */}
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-primary mb-1">{t("history.title")}</h2>
            <p className="text-xs text-neutral-600 mb-4">{t("history.description")}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <caption className="sr-only">{t("history.title")}</caption>
                <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 text-start">{t("history.colDate")}</th>
                    <th scope="col" className="py-2.5 px-3 text-start">{t("history.colReference")}</th>
                    <th scope="col" className="py-2.5 px-3 text-start">{t("history.colMethod")}</th>
                    <th scope="col" className="py-2.5 px-3 text-end">{t("history.colAmount")}</th>
                    <th scope="col" className="py-2.5 px-3 text-end">{t("history.colStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40 font-semibold">
                  {PAYOUT_HISTORY.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/50">
                      <td className="py-3 px-3 text-neutral-600">{formatDate(row.date, locale)}</td>
                      <td className="py-3 px-3 font-mono text-neutral-600">
                        <bdi dir="ltr">{row.id}</bdi>
                      </td>
                      <td className="py-3 px-3 text-primary">{t(`channels.${row.channel}`)}</td>
                      <td className="py-3 px-3 font-mono font-bold text-primary text-end">
                        {formatDzd(row.amount, locale)}
                      </td>
                      <td className="py-3 px-3 text-end">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t("history.statusTransferred")}
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
        <div
          role="tabpanel"
          id={panelId("identity")}
          aria-labelledby={tabId("identity")}
          className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in"
        >
          <div>
            <h2 className="font-serif text-lg font-bold text-primary">{t("identity.title")}</h2>
            <p className="text-xs text-neutral-600">{t("identity.description")}</p>
          </div>

          {/* Current Status Box */}
          <div className="bg-neutral-50 rounded-2xl p-5 border border-tertiary/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center"
              >
                {organization ? <BrandBuildingIcon size={24} /> : <BrandShieldIcon size={24} />}
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                  {t("identity.currentStatus")}
                </span>
                <h3 className="font-serif font-black text-primary text-base">
                  {organization ? organization.name : t("identity.individualHost")}
                </h3>
                <div className="text-xs text-neutral-600">
                  {organization
                    ? t("identity.verifiedAgency", { rc: organization.businessRegistrationNumber })
                    : t("identity.individualVerified")}
                </div>
              </div>
            </div>

            {organization ? (
              <Link
                href="/host/agency/team"
                className={`px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 self-start sm:self-auto ${FOCUS_RING}`}
              >
                <BrandUsersIcon size={16} aria-hidden="true" />
                <span>{t("identity.manageTeam")}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  toast.info(t("toasts.agencyUpgradeRequested"));
                }}
                className={`px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary/90 transition self-start sm:self-auto ${FOCUS_RING}`}
              >
                {t("identity.upgrade")}
              </button>
            )}
          </div>

          <div className="border-t border-tertiary/40 pt-4">
            <h3 className="font-bold text-primary text-sm mb-2">{t("identity.complianceTitle")}</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{t("identity.complianceBody")}</p>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKING DEFAULTS */}
      {activeTab === "defaults" && (
        <div
          role="tabpanel"
          id={panelId("defaults")}
          aria-labelledby={tabId("defaults")}
          className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in"
        >
          <div>
            <h2 className="font-serif text-lg font-bold text-primary">{t("defaults.title")}</h2>
            <p className="text-xs text-neutral-600">{t("defaults.description")}</p>
          </div>

          <div className="space-y-4">
            {/* Booking Approval Mode 2-Card Selector */}
            <div className="space-y-2" role="group" aria-labelledby={ids.approvalLabel}>
              <span id={ids.approvalLabel} className="text-xs font-bold text-neutral-700 block">
                {t("defaults.approvalModeLabel")}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={approvalMode === "instant"}
                  onClick={() => setApprovalMode("instant")}
                  className={`p-4 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer ${FOCUS_RING} ${
                    approvalMode === "instant"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-tertiary/70 bg-neutral-50 hover:bg-neutral-100/60"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      approvalMode === "instant" ? "bg-primary text-white" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    <BrandLightningIcon size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-primary block">{t("defaults.instantTitle")}</span>
                    <span className="text-[11px] text-neutral-600 leading-snug block mt-0.5">
                      {t("defaults.instantDesc")}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={approvalMode === "request"}
                  onClick={() => setApprovalMode("request")}
                  className={`p-4 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer ${FOCUS_RING} ${
                    approvalMode === "request"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-tertiary/70 bg-neutral-50 hover:bg-neutral-100/60"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      approvalMode === "request" ? "bg-amber-700 text-white" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    <BrandClockIcon size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-primary block">{t("defaults.requestTitle")}</span>
                    <span className="text-[11px] text-neutral-600 leading-snug block mt-0.5">
                      {t("defaults.requestDesc")}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Advance Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={ids.advanceNotice} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("defaults.advanceNoticeLabel")}
                </label>
                <select
                  id={ids.advanceNotice}
                  value={advanceNotice}
                  onChange={(e) => setAdvanceNotice(e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="same_day">{t("defaults.advanceSameDay")}</option>
                  <option value="1_day">{t("defaults.advanceDays", { count: 1 })}</option>
                  <option value="2_days">{t("defaults.advanceDays", { count: 2 })}</option>
                </select>
              </div>

              <div>
                <label htmlFor={ids.prepTime} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("defaults.prepTimeLabel")}
                </label>
                <select
                  id={ids.prepTime}
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="none">{t("defaults.prepNone")}</option>
                  <option value="1_night">{t("defaults.prepOneNight")}</option>
                </select>
              </div>
            </div>

            {/* Check-in / check-out times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={ids.checkIn} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("defaults.checkInLabel")}
                </label>
                <input
                  id={ids.checkIn}
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className={`${FIELD_CLASS} text-start`}
                />
              </div>

              <div>
                <label htmlFor={ids.checkOut} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("defaults.checkOutLabel")}
                </label>
                <input
                  id={ids.checkOut}
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className={`${FIELD_CLASS} text-start`}
                />
              </div>
            </div>

            {/* Cancellation Policy */}
            <div>
              <label htmlFor={ids.cancellation} className="text-xs font-bold text-neutral-600 block mb-1">
                {t("defaults.cancellationLabel")}
              </label>
              <select
                id={ids.cancellation}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="flexible">{t("defaults.cancellationFlexible")}</option>
                <option value="moderate">{t("defaults.cancellationModerate")}</option>
                <option value="strict">{t("defaults.cancellationStrict")}</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-tertiary/40 flex justify-end">
            <button
              type="button"
              onClick={handleSaveDefaults}
              className={`px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs ${FOCUS_RING}`}
            >
              {t("defaults.save")}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS & GUEST COMMUNICATION */}
      {activeTab === "notifications" && (
        <div
          role="tabpanel"
          id={panelId("notifications")}
          aria-labelledby={tabId("notifications")}
          className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 animate-in fade-in"
        >
          <div>
            <h2 className="font-serif text-lg font-bold text-primary">{t("notifications.title")}</h2>
            <p className="text-xs text-neutral-600">{t("notifications.description")}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 bg-neutral-50 rounded-2xl border border-tertiary/60">
              <div>
                <label htmlFor={ids.sms} className="block font-bold text-sm text-primary cursor-pointer">
                  {t("notifications.smsTitle")}
                </label>
                <span id={ids.smsDesc} className="text-xs text-neutral-600">
                  {t("notifications.smsDesc")}
                </span>
              </div>
              <input
                id={ids.sms}
                type="checkbox"
                role="switch"
                aria-checked={smsBookings}
                aria-describedby={ids.smsDesc}
                checked={smsBookings}
                onChange={(e) => setSmsBookings(e.target.checked)}
                className="w-5 h-5 shrink-0 text-primary rounded focus:ring-primary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 bg-neutral-50 rounded-2xl border border-tertiary/60">
              <div>
                <label htmlFor={ids.email} className="block font-bold text-sm text-primary cursor-pointer">
                  {t("notifications.emailTitle")}
                </label>
                <span id={ids.emailDesc} className="text-xs text-neutral-600">
                  {t("notifications.emailDesc")}
                </span>
              </div>
              <input
                id={ids.email}
                type="checkbox"
                role="switch"
                aria-checked={emailInquiries}
                aria-describedby={ids.emailDesc}
                checked={emailInquiries}
                onChange={(e) => setEmailInquiries(e.target.checked)}
                className="w-5 h-5 shrink-0 text-primary rounded focus:ring-primary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor={ids.welcome} className="text-xs font-bold text-neutral-600 block mb-1">
                {t("notifications.welcomeLabel")}
              </label>
              <textarea
                id={ids.welcome}
                rows={4}
                value={autoWelcomeMessage}
                onChange={(e) => setAutoWelcomeMessage(e.target.value)}
                className={`${FIELD_CLASS} p-3 leading-relaxed`}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-tertiary/40 flex justify-end">
            <button
              type="button"
              onClick={() => toast.success(t("toasts.communicationSaved"))}
              className={`px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs ${FOCUS_RING}`}
            >
              {t("notifications.save")}
            </button>
          </div>
        </div>
      )}

      {/* Add Payout Account Modal */}
      <Dialog
        isOpen={isAddPayoutOpen}
        onClose={closeAddPayout}
        title={t("addPayout.title")}
        titleClassName="font-serif text-lg font-black text-primary pe-10 pb-3 border-b border-tertiary/60 mb-4"
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-tertiary shadow-2xl p-6 sm:p-8 max-h-[92dvh] overflow-y-auto animate-in fade-in zoom-in-95"
      >
        <button
          type="button"
          onClick={closeAddPayout}
          className={`absolute top-6 end-6 sm:top-8 sm:end-8 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition ${FOCUS_RING}`}
          aria-label={t("addPayout.close")}
        >
          <BrandCrossIcon size={16} aria-hidden="true" />
        </button>

        <form onSubmit={handleAddPayout} noValidate className="space-y-4">
          <div role="group" aria-labelledby={ids.channelLabel}>
            <span id={ids.channelLabel} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("addPayout.channelLabel")}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["CCP", "BNA", "BEA"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  aria-pressed={newAccountType === ch}
                  aria-label={t(`channels.${ch}`)}
                  onClick={() => setNewAccountType(ch)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${FOCUS_RING} ${
                    newAccountType === ch
                      ? "bg-primary text-white border-primary"
                      : "border-tertiary/80 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {t(`channelsShort.${ch}`)}
                </button>
              ))}
            </div>
          </div>

          {newAccountType === "CCP" ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label htmlFor={ids.accountNumber} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("addPayout.ccpNumberLabel")}
                </label>
                <input
                  id={ids.accountNumber}
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="0012345678"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  aria-required="true"
                  aria-invalid={accountError ? true : undefined}
                  aria-describedby={accountError ? ids.accountError : undefined}
                  className={`${FIELD_CLASS} font-mono font-bold text-start`}
                />
              </div>
              <div>
                <label htmlFor={ids.accountKey} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("addPayout.ccpKeyLabel")}
                </label>
                <input
                  id={ids.accountKey}
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="45"
                  value={newAccountCle}
                  onChange={(e) => setNewAccountCle(e.target.value)}
                  className={`${FIELD_CLASS} font-mono font-bold text-start`}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor={ids.accountNumber} className="text-xs font-bold text-neutral-600 block mb-1">
                {t("addPayout.ribLabel")}
              </label>
              <input
                id={ids.accountNumber}
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="001 00234 1234567890 44"
                value={newAccountNumber}
                onChange={(e) => setNewAccountNumber(e.target.value)}
                aria-required="true"
                aria-invalid={accountError ? true : undefined}
                aria-describedby={accountError ? ids.accountError : undefined}
                className={`${FIELD_CLASS} font-mono font-bold text-start`}
              />
            </div>
          )}

          {accountError && (
            <p id={ids.accountError} role="alert" className="text-xs font-semibold text-status-error">
              {accountError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeAddPayout}
              className={`px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition ${FOCUS_RING}`}
            >
              {t("addPayout.cancel")}
            </button>
            <button
              type="submit"
              className={`px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs ${FOCUS_RING}`}
            >
              {t("addPayout.save")}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
