import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kid-friendly, vibrant color palette
        primary: {
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
        },
        fun: {
          pink: "#ff6b9d",
          purple: "#c084fc",
          cyan: "#22d3ee",
          green: "#4ade80",
          yellow: "#fbbf24",
          orange: "#fb923c",
          red: "#f87171",
        },
        surface: {
          light: "#fefce8",
          card: "#ffffff",
          dark: "#1e293b",
        },
      },
      fontFamily: {
        heading: ["Fredoka", "Comic Neue", "sans-serif"],
        body: ["Nunito", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        bubble: "1.5rem",
        card: "1rem",
      },
      animation: {
        "bounce-slow": "bounce 3s infinite",
        "float": "float 3s ease-in-out infinite",
        "wiggle": "wiggle 1s ease-in-out infinite",
        "pop": "pop 0.3s ease-out",
        "confetti": "confetti 1s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        pop: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateY(-200px) rotate(720deg)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
