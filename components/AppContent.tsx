"use client";

import { usePathname } from "@/navigation";
import React from "react";

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isHome = pathname === "/";

  const isLogin = pathname?.endsWith("/login");

  if (isAdmin) {
    return <main className="min-h-screen bg-neutral-50 text-neutral-900">{children}</main>;
  }

  if (isLogin || pathname?.startsWith("/become-a-host")) {
    return <main className="min-h-screen w-full bg-white">{children}</main>;
  }

  if (pathname?.startsWith("/messages")) {
    return (
      <main className="fixed inset-x-0 bottom-0 top-[112px] md:top-[80px] flex flex-col overflow-hidden bg-white z-10">
        {children}
      </main>
    );
  }

  return (
    <div
      className={`min-h-[calc(100vh-280px)] ${
        isHome ? "pt-0 pb-16" : "pt-20 sm:pt-24 pb-24 md:pb-16"
      }`}
    >
      {children}
    </div>
  );
}
