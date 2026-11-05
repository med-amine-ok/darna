"use client";

import React, { useState, useEffect, useRef } from "react";
import Container from "@/components/Container";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";
import { User } from "@/types";
import { useSearchModal } from "@/hook/useSearchModal";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDestinationLabel } from "@/hook/useDestinationLabel";
import Search from "./Search";
import NotificationsDropdown from "./NotificationsDropdown";
import { BrandPinIcon, BrandSearchIcon } from "@/components/icons";

interface NavbarProps {
  currentUser?: User | null;
  /**
   * Home page: the hero card carries the full search bar, so the header hides its own
   * compact search until the visitor scrolls past the hero (one search on screen at a time).
   */
  isHero?: boolean;
}

/** Scroll distance (px) after which the header search appears on the home page. */
const HERO_SEARCH_HANDOFF = 300;

export default function Navbar({ currentUser, isHero = false }: NavbarProps) {
  const openSearchModal = useSearchModal((s) => s.onOpen);
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const tSearch = useTranslations("search");
  const destinationLabel = useDestinationLabel();

  const destination = searchParams?.get("destination");

  // 0 = at the top of the home hero, 1 = hero search scrolled away (or any other page).
  const [scrollProgress, setScrollProgress] = useState(isHero ? 0 : 1);

  useEffect(() => {
    if (!isHero) {
      setScrollProgress(1);
      return;
    }
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const progress = Math.min(Math.max((window.scrollY - HERO_SEARCH_HANDOFF) / 80, 0), 1);
        setScrollProgress(progress);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHero]);

  const searchHidden = isHero && scrollProgress < 0.5;

  // `inert` keeps the hidden header search out of the tab order. React 18 has no boolean
  // `inert` prop, so it is toggled on the DOM node directly.
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    desktopSearchRef.current?.toggleAttribute("inert", searchHidden);
  }, [searchHidden]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-tertiary-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="py-2.5 sm:py-3 relative">
        <Container>
          <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 md:gap-0 min-h-[44px]">
            {/* Start: logo (horizontal on desktop; on mobile the icon once the header search shows) */}
            <div className="flex items-center shrink-0 z-50">
              <div className="hidden md:block">
                <Logo variant="horizontal" priority />
              </div>
              <div className="md:hidden relative flex items-center h-9">
                {searchHidden ? <Logo variant="horizontal" /> : <Logo variant="icon" />}
              </div>
            </div>

            {/* Desktop center: compact search pill (hidden over the home hero, which has its own bar) */}
            <div
              className={`hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-center pointer-events-none transition-[opacity,transform] duration-base ease-out ${
                searchHidden ? "opacity-0 translate-y-1" : "opacity-100"
              }`}
              aria-hidden={searchHidden || undefined}
              ref={desktopSearchRef}
            >
              <div className={`flex justify-center ${searchHidden ? "" : "pointer-events-auto"}`}>
                <Search />
              </div>
            </div>

            {/* Mobile center: search pill opening the search sheet */}
            <div className="md:hidden flex-1 min-w-0 flex items-center justify-center px-0.5">
              <button
                type="button"
                onClick={openSearchModal}
                tabIndex={searchHidden ? -1 : undefined}
                aria-hidden={searchHidden || undefined}
                aria-label={tNav("search")}
                className={`w-full max-w-[240px] h-11 flex items-center justify-between gap-2 ps-3.5 pe-1 min-[400px]:ps-4 rounded-full bg-white ring-1 ring-tertiary-300 shadow-e1 text-sm font-semibold text-primary-900 transition-[opacity,transform,box-shadow] duration-base ease-out cursor-pointer select-none hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                  searchHidden ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <BrandPinIcon size={15} strokeWidth={2} className="hidden text-accent-600 shrink-0 min-[400px]:block" />
                  <span className="truncate">
                    {destination ? (
                      destinationLabel(destination)
                    ) : (
                      <>
                        <span className="sm:hidden">{tNav("search")}</span>
                        <span className="hidden sm:inline">{tSearch("anywhereInAlgeria")}</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center shrink-0">
                  <BrandSearchIcon size={14} strokeWidth={2.4} className="text-white" />
                </span>
              </button>
            </div>

            {/* End: language, notifications, account */}
            <div className="flex items-center gap-0.5 sm:gap-2.5 shrink-0 z-50">
              <LanguageSwitcher />
              {currentUser && <NotificationsDropdown />}
              <UserMenu currentUser={currentUser} />
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
}
