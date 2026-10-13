"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("darna_admin_sidebar_collapsed");
      if (saved) setCollapsed(saved === "true");
    } catch (e) {}
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("darna_admin_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F6EE]/60 flex flex-col">
      <AdminSidebar
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div
        className={`flex-1 ${
          collapsed ? "md:ps-20" : "md:ps-64"
        } transition-all duration-300 flex flex-col`}
      >
        <AdminHeader onMobileMenuToggle={() => setIsMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
