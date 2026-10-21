"use client";

import React, { useState } from "react";
import { useLocale } from "next-intl";
import {
  Sparkles,
  Home,
  CheckSquare,
  Search,
  Globe,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: { en: string; fr: string; ar: string };
  desc: { en: string; fr: string; ar: string };
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: {
      en: "Welcome to DARNA Admin Console",
      fr: "Bienvenue sur l'espace d'administration DARNA",
      ar: "مرحباً بكم في لوحة إدارة دارنا الجزائر",
    },
    desc: {
      en: "Designed for effortless, safe moderation. You can understand the health of DARNA in under 10 seconds and reach any task in 3 clicks or less.",
      fr: "Conçu pour une modération simple et sereine. Comprenez l'état de DARNA en moins de 10 secondes et accédez à chaque tâche en 3 clics ou moins.",
      ar: "تم تصميم المنصة لتوفير تجربة مريحة وآمنة. فهم نشاط دارنا في أقل من 10 ثوانٍ وإنجاز أي مهمة في 3 نقرات أو أقل.",
    },
    icon: Sparkles,
  },
  {
    title: {
      en: "1. Home & Needs Your Attention",
      fr: "1. Accueil & Ce qui nécessite votre attention",
      ar: "1. الرئيسية والمهام العاجلة",
    },
    desc: {
      en: "The top of the dashboard highlights urgent tasks (hosts waiting for approval, listings to review, disputes). Each card takes you directly to the filtered queue in 1 click.",
      fr: "Le haut de l'accueil regroupe vos priorités du jour (candidatures d'hôtes, annonces à vérifier). Chaque carte vous mène directement à l'action en un clic.",
      ar: "أعلى لوحة التحكم يبرز أولوياتكم (مضيفون قيد الانتظار، إعلانات للمراجعة). كل بطاقة تنقلكم مباشرة للقرار بنقرة واحدة.",
    },
    icon: Home,
  },
  {
    title: {
      en: "2. 'To Review' Approvals Inbox",
      fr: "2. Boîte de validation « À vérifier »",
      ar: "2. صندوق المراجعة والاعتماد",
    },
    desc: {
      en: "Click 'To review' in the sidebar anytime. The red badge shows how many items are waiting. Check documents and approve or reject with helpful guidance.",
      fr: "Le menu « À vérifier » centralise toutes les demandes en attente avec un badge de décompte. Examinez les pièces d'identité et validez d'un clic.",
      ar: "قائمة 'قيد المراجعة' تجمع كافة الطلبات المعلقة مع شارة عددية واضحة. افحصوا الوثائق واعتمدوا الحسابات بسهولة.",
    },
    icon: CheckSquare,
  },
  {
    title: {
      en: "3. Instant Search Anywhere (⌘K)",
      fr: "3. Recherche rapide partout (⌘K)",
      ar: "3. البحث السريع في كل مكان (⌘K)",
    },
    desc: {
      en: "Press ⌘K or click the search bar at any time to instantly jump to any host name, guest, booking, or Algerian wilaya.",
      fr: "Appuyez sur ⌘K ou cliquez sur la barre de recherche pour trouver immédiatement un hôte, un voyageur, ou une wilaya.",
      ar: "اضغطوا على ⌘K أو انقروا على شريط البحث في أي وقت للانتقال الفوري إلى أي مضيف، ضيف، أو ولاية جزائرية.",
    },
    icon: Search,
  },
  {
    title: {
      en: "4. Multi-Language & Contextual Help (?)",
      fr: "4. Multilingue & Aide contextuelle (?)",
      ar: "4. اللغات والمساعدة السريعة (?)",
    },
    desc: {
      en: "Switch between French, Arabic (full RTL), and English. Click the (?) icon in the top bar on any page for task step-by-step guides and words used.",
      fr: "Passez en français, arabe (RTL complet) ou anglais. Cliquez sur le bouton (?) pour voir le mode d'emploi et les définitions de la page.",
      ar: "التبديل بين العربية والفرنسية والإنجليزية. اضغطوا على أيقونة (?) في أعلى أي صفحة للاطلاع على دليل الخطوات والمصطلحات.",
    },
    icon: HelpCircle,
  },
];

export const ProductTour: React.FC<ProductTourProps> = ({ isOpen, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const locale = useLocale() as "en" | "fr" | "ar";

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[stepIndex];
  const StepIcon = currentStep.icon;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      try {
        localStorage.setItem("darna_admin_tour_completed", "true");
      } catch {}
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 text-start space-y-6">
        {/* Step indicator header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "w-8 bg-secondary"
                    : i < stepIndex
                    ? "w-3 bg-secondary/50"
                    : "w-3 bg-neutral-200"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-neutral-400">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* Content Card */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/25 flex items-center justify-center shrink-0 text-secondary">
            <StepIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-base font-bold text-primary">
              {currentStep.title[locale] || currentStep.title.en}
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {currentStep.desc[locale] || currentStep.desc.en}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-tertiary/60">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-neutral-800 transition font-medium"
          >
            {locale === "fr"
              ? "Passer la visite"
              : locale === "ar"
              ? "تخطي الجولة"
              : "Skip tour"}
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>
                  {locale === "fr"
                    ? "Précédent"
                    : locale === "ar"
                    ? "السابق"
                    : "Back"}
                </span>
              </Button>
            )}

            <Button variant="primary" size="sm" onClick={handleNext}>
              <span>
                {isLast
                  ? locale === "fr"
                    ? "C'est parti !"
                    : locale === "ar"
                    ? "ابدأ العمل"
                    : "Get Started"
                  : locale === "fr"
                  ? "Suivant"
                  : locale === "ar"
                  ? "التالي"
                  : "Next"}
              </span>
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
