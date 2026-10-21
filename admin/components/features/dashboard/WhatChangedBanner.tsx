"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { useLocale } from "next-intl";
import { Info, ArrowRight, X } from "lucide-react";

export const WhatChangedBanner: React.FC = () => {
  const locale = useLocale() as "en" | "fr" | "ar";
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
      aria-label={
        locale === "fr"
          ? "Information sur les nouveautés de l'interface"
          : locale === "ar"
          ? "تنبيه حول تحديثات الواجهة"
          : "Interface update announcement"
      }
      className="p-3.5 sm:p-4 rounded-2xl bg-secondary/10 border border-secondary/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-start animate-in fade-in"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0 text-secondary">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-primary block">
            {locale === "fr"
              ? "Nouveau : Une navigation simplifiée en 7 rubriques clés"
              : locale === "ar"
              ? "تحديث: تم تبسيط القائمة الرئيسية لتشمل 7 أقسام أساسية فقط"
              : "What changed? Navigation simplified to 7 core items"}
          </span>
          <p className="text-[11px] text-neutral-600 mt-0.5">
            {locale === "fr"
              ? "Moins d'options, plus de rapidité : toutes les pages secondaires sont regroupées sous « Gérer »."
              : locale === "ar"
              ? "خيارات أوضح وسرعة أكبر: تم تنظيم الصفحات الإضافية تحت تبويب 'إدارة'."
              : "Fewer choices, faster workflow: secondary features are organized cleanly under 'Manage'."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
        <Link
          href="/where-did-it-go"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition underline"
        >
          <span>
            {locale === "fr"
              ? "Où est passée mon ancienne page ?"
              : locale === "ar"
              ? "دليل الانتقال: أين ذهبت صفحتي السابقة؟"
              : "Where did it go? Guide"}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-neutral-400 hover:text-neutral-700 transition p-1 rounded-lg"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
