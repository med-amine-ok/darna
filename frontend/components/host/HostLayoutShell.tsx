"use client";

import React from "react";
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

  // 2. Standard host pages (Today, Listings, Bookings, Calendar, Settings, Team, Trips)
  return (
    <div className="min-h-screen bg-bg-light/40 flex flex-col">
      <HostNavbar currentUser={currentUser} organization={organization} />
      <main className="flex-1 pb-20 md:pb-12">{children}</main>
      <HostBottomNav hostType={hostType} />
    </div>
  );
}
