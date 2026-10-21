"use client";

import React from "react";
import { usePathname } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  X,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Keyboard,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Link } from "@/navigation";

export interface PageHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

interface PageHelpContent {
  title: { en: string; fr: string; ar: string };
  whatFor: { en: string; fr: string; ar: string };
  commonTasks: Array<{
    title: { en: string; fr: string; ar: string };
    steps: { en: string[]; fr: string[]; ar: string[] };
  }>;
  glossary: Array<{
    term: { en: string; fr: string; ar: string };
    def: { en: string; fr: string; ar: string };
  }>;
  shortcuts: Array<{
    keys: string[];
    desc: { en: string; fr: string; ar: string };
  }>;
}

const PAGE_HELP_DATA: Record<string, PageHelpContent> = {
  home: {
    title: {
      en: "Home Dashboard Help",
      fr: "Aide — Tableau de bord",
      ar: "مساعدة — لوحة التحكم الرئيسية",
    },
    whatFor: {
      en: "Gives you a calm 10-second overview of pending approvals and overall DARNA business health.",
      fr: "Vous offre une vue claire en 10 secondes sur les tâches urgentes et la santé de DARNA.",
      ar: "تمنحكم نظرة سريعة في 10 ثوانٍ على القرارات المعلقة وصحة أعمال منصة دارنا.",
    },
    commonTasks: [
      {
        title: {
          en: "Review pending host applications",
          fr: "Examiner les candidatures d'hôtes",
          ar: "مراجعة طلبات انضمام المضيفين",
        },
        steps: {
          en: [
            "Look at the first card under 'Needs your attention'",
            "Click the green 'Review hosts' button",
            "Inspect the identity documents and click 'Approve host'",
          ],
          fr: [
            "Regardez la première carte de « Nécessite votre attention »",
            "Cliquez sur le bouton vert « Examiner les hôtes »",
            "Vérifiez les pièces d'identité et cliquez sur « Approuver »",
          ],
          ar: [
            "راجعوا البطاقة الأولى تحت 'يحتاج إلى انتباهكم'",
            "اضغطوا على الزر الأخضر 'مراجعة المضيفين'",
            "تحققوا من الوثائق واضغطوا على 'قبول المضيف'",
          ],
        },
      },
      {
        title: {
          en: "Check monthly earnings and bookings",
          fr: "Vérifier les revenus et réservations du mois",
          ar: "الاطلاع على أرباح وحجوزات الشهر",
        },
        steps: {
          en: [
            "Ensure the period selector is set to 'Last 30 days'",
            "Read the 4 cards: Bookings, Money paid by guests, DARNA earnings, New hosts",
            "Hover over the (?) icon on any card to see how it is counted",
          ],
          fr: [
            "Vérifiez que le filtre de période est sur « 30 derniers jours »",
            "Consultez les 4 chiffres clés et leurs phrases explicatives",
            "Survolez l'icône (?) pour voir le mode de calcul",
          ],
          ar: [
            "تأكدوا من اختيار فترة 'آخر 30 يوماً'",
            "اطلعوا على البطاقات الـ 4 والجمل التوضيحية أسفلها",
            "مرروا الفأرة فوق علامة (?) لقراءة طريقة الحساب",
          ],
        },
      },
    ],
    glossary: [
      {
        term: { en: "Money paid by guests", fr: "Argent payé par les voyageurs", ar: "المبالغ المدفوعة من الضيوف" },
        def: {
          en: "The total amount paid by guests for all accommodation and trip bookings.",
          fr: "Total des paiements réglés par les voyageurs pour leurs séjours.",
          ar: "إجمالي المبالغ المدفوعة من طرف الضيوف لكافة الحجوزات.",
        },
      },
      {
        term: { en: "DARNA earnings", fr: "Revenus de DARNA", ar: "أرباح دارنا" },
        def: {
          en: "The platform commission retained to maintain operations and customer support.",
          fr: "La commission conservée par DARNA pour opérer le service et le support.",
          ar: "العمولة المحتفظ بها لتشغيل المنصة ودعم العملاء في الجزائر.",
        },
      },
    ],
    shortcuts: [
      { keys: ["⌘", "K"], desc: { en: "Quick search anywhere", fr: "Recherche rapide", ar: "البحث السريع في أي مكان" } },
      { keys: ["?"], desc: { en: "Open this help side panel", fr: "Ouvrir ce panneau d'aide", ar: "فتح لوحة المساعدة هذه" } },
      { keys: ["Esc"], desc: { en: "Close dialog or panel", fr: "Fermer la boîte de dialogue", ar: "إغلاق النافذة الحالية" } },
    ],
  },
  approvals: {
    title: {
      en: "To Review (Approvals Inbox) Help",
      fr: "Aide — À vérifier (Boîte de modération)",
      ar: "مساعدة — قيد المراجعة (صندوق التدقيق)",
    },
    whatFor: {
      en: "Your centralized moderation desk for deciding on new hosts and pending listings.",
      fr: "Votre espace centralisé de décision pour valider ou refuser les nouveaux hôtes et annonces.",
      ar: "مساحتكم المركزية لمراجعة واعتماد المضيفين والإعلانات الجديدة في الجزائر.",
    },
    commonTasks: [
      {
        title: {
          en: "Approve a verified host",
          fr: "Approuver un hôte vérifié",
          ar: "اعتماد مضيف موثوق",
        },
        steps: {
          en: [
            "Click on the host row to open their verification drawer",
            "Inspect their Algerian identity card and tourism documents",
            "Click the solid green 'Approve host' button",
            "A confirmation toast appears with an 8-second Undo option",
          ],
          fr: [
            "Cliquez sur la ligne de l'hôte pour ouvrir son volet",
            "Vérifiez sa pièce d'identité et ses documents professionnels",
            "Cliquez sur le bouton vert « Approuver l'hôte »",
            "Une notification de succès s'affiche avec option Annuler pendant 8s",
          ],
          ar: [
            "اضغطوا على سطر المضيف لفتح لوحة التحقق",
            "راجعوا بطاقة الهوية الوطنية والوثائق المهنية",
            "اضغطوا على الزر الأخضر 'قبول المضيف'",
            "سيظهر إشعار نجاح مع خيار التراجع لمدة 8 ثوانٍ",
          ],
        },
      },
      {
        title: {
          en: "Reject with a helpful reason",
          fr: "Refuser avec motif explicatif",
          ar: "الرفض مع توضيح السبب للمضيف",
        },
        steps: {
          en: [
            "Click 'Reject' on the host or listing row",
            "Choose a clear template (e.g., 'Blurry ID card')",
            "Add a friendly sentence so the host knows what to re-upload",
            "Click 'Confirm rejection'",
          ],
          fr: [
            "Cliquez sur « Refuser » sur la ligne concernée",
            "Choisissez un motif prédéfini (ex: « Pièce d'identité illisible »)",
            "Ajoutez un message bienveillant pour guider l'hôte",
            "Cliquez sur « Confirmer le refus »",
          ],
          ar: [
            "اضغطوا على 'رفض' في سطر المضيف أو الإعلان",
            "اختاروا سبباً جاهزاً (مثل 'وثيقة هوية غير واضحة')",
            "أضيفوا رسالة توضيحية للمضيف لإرشاده",
            "اضغطوا على 'تأكيد الرفض'",
          ],
        },
      },
    ],
    glossary: [
      {
        term: { en: "Waiting for your decision", fr: "En attente de votre décision", ar: "في انتظار قراركم" },
        def: {
          en: "Items that need staff review before they can go live to Algerian travelers.",
          fr: "Dossiers soumis nécessitant votre vérification avant d'être mis en ligne.",
          ar: "ملفات تحتاج فحصكم واعتمادكم لتظهر للمسافرين الجزائريين.",
        },
      },
    ],
    shortcuts: [
      { keys: ["A"], desc: { en: "Quick approve focused item", fr: "Approbation rapide de l'élément", ar: "اعتماد سريع للعنصر المحدد" } },
      { keys: ["R"], desc: { en: "Open rejection modal", fr: "Ouvrir la fenêtre de refus", ar: "فتح نافذة الرفض" } },
    ],
  },
  default: {
    title: {
      en: "DARNA Admin Help",
      fr: "Aide DARNA Admin",
      ar: "مساعدة دارنا للإدارة",
    },
    whatFor: {
      en: "This page is built for safe, clear administration. You can always undo reversible changes.",
      fr: "Cette interface est conçue pour être simple et sécurisante. Vous pouvez toujours annuler vos actions.",
      ar: "صممت هذه الصفحة لتوفير إدارة آمنة وسهلة مع إمكانية التراجع عن القرارات.",
    },
    commonTasks: [
      {
        title: {
          en: "Finding any record quickly",
          fr: "Retrouver n'importe quel élément rapidement",
          ar: "العثور على أي ملف بسرعة",
        },
        steps: {
          en: [
            "Press ⌘K or click the search bar at the top",
            "Type a host name, guest name, or Algerian wilaya",
            "Press Enter to jump directly to the record",
          ],
          fr: [
            "Appuyez sur ⌘K ou cliquez sur la barre de recherche en haut",
            "Tapez un nom d'hôte, de voyageur ou une wilaya",
            "Appuyez sur Entrée pour y accéder immédiatement",
          ],
          ar: [
            "اضغطوا على ⌘K أو انقروا على شريط البحث في الأعلى",
            "اكتبوا اسم المضيف أو الضيف أو اسم الولاية",
            "اضغطوا على Enter للانتقال مباشرة للملف",
          ],
        },
      },
    ],
    glossary: [
      {
        term: { en: "Training Mode", fr: "Mode entraînement", ar: "وضع التدريب" },
        def: {
          en: "A safe sandbox where actions do not affect real data. Perfect for learning.",
          fr: "Un environnement d'essai où vos actions n'altèrent pas les vraies données.",
          ar: "بيئة تجريبية آمنة لا تؤثر على البيانات الحقيقية، ممتازة للتمرن.",
        },
      },
    ],
    shortcuts: [
      { keys: ["⌘", "K"], desc: { en: "Open Command search", fr: "Recherche globale", ar: "البحث الشامل" } },
      { keys: ["?"], desc: { en: "Toggle this help drawer", fr: "Afficher/masquer cette aide", ar: "إظهار/إخفاء لوحة المساعدة" } },
    ],
  },
};

export const PageHelpDrawer: React.FC<PageHelpDrawerProps> = ({
  isOpen,
  onClose,
  onStartTour,
}) => {
  const pathname = usePathname();
  const locale = useLocale() as "en" | "fr" | "ar";

  let pageKey = "default";
  if (pathname === "/" || pathname === "") pageKey = "home";
  else if (pathname?.includes("approvals")) pageKey = "approvals";

  const content = PAGE_HELP_DATA[pageKey] || PAGE_HELP_DATA.default;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={content.title[locale] || content.title.en}
      subtitle={content.whatFor[locale] || content.whatFor.en}
      size="md"
    >
      <div className="space-y-6 text-start">
        {/* Section 1: What is this page for? */}
        <div className="p-3.5 rounded-2xl bg-secondary/10 border border-secondary/20">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <HelpCircle className="w-4 h-4 text-secondary" />
            <span>
              {locale === "fr"
                ? "À quoi sert cette page ?"
                : locale === "ar"
                ? "ما هو الغرض من هذه الصفحة؟"
                : "What is this page for?"}
            </span>
          </div>
          <p className="text-xs text-neutral-700 mt-1.5 leading-relaxed">
            {content.whatFor[locale] || content.whatFor.en}
          </p>
        </div>

        {/* Section 2: Common Tasks (from Task Trees) */}
        <div>
          <h4 className="text-xs font-bold text-primary flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-secondary" />
            <span>
              {locale === "fr"
                ? "Tâches courantes"
                : locale === "ar"
                ? "المهام الشائعة خطوة بخطوة"
                : "Common Tasks"}
            </span>
          </h4>
          <div className="space-y-3">
            {content.commonTasks.map((task, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-white border border-tertiary/70 shadow-2xs space-y-2"
              >
                <p className="text-xs font-bold text-neutral-800">
                  {task.title[locale] || task.title.en}
                </p>
                <ol className="space-y-1.5 text-[11px] text-neutral-600 list-decimal list-inside">
                  {(task.steps[locale] || task.steps.en).map((step, sIdx) => (
                    <li key={sIdx} className="leading-tight">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Words used here (Glossary) */}
        <div>
          <h4 className="text-xs font-bold text-primary flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-secondary" />
            <span>
              {locale === "fr"
                ? "Vocabulaire clair employé ici"
                : locale === "ar"
                ? "المصطلحات المبسطة المستخدمة هنا"
                : "Words used on this page"}
            </span>
          </h4>
          <div className="space-y-2">
            {content.glossary.map((item, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-darnaBg/80 border border-tertiary/60 text-xs"
              >
                <span className="font-bold text-primary block">
                  {item.term[locale] || item.term.en}
                </span>
                <span className="text-[11px] text-neutral-600 mt-0.5 block leading-relaxed">
                  {item.def[locale] || item.def.en}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Keyboard shortcuts */}
        <div>
          <h4 className="text-xs font-bold text-primary flex items-center gap-2 mb-3">
            <Keyboard className="w-4 h-4 text-secondary" />
            <span>
              {locale === "fr"
                ? "Raccourcis clavier utiles"
                : locale === "ar"
                ? "اختصارات لوحة المفاتيح"
                : "Helpful Keyboard Shortcuts"}
            </span>
          </h4>
          <div className="space-y-2">
            {content.shortcuts.map((sc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-neutral-100 text-xs"
              >
                <span className="text-neutral-600">
                  {sc.desc[locale] || sc.desc.en}
                </span>
                <div className="flex items-center gap-1">
                  {sc.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-mono text-neutral-700 shadow-2xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Links */}
        <div className="pt-4 border-t border-tertiary/60 space-y-2">
          {onStartTour && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onStartTour();
              }}
              className="w-full justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>
                {locale === "fr"
                  ? "Relancer la visite guidée (5 étapes)"
                  : locale === "ar"
                  ? "إعادة جولة التعريف بالمنصة (5 خطوات)"
                  : "Replay Guided Tour (5 steps)"}
              </span>
            </Button>
          )}

          <Link
            href="/where-did-it-go"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-secondary hover:bg-secondary/10 transition border border-secondary/30"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>
              {locale === "fr"
                ? "Où est passée mon ancienne page ? (Guide)"
                : locale === "ar"
                ? "أين ذهبت الصفحة السابقة؟ (دليل التنقل)"
                : "Where did my page go? (Old to New Guide)"}
            </span>
          </Link>
        </div>
      </div>
    </Drawer>
  );
};
