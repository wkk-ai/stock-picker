import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B1F33",
        gold: "#C9A227",
        bg: "#EEF1F4",
        elev: "#FFFFFF",
        ink: "#12202E",
        muted: "#5B6B7A",
        faint: "#8A97A6",
        line: "#D5DDE5",
        accent: "#0F7A4A",
        soft: "#E7F4EE",
        down: "#B42318",
        watch: "#B54708",
        mist: "#F7F9FB",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "none",
      },
    },
  },
  plugins: [],
};

export default config;
