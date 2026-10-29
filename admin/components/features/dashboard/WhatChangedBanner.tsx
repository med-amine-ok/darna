"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { Info, ArrowRight, X } from "lucide-react";

export const WhatChangedBanner: React.FC = () => {
  const t = useTranslations("dashboard.whatChanged");
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("darna_admin_what_changed_dismissed");
      if (!dismissed) {
        setIsDismissed(false);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("darna_admin_what_changed_dismissed", "true");
    } catch {}
  };

  if (isDismissed) return null;

  return (
    <aside
      aria-label={t("ariaLabel")}
      className="p-3.5 sm:p-4 rounded-2xl bg-secondary/10 border border-secondary/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-start animate-in fade-in"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0 text-secondary">
          <Info className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <span className="text-xs font-bold text-primary block">{t("title")}</span>
          <p className="text-[11px] text-neutral-600 mt-0.5">{t("description")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
        <Link
          href="/where-did-it-go"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-neutral-900 transition underline"
        >
          <span>{t("guideLink")}</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-neutral-500 hover:text-neutral-700 transition p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          aria-label={t("dismiss")}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
