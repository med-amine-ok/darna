"use client";

import EmptyState from "@/components/EmptyState";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

type Props = {
  error: Error;
};

function ErrorState({ error }: Props) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return <EmptyState title={t("error")} subtitle="Please try again or return to home." />;
}

export default ErrorState;
