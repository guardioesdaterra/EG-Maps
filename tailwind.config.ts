/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Earth Guardians nature theme
        'eg-forest': '#2D5016',
        'eg-teal': '#10BFAE',
        'eg-sand': '#F5E6D3',
        'eg-ocean': '#1E40AF',
        'eg-sky': '#38BDF8',
        'eg-earth': '#92400E',
        'eg-danger': '#EF4444',
        'eg-warning': '#F59E0B',
        'eg-success': '#22C55E',
        // Cyberpunk accents from project-grants
        'cyber-cyan': '#06B6D4',
        'cyber-purple': '#A855F7',
        'cyber-pink': '#EC4899',
        'cyber-green': '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(16, 191, 174, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(16, 191, 174, 0.8), 0 0 30px rgba(16, 191, 174, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
