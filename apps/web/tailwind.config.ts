import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--bg-base)",
          100: "var(--bg-base)",
          200: "var(--border-divider)",
          300: "var(--border-default)",
          400: "var(--text-muted)",
          500: "var(--text-secondary)",
          600: "var(--text-primary)",
          700: "var(--text-primary)",
          800: "var(--text-primary)",
          900: "var(--text-primary)",
        },
        surface: {
          page: "var(--bg-base)",
          card: "var(--bg-surface)",
          sunken: "var(--bg-base)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-default)",
        md: "var(--radius-default)",
        lg: "var(--radius-default)",
        xl: "var(--radius-default)",
        "2xl": "var(--radius-default)",
      },
      boxShadow: {
        xs: "none",
        sm: "none",
        md: "none",
        lg: "none",
        focus: "none",
      },
    },
  },
  plugins: [],
};

export default config;
