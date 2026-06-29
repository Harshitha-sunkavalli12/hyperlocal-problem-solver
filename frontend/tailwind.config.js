/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0A0F1E",
        surface: "#111827",
        teal: "#00E5C3",
        amber: "#FFB800",
        verified: "#22C55E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(0,229,195,0.35)",
        glowamber: "0 0 24px rgba(255,184,0,0.35)",
      },
      keyframes: {
        pulsePin: {
          "0%,100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.4)", opacity: "0.6" },
        },
        moveBackground: {
          from: { backgroundPosition: "0% 0%" },
          to: { backgroundPosition: "0% -1000%" },
        },
      },
      animation: {
        pulsePin: "pulsePin 1.6s ease-in-out infinite",
        moveBackground: "moveBackground 60s linear infinite",
      },
    },
  },
  plugins: [],
};
