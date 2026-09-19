import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        dark: {
          bg: "#080a14",
          surface: "rgba(18, 22, 44, 0.75)",
          elevated: "rgba(25, 30, 58, 0.85)",
          border: "rgba(139, 92, 246, 0.2)",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(37, 99, 235, 0.35)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.35)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        pulseGlow: {
          "0%": { backgroundColor: "rgba(37, 99, 235, 0.35)", boxShadow: "0 0 16px rgba(37, 99, 235, 0.4)" },
          "50%": { backgroundColor: "rgba(37, 99, 235, 0.18)" },
          "100%": { backgroundColor: "transparent" },
        }
      }
    },
  },
  plugins: [],
};
export default config;