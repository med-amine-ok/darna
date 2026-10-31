"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useVertical } from "@/hook/useVertical";
import { useSearchModal } from "@/hook/useSearchModal";
import { findDestination } from "@/components/search/destinations";
import ArchImage from "@/components/ui/ArchImage";
import { imagery } from "@/lib/imagery";
import { dur, ease, spring } from "@/lib/motion";
import { ListingVertical } from "@/types";
import {
  BrandCompassIcon,
  BrandPinIcon,
  BrandSearchIcon,
  BrandShieldIcon,
  BrandStarIcon,
  BrandTagIcon,
  CategoryHotelIcon,
  CategoryHouseIcon,
  CategoryVehicleIcon,
} from "@/components/icons";

export interface PromoData {
  /** Destination values (as used in `?destination=`), shown with their localized names. */
  cities: string[];
}

export const DEFAULT_PROMO_DATA: PromoData = {
  cities: [
    "Tipaza",
    "Algiers",
    "Oran",
    "Constantine",
    "Taghit",
    "Djanet",
    "Ghardaïa",
    "Tlemcen",
    "Annaba",
  ],
};

const VERTICAL_TABS: {
  id: ListingVertical;
  labelKey:
    | "tabHomes"
    | "tabHotels"
    | "tabExperiences"
    | "tabVehicles"
    | "tabTrips";
  Icon: typeof CategoryHouseIcon;
}[] = [
  { id: "home", labelKey: "tabHomes", Icon: CategoryHouseIcon },
  { id: "hotel", labelKey: "tabHotels", Icon: CategoryHotelIcon },
  { id: "experience", labelKey: "tabExperiences", Icon: BrandPinIcon },
  { id: "vehicle", labelKey: "tabVehicles", Icon: CategoryVehicleIcon },
  { id: "trip", labelKey: "tabTrips", Icon: BrandCompassIcon },
];

type GalleryKey = "constantine" | "ghardaia" | "tassili" | "algiers" | "taghit";

/**
 * Phones and tablets: five small arches in a centred row under the copy (three on phones):
 * small, medium, tall centre, medium, small; the outer ones sit higher, a gentle arc.
 * `depth` picks the parallax layer.
 */
const GALLERY: {
  key: GalleryKey;
  src: string;
  w: number;
  sizes: string;
  priority: boolean;
  position: string;
  delay: number;
  depth: "back" | "mid" | "front";
  className: string;
}[] = [
  { key: "constantine", src: imagery.constantineBridge, w: 600, sizes: "(min-width: 1024px) 160px, 15vw", priority: false, position: "object-center", delay: 300, depth: "front", className: "hidden md:block w-[15%] mb-20" },
  { key: "ghardaia", src: imagery.ghardaia, w: 800, sizes: "(min-width: 1024px) 230px, 30vw", priority: true, position: "object-center", delay: 150, depth: "back", className: "w-[29%] md:w-[21%] mb-8" },
  { key: "tassili", src: imagery.tassiliArch, w: 1100, sizes: "(min-width: 1024px) 320px, 40vw", priority: true, position: "object-[50%_60%]", delay: 0, depth: "mid", className: "relative z-10 w-[40%] md:w-[28%]" },
  { key: "algiers", src: imagery.algiersBay, w: 800, sizes: "(min-width: 1024px) 230px, 30vw", priority: true, position: "object-center", delay: 150, depth: "back", className: "w-[29%] md:w-[21%] mb-8" },
  { key: "taghit", src: imagery.dunesGolden, w: 600, sizes: "(min-width: 1024px) 160px, 15vw", priority: false, position: "object-center", delay: 300, depth: "front", className: "hidden md:block w-[15%] mb-20" },
];

/**
 * Desktop (lg+): the same arches scattered behind the copy, framing it on both sides at
 * different heights (they stay in the side margins so the text never sits on a photo).
 * `bob` offsets their slow float so they never move in step.
 */
const SCATTER: { key: GalleryKey; pos: string; bob: string }[] = [
  { key: "tassili", pos: "start-[1%] top-[2%] w-[14%]", bob: "0s" },
  { key: "constantine", pos: "start-[13%] bottom-[3%] w-[9%]", bob: "-3s" },
  { key: "ghardaia", pos: "start-[16.5%] top-[6%] w-[6.5%]", bob: "-1.5s" },
  { key: "algiers", pos: "end-[1%] top-[10%] w-[13%]", bob: "-4.5s" },
  { key: "taghit", pos: "end-[14%] bottom-[0%] w-[9%]", bob: "-2s" },
];

/** Floating badges: pop in, then bob gently (still under reduced motion). */
const BADGES = [
  { key: "chipRating", Icon: BrandStarIcon, tone: "bg-accent-50 text-accent-600", delay: 700, bob: "0s", pos: "start-[1%] md:start-[9%] top-[38%]", desk: "start-[6%] top-[46%]" },
  { key: "chipPay", Icon: BrandTagIcon, tone: "bg-tertiary-100 text-primary-700", delay: 1000, bob: "-2s", pos: "hidden", desk: "end-[11%] top-[2%]" },
  { key: "chipVerified", Icon: BrandShieldIcon, tone: "bg-secondary-50 text-secondary-700", delay: 850, bob: "-4s", pos: "end-[1%] md:end-[10%] bottom-[4%]", desk: "end-[3%] top-[62%]" },
] as const;

function Badge({ badge, className, label }: { badge: (typeof BADGES)[number]; className: string; label: string }) {
  const { Icon, tone, delay, bob } = badge;
  return (
    <div className={`absolute z-20 ${className}`}>
      <div className="enter-pop" style={{ animationDelay: `${delay}ms` }}>
        <div className="float-soft glass-light shadow-e3 rounded-2xl ps-2.5 pe-3.5 py-2 flex items-center gap-2" style={{ animationDelay: bob }}>
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${tone}`}>
            <Icon size={16} />
          </span>
          <span className="text-meta font-semibold text-primary-900 whitespace-nowrap">{label}</span>
        </div>
      </div>
    </div>
  );
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg";

export default function HomeHero({
  promoData = DEFAULT_PROMO_DATA,
}: {
  promoData?: PromoData;
}) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("homeHero");
  const tDest = useTranslations("search.destinations");
  const openSearchModal = useSearchModal((s) => s.onOpen);
  const activeVertical = useVertical((s) => s.activeVertical);
  const setActiveVertical = useVertical((s) => s.setActiveVertical);
  const reduceMotion = useReducedMotion();

  // Gentle parallax on the arch row (disabled for reduced motion).
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const yBack = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -60]);
  const yMid = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -110]);
  const yFront = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -30]);
  const depthY = { back: yBack, mid: yMid, front: yFront };

  // Rotating destination in the promo line; pauses on hover/focus (WCAG 2.2.2) and for reduced motion.
  const [cityIndex, setCityIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  useEffect(() => {
    if (isPaused || reduceMotion) return;
    const timer = setInterval(
      () => setCityIndex((i) => (i + 1) % promoData.cities.length),
      3200,
    );
    return () => clearInterval(timer);
  }, [promoData.cities.length, isPaused, reduceMotion]);

  const currentCity = promoData.cities[cityIndex];
  const known = findDestination(currentCity);
  const currentCityLabel = known ? tDest(`${known.key}.name`) : currentCity;

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden pt-[5.5rem] md:pt-[9.5rem] pb-10 md:pb-16"
      aria-labelledby="home-hero-title"
    >
      {/* Background: paper grain, soft sand and sage glows and a faint zellige band (all decorative). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute inset-0 texture-grain opacity-70" />
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[60rem] h-[46rem] rounded-full bg-[radial-gradient(closest-side,rgba(233,223,208,0.8),rgba(233,223,208,0))]" />
        <div className="absolute bottom-0 start-[-12%] w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(232,237,227,0.85),rgba(232,237,227,0))]" />
        <div className="absolute bottom-0 end-[-12%] w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(232,237,227,0.85),rgba(232,237,227,0))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 texture-zellige opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]" />
      </div>

      {/* ── Copy, centred ───────────────────────────────── */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1360px] flex-col items-center px-4 text-center sm:px-6 lg:px-10 lg:py-14">
        {/* Desktop: arches scattered behind the copy, in the side margins, floating gently. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
          {SCATTER.map(({ key, pos, bob }) => {
            const g = GALLERY.find((x) => x.key === key)!;
            return (
              <m.div key={key} style={{ y: depthY[g.depth] }} className={`absolute ${pos}`}>
                <div className="enter-rise" style={{ animationDelay: `${g.delay}ms` }}>
                  <div className="float-soft" style={{ animationDelay: bob, animationDuration: "8s" }}>
                    <ArchImage
                      src={`${g.src}?auto=format&fit=crop&w=${Math.round(g.w * 0.6)}&q=80`}
                      alt=""
                      sizes="(min-width: 1024px) 200px, 1px"
                      objectPosition={g.position}
                    />
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>
        <div className="hidden lg:block">
          {BADGES.map((b) => (
            <Badge key={b.key} badge={b} className={b.desk} label={t(b.key)} />
          ))}
        </div>

        {/* Mobile search pill (desktop uses the header search, which docks on scroll). */}
        <div className="md:hidden mb-8 w-full -mt-2 enter-up">
          <button
            type="button"
            onClick={openSearchModal}
            className={`w-full flex items-center gap-3 p-2 ps-4 rounded-full bg-white shadow-e3 text-start active:scale-[0.98] transition-transform duration-micro ${focusRing}`}
          >
            <BrandPinIcon size={18} className="text-accent-600 shrink-0" />
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-primary-900 truncate">{t("whereTo")}</span>
              <span className="text-meta text-primary-500 truncate">{t("anywhereAnyWeek")}</span>
            </span>
            <span className="w-11 h-11 rounded-full bg-cta text-white flex items-center justify-center shadow-glow shrink-0">
              <BrandSearchIcon size={18} strokeWidth={2.2} />
              <span className="sr-only">{t("search")}</span>
            </span>
          </button>
        </div>

        <p className="inline-flex items-center gap-3 text-eyebrow uppercase font-semibold text-secondary-700 enter-up" style={{ animationDelay: "60ms" }}>
          <span aria-hidden="true" className="h-px w-8 bg-secondary-600/60" />
          {t("eyebrow")}
          <span aria-hidden="true" className="h-px w-8 bg-secondary-600/60" />
        </p>

        {/* Brand line in Algerian Arabic, decorative signature, always RTL. */}
        {!isRtl && (
          <p
            style={{ animationDelay: "120ms" }}
            lang="ar"
            dir="rtl"
            className="mt-5 font-[family-name:var(--font-messiri)] text-2xl text-accent-700/90 leading-none enter-up"
          >
            {t("brandLine")}
          </p>
        )}

        <h1
          id="home-hero-title"
          style={{ animationDelay: "180ms" }}
          className="mt-4 mx-auto font-serif text-display-xl text-primary-900 max-w-[16ch] text-balance enter-lift"
        >
          {t("headlineLead")}{" "}
          <em className="not-italic text-secondary-700 [font-variation-settings:'SOFT'_100,'opsz'_144]">{t("headlineAccent")}</em>
        </h1>

        <p className="mt-5 mx-auto text-body-lg text-primary-600 max-w-[52ch] text-pretty enter-lift" style={{ animationDelay: "260ms" }}>
          {t("lede")}
        </p>

        {/* Promo line with rotating destination */}
        <p
          style={{ animationDelay: "330ms" }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-2 text-title text-primary-800 enter-up"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          {t.rich("promoLine", {
            city: () => (
              <span className="relative inline-flex justify-center overflow-hidden align-bottom h-[1.4em] min-w-[6ch]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.span
                    key={currentCity}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: dur.base, ease: ease.out }}
                    className="inline-block"
                  >
                    <Link
                      href={{ pathname: "/search", query: { destination: currentCity } }}
                      className={`font-serif text-accent-700 underline decoration-accent-300 decoration-1 underline-offset-[6px] hover:decoration-accent-600 transition-colors rounded ${focusRing}`}
                    >
                      {currentCityLabel}
                    </Link>
                  </m.span>
                </AnimatePresence>
              </span>
            ),
          })}
        </p>

        {/* Vertical switcher with a sliding indicator (shared layout). */}
        <div
          role="group"
          aria-label={t("verticalSwitcher")}
          style={{ animationDelay: "420ms" }}
          className="enter-up relative mt-8 max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none"
        >
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-white/80 shadow-e2 ring-1 ring-white/60">
            {VERTICAL_TABS.map(({ id, labelKey, Icon }) => {
              const isActive = activeVertical === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveVertical(id)}
                  className={`relative shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors duration-fast ease-standard ${focusRing} ${
                    isActive ? "text-white" : "text-primary-700 hover:text-primary-900"
                  }`}
                >
                  {isActive && (
                    <m.span
                      layoutId="hero-vertical-indicator"
                      transition={spring.layout}
                      className="absolute inset-0 rounded-full bg-primary-800 shadow-e2"
                      aria-hidden="true"
                    />
                  )}
                  <Icon size={18} className={`relative ${isActive ? "text-tertiary-200" : "text-secondary-600"}`} />
                  <span className="relative whitespace-nowrap">{t(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Arch row, centred under the copy, with floating badges ── */}
      <div className="relative mx-auto mt-10 md:mt-12 w-full max-w-[1180px] px-4 sm:px-6 lg:hidden">
        <div className="relative flex items-end justify-center gap-3 sm:gap-5 lg:gap-7">
          {GALLERY.map((g) => (
            <m.div key={g.key} style={{ y: depthY[g.depth] }} className={g.className}>
              <div className="enter-rise" style={{ animationDelay: `${g.delay}ms` }}>
                <ArchImage
                  src={`${g.src}?auto=format&fit=crop&w=${g.w}&q=80`}
                  alt={t(`imageAlt.${g.key}`)}
                  sizes={g.sizes}
                  priority={g.priority}
                  objectPosition={g.position}
                />
              </div>
            </m.div>
          ))}

          {BADGES.map((b) => (
            <Badge key={b.key} badge={b} className={b.pos} label={t(b.key)} />
          ))}
        </div>
      </div>
    </section>
  );
}

