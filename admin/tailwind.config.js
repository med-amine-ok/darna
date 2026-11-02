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
        // Earthy Minimal Palette
        primary: {
          DEFAULT: "#2E3A2F",
          50: "#F4F5F4",
          100: "#E5E8E5",
          200: "#C7CDC6",
          300: "#A4AEA3",
          400: "#7E8D7C",
          500: "#5C6C5A",
          600: "#455243",
          700: "#364135",
          800: "#2E3A2F",
          900: "#1E261F",
          950: "#121713",
        },
        secondary: {
          DEFAULT: "#6B7F5B",
          50: "#F5F7F3",
          100: "#E8EDE3",
          200: "#D3DDC9",
          300: "#B7C7AA",
          400: "#96AC85",
          500: "#7A9168",
          600: "#6B7F5B",
          700: "#536446",
          800: "#424F38",
          900: "#35402E",
          950: "#1F261B",
        },
        tertiary: {
          DEFAULT: "#D9C9B2",
          50: "#FAF8F5",
          100: "#F4EFE7",
          200: "#E9DFD0",
          300: "#D9C9B2",
          400: "#C5B193",
          500: "#B09875",
          600: "#967F5E",
          700: "#79654A",
          800: "#61523D",
          900: "#4E4232",
          950: "#31291E",
        },
        accent: {
          DEFAULT: "#C96F4F",
          50: "#FCF6F4",
          100: "#F9EAE5",
          200: "#F3D4C9",
          300: "#E9B4A3",
          400: "#DC8D74",
          500: "#C96F4F",
          600: "#B65634",
          700: "#974426",
          800: "#7C3922",
          900: "#65301F",
          950: "#3A180E",
        },
        darnaBg: {
          DEFAULT: "#F8F6EE",
          50: "#FDFDFB",
          100: "#FAF9F4",
          200: "#F8F6EE",
          300: "#EFECE0",
          400: "#E3DEC9",
          500: "#D2CBB0",
          600: "#B8B092",
          700: "#958E72",
          800: "#767059",
          900: "#5F5A47",
          950: "#3C392C",
        },
        // Off-palette families remapped onto tints/shades of the five BLADUS hues
        // (no new hues): neutral = warm ink/sand greys; emerald (success) = olive;
        // rose/red (danger) = terracotta; amber (warning) = ochre between sand and
        // terracotta; blue/purple = olive/ink. neutral-500+ keeps >= 4.5:1 on #F8F6EE.
        neutral: {
          50: "#F7F6F2",
          100: "#EFEDE7",
          200: "#E2DFD6",
          300: "#CBC7BB",
          400: "#A19D90",
          500: "#6B6C61",
          600: "#55574D",
          700: "#424539",
          800: "#2F3329",
          900: "#1F231C",
          950: "#141712",
        },
        emerald: {
          50: "#F5F7F3",
          100: "#E8EDE3",
          200: "#D3DDC9",
          300: "#B7C7AA",
          400: "#96AC85",
          500: "#7A9168",
          600: "#5F7350",
          700: "#4C5D40",
          800: "#3D4A34",
          900: "#313C2A",
          950: "#1F261B",
        },
        rose: {
          50: "#FCF6F4",
          100: "#F9EAE5",
          200: "#F3D4C9",
          300: "#E9B4A3",
          400: "#DC8D74",
          500: "#C96F4F",
          600: "#B65634",
          700: "#974426",
          800: "#7C3922",
          900: "#65301F",
          950: "#3A180E",
        },
        red: {
          50: "#FCF6F4",
          100: "#F9EAE5",
          200: "#F3D4C9",
          300: "#E9B4A3",
          400: "#DC8D74",
          500: "#C96F4F",
          600: "#B65634",
          700: "#974426",
          800: "#7C3922",
          900: "#65301F",
          950: "#3A180E",
        },
        amber: {
          50: "#FBF6EE",
          100: "#F5EAD8",
          200: "#EBD5B4",
          300: "#DDBB8B",
          400: "#CF9F68",
          500: "#BE8550",
          600: "#A56C3C",
          700: "#85552F",
          800: "#6A4427",
          900: "#573822",
          950: "#33200F",
        },
        blue: {
          50: "#F5F7F3",
          100: "#E8EDE3",
          200: "#D3DDC9",
          300: "#B7C7AA",
          400: "#96AC85",
          500: "#6B7F5B",
          600: "#536446",
          700: "#424F38",
          800: "#35402E",
          900: "#2A3325",
          950: "#1F261B",
        },
        purple: {
          50: "#F4F5F4",
          100: "#E5E8E5",
          200: "#C7CDC6",
          300: "#A4AEA3",
          400: "#7E8D7C",
          500: "#5C6C5A",
          600: "#455243",
          700: "#364135",
          800: "#2E3A2F",
          900: "#1E261F",
          950: "#121713",
        },
        sky: {
          50: "#F5F7F3",
          100: "#E8EDE3",
          200: "#D3DDC9",
          300: "#B7C7AA",
          400: "#96AC85",
          500: "#6B7F5B",
          600: "#536446",
          700: "#424F38",
          800: "#35402E",
          900: "#2A3325",
          950: "#1F261B",
        },
        // Semantic status tones (palette-derived).
        status: {
          red: "#B65634",
          amber: "#A56C3C",
          green: "#5F7350",
          info: "#455243",
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
        e1: "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
        e2: "0 0 0 1px rgba(30,38,31,0.04), 0 2px 4px rgba(30,38,31,0.05), 0 8px 20px -4px rgba(30,38,31,0.10)",
        e3: "0 0 0 1px rgba(30,38,31,0.04), 0 4px 8px rgba(30,38,31,0.05), 0 16px 36px -8px rgba(30,38,31,0.16)",
        e4: "0 0 0 1px rgba(30,38,31,0.05), 0 12px 24px rgba(30,38,31,0.08), 0 32px 64px -12px rgba(30,38,31,0.24)",
        e5: "0 0 0 1px rgba(30,38,31,0.05), 0 12px 24px rgba(30,38,31,0.08), 0 32px 64px -12px rgba(30,38,31,0.24), 0 48px 96px -24px rgba(30,38,31,0.30)",
        highlight: "inset 0 1px 0 rgba(255,255,255,0.6)",
        glow: "0 0 0 1px rgba(201,111,79,0.18), 0 8px 24px -6px rgba(182,86,52,0.45)",
        "2xs": "0 0 0 1px rgba(30,38,31,0.04), 0 1px 2px rgba(30,38,31,0.05)",
        xs: "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
        sm: "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
        DEFAULT:
          "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
        md: "0 0 0 1px rgba(30,38,31,0.04), 0 2px 4px rgba(30,38,31,0.05), 0 8px 20px -4px rgba(30,38,31,0.10)",
        lg: "0 0 0 1px rgba(30,38,31,0.04), 0 4px 8px rgba(30,38,31,0.05), 0 16px 36px -8px rgba(30,38,31,0.16)",
        xl: "0 0 0 1px rgba(30,38,31,0.05), 0 12px 24px rgba(30,38,31,0.08), 0 32px 64px -12px rgba(30,38,31,0.24)",
        "2xl":
          "0 0 0 1px rgba(30,38,31,0.05), 0 12px 24px rgba(30,38,31,0.08), 0 32px 64px -12px rgba(30,38,31,0.24)",
        "darna-sm":
          "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
        darna:
          "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
        "darna-card":
          "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
        "darna-hover":
          "0 0 0 1px rgba(30,38,31,0.04), 0 2px 4px rgba(30,38,31,0.05), 0 8px 20px -4px rgba(30,38,31,0.10)",
        "darna-dropdown":
          "0 0 0 1px rgba(30,38,31,0.04), 0 4px 8px rgba(30,38,31,0.05), 0 16px 36px -8px rgba(30,38,31,0.16)",
        "darna-widget":
          "0 0 0 1px rgba(30,38,31,0.04), 0 4px 8px rgba(30,38,31,0.05), 0 16px 36px -8px rgba(30,38,31,0.16)",
        "darna-lg":
          "0 0 0 1px rgba(30,38,31,0.04), 0 4px 8px rgba(30,38,31,0.05), 0 16px 36px -8px rgba(30,38,31,0.16)",
        "darna-modal":
          "0 0 0 1px rgba(30,38,31,0.05), 0 12px 24px rgba(30,38,31,0.08), 0 32px 64px -12px rgba(30,38,31,0.24)",
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
