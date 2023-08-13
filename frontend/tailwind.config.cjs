/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        "open-sans": ["Open Sans", "sans-serif"],
      },
      colors: {
        "dark-primary": "#0f0f0f",
        "white-primary": "#f1f1f1",
        gray: "#aaaaaa",
        spotify: "#1DB954",
        youtube: "#FF0000",
      },
    },
  },
  plugins: [],
};
