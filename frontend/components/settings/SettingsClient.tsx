"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { User } from "@/types";
import {
  BrandUserIcon,
  BrandShieldIcon,
  BrandEyeIcon,
  BrandBellIcon,
  BrandReceiptIcon,
  BrandCreditCardIcon,
  BrandGlobeIcon,
  BrandKeyIcon,
  BrandBriefcaseIcon,
  BrandFilterIcon,
} from "@/components/icons";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { FOCUS_RING } from "./settingsUi";
import PersonalSection from "./PersonalSection";
import SecuritySection from "./SecuritySection";
import NotificationsSection from "./NotificationsSection";
import PaymentsSection from "./PaymentsSection";
import LanguagesSection from "./LanguagesSection";
import {
  BookingPermissionsSection,
  PrivacySection,
  ProHostingSection,
  TaxesSection,
  TravelForWorkSection,
} from "./HostingSections";

interface SettingsClientProps {
  currentUser?: User | null;
}

type SectionId =
  | "personal"
  | "security"
  | "privacy"
  | "notifications"
  | "taxes"
  | "payments"
  | "languages"
  | "booking_permissions"
  | "travel_for_work"
  | "pro_hosting";

const NAV_ITEMS: { id: SectionId; labelKey: string; icon: typeof BrandUserIcon; isNew?: boolean }[] = [
  { id: "personal", labelKey: "nav.personal", icon: BrandUserIcon },
  { id: "security", labelKey: "nav.security", icon: BrandShieldIcon },
  { id: "privacy", labelKey: "nav.privacy", icon: BrandEyeIcon },
  { id: "notifications", labelKey: "nav.notifications", icon: BrandBellIcon },
  { id: "taxes", labelKey: "nav.taxes", icon: BrandReceiptIcon },
  { id: "payments", labelKey: "nav.payments", icon: BrandCreditCardIcon },
  { id: "languages", labelKey: "nav.languages", icon: BrandGlobeIcon },
  { id: "booking_permissions", labelKey: "nav.bookingPermissions", icon: BrandKeyIcon, isNew: true },
  { id: "travel_for_work", labelKey: "nav.travelForWork", icon: BrandBriefcaseIcon },
];

export default function SettingsClient({ currentUser }: SettingsClientProps) {
  const t = useTranslations("settings");

  const [activeSection, setActiveSection] = useState<SectionId>("personal");
  const [isDeactivateAccountOpen, setIsDeactivateAccountOpen] = useState(false);
  const [cardToRemove, setCardToRemove] = useState<string | null>(null);

  const navButtonClass = (isActive: boolean) =>
    `w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition text-start ${FOCUS_RING} ${
      isActive ? "bg-primary text-white shadow-xs" : "text-neutral-700 hover:bg-tertiary/20"
    }`;

  const panelId = (id: SectionId) => `settings-panel-${id}`;

  // Panels stay mounted (hidden when inactive) so unsaved edits survive switching sections.
  const panels: { id: SectionId; node: React.ReactNode }[] = [
    { id: "personal", node: <PersonalSection currentUser={currentUser} /> },
    { id: "security", node: <SecuritySection onDeactivate={() => setIsDeactivateAccountOpen(true)} /> },
    { id: "notifications", node: <NotificationsSection /> },
    { id: "payments", node: <PaymentsSection onRemoveCard={setCardToRemove} /> },
    { id: "languages", node: <LanguagesSection /> },
    { id: "booking_permissions", node: <BookingPermissionsSection /> },
    { id: "taxes", node: <TaxesSection /> },
    { id: "privacy", node: <PrivacySection /> },
    { id: "travel_for_work", node: <TravelForWorkSection /> },
    { id: "pro_hosting", node: <ProHostingSection /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-6">
      <div className="md:col-span-4 lg:col-span-3 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-primary font-serif mb-1">{t("title")}</h1>
          <p className="text-xs text-neutral-600">
            {currentUser?.name || t("member")}
            {currentUser?.email ? ` · ${currentUser.email}` : ""}
          </p>
        </div>

        <nav aria-label={t("navLabel")} className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "true" : undefined}
                aria-controls={panelId(item.id)}
                onClick={() => setActiveSection(item.id)}
                className={navButtonClass(isActive)}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={17} aria-hidden="true" className={isActive ? "text-white" : "text-secondary"} />
                  <span>{t(item.labelKey)}</span>
                </span>
                {item.isNew && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive ? "bg-white/20 text-white" : "bg-accent/15 text-accent-700"
                    }`}
                  >
                    {t("nav.new")}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <nav aria-labelledby="settings-hosting-nav-label" className="pt-4 border-t border-tertiary/50">
          <div
            id="settings-hosting-nav-label"
            className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-2 px-3"
          >
            {t("nav.hostingManagement")}
          </div>
          <button
            type="button"
            aria-current={activeSection === "pro_hosting" ? "true" : undefined}
            aria-controls={panelId("pro_hosting")}
            onClick={() => setActiveSection("pro_hosting")}
            className={navButtonClass(activeSection === "pro_hosting")}
          >
            <span className="flex items-center gap-2.5">
              <BrandFilterIcon
                size={17}
                aria-hidden="true"
                className={activeSection === "pro_hosting" ? "text-white" : "text-secondary"}
              />
              <span>{t("nav.proHosting")}</span>
            </span>
          </button>
        </nav>
      </div>

      <div className="md:col-span-8 lg:col-span-9 bg-white rounded-3xl p-6 sm:p-10 border border-tertiary shadow-sm">
        {panels.map((p) => (
          <div key={p.id} id={panelId(p.id)} hidden={activeSection !== p.id}>
            {p.node}
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={isDeactivateAccountOpen}
        variant="destructive"
        title={t("dialogs.deactivateTitle")}
        message={t("dialogs.deactivateMessage")}
        confirmLabel={t("dialogs.deactivateConfirm")}
        cancelLabel={t("dialogs.deactivateCancel")}
        onConfirm={() => {
          setIsDeactivateAccountOpen(false);
          toast.info(t("dialogs.deactivateSoon"));
        }}
        onCancel={() => setIsDeactivateAccountOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!cardToRemove}
        variant="destructive"
        title={t("dialogs.removeCardTitle")}
        message={cardToRemove ? t("dialogs.removeCardMessage", { card: cardToRemove }) : ""}
        confirmLabel={t("dialogs.removeCardConfirm")}
        cancelLabel={t("dialogs.removeCardCancel")}
        onConfirm={() => {
          setCardToRemove(null);
          toast.success(t("dialogs.cardRemoved"));
        }}
        onCancel={() => setCardToRemove(null)}
      />
    </div>
  );
}
