"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
  /** Custom trigger; should be (or contain) a <button>. */
  trigger?: React.ReactNode;
  triggerIcon?: React.ReactNode;
  /** Accessible name of the default icon trigger. */
  triggerLabel?: string;
  align?: "left" | "right";
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  trigger,
  triggerIcon = <MoreVertical className="w-4 h-4" aria-hidden="true" />,
  triggerLabel,
  align = "right",
  className = "",
}) => {
  const t = useTranslations("ui");
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setIsOpen(false);
      containerRef.current
        ?.querySelector<HTMLElement>("[data-dropdown-trigger] button, button[data-dropdown-trigger]")
        ?.focus();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
    if (nodes.length === 0) return;
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (idx + 1) % nodes.length : (idx - 1 + nodes.length) % nodes.length;
    nodes[next]?.focus();
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-start ${className}`}>
      {trigger ? (
        <div
          data-dropdown-trigger
          onClickCapture={(e) => {
            e.stopPropagation();
            setIsOpen((o) => !o);
          }}
          className="cursor-pointer"
        >
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          data-dropdown-trigger
          aria-label={triggerLabel ?? t("moreOptions")}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((o) => !o);
          }}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-primary hover:bg-neutral-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
        >
          {triggerIcon}
        </button>
      )}

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          onKeyDown={onMenuKeyDown}
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-40 mt-1 w-44 rounded-2xl bg-white border border-tertiary/80 shadow-darna-dropdown p-1.5 animate-in fade-in zoom-in-95 ${
            align === "right" ? "end-0" : "start-0"
          }`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold select-none transition text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                item.disabled
                  ? "opacity-40 pointer-events-none"
                  : item.variant === "danger"
                  ? "text-accent-700 hover:bg-accent/10"
                  : "text-neutral-700 hover:bg-darnaBg/80 hover:text-primary"
              }`}
            >
              {item.icon && (
                <span className="shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
