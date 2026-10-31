import {
  El_Messiri,
  Fraunces,
  IBM_Plex_Sans_Arabic,
  Plus_Jakarta_Sans,
} from "next/font/google";

// Type system (docs/design/DESIGN-DIRECTION.md §3). CSS variables are mapped to
// the active script in styles/globals.css (--font-ui / --font-display), so
// `font-sans` / `font-serif` pick the Arabic faces automatically under dir="rtl".

/** UI / body (Latin). */
export const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

/** Display / editorial (Latin), variable with optical size + softness. */
export const fontDisplay = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
  display: "swap",
});

/** UI / body (Arabic). Only preloaded on the Arabic locale (see layout). */
export const fontArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
  preload: false,
});

/** Display (Arabic). */
export const fontArabicDisplay = El_Messiri({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-messiri",
  display: "swap",
  preload: false,
});

export const fontVariables = [
  fontSans,
  fontDisplay,
  fontArabic,
  fontArabicDisplay,
]
  .map((f) => f.variable)
  .join(" ");
