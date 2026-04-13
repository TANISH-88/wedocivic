import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        civic: {
          50: "#E0F9F5",  // Lightest mint
          100: "#C1F6ED", // Light mint/cyan
          200: "#9AEFE4", 300: "#73E8DB",
          400: "#4DE1D2", 500: "#3FD0C9", // Bright cyan (main)
          600: "#2EAF7D", // Teal green
          700: "#02808C", // Medium teal  
          800: "#025E68", // Dark teal
          900: "#02353C", // Darkest teal
          950: "#011A1E",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-main': 'linear-gradient(135deg, #f0f9ff 0%, #fae8ff 25%, #fce7f3 50%, #e0f2fe 75%, #f0fdfa 100%)',
        'gradient-primary': 'linear-gradient(135deg, #3FD0C9 0%, #2EAF7D 50%, #02353C 100%)',
        'gradient-accent': 'linear-gradient(135deg, #C1F6ED 0%, #9AEFE4 50%, #73E8DB 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(240,249,255,0.7) 50%, rgba(255,255,255,0.75) 100%)',
      },
      boxShadow: {
        soft:      "0 2px 16px rgba(2,53,60,0.05), 0 1px 4px rgba(63,208,201,0.08)",
        medium:    "0 4px 32px rgba(2,53,60,0.08), 0 2px 16px rgba(63,208,201,0.12)",
        large:     "0 8px 48px rgba(2,53,60,0.12), 0 4px 24px rgba(63,208,201,0.15)",
        green:     "0 4px 20px rgba(63,208,201,0.30)",
        "green-lg":"0 8px 36px rgba(63,208,201,0.40)",
        glow:      "0 0 40px rgba(63,208,201,0.25), 0 0 80px rgba(193,246,237,0.15)",
        inner:     "inset 0 2px 4px rgba(2,53,60,0.06)",
      },
      animation: {
        "fade-in":  "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "float":    "float 4s ease-in-out infinite",
        "glow":     "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" },                              "100%": { opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(20px)", opacity: "0" },"100%": { transform: "translateY(0)", opacity: "1" } },
        scaleIn: { "0%": { transform: "scale(0.92)", opacity: "0" },    "100%": { transform: "scale(1)",    opacity: "1" } },
        float:   { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        glow:    { "0%": { boxShadow: "0 0 20px rgba(63,208,201,0.2)" }, "100%": { boxShadow: "0 0 40px rgba(63,208,201,0.4)" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
