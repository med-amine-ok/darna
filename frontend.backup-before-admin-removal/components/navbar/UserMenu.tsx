"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { BrandMenuIcon } from "@/components/icons";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import Avatar from "@/components/Avatar";
import MenuItem from "./MenuItem";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { User } from "@/types";

interface UserMenuProps {
  currentUser?: User | null;
}

export default function UserMenu({ currentUser }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();
  const tNav = useTranslations("nav");

  const isHost = Boolean(currentUser?.hostType);

  const handleHostAction = () => {
    setIsOpen(false);
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }
    if (isHost) {
      try {
        localStorage.setItem("darna_mode", "host");
      } catch (e) {}
      router.push("/host");
    } else {
      let target = "/become-a-host";
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("darna_host_draft");
          if (saved) {
            const draft = JSON.parse(saved);
            if (draft.isAgencyFlow) {
              target = "/become-a-host/agency";
            } else if (draft.currentStep && draft.currentStep > 0) {
              target = `/become-a-host/${draft.currentStep}`;
            }
          }
        } catch (e) {}
      }
      router.push(target);
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      document.cookie = "darna_user_id=; path=/; max-age=0";
      document.cookie = "darna_host_type=; path=/; max-age=0";
      document.cookie = "darna_mode=; path=/; max-age=0";
      document.cookie = "darna_agency_id=; path=/; max-age=0";
      localStorage.removeItem("darna_mode");
      localStorage.removeItem("darna_host_draft");
      window.location.href = "/";
    }
  };

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex flex-row items-center gap-3">
        {/* Become a Host or Switch to Hosting */}
        <button
          type="button"
          onClick={handleHostAction}
          className="hidden md:block text-xs sm:text-sm font-semibold py-2 px-3.5 rounded-full hover:bg-black/5 transition cursor-pointer text-primary select-none btn-press"
        >
          {isHost ? "Switch to hosting" : tNav("becomeHost") || "Become a host"}
        </button>

        {/* User Pill Button */}
        <button
          type="button"
          onClick={toggleOpen}
          aria-label="User navigation menu"
          className="p-1 sm:py-1.5 sm:px-2.5 border border-tertiary/80 flex flex-row items-center gap-1.5 sm:gap-2.5 rounded-full cursor-pointer hover:shadow-darna transition bg-white/95 backdrop-blur-sm select-none btn-press shrink-0"
        >
          <BrandMenuIcon size={16} className="text-neutral-700 ms-0.5 sm:ms-1 shrink-0" />
          <div className="hidden sm:block shrink-0">
            <Avatar src={currentUser?.image} size={30} />
          </div>
          <div className="sm:hidden shrink-0">
            <Avatar src={currentUser?.image} size={28} />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute rounded-2xl shadow-darna-dropdown w-64 max-w-[calc(100vw-24px)] bg-white overflow-hidden end-0 top-12 text-sm border border-tertiary/60 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col cursor-pointer">
            {currentUser ? (
              <>
                {/* 1. Mode Switcher Banner */}
                <div className="p-1.5 pb-2 border-b border-tertiary/40">
                  <button
                    type="button"
                    onClick={handleHostAction}
                    className="w-full text-start px-3 py-2 bg-primary/5 hover:bg-primary/10 rounded-xl font-bold text-primary transition flex items-center justify-between text-xs btn-press"
                  >
                    <span>{isHost ? "Switch to hosting" : "Become a host"}</span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-white font-black">
                      {isHost ? "Host Mode" : "Start"}
                    </span>
                  </button>
                </div>

                {/* 2. Travel & Activity */}
                <div className="py-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Travel & Activity
                  </div>
                  <MenuItem
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/trips");
                    }}
                    label="Trips & Bookings"
                  />
                  <MenuItem
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/favorites");
                    }}
                    label="Wishlist"
                  />
                  <MenuItem
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/messages");
                    }}
                    label="Messages"
                  />
                  <MenuItem
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/notifications");
                    }}
                    label="Notifications"
                  />
                </div>

                {/* 3. Host Workspace Quick Access */}
                {isHost && (
                  <div className="py-1 border-t border-tertiary/30">
                    <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                      Hosting Tools
                    </div>
                    <MenuItem
                      onClick={() => {
                        setIsOpen(false);
                        try {
                          localStorage.setItem("darna_mode", "host");
                        } catch (e) {}
                        router.push("/host");
                      }}
                      label="Host Workspace"
                      bold
                    />
                    <MenuItem
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/reservations");
                      }}
                      label="Host reservations"
                    />
                    <MenuItem
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/properties");
                      }}
                      label="Manage properties"
                    />
                  </div>
                )}

                {/* 4. Account & Support */}
                <div className="py-1 border-t border-tertiary/30">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Account & Support
                  </div>
                  <MenuItem
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/profile");
                    }}
                    label="Profile & Passport"
                  />
                  <MenuItem
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/settings");
                    }}
                    label="Account settings"
                  />
                  <MenuItem
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/help");
                    }}
                    label="Help Center"
                  />
                </div>

                <hr className="my-1 border-tertiary/30" />
                <MenuItem
                  onClick={handleLogout}
                  label="Log out"
                />
              </>
            ) : (
              <>
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    loginModal.onOpen();
                  }}
                  label={tNav("login") || "Log in"}
                  bold
                />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    registerModal.onOpen();
                  }}
                  label={tNav("signUp") || "Sign up"}
                />
                <hr className="my-1 border-tertiary/30" />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    loginModal.onOpen();
                  }}
                  label="Become a host"
                />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/help");
                  }}
                  label="Help Center"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
