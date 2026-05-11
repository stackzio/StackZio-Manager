import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        // Premium indigo → violet → fuchsia. Tightened hue range, no orange
        // tail — reads as polished/tech rather than candy/playful.
        "brand-gradient":
          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(79,70,229,0.16) 0%, rgba(124,58,237,0.16) 50%, rgba(192,38,211,0.16) 100%)",
        "brand-radial":
          "radial-gradient(80% 80% at 0% 0%, rgba(79,70,229,0.55) 0%, transparent 55%), radial-gradient(70% 70% at 100% 100%, rgba(192,38,211,0.45) 0%, transparent 55%), linear-gradient(135deg, #6d28d9 0%, #a21caf 100%)",
        // Subtle white-edge highlight used inside gradient buttons for a glass
        // top sheen — pair with `bg-brand-gradient` to get the premium feel.
        "brand-highlight":
          "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0) 100%)",
      },
      boxShadow: {
        // Softer, deeper "premium" glow. Indigo base, fuchsia accent.
        glow: "0 8px 28px -10px rgba(99,102,241,0.55), 0 2px 8px -2px rgba(192,38,211,0.30)",
        "glow-sm": "0 4px 14px -6px rgba(99,102,241,0.45), 0 1px 4px -1px rgba(192,38,211,0.22)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "progress-sheen": {
          "0%": { transform: "translateX(-100%)" },
          "60%, 100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
        "progress-sheen": "progress-sheen 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
