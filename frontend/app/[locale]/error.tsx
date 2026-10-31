"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { BrandRefreshIcon } from "@/components/icons";
import Button from "@/components/ui/Button";
import { Illustration } from "@/components/ui/Illustration";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Route-level error boundary: branded card on paper with retry and a way home. */
export default function ErrorPage({ error, reset }: ErrorProps) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-[80dvh] items-center justify-center overflow-hidden bg-darnaBg px-4 py-14">
      <div aria-hidden="true" className="texture-zellige pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50" />
      <div
        role="alert"
        className="enter-up relative w-full max-w-xl rounded-3xl bg-white px-6 py-10 text-center shadow-e3 sm:px-12 sm:py-12"
      >
        <Illustration variant="error" size={148} className="mx-auto" />
        <p className="mt-4 text-eyebrow uppercase font-semibold text-secondary-700">{t("errorEyebrow")}</p>
        <h1 className="mt-3 font-serif text-display-md text-primary-900 [text-wrap:balance]">{t("errorTitle")}</h1>
        <p className="mx-auto mt-3 max-w-[46ch] text-body text-primary-600 [text-wrap:pretty]">{t("errorBody")}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => reset()} leadingIcon={<BrandRefreshIcon size={18} aria-hidden="true" />}>
            {t("tryAgain")}
          </Button>
          <Button href="/" variant="tertiary">
            {t("returnHome")}
          </Button>
        </div>
        {error.digest && (
          <p className="mt-6 text-meta text-primary-500">
            {t("errorReference")} <span className="font-mono tabular-nums" dir="ltr">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
