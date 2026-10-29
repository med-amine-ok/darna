"use client";

import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Search, Building, User, Calendar, Star, Sparkles, ArrowRight, X } from "lucide-react";
import { searchGlobalCommandPalette } from "@/lib/actions/command-palette";
import type { CommandPaletteResult } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const kbd = (chunks: React.ReactNode) => (
  <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-neutral-200">{chunks}</kbd>
);

/**
 * Global search palette — WAI-ARIA combobox (input) + listbox (results)
 * inside a modal dialog. Arrow keys move the active option, Enter opens it,
 * Escape closes; focus returns to the opener.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
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
    [onClose, router]
  );

  // Keep the active option visible.
  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(optionId(selectedIndex))?.scrollIntoView({ block: "nearest" });
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
    user: <User className="w-4 h-4 text-[#79654A] shrink-0" />,
    booking: <Calendar className="w-4 h-4 text-[#8F3517] shrink-0" />,
    review: <Star className="w-4 h-4 text-amber-500 shrink-0" />,
    action: <Sparkles className="w-4 h-4 text-secondary shrink-0" />,
  };

  const hasResults = results.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-20 p-4 text-start">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
          />

          {/* Palette Modal */}
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-darna-modal border border-tertiary/80 overflow-hidden z-10"
          >
            <h2 id={titleId} className="sr-only">
              {tPalette("title")}
            </h2>

            {/* Search Input Bar */}
            <div className="p-4 flex items-center gap-3 border-b border-tertiary/60 bg-darnaBg/40 focus-within:ring-2 focus-within:ring-inset focus-within:ring-accent-600">
              <Search className="w-5 h-5 text-neutral-400 shrink-0" aria-hidden="true" />
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
                aria-activedescendant={hasResults && results[selectedIndex] ? optionId(selectedIndex) : undefined}
                aria-describedby={hintId}
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={tPalette("placeholder")}
                className="w-full text-sm bg-transparent border-none text-primary placeholder:text-neutral-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label={tPalette("clear")}
                  className="p-1 rounded text-neutral-500 hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <kbd className="text-[10px] text-neutral-500 font-mono px-1.5 py-0.5 rounded border border-neutral-200 bg-white shrink-0">
                Esc
              </kbd>
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto p-2 darna-admin-scrollbar">
              <ul
                id={listboxId}
                role="listbox"
                aria-label={tPalette("resultsLabel")}
                className="space-y-1"
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
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer select-none transition ${
                        isSelected
                          ? "bg-secondary/15 text-primary font-semibold ring-2 ring-inset ring-secondary/50"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg bg-white border border-tertiary/60 flex items-center justify-center shrink-0 shadow-2xs"
                          aria-hidden="true"
                        >
                          {typeIcons[item.type] || <Sparkles className="w-4 h-4 text-secondary" />}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-primary truncate leading-tight">{item.title}</span>
                          <span className="block text-[11px] text-neutral-500 truncate leading-snug">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ms-2">
                        {item.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-tertiary/60 uppercase">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 rtl:rotate-180" aria-hidden="true" />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!hasResults && (
                <p className="p-8 text-center text-xs text-neutral-500" role="status">
                  {query ? tPalette("noResultsFor", { query }) : tPalette("typeToSearch")}
                </p>
              )}
            </div>

            {/* Palette Footer Hints */}
            <div
              id={hintId}
              className="p-2.5 px-4 bg-darnaBg/50 border-t border-tertiary/50 flex items-center justify-between gap-2 text-[11px] text-neutral-600"
            >
              <span className="flex items-center gap-2">
                <span>{tPalette.rich("navigateHint", { kbd })}</span>
                <span>{tPalette.rich("selectHint", { kbd })}</span>
              </span>
              <span className="text-[10px] text-neutral-600">
                {tPalette("tipLabel")}{" "}
                <bdi dir="ltr" className="font-mono">
                  type:host wilaya:oran
                </bdi>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
