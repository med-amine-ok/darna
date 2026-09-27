"use client";

import React, { useState, useEffect } from "react";
import { SafeUser } from "@/types";
import { usePathname } from "@/navigation";
import Container from "../Container";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import MainCategoryTabs from "./MainCategoryTabs";
import LanguageSwitcher from "./LanguageSwitcher";

type Props = {
  currentUser?: SafeUser | null;
};

function Navbar({ currentUser }: Props) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
        setIsSearchExpanded(false);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide consumer navbar on admin dashboard pages and become-a-host flow
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/become-a-host")) {
    return null;
  }

  const isLoginPage = pathname?.endsWith("/login");
  const showCompactSearch = isScrolled || !isHomePage;

  return (
    <header
      className={`${
        isLoginPage ? "hidden md:block border-b border-tertiary/40 bg-surface" : ""
      } fixed top-0 inset-x-0 w-full z-30 transition-all duration-200 ${
        !isLoginPage && (
          isScrolled
            ? "bg-surface/95 backdrop-blur-md shadow-xs border-b border-tertiary/40"
            : isHomePage
            ? "bg-background/90 backdrop-blur-md border-b border-transparent"
            : "bg-surface/95 backdrop-blur-md border-b border-tertiary/20"
        )
      }`}
    >
      <div className="py-2.5 sm:py-3.5">
        <Container>
          {/* Desktop Top Header Row */}
          <div className="hidden md:flex flex-row items-center justify-between gap-4">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Logo />
            </div>

            {/* Center: Search pill (hidden on login page; shown when scrolled or on subpages) */}
            {!isLoginPage && (
              <div className="flex-1 flex justify-center max-w-xl transition-all duration-200">
                {showCompactSearch && !isSearchExpanded ? (
                  <Search compact onExpand={() => setIsSearchExpanded(true)} />
                ) : null}
              </div>
            )}

            {/* Right: Become a host + Language Switcher + User Profile */}
            <div className="flex flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
              <LanguageSwitcher />
              <UserMenu currentUser={currentUser} />
            </div>
          </div>

          {/* Desktop Expanded Search Bar when user clicks compact search while scrolled */}
          {!isLoginPage && isSearchExpanded && (
            <div className="hidden md:block pt-3 pb-1 animate-in fade-in zoom-in-95 duration-150">
              <Search />
            </div>
          )}

          {/* Mobile Layout: Header Row + Tappable Search Bar (Hidden on login page) */}
          {!isLoginPage && (
            <div className="md:hidden flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <Logo />
                <div className="flex items-center gap-1.5">
                  <LanguageSwitcher />
                  <UserMenu currentUser={currentUser} />
                </div>
              </div>

              {/* Mobile Tappable Search Pill when scrolled or on subpages */}
              {showCompactSearch && (
                <div className="w-full animate-in fade-in duration-150">
                  <Search mobile />
                </div>
              )}
            </div>
          )}
        </Container>
      </div>
    </header>
  );
}

export default Navbar;
