"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Search, Building, User, Calendar, Star, Sparkles, ArrowRight, X } from "lucide-react";
import { searchGlobalCommandPalette, CommandPaletteResult } from "@/lib/data/command-palette";
import { motion, AnimatePresence } from "framer-motion";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const tPalette = useTranslations("commandPalette");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandPaletteResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load results on query change
  useEffect(() => {
    let active = true;
    searchGlobalCommandPalette(query).then((res) => {
      if (active) {
        setResults(res);
        setSelectedIndex(0);
      }
    });
    return () => {
      active = false;
    };
  }, [query]);

  // Keyboard navigation & global Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }

      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSelect = (item: CommandPaletteResult) => {
    onClose();
    setQuery("");
    router.push(item.href);
  };

  const typeIcons: Record<string, React.ReactNode> = {
    host: <Building className="w-4 h-4 text-secondary shrink-0" />,
    listing: <Building className="w-4 h-4 text-primary shrink-0" />,
    user: <User className="w-4 h-4 text-[#79654A] shrink-0" />,
    booking: <Calendar className="w-4 h-4 text-[#8F3517] shrink-0" />,
    review: <Star className="w-4 h-4 text-amber-500 shrink-0" />,
    action: <Sparkles className="w-4 h-4 text-secondary shrink-0" />,
  };

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
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
          />

          {/* Palette Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-darna-modal border border-tertiary/80 overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="p-4 flex items-center gap-3 border-b border-tertiary/60 bg-darnaBg/40">
              <Search className="w-5 h-5 text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tPalette("placeholder")}
                className="w-full text-sm bg-transparent border-none text-primary placeholder:text-neutral-400 focus:outline-none"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 text-neutral-400 hover:text-primary transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded border border-neutral-200 bg-white shrink-0">
                ESC
              </span>
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1 darna-admin-scrollbar">
              {results.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  {tPalette("noResults")} "{query}"
                </div>
              ) : (
                results.map((item, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer select-none transition ${
                        isSelected
                          ? "bg-secondary/15 text-primary font-semibold"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white border border-tertiary/60 flex items-center justify-center shrink-0 shadow-2xs">
                          {typeIcons[item.type] || <Sparkles className="w-4 h-4 text-secondary" />}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-primary truncate leading-tight">
                            {item.title}
                          </span>
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
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 rtl:rotate-180" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Palette Footer Hints */}
            <div className="p-2.5 px-4 bg-darnaBg/50 border-t border-tertiary/50 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-2">
                <span>Navigate <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-neutral-200">↑</kbd> <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-neutral-200">↓</kbd></span>
                <span>Select <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-neutral-200">↵</kbd></span>
              </span>
              <span className="font-mono text-[10px] text-neutral-500">
                Tip: type:host wilaya:oran
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
