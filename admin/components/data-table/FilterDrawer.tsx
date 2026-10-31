"use client";

import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  title?: string;
  activeFilterCount?: number;
  children: React.ReactNode;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  title,
  activeFilterCount = 0,
  children,
}) => {
  const t = useTranslations("common");
  const tUi = useTranslations("ui");
  const drawerTitle = title || t("filters");

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{drawerTitle}</span>
          {activeFilterCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-700 text-white font-semibold tabular-nums">
              {tUi("activeFilterCount", { count: activeFilterCount })}
            </span>
          )}
        </div>
      }
      subtitle=""
      size="md"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onReset}
            className="text-primary-600 hover:text-accent-700"
          >
            {t("reset")}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button variant="primary" size="sm" onClick={() => { onApply(); onClose(); }}>
              {t("apply")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">{children}</div>
    </Drawer>
  );
};
