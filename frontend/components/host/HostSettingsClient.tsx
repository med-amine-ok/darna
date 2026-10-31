"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
} from "@/components/icons";
import { toast } from "react-toastify";
import { setBookingApprovalModeAction } from "@/app/actions/host";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogFooter,
  Input,
  RadioGroup,
  SegmentedControl,
  Select,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  cn,
} from "@/components/ui";
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

export default function HostSettingsClient({
  currentUser,
  organization,
}: HostSettingsClientProps) {
  const t = useTranslations("hostSettings");
  const errorText = useActionError();
  const locale = useLocale();
  const baseId = useId();
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
    sms: `${baseId}-sms`,
    email: `${baseId}-email`,
    welcome: `${baseId}-welcome`,
    channelLabel: `${baseId}-channel-label`,
    accountNumber: `${baseId}-account-number`,
    accountKey: `${baseId}-account-key`,
  };

  const tabsId = `host-settings${baseId.replace(/:/g, "")}`;

  const sectionHead = (title: string, description: string, action?: React.ReactNode) => (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-serif text-heading text-primary-900">{title}</h2>
        <p className="mt-1 max-w-xl text-meta text-primary-600 [text-wrap:pretty]">{description}</p>
      </div>
      {action}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="enter-up mb-8">
        <p className="text-eyebrow uppercase text-secondary-700">{t("eyebrow")}</p>
        <h1 className="mt-2 font-serif text-display-md text-primary-900">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-body text-primary-600 [text-wrap:pretty]">{t("subtitle")}</p>
      </header>

      <div className="-mx-4 mb-8 overflow-x-auto scrollbar-none px-4 sm:mx-0 sm:px-0">
        <Tabs
          id={tabsId}
          ariaLabel={t("tabs.ariaLabel")}
          value={activeTab}
          onChange={setActiveTab}
          items={TABS.map(({ id, icon: Icon }) => ({
            value: id,
            label: t(`tabs.${id}`),
            icon: <Icon size={16} aria-hidden="true" />,
          }))}
          className="min-w-max"
        />
      </div>

      {/* Payouts */}
      <TabPanel tabsId={tabsId} value="payouts" active={activeTab} className="space-y-6">
        <Card as="section" padding="lg" radius="3xl">
          {sectionHead(
            t("payouts.title"),
            t("payouts.description"),
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsAddPayoutOpen(true)}
              aria-haspopup="dialog"
              leadingIcon={<BrandPlusIcon size={16} aria-hidden="true" />}
              className="self-start"
            >
              {t("payouts.add")}
            </Button>
          )}
          <ul className="space-y-3">
            {payoutMethods.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 transition-shadow duration-fast ease-standard",
                  m.isDefault ? "bg-secondary-50 ring-1 ring-inset ring-secondary-200" : "bg-darnaBg-300/50"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-meta font-semibold text-primary-800 shadow-e1"
                  >
                    {m.channel === "CCP" ? t("payouts.badgeCcp") : t("payouts.badgeRib")}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-primary-900">
                      {t(`channels.${m.channel}`)}
                      {m.isDefault && (
                        <Badge tone="success" dot>
                          {t("payouts.defaultBadge")}
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-meta tabular-nums text-primary-600">
                      <bdi dir="ltr">{payoutDetails(m)}</bdi>
                      {m.holder && <> · {m.holder}</>}
                    </p>
                  </div>
                </div>
                {!m.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefaultPayout(m.id)}
                    aria-label={t("payouts.setDefaultFor", { method: t(`channels.${m.channel}`) })}
                  >
                    {t("payouts.setDefault")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" padding="lg" radius="3xl">
          {sectionHead(t("history.title"), t("history.description"))}
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-start text-meta">
              <caption className="sr-only">{t("history.title")}</caption>
              <thead className="text-primary-600">
                <tr className="border-b border-primary/[0.08]">
                  <th scope="col" className="px-2 py-2.5 text-start font-semibold">{t("history.colDate")}</th>
                  <th scope="col" className="px-2 py-2.5 text-start font-semibold">{t("history.colReference")}</th>
                  <th scope="col" className="px-2 py-2.5 text-start font-semibold">{t("history.colMethod")}</th>
                  <th scope="col" className="px-2 py-2.5 text-end font-semibold">{t("history.colAmount")}</th>
                  <th scope="col" className="px-2 py-2.5 text-end font-semibold">{t("history.colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/[0.06]">
                {PAYOUT_HISTORY.map((row) => (
                  <tr key={row.id} className="transition-colors duration-fast ease-standard hover:bg-darnaBg/70">
                    <td className="px-2 py-3 tabular-nums text-primary-700">{formatDate(row.date, locale)}</td>
                    <td className="px-2 py-3 tabular-nums text-primary-600">
                      <bdi dir="ltr">{row.id}</bdi>
                    </td>
                    <td className="px-2 py-3 text-primary-800">{t(`channels.${row.channel}`)}</td>
                    <td className="px-2 py-3 text-end font-semibold tabular-nums text-primary-900">
                      {formatDzd(row.amount, locale)}
                    </td>
                    <td className="px-2 py-3 text-end">
                      <Badge tone="success">{t("history.statusTransferred")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </TabPanel>

      {/* Identity */}
      <TabPanel tabsId={tabsId} value="identity" active={activeTab}>
        <Card as="section" padding="lg" radius="3xl" className="space-y-6">
          {sectionHead(t("identity.title"), t("identity.description"))}
          <div className="flex flex-col gap-4 rounded-2xl bg-darnaBg-300/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-100 text-secondary-800">
                {organization ? <BrandBuildingIcon size={24} /> : <BrandShieldIcon size={24} />}
              </span>
              <div className="min-w-0">
                <p className="text-meta text-primary-600">{t("identity.currentStatus")}</p>
                <h3 className="font-serif text-title font-normal text-primary-900">
                  {organization ? organization.name : t("identity.individualHost")}
                </h3>
                <p className="text-meta text-primary-600">
                  {organization
                    ? t("identity.verifiedAgency", { rc: organization.businessRegistrationNumber })
                    : t("identity.individualVerified")}
                </p>
              </div>
            </div>
            {organization ? (
              <Button
                href="/host/agency/team"
                variant="secondary"
                size="md"
                leadingIcon={<BrandUsersIcon size={16} aria-hidden="true" />}
                className="self-start sm:self-auto"
              >
                {t("identity.manageTeam")}
              </Button>
            ) : (
              <Button
                variant="tertiary"
                size="md"
                onClick={() => toast.info(t("toasts.agencyUpgradeRequested"))}
                className="self-start sm:self-auto"
              >
                {t("identity.upgrade")}
              </Button>
            )}
          </div>
          <div className="border-t border-primary/[0.08] pt-5">
            <h3 className="text-title text-primary-900">{t("identity.complianceTitle")}</h3>
            <p className="mt-1.5 text-meta leading-relaxed text-primary-700">{t("identity.complianceBody")}</p>
          </div>
        </Card>
      </TabPanel>

      {/* Booking defaults */}
      <TabPanel tabsId={tabsId} value="defaults" active={activeTab}>
        <Card as="section" padding="lg" radius="3xl" className="space-y-6">
          {sectionHead(t("defaults.title"), t("defaults.description"))}
          <RadioGroup
            legend={t("defaults.approvalModeLabel")}
            name={`${baseId}-approval`}
            value={approvalMode}
            onChange={(v) => setApprovalMode(v as "instant" | "request")}
            appearance="card"
            orientation="horizontal"
            options={[
              {
                value: "instant",
                label: (
                  <span className="flex items-center gap-2">
                    <BrandLightningIcon size={16} aria-hidden="true" className="text-secondary-700" />
                    {t("defaults.instantTitle")}
                  </span>
                ),
                description: t("defaults.instantDesc"),
              },
              {
                value: "request",
                label: (
                  <span className="flex items-center gap-2">
                    <BrandClockIcon size={16} aria-hidden="true" className="text-amber-700" />
                    {t("defaults.requestTitle")}
                  </span>
                ),
                description: t("defaults.requestDesc"),
              },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select id={ids.advanceNotice} label={t("defaults.advanceNoticeLabel")} value={advanceNotice} onChange={(e) => setAdvanceNotice(e.target.value)}>
              <option value="same_day">{t("defaults.advanceSameDay")}</option>
              <option value="1_day">{t("defaults.advanceDays", { count: 1 })}</option>
              <option value="2_days">{t("defaults.advanceDays", { count: 2 })}</option>
            </Select>
            <Select id={ids.prepTime} label={t("defaults.prepTimeLabel")} value={prepTime} onChange={(e) => setPrepTime(e.target.value)}>
              <option value="none">{t("defaults.prepNone")}</option>
              <option value="1_night">{t("defaults.prepOneNight")}</option>
            </Select>
            <Input
              id={ids.checkIn}
              label={t("defaults.checkInLabel")}
              inputMode="numeric"
              dir="ltr"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              prefix={<BrandClockIcon size={16} aria-hidden="true" />}
              className="tabular-nums"
            />
            <Input
              id={ids.checkOut}
              label={t("defaults.checkOutLabel")}
              inputMode="numeric"
              dir="ltr"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              prefix={<BrandClockIcon size={16} aria-hidden="true" />}
              className="tabular-nums"
            />
          </div>
          <Select id={ids.cancellation} label={t("defaults.cancellationLabel")} value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)}>
            <option value="flexible">{t("defaults.cancellationFlexible")}</option>
            <option value="moderate">{t("defaults.cancellationModerate")}</option>
            <option value="strict">{t("defaults.cancellationStrict")}</option>
          </Select>
          <div className="flex justify-end border-t border-primary/[0.08] pt-5">
            <Button variant="primary" size="md" onClick={handleSaveDefaults}>
              {t("defaults.save")}
            </Button>
          </div>
        </Card>
      </TabPanel>

      {/* Notifications */}
      <TabPanel tabsId={tabsId} value="notifications" active={activeTab}>
        <Card as="section" padding="lg" radius="3xl" className="space-y-6">
          {sectionHead(t("notifications.title"), t("notifications.description"))}
          <div className="divide-y divide-primary/[0.08] rounded-2xl bg-darnaBg-300/50 px-4">
            <Switch
              id={ids.sms}
              label={t("notifications.smsTitle")}
              description={t("notifications.smsDesc")}
              checked={smsBookings}
              onCheckedChange={setSmsBookings}
              className="py-4"
            />
            <Switch
              id={ids.email}
              label={t("notifications.emailTitle")}
              description={t("notifications.emailDesc")}
              checked={emailInquiries}
              onCheckedChange={setEmailInquiries}
              className="py-4"
            />
          </div>
          <Textarea
            id={ids.welcome}
            label={t("notifications.welcomeLabel")}
            rows={4}
            value={autoWelcomeMessage}
            onChange={(e) => setAutoWelcomeMessage(e.target.value)}
          />
          <div className="flex justify-end border-t border-primary/[0.08] pt-5">
            <Button variant="primary" size="md" onClick={() => toast.success(t("toasts.communicationSaved"))}>
              {t("notifications.save")}
            </Button>
          </div>
        </Card>
      </TabPanel>

      {/* Add payout account */}
      <Dialog isOpen={isAddPayoutOpen} onClose={closeAddPayout} title={t("addPayout.title")} showClose size="sm">
        <form onSubmit={handleAddPayout} noValidate className="mt-6 space-y-5">
          <div>
            <p id={ids.channelLabel} className="mb-2 text-meta font-semibold text-primary-700">
              {t("addPayout.channelLabel")}
            </p>
            <SegmentedControl
              ariaLabel={t("addPayout.channelLabel")}
              value={newAccountType}
              onChange={setNewAccountType}
              fullWidth
              options={(["CCP", "BNA", "BEA"] as const).map((ch) => ({ value: ch, label: t(`channelsShort.${ch}`) }))}
            />
          </div>
          {newAccountType === "CCP" ? (
            <div className="grid grid-cols-3 gap-2">
              <Input
                id={ids.accountNumber}
                label={t("addPayout.ccpNumberLabel")}
                inputMode="numeric"
                dir="ltr"
                value={newAccountNumber}
                onChange={(e) => setNewAccountNumber(e.target.value)}
                aria-required="true"
                error={accountError ?? undefined}
                containerClassName="col-span-2"
                className="tabular-nums"
              />
              <Input
                id={ids.accountKey}
                label={t("addPayout.ccpKeyLabel")}
                inputMode="numeric"
                dir="ltr"
                value={newAccountCle}
                onChange={(e) => setNewAccountCle(e.target.value)}
                className="tabular-nums"
              />
            </div>
          ) : (
            <Input
              id={ids.accountNumber}
              label={t("addPayout.ribLabel")}
              inputMode="numeric"
              dir="ltr"
              value={newAccountNumber}
              onChange={(e) => setNewAccountNumber(e.target.value)}
              aria-required="true"
              error={accountError ?? undefined}
              className="tabular-nums"
            />
          )}
          <DialogFooter>
            <Button type="button" variant="tertiary" size="md" onClick={closeAddPayout}>
              {t("addPayout.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="md">
              {t("addPayout.save")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
