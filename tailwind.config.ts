import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dock: {
          950: "#0F1013",
          900: "#16171B",
          800: "#212227",
          700: "#2C2D33",
          600: "#3A3B42",
        },
        chalk: "#F2F0E9",
        amber: {
          DEFAULT: "#F5A623",
          dim: "#B97C1A",
        },
        alert: "#FF4433",
        go: "#3FBF7F",
      },
      fontFamily: {
        display: [
          '"Arial Black"',
          '"Archivo Black"',
          "Impact",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          '"SF Mono"',
          "Menlo",
          '"JetBrains Mono"',
          "Consolas",
          "monospace",
        ],
      },
      backgroundImage: {
        hazard:
          "repeating-linear-gradient(135deg, #F5A623 0px, #F5A623 10px, #16171B 10px, #16171B 20px)",
      },
      keyframes: {
        "pulse-bar": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
      },
      animation: {
        "pulse-bar": "pulse-bar 0.6s ease-in-out infinite",
        shake: "shake 0.35s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
