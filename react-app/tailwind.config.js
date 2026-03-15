export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
          700: '#294470',
          800: '#243e6a',
          900: '#213555',
        },
        secondary: {
          50: '#effaf3',
          100: '#dff5e7',
          200: '#bfeacc',
          300: '#9fdfb2',
          400: '#5ec97e',
          500: '#25B34B',
          600: '#21a144',
          700: '#1c8638',
          800: '#166b2d',
          900: '#125825',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
}
