"use client";

import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Building,
  User,
  Calendar,
  Star,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";
import { searchGlobalCommandPalette } from "@/lib/actions/command-palette";
import type { CommandPaletteResult } from "@/lib/types";
import { m, AnimatePresence } from "framer-motion";
import { dur, ease } from "@/lib/motion";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const kbd = (chunks: React.ReactNode) => (
  <kbd className="inline-flex items-center h-5 min-w-[20px] justify-center px-1 rounded-md bg-white text-primary-700 font-semibold shadow-2xs">
    {chunks}
  </kbd>
);

/**
 * Global search palette, WAI-ARIA combobox (input) + listbox (results)
 * inside a modal dialog. Arrow keys move the active option, Enter opens it,
 * Escape closes; focus returns to the opener.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const tPalette = useTranslations("commandPalette");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandPaletteResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const titleId = `${uid}-title`;
  const hintId = `${uid}-hint`;
  const optionId = (index: number) => `${uid}-option-${index}`;
  const containerRef = useDialogA11y<HTMLDivElement>(isOpen, {
    onEscape: onClose,
    initialFocusRef: inputRef as React.RefObject<HTMLElement>,
  });

  // Load results on query change (only while open)
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    searchGlobalCommandPalette(query).then((res) => {
      if (active) {
        setResults(res.ok ? res.data : []);
        setSelectedIndex(0);
      }
    });
    return () => {
      active = false;
    };
  }, [query, isOpen]);

  const handleSelect = useCallback(
    (item: CommandPaletteResult) => {
      onClose();
      setQuery("");
      router.push(item.href);
    },
    [onClose, router],
  );

  // Keep the active option visible.
  useEffect(() => {
    if (!isOpen) return;
    document
      .getElementById(optionId(selectedIndex))
      ?.scrollIntoView({ block: "nearest" });
    // optionId is derived from a stable useId value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, isOpen]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIndex(results.length - 1);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    host: <Building className="w-4 h-4 text-secondary shrink-0" />,
    listing: <Building className="w-4 h-4 text-primary shrink-0" />,
    user: <User className="w-4 h-4 text-tertiary-700 shrink-0" />,
    booking: <Calendar className="w-4 h-4 text-accent-800 shrink-0" />,
    review: <Star className="w-4 h-4 text-amber-600 shrink-0" />,
    action: <Sparkles className="w-4 h-4 text-secondary shrink-0" />,
  };

  const hasResults = results.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-[12vh] p-4 text-start">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast, ease: ease.standard }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 backdrop-ink"
          />

          {/* Palette Modal */}
          <m.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: dur.base, ease: ease.out },
            }}
            exit={{
              opacity: 0,
              scale: 0.98,
              y: -6,
              transition: { duration: dur.fast, ease: ease.standard },
            }}
            className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-e5 overflow-hidden z-10"
          >
            <h2 id={titleId} className="sr-only">
              {tPalette("title")}
            </h2>

            {/* Search Input Bar */}
            <div className="px-5 h-16 flex items-center gap-3 border-b border-primary/[0.06]">
              <Search
                className="w-5 h-5 text-primary-500 shrink-0"
                aria-hidden="true"
              />
              <label htmlFor={`${uid}-input`} className="sr-only">
                {tPalette("inputLabel")}
              </label>
              <input
                id={`${uid}-input`}
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={hasResults}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  hasResults && results[selectedIndex]
                    ? optionId(selectedIndex)
                    : undefined
                }
                aria-describedby={hintId}
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={tPalette("placeholder")}
                className="w-full text-body bg-transparent border-none text-primary-900 placeholder:text-primary-500 focus:outline-none focus:ring-0 focus:shadow-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label={tPalette("clear")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-primary-500 hover:text-primary-900 hover:bg-primary/[0.06] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <kbd className="text-[11px] text-primary-600 font-semibold px-1.5 h-6 inline-flex items-center rounded-md bg-darnaBg-300/80 shrink-0">
                Esc
              </kbd>
            </div>

            {/* Results list */}
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
              <ul
                id={listboxId}
                role="listbox"
                aria-label={tPalette("resultsLabel")}
                className="space-y-0.5"
              >
                {results.map((item, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <li
                      key={item.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer select-none transition-colors duration-micro ease-standard ${
                        isSelected
                          ? "bg-darnaBg-300/70 text-primary-900"
                          : "text-primary-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-e1"
                          aria-hidden="true"
                        >
                          {typeIcons[item.type] || (
                            <Sparkles className="w-4 h-4 text-secondary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-semibold text-primary-900 truncate leading-tight">
                            {item.title}
                          </span>
                          <span className="block text-xs text-primary-600 truncate leading-snug">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ms-2">
                        {item.badge && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-primary-700 ring-1 ring-inset ring-primary/10">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight
                          className={`w-3.5 h-3.5 rtl:rotate-180 transition-[opacity,transform] duration-fast ease-out ${isSelected ? "opacity-100 text-primary-700 translate-x-0" : "opacity-0 -translate-x-1 rtl:translate-x-1"}`}
                          aria-hidden="true"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!hasResults && (
                <p
                  className="p-8 text-center text-meta text-primary-600"
                  role="status"
                >
                  {query
                    ? tPalette("noResultsFor", { query })
                    : tPalette("typeToSearch")}
                </p>
              )}
            </div>

            {/* Palette Footer Hints */}
            <div
              id={hintId}
              className="py-2.5 px-5 bg-darnaBg-100 border-t border-primary/[0.06] flex items-center justify-between gap-2 text-xs text-primary-600"
            >
              <span className="flex items-center gap-2">
                <span>{tPalette.rich("navigateHint", { kbd })}</span>
                <span>{tPalette.rich("selectHint", { kbd })}</span>
              </span>
              <span className="text-xs text-primary-600 hidden sm:inline">
                {tPalette("tipLabel")}{" "}
                <bdi dir="ltr" className="font-mono">
                  type:host wilaya:oran
                </bdi>
              </span>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
