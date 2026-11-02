"use client";

import type { IconProps } from "@/components/icons/BrandIcons";
import React from "react";
import {
  BrandMenuIcon,
  BrandCompassIcon,
  BrandHeartIcon,
  BrandMessageIcon,
  BrandBellIcon,
  BrandBriefcaseIcon,
  BrandBookingsIcon,
  BrandHomeIcon,
  BrandUserIcon,
  BrandSettingsIcon,
  BrandAlertCircleIcon,
  BrandArrowRightIcon,
  BrandSparklesIcon,
  BrandUserAddIcon,
} from "@/components/icons";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Avatar, DropdownMenu, cn, focusRing, type DropdownItem } from "@/components/ui";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { User } from "@/types";
import { logoutAndRedirect, readHostDraft } from "@/lib/client/user-storage";

interface UserMenuProps {
  currentUser?: User | null;
}

/** Account menu: kit DropdownMenu (role="menu", arrow keys, animated entrance from the trigger corner). */
export default function UserMenu({ currentUser }: UserMenuProps) {
  const router = useRouter();
  const openLogin = useLoginModal((s) => s.onOpen);
  const openRegister = useRegisterModal((s) => s.onOpen);
  const t = useTranslations("nav");

  const isHost = Boolean(currentUser?.hostType);

  const goHostMode = () => {
    try {
      localStorage.setItem("darna_mode", "host");
    } catch {
      // Storage can be unavailable (private mode); the host area still works.
    }
    router.push("/host");
  };

  const handleHostAction = () => {
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
      if (draft.isAgencyFlow) target = "/become-a-host/agency";
      else if (typeof draft.currentStep === "number" && draft.currentStep > 0) target = `/become-a-host/${draft.currentStep}`;
    }
    router.push(target);
  };

  const icon = (Icon: React.ComponentType<IconProps>, extra?: string) => <Icon size={18} className={extra} />;

  const items: DropdownItem[] = currentUser
    ? [
        {
          label: isHost ? t("switchToHosting") : t("becomeHost"),
          description: isHost ? t("hostModeBadge") : t("startBadge"),
          icon: icon(BrandSparklesIcon, "text-accent-600"),
          onSelect: handleHostAction,
        },
        { type: "separator" },
        { type: "label", label: t("travelActivity") },
        { label: t("tripsBookings"), href: "/trips", icon: icon(BrandCompassIcon) },
        { label: t("wishlists"), href: "/favorites", icon: icon(BrandHeartIcon) },
        { label: t("messages"), href: "/messages", icon: icon(BrandMessageIcon) },
        { label: t("notifications"), href: "/notifications", icon: icon(BrandBellIcon) },
        ...(isHost
          ? ([
              { type: "separator" },
              { type: "label", label: t("hostingTools") },
              { label: t("hostWorkspace"), icon: icon(BrandBriefcaseIcon), onSelect: goHostMode },
              { label: t("hostReservations"), href: "/reservations", icon: icon(BrandBookingsIcon) },
              { label: t("manageProperties"), href: "/host/listings", icon: icon(BrandHomeIcon) },
            ] as DropdownItem[])
          : []),
        { type: "separator" },
        { type: "label", label: t("accountSupport") },
        { label: t("profilePassport"), href: "/profile", icon: icon(BrandUserIcon) },
        { label: t("accountSettings"), href: "/settings", icon: icon(BrandSettingsIcon) },
        { label: t("helpCenter"), href: "/help", icon: icon(BrandAlertCircleIcon) },
        { type: "separator" },
        { label: t("logOut"), icon: icon(BrandArrowRightIcon, "rtl:rotate-180"), onSelect: () => void logoutAndRedirect("/") },
      ]
    : [
        { label: t("login"), icon: icon(BrandUserIcon), onSelect: openLogin },
        { label: t("signUp"), icon: icon(BrandUserAddIcon), onSelect: openRegister },
        { type: "separator" },
        { label: t("becomeHost"), icon: icon(BrandSparklesIcon, "text-accent-600"), onSelect: openLogin },
        { label: t("helpCenter"), href: "/help", icon: icon(BrandAlertCircleIcon) },
      ];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleHostAction}
        className={cn(
          "hidden xl:inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-primary-900 cursor-pointer select-none",
          "transition-colors duration-fast ease-standard hover:bg-primary/[0.06]",
          focusRing
        )}
      >
        {isHost ? t("switchToHosting") : t("becomeHost")}
      </button>

      <DropdownMenu
        ariaLabel={t("userMenu")}
        align="end"
        className="w-72 max-w-[calc(100vw-1.5rem)] rounded-3xl p-2 shadow-e4"
        items={items}
        trigger={
          <button
            type="button"
            aria-label={t("userMenu")}
            className={cn(
              "relative flex h-11 shrink-0 items-center gap-2 rounded-full bg-white ps-3 pe-1 shadow-e1 cursor-pointer select-none",
              "transition-shadow duration-fast ease-standard hover:shadow-e2 aria-expanded:shadow-e2",
              focusRing
            )}
          >
            <BrandMenuIcon size={17} className="text-primary-800" />
            {currentUser ? (
              <Avatar name={currentUser.name || currentUser.email || "BLADUS"} src={currentUser.image ?? undefined} size="sm" decorative />
            ) : (
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-800 text-white">
                <BrandUserIcon size={16} />
              </span>
            )}
          </button>
        }
      />
    </div>
  );
}
