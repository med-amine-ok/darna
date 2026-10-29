"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { BrandMenuIcon } from "@/components/icons";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import Avatar from "@/components/Avatar";
import MenuItem from "./MenuItem";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { useDismiss, handleMenuKeyDown, focusFirstMenuItem } from "@/hook/useDismiss";
import { User } from "@/types";
import { logoutAndRedirect, readHostDraft } from "@/lib/client/user-storage";

interface UserMenuProps {
  currentUser?: User | null;
}

function MenuGroupLabel({
  id,
  children,
  tone = "neutral",
}: {
  id: string;
  children: React.ReactNode;
  tone?: "neutral" | "secondary";
}) {
  return (
    <div
      id={id}
      className={`px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        tone === "secondary" ? "text-secondary-700" : "text-neutral-600"
      }`}
    >
      {children}
    </div>
  );
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function UserMenu({ currentUser }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const openLogin = useLoginModal((s) => s.onOpen);
  const openRegister = useRegisterModal((s) => s.onOpen);
  const t = useTranslations("nav");

  const isHost = Boolean(currentUser?.hostType);

  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(isOpen, containerRef, close, triggerRef);

  useEffect(() => {
    if (isOpen) focusFirstMenuItem(menuRef.current);
  }, [isOpen]);

  const go = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const goHostMode = () => {
    try {
      localStorage.setItem("darna_mode", "host");
    } catch {
      // Storage can be unavailable (private mode); the host area still works.
    }
    go("/host");
  };

  const handleHostAction = () => {
    setIsOpen(false);
    if (!currentUser) {
      openLogin();
      return;
    }
    if (isHost) {
      goHostMode();
      return;
    }
    let target = "/become-a-host";
    const draft = readHostDraft(currentUser.id);
    if (draft) {
      if (draft.isAgencyFlow) {
        target = "/become-a-host/agency";
      } else if (typeof draft.currentStep === "number" && draft.currentStep > 0) {
        target = `/become-a-host/${draft.currentStep}`;
      }
    }
    router.push(target);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logoutAndRedirect("/");
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-row items-center gap-3">
        {/* Become a Host or Switch to Hosting */}
        <button
          type="button"
          onClick={handleHostAction}
          className={`hidden xl:block text-xs sm:text-sm font-semibold py-2 px-3.5 rounded-full hover:bg-black/5 transition cursor-pointer text-primary select-none btn-press ${focusRing}`}
        >
          {isHost ? t("switchToHosting") : t("becomeHost")}
        </button>

        {/* User Pill Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={t("userMenu")}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          className={`p-1 sm:py-1.5 sm:px-2.5 border border-tertiary/80 flex flex-row items-center gap-1.5 sm:gap-2.5 rounded-full cursor-pointer hover:shadow-darna transition bg-white/95 backdrop-blur-sm select-none btn-press shrink-0 ${focusRing}`}
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
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t("userMenu")}
          onKeyDown={handleMenuKeyDown}
          className="absolute rounded-2xl shadow-darna-dropdown w-64 max-w-[calc(100vw-24px)] bg-white overflow-hidden end-0 top-12 text-sm border border-tertiary/60 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {currentUser ? (
            <>
              {/* 1. Mode Switcher Banner */}
              <div className="p-1.5 pb-2 border-b border-tertiary/40">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleHostAction}
                  className="w-full text-start px-3 py-2 bg-primary/5 hover:bg-primary/10 rounded-xl font-bold text-primary transition flex items-center justify-between text-xs btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  <span>{isHost ? t("switchToHosting") : t("becomeHost")}</span>
                  <span
                    aria-hidden="true"
                    className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-white font-bold"
                  >
                    {isHost ? t("hostModeBadge") : t("startBadge")}
                  </span>
                </button>
              </div>

              {/* 2. Travel & Activity */}
              <div role="group" aria-labelledby={`${menuId}-travel`} className="py-1">
                <MenuGroupLabel id={`${menuId}-travel`}>{t("travelActivity")}</MenuGroupLabel>
                <MenuItem onClick={() => go("/trips")} label={t("tripsBookings")} />
                <MenuItem onClick={() => go("/favorites")} label={t("wishlists")} />
                <MenuItem onClick={() => go("/messages")} label={t("messages")} />
                <MenuItem onClick={() => go("/notifications")} label={t("notifications")} />
              </div>

              {/* 3. Host Workspace Quick Access */}
              {isHost && (
                <div role="group" aria-labelledby={`${menuId}-host`} className="py-1 border-t border-tertiary/30">
                  <MenuGroupLabel id={`${menuId}-host`} tone="secondary">
                    {t("hostingTools")}
                  </MenuGroupLabel>
                  <MenuItem onClick={goHostMode} label={t("hostWorkspace")} bold />
                  <MenuItem onClick={() => go("/reservations")} label={t("hostReservations")} />
                  <MenuItem onClick={() => go("/host/listings")} label={t("manageProperties")} />
                </div>
              )}

              {/* 4. Account & Support */}
              <div role="group" aria-labelledby={`${menuId}-account`} className="py-1 border-t border-tertiary/30">
                <MenuGroupLabel id={`${menuId}-account`}>{t("accountSupport")}</MenuGroupLabel>
                <MenuItem onClick={() => go("/profile")} label={t("profilePassport")} />
                <MenuItem onClick={() => go("/settings")} label={t("accountSettings")} />
                <MenuItem onClick={() => go("/help")} label={t("helpCenter")} />
              </div>

              <hr className="my-1 border-tertiary/30" />
              <MenuItem onClick={handleLogout} label={t("logOut")} />
            </>
          ) : (
            <>
              <MenuItem
                onClick={() => {
                  setIsOpen(false);
                  openLogin();
                }}
                label={t("login")}
                bold
              />
              <MenuItem
                onClick={() => {
                  setIsOpen(false);
                  openRegister();
                }}
                label={t("signUp")}
              />
              <hr className="my-1 border-tertiary/30" />
              <MenuItem
                onClick={() => {
                  setIsOpen(false);
                  openLogin();
                }}
                label={t("becomeHost")}
              />
              <MenuItem onClick={() => go("/help")} label={t("helpCenter")} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
