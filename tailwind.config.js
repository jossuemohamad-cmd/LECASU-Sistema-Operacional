/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lecasu: {
          orange: '#ea580c',      // Laranja oficial de destaque
          orangeHover: '#c2410c',
          dark: '#0f172a',        // Grafite profundo
          sidebar: '#1e293b',     // Grafite da sidebar
          text: '#334155',
          border: '#e2e8f0',
          bg: '#f8fafc',
        }
      }
    },
  },
  plugins: [],
}