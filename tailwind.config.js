/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4fc',
          100: '#e1e9f8',
          200: '#c5d7f1',
          300: '#99bae7',
          400: '#6795da',
          500: '#4375cc',
          600: '#315bb9',
          700: '#294470', // Deep Blue/Navy
          800: '#243e6a',
          900: '#213555',
        },
        secondary: {
          50: '#effaf3',
          100: '#dff5e7',
          200: '#bfeacc',
          300: '#9fdfb2',
          400: '#5ec97e',
          500: '#25B34B', // Vibrant Green
          600: '#21a144',
          700: '#1c8638',
          800: '#166b2d',
          900: '#125825',
        },
        surface: {
          50: '#fafafa',
          100: '#f5f5f6',
          200: '#ececf0',
          300: '#d9d9e0',
          400: '#c6c7d1',
          500: '#9f9fb1',
          600: '#5E5F77', // Muted Gray/Purple
          700: '#55566b',
          800: '#474759',
          900: '#383947',
          950: '#2e2e3a',
        },
        dark: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.35rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.35rem', { lineHeight: '1.85rem' }],
        '3xl': ['1.75rem', { lineHeight: '2.15rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'subtle-float': 'subtle-float 4s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'subtle-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      }
    },
  },
  plugins: [],
}
