/**
 * BLADUS admin design tokens, ported from frontend/tailwind.config.js (copied, not imported):
 * docs/design/DESIGN-DIRECTION.md §2–§4, §7 and §9 (admin translation).
 * Five hues only; every other Tailwind colour family is remapped onto their tints/shades.
 */
const plugin = require("tailwindcss/plugin");

/**
 * Minimal local stand-in for tailwindcss-animate (not installed in admin): makes the existing
 * `animate-in fade-in zoom-in-95 slide-in-from-*` utilities actually animate (CSS variables
 * composed by one keyframe, transform/opacity only).
 */
const enterAnimations = plugin(({ addUtilities, matchUtilities, theme }) => {
  addUtilities({
    ".animate-in": {
      animationName: "enter",
      animationDuration: "200ms",
      animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      animationFillMode: "both",
      "--tw-enter-opacity": "initial",
      "--tw-enter-scale": "initial",
      "--tw-enter-translate-x": "initial",
      "--tw-enter-translate-y": "initial",
    },
  });
  matchUtilities(
    { "fade-in": (value) => ({ "--tw-enter-opacity": value }) },
    { values: { DEFAULT: "0", 0: "0", 50: "0.5" } },
  );
  matchUtilities(
    { "zoom-in": (value) => ({ "--tw-enter-scale": value }) },
    { values: { DEFAULT: "0", 50: "0.5", 90: "0.9", 95: "0.95", 98: "0.98" } },
  );
  const offsets = { DEFAULT: "100%", ...theme("spacing") };
  matchUtilities(
    {
      "slide-in-from-top": (value) => ({
        "--tw-enter-translate-y": `-${value}`,
      }),
      "slide-in-from-bottom": (value) => ({ "--tw-enter-translate-y": value }),
      "slide-in-from-left": (value) => ({
        "--tw-enter-translate-x": `-${value}`,
      }),
      "slide-in-from-right": (value) => ({ "--tw-enter-translate-x": value }),
    },
    { values: offsets },
  );
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // BLADUS "Clear Blue" palette (2026-11): white canvas, navy ink, one action blue.
        // Contrast on white: primary-800 13.9:1, accent-600 6.4:1, secondary-600 5.4:1,
        // neutral-500 4.8:1 (minimum for text). See docs/design/PALETTE.md.
        // primary = navy ink (text, dark surfaces, secondary buttons)
        primary: {
          DEFAULT: "#152C52",
          50: "#F1F5FB",
          100: "#E2EAF5",
          200: "#C3D3EA",
          300: "#97B1D8",
          400: "#5F86C0",
          500: "#3A63A3",
          600: "#2A4C85",
          700: "#1F3B6B",
          800: "#152C52",
          900: "#0E1F3B",
          950: "#08132A",
        },
        // secondary = sky blue (secondary actions, chips, highlights)
        secondary: {
          DEFAULT: "#0E6FAD",
          50: "#EEF8FD",
          100: "#D7EEFA",
          200: "#B0DCF5",
          300: "#7CC4EE",
          400: "#3FA5E2",
          500: "#1A88CC",
          600: "#0E6FAD",
          700: "#0D5A8C",
          800: "#104B73",
          900: "#123F60",
          950: "#0B283F",
        },
        // tertiary = cool hairlines and quiet surfaces (was sand)
        tertiary: {
          DEFAULT: "#D3DCE8",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E4EAF2",
          300: "#D3DCE8",
          400: "#B4C1D3",
          500: "#94A3B8",
          600: "#64748B",
          700: "#475569",
          800: "#334155",
          900: "#1E293B",
          950: "#0F172A",
        },
        // accent = action blue (primary buttons, links, focus, selected states)
        accent: {
          DEFAULT: "#0B57D0",
          50: "#EFF5FF",
          100: "#DBE8FF",
          200: "#BED5FF",
          300: "#91B8FF",
          400: "#5C92FA",
          500: "#2F6EF0",
          600: "#0B57D0",
          700: "#0846AB",
          800: "#0A3B8A",
          900: "#0E336F",
          950: "#0B2147",
        },
        // page background: white; 300+ are pale blue bands for alternating sections
        darnaBg: {
          DEFAULT: "#FFFFFF",
          50: "#FFFFFF",
          100: "#FFFFFF",
          200: "#FFFFFF",
          300: "#F5F8FC",
          400: "#EBF0F7",
          500: "#D3DCE8",
          600: "#94A3B8",
          700: "#64748B",
          800: "#475569",
          900: "#334155",
          950: "#1E293B",
        },
        // cool slate greys; neutral-500 is the lightest allowed for text (4.8:1)
        neutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        emerald: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#022C22",
        },
        rose: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
          800: "#9F1239",
          900: "#881337",
          950: "#4C0519",
        },
        red: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
        },
        amber: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          950: "#451A03",
        },
        blue: {
          50: "#EFF5FF",
          100: "#DBE8FF",
          200: "#BED5FF",
          300: "#91B8FF",
          400: "#5C92FA",
          500: "#2F6EF0",
          600: "#0B57D0",
          700: "#0846AB",
          800: "#0A3B8A",
          900: "#0E336F",
          950: "#0B2147",
        },
        purple: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
          950: "#2E1065",
        },
        sky: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
          950: "#082F49",
        },
        // Status tones (AA on white)
        status: {
          red: "#DC2626",
          amber: "#D97706",
          green: "#16A34A",
          error: "#B91C1C",
          warning: "#B45309",
          success: "#15803D",
          info: "#2A4C85",
        },
      },
      // Type system, see docs/design/DESIGN-DIRECTION.md §3. The CSS variables
      // --font-ui / --font-display switch to the Arabic faces under dir="rtl".
      fontFamily: {
        sans: [
          "var(--font-ui)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "var(--font-display)",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        display: ["var(--font-display)", "Georgia", "serif"],
        // Prices/KPIs used font-mono and fell back to Courier: map to the UI face (tabular-nums in globals.css).
        mono: ["var(--font-ui)", "system-ui", "sans-serif"],
        arabic: [
          "var(--font-plex-arabic)",
          "IBM Plex Sans Arabic",
          "Tahoma",
          "sans-serif",
        ],
      },
      fontSize: {
        // Admin density (§9): the smallest running text is 13px (= meta); 11px only for micro badges.
        xs: ["0.8125rem", { lineHeight: "1.25rem" }],
        md: ["1rem", { lineHeight: "1.5rem" }],
        // Fluid editorial scale (375 → 1440px).
        "display-xl": [
          "clamp(2.75rem, 1.9rem + 3.6vw, 4.75rem)",
          { lineHeight: "1.02", letterSpacing: "-0.025em" },
        ],
        "display-lg": [
          "clamp(2.125rem, 1.6rem + 2.3vw, 3.5rem)",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
        "display-md": [
          "clamp(1.75rem, 1.45rem + 1.25vw, 2.5rem)",
          { lineHeight: "1.1", letterSpacing: "-0.015em" },
        ],
        heading: [
          "clamp(1.375rem, 1.25rem + 0.55vw, 1.75rem)",
          { lineHeight: "1.2", letterSpacing: "-0.01em" },
        ],
        title: [
          "clamp(1.0625rem, 1rem + 0.2vw, 1.1875rem)",
          { lineHeight: "1.35", letterSpacing: "-0.005em" },
        ],
        "body-lg": ["1.0625rem", { lineHeight: "1.6" }],
        body: ["0.9375rem", { lineHeight: "1.6" }],
        meta: ["0.8125rem", { lineHeight: "1.45" }],
        eyebrow: ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.14em" }],
      },
      backdropBlur: {
        xs: "2px",
        glass: "18px",
      },
      // Radius scale: 6 / 8 / 10 / 14 / 20 (cards, images) / 28 (hero tiles, sheets) / pill.
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2rem",
      },
      // Elevation e0–e5: hairline ring + soft layers, tinted with ink (primary-900), never black.
      // The stock shadow-* names are remapped so every existing use moves onto the scale.
      boxShadow: {
        e1: "0 0 0 1px rgba(14,31,59,0.05), 0 1px 2px rgba(14,31,59,0.05), 0 2px 6px rgba(14,31,59,0.05)",
        e2: "0 0 0 1px rgba(14,31,59,0.04), 0 2px 4px rgba(14,31,59,0.05), 0 8px 20px -4px rgba(14,31,59,0.10)",
        e3: "0 0 0 1px rgba(14,31,59,0.04), 0 4px 8px rgba(14,31,59,0.05), 0 16px 36px -8px rgba(14,31,59,0.16)",
        e4: "0 0 0 1px rgba(14,31,59,0.05), 0 12px 24px rgba(14,31,59,0.08), 0 32px 64px -12px rgba(14,31,59,0.24)",
        e5: "0 0 0 1px rgba(14,31,59,0.05), 0 12px 24px rgba(14,31,59,0.08), 0 32px 64px -12px rgba(14,31,59,0.24), 0 48px 96px -24px rgba(14,31,59,0.30)",
        highlight: "inset 0 1px 0 rgba(255,255,255,0.6)",
        glow: "0 0 0 1px rgba(11,87,208,0.18), 0 8px 24px -6px rgba(182,86,52,0.45)",
        "2xs": "0 0 0 1px rgba(14,31,59,0.04), 0 1px 2px rgba(14,31,59,0.05)",
        xs: "0 0 0 1px rgba(14,31,59,0.05), 0 1px 2px rgba(14,31,59,0.05), 0 2px 6px rgba(14,31,59,0.05)",
        sm: "0 0 0 1px rgba(14,31,59,0.05), 0 1px 2px rgba(14,31,59,0.05), 0 2px 6px rgba(14,31,59,0.05)",
        DEFAULT:
          "0 0 0 1px rgba(14,31,59,0.05), 0 1px 2px rgba(14,31,59,0.05), 0 2px 6px rgba(14,31,59,0.05)",
        md: "0 0 0 1px rgba(14,31,59,0.04), 0 2px 4px rgba(14,31,59,0.05), 0 8px 20px -4px rgba(14,31,59,0.10)",
        lg: "0 0 0 1px rgba(14,31,59,0.04), 0 4px 8px rgba(14,31,59,0.05), 0 16px 36px -8px rgba(14,31,59,0.16)",
        xl: "0 0 0 1px rgba(14,31,59,0.05), 0 12px 24px rgba(14,31,59,0.08), 0 32px 64px -12px rgba(14,31,59,0.24)",
        "2xl":
          "0 0 0 1px rgba(14,31,59,0.05), 0 12px 24px rgba(14,31,59,0.08), 0 32px 64px -12px rgba(14,31,59,0.24)",
        "darna-sm":
          "0 0 0 1px rgba(14,31,59,0.05), 0 1px 2px rgba(14,31,59,0.05), 0 2px 6px rgba(14,31,59,0.05)",
        darna:
          "0 0 0 1px rgba(14,31,59,0.05), 0 1px 2px rgba(14,31,59,0.05), 0 2px 6px rgba(14,31,59,0.05)",
        "darna-card":
          "0 0 0 1px rgba(14,31,59,0.05), 0 1px 2px rgba(14,31,59,0.05), 0 2px 6px rgba(14,31,59,0.05)",
        "darna-hover":
          "0 0 0 1px rgba(14,31,59,0.04), 0 2px 4px rgba(14,31,59,0.05), 0 8px 20px -4px rgba(14,31,59,0.10)",
        "darna-dropdown":
          "0 0 0 1px rgba(14,31,59,0.04), 0 4px 8px rgba(14,31,59,0.05), 0 16px 36px -8px rgba(14,31,59,0.16)",
        "darna-widget":
          "0 0 0 1px rgba(14,31,59,0.04), 0 4px 8px rgba(14,31,59,0.05), 0 16px 36px -8px rgba(14,31,59,0.16)",
        "darna-lg":
          "0 0 0 1px rgba(14,31,59,0.04), 0 4px 8px rgba(14,31,59,0.05), 0 16px 36px -8px rgba(14,31,59,0.16)",
        "darna-modal":
          "0 0 0 1px rgba(14,31,59,0.05), 0 12px 24px rgba(14,31,59,0.08), 0 32px 64px -12px rgba(14,31,59,0.24)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        micro: "120ms",
        fast: "200ms",
        base: "280ms",
        slow: "450ms",
        page: "600ms",
      },
      zIndex: {
        header: "40",
        sticky: "30",
        dropdown: "50",
        overlay: "80",
        modal: "90",
        toast: "100",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        enter: {
          from: {
            opacity: "var(--tw-enter-opacity, 1)",
            transform:
              "translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1))",
          },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite",
      },
    },
  },
  plugins: [
    require("tailwind-scrollbar")({ nocompatible: true }),
    enterAnimations,
  ],
};
