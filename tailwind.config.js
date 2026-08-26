/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#006d37', // Stitch Primary
          700: '#005228',
          800: '#00391a',
          900: '#00210c',
        },
        primary: {
          DEFAULT: '#006d37',
          hover: '#00582c',
          container: '#27ae60',
          light: '#e8f5e9',
        },
        secondary: {
          DEFAULT: '#904d00',
          container: '#ffa454',
          light: '#fff3e0',
        },
        tertiary: {
          DEFAULT: '#006492',
          container: '#35a1e0',
          light: '#e1f5fe',
        },
        surface: {
          DEFAULT: '#f9f9f9',
          card: '#ffffff',
          container: '#f3f4f6',
          muted: '#e5e7eb',
        },
        verified: '#10b981',
        pending: '#f59e0b',
        rejected: '#ef4444',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      aspectRatio: {
        '4/3': '4 / 3',
        '16/10': '16 / 10',
        '21/9': '21 / 9',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px -4px rgba(0, 109, 55, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
        subtle: '0 1px 3px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
