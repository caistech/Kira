import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Scan the canonical auth surface so its Tailwind classes are generated (otherwise the
    // @caistech/corporate-components AuthForm renders unstyled). Tailwind v3 content-scan (no @source).
    './node_modules/@caistech/corporate-components/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {
      colors: {
        kira: {
          warm: '#22c55e',
          coral: '#4ade80',
          peach: '#86efac',
          cream: '#f0fdf4',
          dark: '#2D2A26',
          charcoal: '#4A4541',
          soft: '#7D756D',
          mist: '#F5F3F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 30s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
