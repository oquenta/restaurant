import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        guinda: {
          50: "#FBF3F4", 100: "#F3DDE0", 500: "#A34752", 600: "#883741",
          700: "#7C2430", 800: "#611C26", 900: "#47141C",
        },
        papel: "#F7F1E6",
        crema: "#FFFCF6",
        bosque: { 500: "#2E6B57", 700: "#1E4D3F", 900: "#122E26" },
        mostaza: { 400: "#F0BC5C", 500: "#E7A93C", 600: "#C98C22" },
        tinta: "#221A14",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-atkinson)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        placa: "0 1px 0 rgba(34,26,20,.08), 0 10px 24px -14px rgba(34,26,20,.25)",
      },
    },
  },
  plugins: [],
};
export default config;
