/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f0f3f9', 100: '#d9e0ef', 800: '#1a2342', 900: '#111829', 950: '#0b1120' },
        brand: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
