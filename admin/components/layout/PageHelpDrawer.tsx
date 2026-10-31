"use client";

import React from "react";
import { Link, usePathname } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Keyboard,
  Compass,
  Sparkles,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { useGlossary, type GlossaryKey } from "@/lib/glossary";
import { TOUR_STEP_COUNT } from "./ProductTour";

export interface PageHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

type HelpPageKey = "home" | "approvals" | "default";

/** A glossary entry: either a shared `glossary.<key>` term or a local `pageHelp.terms.<key>` one. */
type HelpTerm = { glossary: GlossaryKey } | { local: "trainingMode" };

interface PageHelpStructure {
  /** Task ids under pageHelp.pages.<page>.tasks with their number of steps (s1..sN). */
  tasks: ReadonlyArray<{ id: string; steps: number }>;
  terms: ReadonlyArray<HelpTerm>;
  /** Shortcut description ids under pageHelp.shortcuts. */
  shortcuts: ReadonlyArray<{ keys: readonly string[]; id: string }>;
}

/** Structure only, all text lives in the `pageHelp` (and `glossary`) messages. */
const PAGE_HELP: Record<HelpPageKey, PageHelpStructure> = {
  home: {
    tasks: [
      { id: "reviewHosts", steps: 3 },
      { id: "monthlyEarnings", steps: 3 },
    ],
    terms: [{ glossary: "gmv" }, { glossary: "commission" }],
    shortcuts: [
      { keys: ["⌘", "K"], id: "quickSearch" },
      { keys: ["?"], id: "openHelp" },
      { keys: ["Esc"], id: "closeDialog" },
    ],
  },
  approvals: {
    tasks: [
      { id: "approveHost", steps: 4 },
      { id: "rejectWithReason", steps: 4 },
    ],
    terms: [{ glossary: "pendingReview" }],
    shortcuts: [
      { keys: ["A"], id: "quickApprove" },
      { keys: ["R"], id: "openReject" },
    ],
  },
  default: {
    tasks: [{ id: "findRecord", steps: 3 }],
    terms: [{ local: "trainingMode" }],
    shortcuts: [
      { keys: ["⌘", "K"], id: "commandSearch" },
      { keys: ["?"], id: "toggleHelp" },
    ],
  },
};

export const PageHelpDrawer: React.FC<PageHelpDrawerProps> = ({
  isOpen,
  onClose,
  onStartTour,
}) => {
  const pathname = usePathname();
  const t = useTranslations("pageHelp");
  const { getPlainTerm, getDefinition } = useGlossary();

  let pageKey: HelpPageKey = "default";
  if (pathname === "/" || pathname === "") pageKey = "home";
  else if (pathname?.includes("approvals")) pageKey = "approvals";

  const content = PAGE_HELP[pageKey];
  const page = (key: string) => t(`pages.${pageKey}.${key}`);

  const terms = content.terms.map((term) =>
    "glossary" in term
      ? {
          id: term.glossary,
          term: getPlainTerm(term.glossary),
          definition: getDefinition(term.glossary),
        }
      : {
          id: term.local,
          term: t(`terms.${term.local}.term`),
          definition: t(`terms.${term.local}.definition`),
        },
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={page("title")} size="md">
      <div className="space-y-6 text-start">
        {/* Section 1: What is this page for? */}
        <section className="p-3.5 rounded-2xl bg-secondary-50 ring-1 ring-inset ring-secondary-200">
          <h3 className="flex items-center gap-2 text-primary-900 font-semibold text-xs">
            <HelpCircle
              className="w-4 h-4 text-secondary-700"
              aria-hidden="true"
            />
            <span>{t("sections.whatFor")}</span>
          </h3>
          <p className="text-xs text-primary-800 mt-1.5 leading-relaxed">
            {page("whatFor")}
          </p>
        </section>

        {/* Section 2: Common Tasks */}
        <section>
          <h3 className="text-xs font-semibold text-primary-900 flex items-center gap-2 mb-3">
            <CheckCircle2
              className="w-4 h-4 text-secondary-700"
              aria-hidden="true"
            />
            <span>{t("sections.commonTasks")}</span>
          </h3>
          <ul className="space-y-3">
            {content.tasks.map((task) => (
              <li
                key={task.id}
                className="p-3 rounded-xl bg-white shadow-e1 space-y-2"
              >
                <h4 className="text-xs font-semibold text-primary-900">
                  {page(`tasks.${task.id}.title`)}
                </h4>
                <ol className="space-y-1.5 text-[11px] text-primary-600 list-decimal list-inside">
                  {Array.from({ length: task.steps }, (_, i) => (
                    <li key={i} className="leading-tight">
                      {page(`tasks.${task.id}.steps.s${i + 1}`)}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 3: Words used here (Glossary) */}
        <section>
          <h3 className="text-xs font-semibold text-primary-900 flex items-center gap-2 mb-3">
            <BookOpen
              className="w-4 h-4 text-secondary-700"
              aria-hidden="true"
            />
            <span>{t("sections.words")}</span>
          </h3>
          <dl className="space-y-2">
            {terms.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-darnaBg-100 text-xs"
              >
                <dt className="font-semibold text-primary-900">{item.term}</dt>
                <dd className="text-[11px] text-primary-600 mt-0.5 leading-relaxed">
                  {item.definition}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Section 4: Keyboard shortcuts */}
        <section>
          <h3 className="text-xs font-semibold text-primary-900 flex items-center gap-2 mb-3">
            <Keyboard
              className="w-4 h-4 text-secondary-700"
              aria-hidden="true"
            />
            <span>{t("sections.shortcuts")}</span>
          </h3>
          <ul className="space-y-2">
            {content.shortcuts.map((sc) => (
              <li
                key={sc.id}
                className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white shadow-e1 text-xs"
              >
                <span className="text-primary-600">
                  {t(`shortcuts.${sc.id}`)}
                </span>
                <span className="flex items-center gap-1" dir="ltr">
                  {sc.keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex items-center h-5 min-w-[20px] justify-center px-1.5 rounded-md bg-darnaBg-300/80 text-[11px] font-semibold text-primary-800"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Action Links */}
        <div className="pt-4 border-t border-primary/[0.06] space-y-2">
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
              <Sparkles
                className="w-3.5 h-3.5 text-secondary"
                aria-hidden="true"
              />
              <span>{t("replayTour", { count: TOUR_STEP_COUNT })}</span>
            </Button>
          )}

          <Link
            href="/where-did-it-go"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-secondary-800 bg-white shadow-e1 hover:shadow-e2 transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("whereDidMyPageGo")}</span>
          </Link>
        </div>
      </div>
    </Drawer>
  );
};
