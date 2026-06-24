/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./stores/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        'text-primary': "var(--text-primary)",
        'text-secondary': "var(--text-secondary)",
        border: "var(--border)",
        primary: "var(--primary)",
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        interBold: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
