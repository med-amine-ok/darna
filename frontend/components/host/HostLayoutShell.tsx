"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/navigation";
import HostNavbar from "@/components/host/HostNavbar";
import HostBottomNav from "@/components/host/HostBottomNav";
import { User, Organization } from "@/types";

interface HostLayoutShellProps {
  children: React.ReactNode;
  currentUser: User | null;
  organization: Organization | null;
  hostType?: "individual" | "agency" | "hotel" | "hostel" | null;
}

export default function HostLayoutShell({
  children,
  currentUser,
  organization,
  hostType,
}: HostLayoutShellProps) {
  const t = useTranslations("hostNav");
  const pathname = usePathname();
  const isMessages = pathname?.includes("/host/messages");

  // 1. Host Messages: Full-screen app experience (like Slack/WhatsApp/Airbnb)
  // Takes 100% viewport height, NO outer page gutters or padding, NO mobile bottom nav conflict
  if (isMessages) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-white">
        <HostNavbar currentUser={currentUser} organization={organization} />
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 w-full">
          {children}
        </main>
      </div>
    );
  }

  // New organizations can use the workspace while DARNA reviews their documents.
  const rejected = organization?.verificationStatus === "rejected";
  const verificationBanner =
    organization && organization.verificationStatus !== "verified" ? (
      <div
        role="status"
        className={`border-b border-primary/[0.06] ${rejected ? "bg-accent-50" : "bg-amber-50"}`}
      >
        <p
          className={`mx-auto flex max-w-7xl items-start gap-2.5 px-4 py-2.5 text-meta font-medium sm:px-6 lg:px-8 ${
            rejected ? "text-accent-800" : "text-amber-900"
          }`}
        >
          <span
            aria-hidden="true"
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${rejected ? "bg-accent-600" : "bg-amber-600"}`}
          />
          <span className="min-w-0">
            {rejected
              ? t("verificationRejected", { name: organization.name })
              : t("verificationPending", { name: organization.name })}
          </span>
        </p>
      </div>
    ) : null;

  // 2. Standard host pages (Today, Listings, Bookings, Calendar, Settings, Team, Trips)
  return (
    <div className="flex min-h-[100dvh] flex-col bg-darnaBg">
      <HostNavbar currentUser={currentUser} organization={organization} />
      {verificationBanner}
      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">{children}</main>
      <HostBottomNav hostType={hostType} />
    </div>
  );
}
