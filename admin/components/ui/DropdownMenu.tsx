"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
  triggerIcon?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  triggerIcon = <MoreVertical className="w-4 h-4" />,
  align = "right",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-start ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg text-neutral-400 hover:text-primary hover:bg-neutral-100 transition cursor-pointer"
        aria-label="More options"
      >
        {triggerIcon}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-40 mt-1 w-44 rounded-2xl bg-white border border-tertiary/80 shadow-darna-dropdown p-1.5 animate-in fade-in zoom-in-95 ${
            align === "right" ? "end-0" : "start-0"
          }`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold select-none transition text-start ${
                item.disabled
                  ? "opacity-40 pointer-events-none"
                  : item.variant === "danger"
                  ? "text-accent hover:bg-accent/10"
                  : "text-neutral-700 hover:bg-darnaBg/80 hover:text-primary"
              }`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
