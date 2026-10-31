"use client";

/**
 * Page-level empty state (search with no results, empty lists). API unchanged, plus an
 * optional `variant` illustration (search · favorites · messages · calendar · generic).
 * Renders the kit KitEmptyState: in-palette arch + rosette line illustration that draws in,
 * serif title, muted lede and a tertiary reset button.
 */

import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import KitButton from "@/components/ui/Button";
import { KitEmptyState } from "@/components/ui/Feedback";
import type { IllustrationVariant } from "@/components/ui/Illustration";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  showReset?: boolean;
  resetLabel?: string;
  resetAction?: () => void;
  variant?: IllustrationVariant;
}

export default function EmptyState({ title, subtitle, showReset, resetLabel, resetAction, variant = "search" }: EmptyStateProps) {
  const router = useRouter();
  const t = useTranslations("common");

  return (
    <KitEmptyState
      variant={variant}
      title={title ?? t("noExactMatches")}
      description={subtitle ?? t("noExactMatchesDesc")}
      action={
        showReset ? (
          <KitButton variant="tertiary" size="lg" onClick={resetAction ? resetAction : () => router.push("/")}>
            {resetLabel ?? t("resetAllFilters")}
          </KitButton>
        ) : undefined
      }
    />
  );
}
