/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: { extend: { colors: { ink: '#172033', muted: '#748096', brand: { 50: '#eef5ff', 100: '#dceaff', 500: '#4778f5', 600: '#315fe0', 700: '#254bb8' } }, boxShadow: { soft: '0 10px 40px rgba(30, 51, 94, 0.07)' }, animation: { 'fade-up': 'fadeUp .45s ease-out both' }, keyframes: { fadeUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } } } },
  plugins: []
};
