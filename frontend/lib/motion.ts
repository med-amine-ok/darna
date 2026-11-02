import type { Transition, Variants } from "framer-motion";

/**
 * BLADUS motion vocabulary (docs/design/DESIGN-DIRECTION.md §7).
 * Framer Motion for stateful animation; CSS transitions only for hover colour/shadow
 * (Tailwind `duration-fast` + `ease-standard`). Only transform/opacity animate.
 */

export const dur = {
  micro: 0.12,
  fast: 0.2,
  base: 0.28,
  slow: 0.45,
  page: 0.6,
} as const;

export const ease = {
  /** Entrances, the Stripe/Airbnb family. */
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Moves between two on-screen positions. */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  /** Hover/press colour & shadow (Airbnb measured). */
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
};

export const spring = {
  press: {
    type: "spring",
    stiffness: 500,
    damping: 30,
    mass: 0.6,
  } satisfies Transition,
  sheet: { type: "spring", stiffness: 380, damping: 36 } satisfies Transition,
  layout: { type: "spring", stiffness: 420, damping: 38 } satisfies Transition,
  pop: { type: "spring", stiffness: 520, damping: 18 } satisfies Transition,
};

export const STAGGER = 0.05;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.slow, ease: ease.out },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: dur.base, ease: ease.out } },
};

export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: dur.base, ease: ease.out },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: dur.fast, ease: ease.standard },
  },
};

/** Horizontal entrance that mirrors under RTL: "start" means from the reading start edge. */
export function slideIn(
  from: "start" | "end",
  isRtl: boolean,
  distance = 24,
): Variants {
  const sign = (from === "start" ? -1 : 1) * (isRtl ? -1 : 1);
  return {
    hidden: { opacity: 0, x: sign * distance },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: dur.slow, ease: ease.out },
    },
    exit: {
      opacity: 0,
      x: sign * distance * 0.5,
      transition: { duration: dur.fast, ease: ease.standard },
    },
  };
}

export function stagger(each = STAGGER, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: each, delayChildren } },
  };
}

/** Press feedback for buttons/cards: spread onto a motion element. */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: spring.press,
} as const;

/** Viewport options for reveal-on-scroll (fires once). */
export const revealViewport = {
  once: true,
  amount: 0.05,
  margin: "0px 0px 12% 0px",
} as const;
