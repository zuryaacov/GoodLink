import tailwindAnimate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0b996f",
          foreground: "hsl(var(--primary-foreground))",
        },
        "primary-green": "#0b996f",
        "secondary-green": "#c0ffa5",
        accent: {
          DEFAULT: "#6358de",
          foreground: "hsl(var(--accent-foreground))",
        },
        "nav-bg": "#f9fff6",
        "card-bg": "#FCFDFD",
        "card-border": "#E5E9E8",
        "background-light": "#f6f6f8",
        "background-dark": "#101622",
        background: "hsl(var(--background))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      boxShadow: {
        "card-mint": "0 4px 20px rgba(0, 245, 155, 0.25)",
      },
    },
  },
  plugins: [tailwindAnimate],
}

