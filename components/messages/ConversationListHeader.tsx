"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FiSearch, FiSettings, FiX } from "react-icons/fi";
import { ConversationCategory, MessageSettings } from "@/types";

interface Props {
  activeCategory: ConversationCategory;
  onSelectCategory: (category: ConversationCategory) => void;
  unreadOnly: boolean;
  onToggleUnread: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unreadCountTotal: number;
}

export default function ConversationListHeader({
  activeCategory,
  onSelectCategory,
  unreadOnly,
  onToggleUnread,
  searchQuery,
  onSearchChange,
  unreadCountTotal,
}: Props) {
  const t = useTranslations("messages");
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<MessageSettings>({
    soundEnabled: true,
    readReceipts: true,
    emailNotifications: true,
  });

  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when toggled open
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories: { key: ConversationCategory; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "guests", label: t("filterGuests") },
    { key: "hosting", label: t("filterHosting") },
    { key: "support", label: t("filterSupport") },
  ];

  const currentCategoryLabel =
    categories.find((c) => c.key === activeCategory)?.label || t("filterAll");

  return (
    <div className="flex flex-col bg-white border-b border-neutral-200 px-4 pt-4 pb-3 flex-shrink-0 select-none">
      {/* Row 1: Header or Search Input */}
      <div className="h-11 flex items-center justify-between gap-2">
        {isSearchOpen ? (
          <div className="flex-1 flex items-center gap-2 bg-neutral-100 rounded-full px-3 py-1.5 transition-all">
            <FiSearch size={16} className="text-neutral-500 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                setIsSearchOpen(false);
              }}
              className="text-neutral-400 hover:text-neutral-700 transition p-1 cursor-pointer"
              aria-label="Close search"
            >
              <FiX size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                {t("title")}
              </h1>
              {unreadCountTotal > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-accent rounded-full">
                  {unreadCountTotal}
                </span>
              )}
            </div>

            {/* Action buttons on the right */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search messages"
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <FiSearch size={17} />
              </button>

              <div className="relative" ref={settingsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  aria-label="Message settings"
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isSettingsOpen
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700"
                  }`}
                >
                  <FiSettings size={17} />
                </button>

                {/* Settings Dropdown Popover */}
                {isSettingsOpen && (
                  <div className="absolute top-full end-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 px-1">
                      {t("settings")}
                    </div>
                    <div className="space-y-2 text-sm text-neutral-800">
                      <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <span>{t("soundEnabled")}</span>
                        <input
                          type="checkbox"
                          checked={settings.soundEnabled}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, soundEnabled: e.target.checked }))
                          }
                          className="w-4 h-4 accent-neutral-900 cursor-pointer rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <span>{t("readReceipts")}</span>
                        <input
                          type="checkbox"
                          checked={settings.readReceipts}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, readReceipts: e.target.checked }))
                          }
                          className="w-4 h-4 accent-neutral-900 cursor-pointer rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <span>{t("emailNotifications")}</span>
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              emailNotifications: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-neutral-900 cursor-pointer rounded"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Row 2: Filter Controls */}
      <div className="flex items-center gap-2 mt-3">
        {/* Category Pill Dropdown */}
        <div className="relative" ref={categoryMenuRef}>
          <button
            type="button"
            onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-800 transition-colors cursor-pointer shadow-2xs"
          >
            <span>{currentCategoryLabel}</span>
            <span className="text-[10px]">▾</span>
          </button>

          {isCategoryMenuOpen && (
            <div className="absolute top-full start-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-neutral-200 py-1.5 z-40 animate-in fade-in duration-100">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.key);
                    setIsCategoryMenuOpen(false);
                  }}
                  className={`w-full text-start px-3.5 py-2 text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                    activeCategory === cat.key
                      ? "bg-neutral-100 font-semibold text-primary"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span>{cat.label}</span>
                  {activeCategory === cat.key && <span className="text-primary font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Unread Pill Toggle */}
        <button
          type="button"
          onClick={onToggleUnread}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
            unreadOnly
              ? "bg-accent text-white border-accent shadow-2xs"
              : "bg-white text-neutral-700 border-tertiary hover:border-primary"
          }`}
        >
          {t("filterUnread")}
        </button>
      </div>
    </div>
  );
}
