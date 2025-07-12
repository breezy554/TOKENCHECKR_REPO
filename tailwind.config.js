/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        velkronCyan: '#00f0ff',
        velkronRed: '#ff003c',
        velkronBlack: '#0a0a0a',
      },
      fontFamily: {
        techno: ['"Orbitron"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
