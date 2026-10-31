"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { dur, ease, spring } from "@/lib/motion";

const DEFAULT_SECTIONS = ["photos", "amenities", "reviews", "location"] as const;
export type Section =
  | "photos"
  | "rooms"
  | "overview"
  | "amenities"
  | "included"
  | "specs"
  | "itinerary"
  | "policies"
  | "reviews"
  | "location";

/**
 * Desktop section bar that replaces the header once the gallery has scrolled away
 * (Airbnb detail pattern). Highlights the section in view with a sliding underline.
 */
export default function ListingSectionNav({
  rightSlot,
  sections,
}: {
  rightSlot?: React.ReactNode;
  /** Section ids (element ids on the page) in order. Labels come from listing.sectionNav. */
  sections?: readonly Section[];
}) {
  const SECTIONS: readonly Section[] = sections ?? DEFAULT_SECTIONS;
  const t = useTranslations("listing.sectionNav");
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Section>(SECTIONS[0]);
  const present = SECTIONS.filter((id) => typeof document !== "undefined" && document.getElementById(id));

  useEffect(() => {
    const gallery = document.getElementById("photos");
    if (!gallery) return;
    const show = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      threshold: 0,
      rootMargin: "-80px 0px 0px 0px",
    });
    show.observe(gallery);

    const spy = new IntersectionObserver(
      (entries) => {
        const inView = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inView[0]) setActive(inView[0].target.id as Section);
      },
      { rootMargin: "-90px 0px -55% 0px", threshold: 0 }
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
    return () => {
      show.disconnect();
      spy.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SECTIONS.join(",")]);

  const go = (id: Section) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <m.nav
          aria-label={t("label")}
          initial={{ y: -72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -72, opacity: 0 }}
          transition={{ duration: dur.base, ease: ease.out }}
          className="hidden md:block fixed top-0 inset-x-0 z-[45] glass border-b border-primary/[0.08] shadow-e1"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8 h-[72px] flex items-center justify-between gap-6">
            <ul className="flex items-center gap-7 h-full">
              {(present.length ? present : SECTIONS).map((id) => (
                <li key={id} className="relative h-full flex items-center">
                  <button
                    type="button"
                    onClick={() => go(id)}
                    aria-current={active === id ? "location" : undefined}
                    className={`text-sm font-semibold transition-colors duration-fast rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-4 ${
                      active === id ? "text-primary-900" : "text-primary-500 hover:text-primary-900"
                    }`}
                  >
                    {t(id)}
                  </button>
                  {active === id && (
                    <m.span layoutId="listing-section-underline" transition={spring.layout} className="absolute bottom-0 inset-x-0 h-0.5 rounded-full bg-primary-900" />
                  )}
                </li>
              ))}
            </ul>
            {rightSlot}
          </div>
        </m.nav>
      )}
    </AnimatePresence>
  );
}
