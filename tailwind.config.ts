import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        secondary: {
          100: "#FAFAF9",
          200: "#E8E8E3",
          300: "#DDDDD5",
          400: "#D1D1C7",
          500: "#AEAE9D",
          600: "#8C8C73",
          700: "#70705C",
        },
        accent: {
          100: "#666666",
          200: "#4D4D4D",
          300: "#262626",
          400: "#0E0E0C",
        },
        brand: {
          50: "#EFF6FF",
          600: "#2563EB",
          700: "#1D4ED8",
        },
      },
      fontFamily: {
        sans: ['"Estedad Variable"', "Estedad", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
