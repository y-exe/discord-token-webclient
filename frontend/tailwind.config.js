/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        google: ['"Google Sans"', 'sans-serif'],
        ggsans: ['"gg sans"', 'sans-serif'],
      },
      colors: {
        'discord-bg': '#08080a',
        'discord-sidebar': '#050505',
        'discord-server': '#050505',
        'discord-popup': '#141517',
        'discord-header': '#08080a',
        'discord-element': '#1e1f22',
        'discord-border': '#242426',
        'discord-hover': '#1c1d1f',
        'discord-active': '#2b2d31',
        'discord-primary': '#5865F2',
        'discord-text': '#dbdee1',
        'discord-muted': '#949ba4',
        'discord-red': '#da373c',
        'discord-green': '#23a559',
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}