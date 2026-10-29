"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { PageHelpDrawer } from "./PageHelpDrawer";
import { ProductTour } from "./ProductTour";
import { TrainingModeBanner } from "./TrainingModeBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { MobileBottomNav } from "./MobileBottomNav";
import { AdminSessionProvider, type AdminSessionValue } from "@/components/auth/AdminSessionProvider";

export interface AdminLayoutClientProps {
  children: React.ReactNode;
  currentAdmin: AdminSessionValue;
  approvalsCount?: number;
}

function AdminLayoutInner({ children, currentAdmin, approvalsCount = 0 }: AdminLayoutClientProps) {
  const t = useTranslations("layout");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(false);

  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen((prev) => !prev), []);
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);
  const openTour = useCallback(() => setIsTourOpen(true), []);
  const closeTour = useCallback(() => setIsTourOpen(false), []);

  // Check training mode & initial tour status from localStorage
  useEffect(() => {
    try {
      const training = localStorage.getItem("darna_admin_training_mode");
      if (training === "true") setIsTrainingMode(true);

      const tourDone = localStorage.getItem("darna_admin_tour_completed");
      if (!tourDone) {
        // Trigger tour on first visit after brief settle
        const timer = setTimeout(() => setIsTourOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Global keyboard shortcuts: Cmd/Ctrl+K toggles the command palette, '?' opens help drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (
        e.key === "?" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "") &&
        !target?.isContentEditable
      ) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleTrainingMode = useCallback(() => {
    setIsTrainingMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("darna_admin_training_mode", String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleExitTrainingMode = useCallback(() => {
    setIsTrainingMode(false);
    try {
      localStorage.setItem("darna_admin_training_mode", "false");
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-darnaBg flex flex-col">
      {/* Skip link: first focusable element on every page */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-white focus:text-primary focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
      >
        {t("skipToContent")}
      </a>

      {/* Training Mode Banner */}
      <TrainingModeBanner isActive={isTrainingMode} onExit={handleExitTrainingMode} />

      <div className="flex-1 flex">
        {/* Sidebar (Miller 7±2 compliant) */}
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
          approvalsCount={approvalsCount}
          onOpenHelp={openHelp}
          onStartTour={openTour}
          isTrainingMode={isTrainingMode}
          onToggleTrainingMode={handleToggleTrainingMode}
        />

        {/* Main Content Area: offset by the sidebar on desktop (218px, or 80px when the sidebar is collapsed), full-width on mobile & tablet */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ms-[218px] lg:[aside[data-collapsed=true]+&]:ms-20">
          <Header
            currentUser={currentAdmin}
            onMobileMenuToggle={toggleMobileSidebar}
            onOpenCommandPalette={openCommandPalette}
            approvalsCount={approvalsCount}
            onOpenHelp={openHelp}
            onStartTour={openTour}
            isTrainingMode={isTrainingMode}
            onToggleTrainingMode={handleToggleTrainingMode}
          />

          <main id="main-content" tabIndex={-1} className="flex-1 p-3.5 sm:p-6 pb-24 lg:pb-8 w-full animate-in fade-in focus:outline-none">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation for phones & tablets */}
        <MobileBottomNav onOpenSidebar={openMobileSidebar} approvalsCount={approvalsCount} />

        {/* Command Palette */}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} />

        {/* Page Help Side Drawer */}
        <PageHelpDrawer isOpen={isHelpOpen} onClose={closeHelp} onStartTour={openTour} />

        {/* Guided Product Tour */}
        <ProductTour isOpen={isTourOpen} onClose={closeTour} />
      </div>
    </div>
  );
}

export default function AdminLayoutClient(props: AdminLayoutClientProps) {
  return (
    <AdminSessionProvider admin={props.currentAdmin}>
      <ToastProvider>
        <AdminLayoutInner {...props} />
      </ToastProvider>
    </AdminSessionProvider>
  );
}
