"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/Button";
import { ArchRosette } from "@/components/ui/EmptyState";

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
    <div role="alert" className="max-w-lg mx-auto my-12 p-8 sm:p-10 rounded-2xl bg-white shadow-e1 text-center flex flex-col items-center">
      <div className="w-20 h-20 rounded-full bg-accent-50 grid place-items-center mb-5" aria-hidden="true">
        <ArchRosette className="w-14 h-14" />
      </div>
      <h1 className="font-serif text-heading text-primary-900">{t("title")}</h1>
      <p className="text-meta text-primary-600 mt-2 leading-relaxed max-w-sm">{t("description")}</p>
      {error.digest && (
        <p className="text-xs text-primary-600 mt-3">
          {t("reference")}{" "}
          <code dir="ltr" className="font-mono bg-darnaBg-300/70 px-1.5 py-0.5 rounded-md text-primary-800">
            {error.digest}
          </code>
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Button type="button" onClick={reset} leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}>
          {t("retry")}
        </Button>
        <Link
          href="/"
          className="inline-flex items-center px-4 min-h-[44px] sm:min-h-[40px] rounded-xl bg-white shadow-e1 hover:shadow-e2 text-meta font-semibold text-primary-800 transition duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
