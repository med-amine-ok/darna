"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import Image from "next/image";
import Button from "./Button";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  showReset?: boolean;
  resetLabel?: string;
  resetAction?: () => void;
}

export default function EmptyState({
  title,
  subtitle,
  showReset,
  resetLabel,
  resetAction,
}: EmptyStateProps) {
  const router = useRouter();
  const t = useTranslations("common");

  return (
    <div className="h-[60vh] flex flex-col gap-4 justify-center items-center text-center p-6">
      <div className="relative w-44 h-44 mb-2">
        <Image
          src="/assets/404-illustration.png"
          alt=""
          fill
          sizes="176px"
          className="object-contain"
        />
      </div>
      <h3 className="text-xl font-bold text-primary">{title ?? t("noExactMatches")}</h3>
      <p className="text-neutral-600 text-sm max-w-sm">{subtitle ?? t("noExactMatchesDesc")}</p>
      {showReset && (
        <div className="w-48 mt-4">
          <Button
            outline
            label={resetLabel ?? t("resetAllFilters")}
            onClick={resetAction ? resetAction : () => router.push("/")}
          />
        </div>
      )}
    </div>
  );
}
