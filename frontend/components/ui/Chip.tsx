"use client";

/**
 * Chip, interactive pill for filters, amenities and tags.
 *
 *   <Chip selected={wifi} onSelectedChange={setWifi} icon={<BrandWifiIcon size={16} />}>Wi-Fi</Chip>
 *   <Chip onRemove={() => drop("oran")}>Oran</Chip>       // removable (separate × button)
 *   <Chip onClick={openFilters}>Filters</Chip>           // plain action chip
 *
 * Toggle chips are buttons with aria-pressed; selected = ink fill. Removable chips render
 * the label as text plus a "Remove {item}" button (ui.removeItem). 40px tall, 44px hit area.
 */

import React from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { BrandCloseIcon } from "@/components/icons";
import { spring } from "@/lib/motion";
import { cn, focusRing } from "./cn";

export interface ChipProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  /** Makes the chip a toggle (aria-pressed). */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  onClick?: () => void;
  /** Adds a remove button. */
  onRemove?: () => void;
  /** Accessible text for the remove button; defaults to "Remove {item}" when children is a string. */
  removeLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const shell = (selected: boolean | undefined, size: "sm" | "md") =>
  cn(
    "relative inline-flex items-center gap-2 rounded-full font-medium whitespace-nowrap",
    "transition-[background-color,box-shadow,color] duration-fast ease-standard",
    size === "sm" ? "h-8 px-3 text-meta" : "h-10 px-4 text-sm",
    selected
      ? "bg-primary-800 text-white shadow-e2"
      : "bg-white text-primary-800 shadow-e1 hover:shadow-e2 hover:text-primary-900",
  );

export function Chip({
  children,
  icon,
  selected,
  onSelectedChange,
  onClick,
  onRemove,
  removeLabel,
  disabled,
  size = "md",
  className,
}: ChipProps) {
  const t = useTranslations("ui");
  const isToggle = selected !== undefined || onSelectedChange !== undefined;

  if (onRemove) {
    const name =
      removeLabel ??
      t("removeItem", { item: typeof children === "string" ? children : "" });
    return (
      <span
        className={cn(
          shell(selected, size),
          "pe-1",
          disabled && "opacity-50",
          className,
        )}
      >
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex shrink-0",
              selected ? "text-tertiary-200" : "text-secondary-600",
            )}
          >
            {icon}
          </span>
        )}
        <span>{children}</span>
        <m.button
          type="button"
          aria-label={name}
          onClick={onRemove}
          disabled={disabled}
          whileTap={{ scale: 0.88 }}
          transition={spring.press}
          className={cn(
            "relative inline-flex h-7 w-7 items-center justify-center rounded-full cursor-pointer",
            "before:absolute before:-inset-2 before:content-['']",
            selected
              ? "hover:bg-white/15"
              : "text-primary-500 hover:bg-primary/[0.07] hover:text-primary-900",
            "transition-colors duration-fast disabled:cursor-not-allowed",
            focusRing,
          )}
        >
          <BrandCloseIcon size={14} strokeWidth={2.2} />
        </m.button>
      </span>
    );
  }

  return (
    <m.button
      type="button"
      aria-pressed={isToggle ? Boolean(selected) : undefined}
      disabled={disabled}
      onClick={() => {
        if (isToggle) onSelectedChange?.(!selected);
        onClick?.();
      }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={spring.press}
      className={cn(
        shell(selected, size),
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex shrink-0",
            selected ? "text-tertiary-200" : "text-secondary-600",
          )}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </m.button>
  );
}

export default Chip;
