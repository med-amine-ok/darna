"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { PageHelpDrawer } from "./PageHelpDrawer";
import { ProductTour } from "./ProductTour";
import { TrainingModeBanner } from "./TrainingModeBanner";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { SessionPayload } from "@/lib/auth/session";

export interface AdminLayoutClientProps {
  children: React.ReactNode;
  currentUser?: SessionPayload | null;
  approvalsCount?: number;
}

function AdminLayoutInner({
  children,
  currentUser,
  approvalsCount = 0,
}: AdminLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(false);

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

  // Global keyboard shortcuts: '?' opens help drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleTrainingMode = () => {
    const next = !isTrainingMode;
    setIsTrainingMode(next);
    try {
      localStorage.setItem("darna_admin_training_mode", String(next));
    } catch {}
  };

  const handleExitTrainingMode = () => {
    setIsTrainingMode(false);
    try {
      localStorage.setItem("darna_admin_training_mode", "false");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-darnaBg flex flex-col">
      {/* Training Mode Banner */}
      <TrainingModeBanner
        isActive={isTrainingMode}
        onExit={handleExitTrainingMode}
      />

      <div className="flex-1 flex">
        {/* Sidebar (Miller 7±2 compliant) */}
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          approvalsCount={approvalsCount}
          onOpenHelp={() => setIsHelpOpen(true)}
          onStartTour={() => setIsTourOpen(true)}
          isTrainingMode={isTrainingMode}
          onToggleTrainingMode={handleToggleTrainingMode}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:ms-64 [aside.w-20_+_&]:md:ms-20">
          <Header
            currentUser={currentUser}
            onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            approvalsCount={approvalsCount}
            onOpenHelp={() => setIsHelpOpen(true)}
            onStartTour={() => setIsTourOpen(true)}
            isTrainingMode={isTrainingMode}
            onToggleTrainingMode={handleToggleTrainingMode}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in">
            {children}
          </main>
        </div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />

        {/* Page Help Side Drawer */}
        <PageHelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          onStartTour={() => setIsTourOpen(true)}
        />

        {/* Guided Product Tour */}
        <ProductTour
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
        />
      </div>
    </div>
  );
}

export default function AdminLayoutClient(props: AdminLayoutClientProps) {
  return (
    <ToastProvider>
      <AdminLayoutInner {...props} />
    </ToastProvider>
  );
}
