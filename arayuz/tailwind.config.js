/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marka: {
          50: "var(--renk-marka-50)",
          100: "var(--renk-marka-100)",
          300: "var(--renk-marka-300)",
          500: "var(--renk-marka-500)",
          600: "var(--renk-marka-600)",
          700: "var(--renk-marka-700)",
          900: "var(--renk-marka-900)",
          yazi: "var(--renk-marka-yazi)",
          border: "var(--renk-marka-border)"
        }
      },
      boxShadow: {
        panel: "0 12px 30px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
