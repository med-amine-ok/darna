"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorProps) {
  const t = useTranslations("errors");

  return (
    <div role="alert" className="min-h-[80dvh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-64 h-64 mb-6">
        <Image src="/assets/404-illustration.png" alt="" fill sizes="256px" className="object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-primary mb-2">{t("errorTitle")}</h1>
      <p className="text-sm text-neutral-600 max-w-md mb-6">{t("errorBody")}</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-full bg-accent-600 text-white font-medium hover:bg-accent-700 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {t("tryAgain")}
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-full border border-tertiary text-primary font-medium hover:bg-tertiary/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {t("returnHome")}
        </Link>
      </div>
    </div>
  );
}
