"use client";

import { motion } from "framer-motion";
import { useRouter } from "@/navigation";
import React from "react";
import Button from "./Button";
import Heading from "./Heading";
import { useTranslations } from "next-intl";

type Props = {
  title?: string;
  subtitle?: string;
  showReset?: boolean;
};

function EmptyState({
  title,
  subtitle,
  showReset,
}: Props) {
  const router = useRouter();
  const t = useTranslations("common");

  const displayTitle = title || t("noExactMatches");
  const displaySubtitle = subtitle || t("noExactMatchesDesc");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="h-[60vh] flex flex-col gap-2 justify-center items-center text-center px-4"
    >
      <Heading center title={displayTitle} subtitle={displaySubtitle} />
      <div className="w-48 mt-4">
        {showReset && (
          <Button
            outline
            label={t("resetAllFilters")}
            onClick={() => router.push("/")}
          />
        )}
      </div>
    </motion.div>
  );
}

export default EmptyState;
