"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HostAccountSummary, Organization, User } from "@/types";
import {
  BrandAdjustmentsIcon,
  BrandBellIcon,
  BrandBuildingIcon,
  BrandClockIcon,
  BrandCreditCardIcon,
  BrandLightningIcon,
  BrandShieldIcon,
  BrandUsersIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import { setBookingApprovalModeAction } from "@/app/actions/host";
import { Badge, Banner, Button, Card, RadioGroup, TabPanel, Tabs } from "@/components/ui";
import { formatDate } from "@/lib/i18n/date-locale";
import { useActionError } from "@/hook/useActionError";

interface HostSettingsClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
  /** GET /host/account; null when the API could not be read. */
  account: HostAccountSummary | null;
}

type TabId = "identity" | "defaults" | "payouts" | "notifications";

const TABS: { id: TabId; icon: typeof BrandCreditCardIcon }[] = [
  { id: "identity", icon: BrandBuildingIcon },
  { id: "defaults", icon: BrandAdjustmentsIcon },
  { id: "payouts", icon: BrandCreditCardIcon },
  { id: "notifications", icon: BrandBellIcon },
];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "sand"> = {
  approved: "success",
  applied: "sand",
  under_review: "warning",
  changes_requested: "warning",
  rejected: "danger",
  suspended: "danger",
  banned: "danger",
};

const DOC_TONE: Record<string, "success" | "warning" | "danger" | "sand"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  missing: "sand",
};

export default function HostSettingsClient({ organization, account }: HostSettingsClientProps) {
  const t = useTranslations("hostSettings");
  const errorText = useActionError();
  const locale = useLocale();
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<TabId>("identity");
  const [approvalMode, setApprovalMode] = useState<"instant" | "request">(account?.defaultApprovalMode ?? "instant");
  const [saving, setSaving] = useState(false);

  const handleSaveDefaults = async () => {
    setSaving(true);
    try {
      const result = await setBookingApprovalModeAction(approvalMode);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      toast.success(t("toasts.defaultsSaved"));
    } catch {
      toast.error(t("account.loadFailed"));
    } finally {
      setSaving(false);
    }
  };

  const tabsId = `host-settings${baseId.replace(/:/g, "")}`;
  const status = account?.verificationStatus ?? "";
  const STATUSES = ["applied", "under_review", "changes_requested", "approved", "rejected", "suspended", "banned"];
  const DOCS = [
    "national_id", "passport", "property_proof", "commercial_register", "tax_card_nif", "statistics_nis",
    "tourism_licence", "hotel_classification", "operating_authorisation", "vehicle_registration", "vehicle_insurance", "other",
  ];
  const statusLabel = (value: string) => (STATUSES.includes(value) ? t(`account.status.${value}`) : value);
  const docLabel = (value: string) => (DOCS.includes(value) ? t(`account.docs.${value}`) : value.replace(/_/g, " "));

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

      {!account && (
        <div className="mb-6">
          <Banner tone="danger">{t("account.loadFailed")}</Banner>
        </div>
      )}

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

      {/* Host account and verification (GET /host/account) */}
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
                  {organization ? organization.name : account?.displayName || t("identity.individualHost")}
                </h3>
                {account && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[status] ?? "sand"}>{statusLabel(status)}</Badge>
                    {account.approvedAt ? (
                      <span className="text-meta text-primary-600">
                        {t("account.approvedOn", { date: formatDate(account.approvedAt, locale) })}
                      </span>
                    ) : account.submittedAt ? (
                      <span className="text-meta text-primary-600">
                        {t("account.submittedOn", { date: formatDate(account.submittedAt, locale) })}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            {organization && (
              <Button
                href="/host/agency/team"
                variant="secondary"
                size="md"
                leadingIcon={<BrandUsersIcon size={16} aria-hidden="true" />}
                className="self-start sm:self-auto"
              >
                {t("identity.manageTeam")}
              </Button>
            )}
          </div>

          {account && account.requiredDocuments.length > 0 && (
            <div>
              <h3 className="text-title text-primary-900">{t("account.documentsTitle")}</h3>
              <p className="mt-1 text-meta text-primary-600">{t("account.documentsHelp")}</p>
              <ul className="mt-3 divide-y divide-primary/[0.08] rounded-2xl bg-darnaBg-300/50 px-4">
                {account.requiredDocuments.map((doc) => (
                  <li key={doc.docType} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-body text-primary-800">{docLabel(doc.docType)}</span>
                    <Badge tone={DOC_TONE[doc.status] ?? "sand"}>{t(`account.docStatus.${doc.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-primary/[0.08] pt-5">
            <h3 className="text-title text-primary-900">{t("identity.complianceTitle")}</h3>
            <p className="mt-1.5 text-meta leading-relaxed text-primary-700">{t("identity.complianceBody")}</p>
          </div>
        </Card>
      </TabPanel>

      {/* Default booking approval mode (PATCH /host/account) */}
      <TabPanel tabsId={tabsId} value="defaults" active={activeTab}>
        <Card as="section" padding="lg" radius="3xl" className="space-y-6">
          {sectionHead(t("defaults.title"), t("account.defaultsDescription"))}
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
          <p className="text-meta text-primary-600">{t("account.perListing")}</p>
          {account && (
            <p className="text-meta text-primary-700">
              {t("account.commission", { rate: account.commissionPercent.toLocaleString(locale) })}
            </p>
          )}
          <div className="flex justify-end border-t border-primary/[0.08] pt-5">
            <Button variant="primary" size="md" loading={saving} disabled={!account || !account.canEdit} onClick={handleSaveDefaults}>
              {t("defaults.save")}
            </Button>
          </div>
        </Card>
      </TabPanel>

      {/* Payouts are switched off on the platform (DEC-019). */}
      <TabPanel tabsId={tabsId} value="payouts" active={activeTab}>
        <Card as="section" padding="lg" radius="3xl">
          {sectionHead(t("payouts.title"), t("account.payoutsOff"))}
          <Badge tone="sand">{t("account.unavailable")}</Badge>
        </Card>
      </TabPanel>

      {/* Notification switches live with the account (GET / PUT /me/notification-preferences). */}
      <TabPanel tabsId={tabsId} value="notifications" active={activeTab}>
        <Card as="section" padding="lg" radius="3xl" className="space-y-4">
          {sectionHead(t("notifications.title"), t("account.notificationsHelp"))}
          <Button href="/notifications" variant="secondary" size="md">
            {t("account.notificationsLink")}
          </Button>
        </Card>
      </TabPanel>
    </div>
  );
}
