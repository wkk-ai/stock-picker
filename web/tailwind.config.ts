import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B1F33",
        gold: "#C9A227",
        bg: "#F3F5F8",
        elev: "#FFFFFF",
        ink: "#12202E",
        muted: "#5B6B7A",
        faint: "#6B7A88",
        line: "#E2E8EE",
        accent: "#0F7A4A",
        soft: "#E7F4EE",
        down: "#B42318",
        watch: "#B54708",
        mist: "#F7F9FB",
        sky: "#E8F1FA",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 28px rgba(11, 31, 51, 0.06)",
        float: "0 12px 32px rgba(11, 31, 51, 0.12)",
      },
      borderRadius: {
        card: "20px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
