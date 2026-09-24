/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef1f7',
          100: '#d7ddec',
          200: '#aeb9d8',
          300: '#8496c2',
          400: '#5a72ab',
          500: '#3d5590',
          600: '#243866',
          700: '#1a2a4d',
          800: '#111c36',
          850: '#0d1730',
          900: '#0a1229',
          950: '#060b1a',
        },
        gold: {
          50: '#fdf8ec',
          100: '#faedc9',
          200: '#f4d98d',
          300: '#eec14f',
          400: '#e6a923',
          500: '#d69518',
          600: '#b17512',
          700: '#8a5810',
          800: '#6f4713',
          900: '#5c3c14',
        },
        forest: {
          50: '#f1f6f0',
          100: '#dfebdb',
          200: '#c0d7b8',
          300: '#98bd8b',
          400: '#729f63',
          500: '#547f46',
          600: '#3f6335',
          700: '#334f2b',
          800: '#2b4024',
          900: '#25361f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(10,18,41,0.08), 0 1px 2px -1px rgba(10,18,41,0.06)',
      },
    },
  },
  plugins: [],
}
