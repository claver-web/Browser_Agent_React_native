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
        primary: "#FF6B35",
        secondary: "#004E89",
        accent: "#1A936F",
        background: "#F7F7F2",
        darkBg: "#1A1A2E",
        darkCard: "#16213E",
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        interBold: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
