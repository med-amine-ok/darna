/**
 * Centralized Design System Tokens — Earthy Minimal Palette
 * 
 * 1. Primary: #2E3A2F (Dark charcoal-green)
 * 2. Secondary: #6B7F5B (Sage green)
 * 3. Tertiary: #D9C9B2 (Warm tan/beige)
 * 4. Accent: #C96F4F (Terracotta)
 * 5. Background: #F8F6EE (Warm off-white)
 */

export const tokens = {
  colors: {
    primary: {
      DEFAULT: "#2E3A2F",
      50: "#F4F6F4",
      100: "#E6ECE6",
      200: "#CCD9CC",
      300: "#A8BEA8",
      400: "#7E9F7E",
      500: "#5B7F5C",
      600: "#446445",
      700: "#364F37",
      800: "#2E3A2F",
      900: "#242E25",
      950: "#141A14",
    },
    secondary: {
      DEFAULT: "#6B7F5B",
      50: "#F6F8F4",
      100: "#ECF1E7",
      200: "#DAE3D0",
      300: "#BED0AF",
      400: "#9FB98B",
      500: "#809F6A",
      600: "#6B7F5B",
      700: "#536446",
      800: "#435139",
      900: "#394331",
      950: "#1D2319",
    },
    tertiary: {
      DEFAULT: "#D9C9B2",
      50: "#FAF8F5",
      100: "#F4F0E9",
      200: "#E9DFD2",
      300: "#D9C9B2",
      400: "#C4AF92",
      500: "#B09676",
      600: "#987E60",
      700: "#7C654E",
      800: "#665443",
      900: "#554639",
      950: "#2D241D",
    },
    accent: {
      DEFAULT: "#C96F4F",
      50: "#FAF3F0",
      100: "#F5E4DE",
      200: "#ECCAC0",
      300: "#DFA99C",
      400: "#D4876F",
      500: "#C96F4F",
      600: "#B85837",
      700: "#9A4529",
      800: "#7F3A25",
      900: "#693323",
      950: "#39170E",
    },
    background: {
      DEFAULT: "#F8F6EE",
      50: "#FFFFFF",
      100: "#FCFBF7",
      200: "#F8F6EE",
      300: "#EFEBD9",
      400: "#E3DCC0",
      500: "#D4CBA2",
      600: "#BDAF7E",
      700: "#9E905D",
      800: "#7F7348",
      900: "#695E3C",
      950: "#38321F",
    },
    surface: {
      DEFAULT: "#FFFFFF",
      muted: "#F3EFE6",
    },
    status: {
      error: "#C0392B",
      warning: "#D9822B",
      success: "#587E54",
      info: "#4A7A8C",
    },
  },
} as const;

export default tokens;
