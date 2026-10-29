"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Link } from "@/navigation";

/** Error boundary for every back-office page (keeps the sidebar/header shell). */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Surface the failure in the browser console for support; the digest links to server logs.
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-white border border-tertiary/70 shadow-darna-card text-start">
      <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent-700 mb-4" aria-hidden="true">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-serif font-black text-primary">{t("title")}</h1>
      <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{t("description")}</p>
      {error.digest && (
        <p className="text-xs text-neutral-600 mt-3">
          {t("reference")}{" "}
          <code dir="ltr" className="font-mono bg-darnaBg/60 px-1.5 py-0.5 rounded">
            {error.digest}
          </code>
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-primary hover:bg-primary-700 text-white text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          {t("retry")}
        </button>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2.5 min-h-[44px] rounded-xl border border-tertiary/70 text-xs font-bold text-primary hover:bg-darnaBg/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
