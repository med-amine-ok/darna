"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { useLocale } from "next-intl";
import {
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Home,
  Users,
  Wallet,
  Globe,
} from "lucide-react";

export interface GettingStartedChecklistProps {
  onDismiss?: () => void;
}

interface ChecklistItem {
  id: string;
  title: { en: string; fr: string; ar: string };
  desc: { en: string; fr: string; ar: string };
  href: string;
  icon: React.ElementType;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "review_host",
    title: {
      en: "Review a waiting host application",
      fr: "Examiner un dossier d'hôte en attente",
      ar: "مراجعة طلب انضمام مضيف جديد",
    },
    desc: {
      en: "Inspect national ID and tourism documents in the approvals inbox.",
      fr: "Vérifiez la pièce d'identité et les documents dans la boîte de validation.",
      ar: "فحص بطاقة الهوية والوثائق في صندوق المراجعة.",
    },
    href: "/approvals?tab=hosts",
    icon: Building,
  },
  {
    id: "approve_listing",
    title: {
      en: "Approve a stay or tour listing",
      fr: "Valider une annonce d'hébergement",
      ar: "اعتماد إعلان إقامة أو رحلة سياحية",
    },
    desc: {
      en: "Inspect photos, pricing in DZD, and stay rules before publishing.",
      fr: "Vérifiez les photos, le tarif en DZD et l'adresse de la wilaya.",
      ar: "التأكد من الصور، السعر بالدينار، وعنوان الولاية قبل النشر.",
    },
    href: "/approvals?tab=listings",
    icon: Home,
  },
  {
    id: "find_guest",
    title: {
      en: "Find a guest in the directory",
      fr: "Consulter la liste des voyageurs",
      ar: "البحث عن مسافر في دليل الضيوف",
    },
    desc: {
      en: "Search by phone number, email, or guest reservation history.",
      fr: "Recherchez par numéro de téléphone, email ou historique de séjours.",
      ar: "البحث برقم الهاتف أو البريد الإلكتروني وسجل الإقامات.",
    },
    href: "/users",
    icon: Users,
  },
  {
    id: "recharge_wallet",
    title: {
      en: "Inspect host wallet balances",
      fr: "Consulter les portefeuilles des hôtes",
      ar: "معاينة محافظ المضيفين وأرصدتهم",
    },
    desc: {
      en: "View escrow balances, bank transfers, and wallet top-ups.",
      fr: "Consultez les soldes, virements et rechargez un portefeuille partenaire.",
      ar: "الاطلاع على الأرصدة والتحويلات وشحن محافظ الشركاء.",
    },
    href: "/finance",
    icon: Wallet,
  },
  {
    id: "switch_language",
    title: {
      en: "Explore language options (FR / AR / EN)",
      fr: "Découvrir le mode bilingue (Arabe / Français)",
      ar: "تجربة لغات المنصة (العربية / الفرنسية)",
    },
    desc: {
      en: "Experience full Arabic RTL and localized Algerian currencies.",
      fr: "Testez l'inversion RTL en arabe et l'affichage des dinars algériens.",
      ar: "تجربة العرض الكامل من اليمين لليسار والتنسيق الجزائري للعملة.",
    },
    href: "/settings",
    icon: Globe,
  },
];

export const GettingStartedChecklist: React.FC<GettingStartedChecklistProps> = () => {
  const locale = useLocale() as "en" | "fr" | "ar";
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("darna_admin_checklist_completed");
      if (saved) setCompletedIds(JSON.parse(saved));
      const dismissed = localStorage.getItem("darna_admin_checklist_dismissed");
      if (dismissed === "true") setIsDismissed(true);
    } catch {}
  }, []);

  const toggleItem = (id: string) => {
    const next = completedIds.includes(id)
      ? completedIds.filter((item) => item !== id)
      : [...completedIds, id];
    setCompletedIds(next);
    try {
      localStorage.setItem("darna_admin_checklist_completed", JSON.stringify(next));
    } catch {}
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("darna_admin_checklist_dismissed", "true");
    } catch {}
  };

  if (isDismissed) return null;

  const progressPercent = Math.round((completedIds.length / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="p-5 rounded-3xl bg-white border border-tertiary/80 shadow-2xs space-y-4 animate-in fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary">
                {locale === "fr"
                  ? "Guide de bienvenue pour bien démarrer"
                  : locale === "ar"
                  ? "قائمة البداية السريعة للمشرفين الجدد"
                  : "Getting Started Checklist"}
              </h3>
              <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                {completedIds.length} / {CHECKLIST_ITEMS.length}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {locale === "fr"
                ? "5 étapes simples pour maîtriser les fonctions clés de DARNA Admin."
                : locale === "ar"
                ? "5 خطوات مبسطة للتعرف على المهام الأساسية لإدارة منصة دارنا."
                : "5 simple tasks to help you master core moderation actions."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-neutral-400 hover:text-neutral-700 transition p-1 rounded-lg"
          title={locale === "fr" ? "Masquer ce guide" : "Dismiss checklist"}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-secondary h-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {CHECKLIST_ITEMS.map((item) => {
          const isDone = completedIds.includes(item.id);
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className={`p-3 rounded-2xl border transition-all text-start flex flex-col justify-between ${
                isDone
                  ? "bg-secondary/5 border-secondary/25"
                  : "bg-darnaBg/40 border-tertiary/60 hover:border-secondary/40 hover:bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      isDone ? "bg-secondary/15 text-secondary" : "bg-white text-neutral-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-xs font-bold leading-tight ${
                      isDone ? "text-secondary line-through" : "text-neutral-800"
                    }`}
                  >
                    {item.title[locale] || item.title.en}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="text-secondary cursor-pointer shrink-0"
                  aria-label="Toggle task status"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-secondary fill-secondary/20" />
                  ) : (
                    <Circle className="w-4 h-4 text-neutral-300 hover:text-secondary transition" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-neutral-500 leading-normal mb-3">
                {item.desc[locale] || item.desc.en}
              </p>

              <Link
                href={item.href}
                onClick={() => {
                  if (!isDone) toggleItem(item.id);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:text-primary transition group self-start"
              >
                <span>
                  {locale === "fr" ? "Ouvrir la page" : locale === "ar" ? "الانتقال للصفحة" : "Go to page"}
                </span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};
