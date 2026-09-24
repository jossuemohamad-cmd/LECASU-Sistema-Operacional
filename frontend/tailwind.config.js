/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LECASU Official Palette
        brand: {
          DEFAULT: '#FF8000',
          hover: '#E67300',
          active: '#CC6600',
          light: '#FFF2E5',
          50: '#FFF8F0',
          100: '#FFEACC',
          500: '#FF8000',
          600: '#E67300',
          700: '#CC6600',
        },
        dark: {
          DEFAULT: '#101010',
          surface: '#181818',
          card: '#1F1F1F',
          elevated: '#262626',
          border: '#333333',
          muted: '#8E8E8E',
        },
        canvas: {
          DEFAULT: '#F5F5F3',
          surface: '#FFFFFF',
          subtle: '#EDEDEA',
          border: '#E2E2DE',
          muted: '#737370',
        },
        lecasu: {
          orange: '#FF8000',
          black: '#101010',
          canvas: '#F5F5F3',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
