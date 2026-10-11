"use client";

import React from "react";
import { usePathname } from "@/navigation";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/navbar/BottomNav";
import { User } from "@/types";

interface AppLayoutShellProps {
  children: React.ReactNode;
  currentUser?: User | null;
}

export default function AppLayoutShell({
  children,
  currentUser,
}: AppLayoutShellProps) {
  const pathname = usePathname();
  const normalizedPath = pathname?.replace(/^\/(?:en|fr|ar)(?=\/|$)/, "") || "/";

  const isAdmin = normalizedPath.startsWith("/admin");
  const isHost = normalizedPath.startsWith("/host");
  const isBecomeHost = normalizedPath.startsWith("/become-a-host");
  const isMessages = normalizedPath === "/messages" || normalizedPath.startsWith("/messages/");
  const isHome = normalizedPath === "/" || normalizedPath === "";

  // 1. Admin mode handles its own layout (AdminSidebar + AdminHeader)
  if (isAdmin) {
    return <div className="min-h-[100dvh] flex flex-col">{children}</div>;
  }

  // 2. Host mode handles its own layout (HostNavbar + HostBottomNav)
  if (isHost) {
    return <div className="min-h-[100dvh] flex flex-col">{children}</div>;
  }

  // 3. Become a Host onboarding flow handles its own sticky header and progress bar
  if (isBecomeHost) {
    return <div className="min-h-[100dvh] flex flex-col">{children}</div>;
  }

  // 4. Messages: Compact Navbar at top, NO marketing footer, full viewport app-like layout
  if (isMessages) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-darnaBg">
        <Navbar currentUser={currentUser} isHero={false} />
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>
    );
  }

  // 5. Standard guest pages (Home, Search, Listing Details, Trips, Wishlist, Profile, Reservations, Settings, Help, etc.)
  return (
    <div className="min-h-[100dvh] flex flex-col bg-darnaBg">
      <Navbar currentUser={currentUser} isHero={isHome} />
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
      <BottomNav currentUser={currentUser} />
    </div>
  );
}
