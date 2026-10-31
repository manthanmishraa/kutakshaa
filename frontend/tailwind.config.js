/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#00D4AA",
        secondary: "#6C63FF",
        danger: "#FF6B6B",
        warning: "#FFB347",
        success: "#00E676",
        background: "#0A0E1A",
        surface: "#111827",
        'border-color': "#1E293B",
        'on-surface': "#FFFFFF",
      },
      fontFamily: {
        headline: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['IBM Plex Sans', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'lg': '1rem',
        'xl': '1.5rem',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-red': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(255, 179, 71, 0.6))' },
          '50%': { opacity: '0.5', filter: 'drop-shadow(0 0 2px rgba(255, 179, 71, 0.2))' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 107, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255, 107, 107, 0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
    },
  },
  plugins: [],
}
