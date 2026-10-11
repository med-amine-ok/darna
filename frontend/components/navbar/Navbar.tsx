"use client";

import React, { useState, useEffect } from "react";
import Container from "@/components/Container";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";
import { User } from "@/types";
import { Search as SearchIcon, Bell } from "lucide-react";
import { useSearchModal } from "@/hook/useSearchModal";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import Search from "./Search";
import NotificationsDropdown from "./NotificationsDropdown";

interface NavbarProps {
  currentUser?: User | null;
  isHero?: boolean;
}

export default function Navbar({ currentUser, isHero = false }: NavbarProps) {
  const searchModal = useSearchModal();
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");

  const destination = searchParams?.get("destination");
  const vertical = searchParams?.get("vertical");

  // Continuous scroll progress: 0 (at top) to 1 (scrolled past hero)
  const [scrollProgress, setScrollProgress] = useState(isHero ? 0 : 1);

  useEffect(() => {
    if (!isHero) {
      setScrollProgress(1);
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          // Start transforming immediately: 0px to 90px
          const progress = Math.min(Math.max((scrollY - 5) / 85, 0), 1);
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHero]);

  // Navbar dynamic styles based on scroll progress
  const navBackgroundStyle = isHero
    ? {
        backgroundColor: `rgba(255, 255, 255, ${scrollProgress * 0.95})`,
        backdropFilter: scrollProgress > 0.05 ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrollProgress > 0.05 ? "blur(12px)" : "none",
        borderBottomColor:
          scrollProgress > 0.4 ? "rgba(217, 201, 178, 0.6)" : "transparent",
        boxShadow:
          scrollProgress > 0.7
            ? "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)"
            : "none",
      }
    : undefined;

  return (
    <header
      style={navBackgroundStyle}
      className={`w-full z-40 transition-colors duration-200 ${
        isHero
          ? "fixed top-0 start-0 border-b border-transparent"
          : "sticky top-0 bg-white/95 backdrop-blur-md border-b border-tertiary/60 shadow-2xs"
      }`}
    >
      <div className="py-2.5 sm:py-3.5 relative">
        <Container>
          <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 md:gap-0 min-h-[44px]">
            {/* Start: Logo */}
            <div className="flex items-center shrink-0 z-50">
              <Logo variant="horizontal" />
            </div>

            {/* Desktop Center: The continuous scroll-transform Search Bar (Immune to RTL flip) */}
            <div className="hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-center pointer-events-none">
              <div className="pointer-events-auto flex justify-center">
                <Search
                  isHero={isHero}
                  scrollProgress={scrollProgress}
                />
              </div>
            </div>

            {/* Mobile Center/Inline Search Button */}
            <div className="md:hidden flex-1 px-2 flex justify-center">
              {(!isHero || scrollProgress > 0.3) && (
                <button
                  type="button"
                  onClick={searchModal.onOpen}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-full border border-tertiary bg-white shadow-xs text-xs font-semibold text-primary truncate max-w-[190px] transition-all"
                  style={{
                    opacity: isHero ? Math.min(1, (scrollProgress - 0.2) * 2) : 1,
                    transform: isHero
                      ? `scale(${0.9 + scrollProgress * 0.1})`
                      : "scale(1)",
                  }}
                >
                  <Image
                    src="/assets/location.png"
                    alt="Location"
                    width={13}
                    height={13}
                    className="object-contain shrink-0"
                  />
                  <span className="truncate">
                    {destination || "Anywhere in Algeria"}
                  </span>
                </button>
              )}
            </div>

            {/* End: LanguageSwitcher + Notifications + UserMenu */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink-0 z-50">
              <LanguageSwitcher />
              <NotificationsDropdown />
              <UserMenu currentUser={currentUser} />
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
}
