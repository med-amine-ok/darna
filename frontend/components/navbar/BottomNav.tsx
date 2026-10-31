"use client";

import React from "react";
import { usePathname, Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { LazyMotion, m } from "framer-motion";
import { BrandSearchIcon, BrandHeartIcon, BrandCompassIcon, BrandMessageIcon, BrandUserIcon } from "@/components/icons";
import { User } from "@/types";
import { Avatar, cn } from "@/components/ui";
import { spring } from "@/lib/motion";
import { useLoginModal } from "@/hook/useLoginModal";

interface BottomNavProps {
  currentUser?: User | null;
}

/** Layout features (shared-layout indicator), loaded lazily on top of the root feature set. */
const loadMaxFeatures = () => import("framer-motion").then((mod) => mod.domMax);

const itemBase =
  "relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] touch-manipulation cursor-pointer select-none rounded-2xl " +
  "transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600";

/** Guest bottom tab bar (phones): glass, terracotta active state with a sliding pill, safe-area aware. */
export default function BottomNav({ currentUser }: BottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const openLogin = useLoginModal((s) => s.onOpen);

  // Hidden in host mode, the become-a-host flow and open message threads.
  if (
    pathname?.startsWith("/host") ||
    pathname?.startsWith("/become-a-host") ||
    (pathname?.startsWith("/messages/") && pathname !== "/messages")
  ) {
    return null;
  }

  const isProfile = pathname === "/profile";
  const items = [
    { href: "/", label: t("explore"), Icon: BrandSearchIcon, active: pathname === "/" || pathname === "" || pathname === "/search", requiresAuth: false },
    { href: "/favorites", label: t("wishlists"), Icon: BrandHeartIcon, active: pathname === "/favorites", requiresAuth: true },
    { href: "/trips", label: t("trips"), Icon: BrandCompassIcon, active: pathname === "/trips", requiresAuth: true },
    { href: "/messages", label: t("messages"), Icon: BrandMessageIcon, active: pathname === "/messages", requiresAuth: true },
  ];

  const content = (active: boolean, icon: React.ReactNode, label: string) => (
    <>
      <span className="relative flex h-8 w-14 items-center justify-center">
        {active && <m.span layoutId="bottom-nav-active" transition={spring.layout} aria-hidden="true" className="absolute inset-0 rounded-full bg-accent-50 ring-1 ring-accent-500/15" />}
        <span className="relative">{icon}</span>
      </span>
      <span className={cn("text-[11px] leading-none", active ? "font-semibold" : "font-medium")}>{label}</span>
    </>
  );

  const tone = (active: boolean) => (active ? "text-accent-700" : "text-primary-600 hover:text-primary-900");

  return (
    <LazyMotion features={loadMaxFeatures}>
      <nav
        aria-label={t("mobileNavigation")}
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-primary/[0.08] px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(30,38,31,0.18)] md:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {items.map(({ href, label, Icon, active, requiresAuth }) => {
            const icon = <Icon size={22} strokeWidth={active ? 2.1 : 1.75} className={active && Icon === BrandHeartIcon ? "fill-accent-600" : undefined} />;
            if (requiresAuth && !currentUser) {
              return (
                <button key={href} type="button" onClick={openLogin} className={cn(itemBase, tone(active))}>
                  {content(active, icon, label)}
                </button>
              );
            }
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(itemBase, tone(active))}>
                {content(active, icon, label)}
              </Link>
            );
          })}

          {currentUser ? (
            <Link href="/profile" aria-current={isProfile ? "page" : undefined} className={cn(itemBase, tone(isProfile))}>
              {content(
                isProfile,
                currentUser.image ? (
                  <Avatar name={currentUser.name || "DARNA"} src={currentUser.image} size="xs" decorative />
                ) : (
                  <BrandUserIcon size={22} strokeWidth={isProfile ? 2.1 : 1.75} />
                ),
                t("profile")
              )}
            </Link>
          ) : (
            <button type="button" onClick={openLogin} className={cn(itemBase, tone(false))}>
              {content(false, <BrandUserIcon size={22} strokeWidth={1.75} />, t("logIn"))}
            </button>
          )}
        </div>
      </nav>
    </LazyMotion>
  );
}
