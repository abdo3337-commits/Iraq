/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Orange Bus Brand Colors
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6e31', // Main brand orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#043153', // Main brand navy blue
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Brand specific colors
        orange: {
          DEFAULT: '#ff6e31',
          light: '#ffedd5',
          dark: '#ea580c'
        },
        navy: {
          DEFAULT: '#043153',
          light: '#0369a1',
          dark: '#082f49'
        }
      },
      fontFamily: {
        'arabic': ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        'orange': '0 10px 25px -3px rgba(255, 110, 49, 0.1), 0 4px 6px -2px rgba(255, 110, 49, 0.05)',
        'navy': '0 10px 25px -3px rgba(4, 49, 83, 0.1), 0 4px 6px -2px rgba(4, 49, 83, 0.05)',
      },
    },
  },
  plugins: [],
}