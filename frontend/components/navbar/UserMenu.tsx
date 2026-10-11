"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Menu } from "lucide-react";
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
          className="p-1 sm:py-1.5 sm:px-2.5 border border-tertiary/80 flex flex-row items-center gap-2.5 rounded-full cursor-pointer hover:shadow-darna transition bg-white/95 backdrop-blur-sm select-none btn-press"
        >
          <Menu size={16} className="text-neutral-700 ms-1" />
          <div className="hidden sm:block">
            <Avatar src={currentUser?.image} size={30} />
          </div>
          <div className="sm:hidden">
            <Avatar src={currentUser?.image} size={28} />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute rounded-2xl shadow-darna-dropdown w-[48vw] md:w-60 bg-white overflow-hidden end-0 top-12 text-sm border border-tertiary/60 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col cursor-pointer">
            {currentUser ? (
              <>
                <MenuItem
                  onClick={handleHostAction}
                  label={isHost ? "Switch to hosting" : "Become a host"}
                  bold
                />
                <hr className="my-1 border-tertiary/30" />
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
                    router.push("/trips");
                  }}
                  label="Trips"
                />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/favorites");
                  }}
                  label="Wishlist"
                />
                {isHost && (
                  <>
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
                  </>
                )}
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
                <hr className="my-1 border-tertiary/30" />
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
                <hr className="my-1 border-tertiary/30" />
                <MenuItem
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login");
                  }}
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
                    router.push("/become-a-host");
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
