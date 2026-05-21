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
        primary: {
          DEFAULT: "#3CC68A",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#FF5A3C",
          foreground: "#ffffff",
        },
        text: {
          DEFAULT: "#1A1A2E",
          muted: "#6b7280",
        },
        background: {
          DEFAULT: "#FFF9F7",
          alt: "#FFF5F0",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
