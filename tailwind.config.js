/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      maxWidth: {
        darna: "1760px",
        airbnb: "1760px",
      },
      colors: {
        // Earthy Minimal Core Palette
        primary: {
          50: "#F4F6F4",
          100: "#E5EAE5",
          200: "#CBD5CB",
          300: "#A7B7A7",
          400: "#7A917A",
          500: "#556B55",
          600: "#425442",
          700: "#374537",
          800: "#2E3A2F",
          900: "#263027",
          950: "#131914",
          DEFAULT: "#2E3A2F", // dark charcoal-green
        },
        secondary: {
          50: "#F5F7F3",
          100: "#E8EDE3",
          200: "#D3DDC9",
          300: "#B4C5A5",
          400: "#91AA7E",
          500: "#6B7F5B",
          600: "#576849",
          700: "#45523B",
          800: "#394332",
          900: "#31392B",
          DEFAULT: "#6B7F5B", // sage green
        },
        tertiary: {
          50: "#FBF9F6",
          100: "#F5F0E8",
          200: "#EAE0D3",
          300: "#D9C9B2",
          400: "#C6B296",
          500: "#AF9677",
          600: "#9A8062",
          700: "#7F674E",
          800: "#675440",
          900: "#544434",
          DEFAULT: "#D9C9B2", // warm tan/beige
        },
        accent: {
          50: "#FBF5F2",
          100: "#F7EAE4",
          200: "#EFD3C7",
          300: "#E4B5A3",
          400: "#D6917A",
          500: "#C96F4F",
          600: "#B65737",
          700: "#97452A",
          800: "#7C3B25",
          900: "#673423",
          950: "#38180E",
          DEFAULT: "#C96F4F", // terracotta
        },
        background: {
          50: "#FCFBF7",
          100: "#F8F6EE",
          200: "#F1EDE0",
          300: "#E6DFC9",
          400: "#D7CCA9",
          500: "#C2B386",
          DEFAULT: "#F8F6EE", // warm off-white
        },
        surface: {
          DEFAULT: "#FFFFFF",
          warm: "#FAF9F5",
          elevated: "#FFFFFF",
        },
        // Earthy status / semantic colors
        status: {
          success: "#587E54",
          "success-bg": "#EBF2EB",
          warning: "#D9822B",
          "warning-bg": "#FBF3EB",
          error: "#C0392B",
          "error-bg": "#FAF0EE",
          info: "#4A7A8C",
          "info-bg": "#EDF4F7",
        },
        // Brand aliases
        darna: {
          DEFAULT: "#C96F4F",
          hover: "#B65737",
          dark: "#97452A",
          light: "#FBF5F2",
          primary: "#2E3A2F",
          secondary: "#6B7F5B",
          tertiary: "#D9C9B2",
          bg: "#F8F6EE",
        },
        airbnb: {
          DEFAULT: "#C96F4F",
          hover: "#B65737",
          dark: "#97452A",
          light: "#FBF5F2",
        },
      },
      boxShadow: {
        darna: "0 6px 16px rgba(46, 58, 47, 0.08)",
        "darna-card": "0 2px 8px rgba(46, 58, 47, 0.06)",
        "darna-search": "0 3px 12px rgba(46, 58, 47, 0.08)",
        "darna-modal": "0 8px 28px rgba(46, 58, 47, 0.22)",
        airbnb: "0 6px 16px rgba(46, 58, 47, 0.08)",
        "airbnb-card": "0 2px 8px rgba(46, 58, 47, 0.06)",
        "airbnb-search": "0 3px 12px rgba(46, 58, 47, 0.08)",
        "airbnb-modal": "0 8px 28px rgba(46, 58, 47, 0.22)",
      },
    },
  },
  plugins: [require("tailwind-scrollbar")],
};
