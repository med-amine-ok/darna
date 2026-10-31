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
  BrandSparklesIcon,
} from "@/components/icons";
import { m } from "framer-motion";
import { Card } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { AccountHeader } from "@/components/profile/AccountShell";
import { spring } from "@/lib/motion";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { FOCUS_RING } from "./settingsUi";
import PersonalSection, { maskEmail } from "./PersonalSection";
import AccessibilitySection from "./AccessibilitySection";
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
  | "accessibility"
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

type NavItem = { id: SectionId; labelKey: string; icon: typeof BrandUserIcon; isNew?: boolean };

const NAV_ITEMS: NavItem[] = [
  { id: "personal", labelKey: "nav.personal", icon: BrandUserIcon },
  { id: "security", labelKey: "nav.security", icon: BrandShieldIcon },
  { id: "privacy", labelKey: "nav.privacy", icon: BrandEyeIcon },
  { id: "notifications", labelKey: "nav.notifications", icon: BrandBellIcon },
  { id: "taxes", labelKey: "nav.taxes", icon: BrandReceiptIcon },
  { id: "payments", labelKey: "nav.payments", icon: BrandCreditCardIcon },
  { id: "languages", labelKey: "nav.languages", icon: BrandGlobeIcon },
  { id: "accessibility", labelKey: "nav.accessibility", icon: BrandSparklesIcon },
  { id: "booking_permissions", labelKey: "nav.bookingPermissions", icon: BrandKeyIcon, isNew: true },
  { id: "travel_for_work", labelKey: "nav.travelForWork", icon: BrandBriefcaseIcon },
];

const HOSTING_ITEM: NavItem = { id: "pro_hosting", labelKey: "nav.proHosting", icon: BrandFilterIcon };

export default function SettingsClient({ currentUser }: SettingsClientProps) {
  const t = useTranslations("settings");

  const [activeSection, setActiveSection] = useState<SectionId>("personal");
  const [isDeactivateAccountOpen, setIsDeactivateAccountOpen] = useState(false);
  const [cardToRemove, setCardToRemove] = useState<string | null>(null);

  const panelId = (id: SectionId) => `settings-panel-${id}`;

  // Panels stay mounted (hidden when inactive) so unsaved edits survive switching sections.
  const panels: { id: SectionId; node: React.ReactNode }[] = [
    { id: "personal", node: <PersonalSection currentUser={currentUser} /> },
    { id: "security", node: <SecuritySection onDeactivate={() => setIsDeactivateAccountOpen(true)} /> },
    { id: "notifications", node: <NotificationsSection /> },
    { id: "payments", node: <PaymentsSection onRemoveCard={setCardToRemove} /> },
    { id: "languages", node: <LanguagesSection /> },
    { id: "accessibility", node: <AccessibilitySection /> },
    { id: "booking_permissions", node: <BookingPermissionsSection /> },
    { id: "taxes", node: <TaxesSection /> },
    { id: "privacy", node: <PrivacySection /> },
    { id: "travel_for_work", node: <TravelForWorkSection /> },
    { id: "pro_hosting", node: <ProHostingSection /> },
  ];

  const select = (id: SectionId) => {
    setActiveSection(id);
    // On phones the nav sits above the panel: bring the panel's title into view.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        document.getElementById(panelId(id))?.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    }
  };

  const navButton = (item: NavItem, layout: "rail" | "pills") => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        type="button"
        aria-current={isActive ? "true" : undefined}
        aria-controls={panelId(item.id)}
        onClick={() => select(item.id)}
        className={
          layout === "rail"
            ? `relative flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-start text-body font-medium transition-colors duration-fast ease-standard ${FOCUS_RING} ${
                isActive ? "text-white" : "text-primary-700 hover:bg-primary/[0.05] hover:text-primary-900"
              }`
            : `relative flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-meta font-semibold transition-colors duration-fast ease-standard ${FOCUS_RING} ${
                isActive ? "text-white" : "bg-white text-primary-700 shadow-e1 hover:text-primary-900"
              }`
        }
      >
        {isActive && (
          <m.span
            layoutId={`settings-nav-active-${layout}`}
            transition={spring.layout}
            aria-hidden="true"
            className={`absolute inset-0 bg-primary-800 shadow-e2 ${layout === "rail" ? "rounded-xl" : "rounded-full"}`}
          />
        )}
        <span className="relative flex min-w-0 items-center gap-2.5">
          <Icon
            size={layout === "rail" ? 18 : 16}
            aria-hidden="true"
            className={`shrink-0 ${isActive ? "text-tertiary-200" : "text-secondary-700"}`}
          />
          <span className={layout === "rail" ? "min-w-0 [text-wrap:balance]" : "whitespace-nowrap"}>{t(item.labelKey)}</span>
        </span>
        {item.isNew && (
          <Badge tone={isActive ? "ink" : "terracotta"} size="sm" className="relative shrink-0">
            {t("nav.new")}
          </Badge>
        )}
      </button>
    );
  };

  const subtitle = [currentUser?.name || t("member"), currentUser?.email ? maskEmail(currentUser.email) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <AccountHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={subtitle} />

      {/* Phones and tablets: horizontally scrolling pills. */}
      <nav aria-label={t("navLabel")} className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 lg:hidden [scrollbar-width:none]">
        <div className="flex w-max gap-2 py-1">{[...NAV_ITEMS, HOSTING_ITEM].map((item) => navButton(item, "pills"))}</div>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <Card padding="sm">
              <nav aria-label={t("navLabel")} className="space-y-0.5">
                {NAV_ITEMS.map((item) => navButton(item, "rail"))}
              </nav>
            </Card>
            <Card padding="sm">
              <nav aria-labelledby="settings-hosting-nav-label">
                <p
                  id="settings-hosting-nav-label"
                  className="px-3.5 pb-2 pt-1 text-eyebrow uppercase font-semibold text-primary-500"
                >
                  {t("nav.hostingManagement")}
                </p>
                {navButton(HOSTING_ITEM, "rail")}
              </nav>
            </Card>
          </div>
        </aside>

        <div className="min-w-0 scroll-mt-28">
          {panels.map((p) => (
            <div
              key={p.id}
              id={panelId(p.id)}
              hidden={activeSection !== p.id}
              className={`scroll-mt-28 ${activeSection === p.id ? "enter-up" : ""}`}
            >
              {p.node}
            </div>
          ))}
        </div>
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
