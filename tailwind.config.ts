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
        // THE GREEN RAMP — the ROLE decides the shade. See DESIGN.md §3.1.
        //
        // These replace `warm`/`coral`/`peach`/`cream`, which were warm-palette NAMES carrying
        // GREEN values: a warm scheme find-replaced into greens with the names left behind, so
        // anyone writing `text-kira-coral` expected coral and got green. That mismatch is the
        // clearest single source of the "inconsistent" complaint.
        //
        // The contrast figures are computed, not estimated, and they are why a single "brand
        // green" cannot exist: the old #22c55e is 2.28:1 on white, which fails even the 3:1 floor
        // for UI components, and the old #4ade80 carried WHITE TEXT on the referral submit button
        // at 1.74:1.
        kira: {
          50: '#F0FDF4', //  tint backgrounds ONLY — never a text colour
          500: '#16A34A', // 3.30:1 on white — large text (>=24px) and UI fills ONLY, never body text
          600: '#15803D', // 5.02:1 on white — body text, links, and any fill carrying a white label
          700: '#166534', // 7.13:1 on white — hover/pressed, text needing extra weight

          // Warm neutrals — kept deliberately. Warm suits this ICP and these names never lied.
          dark: '#2D2A26', //     13.67:1 on surface — body text, headings
          charcoal: '#4A4541', // secondary text
          soft: '#736B63', //     5.01:1 — CORRECTED from #7D756D, which was 4.34:1 and failed AA
          mist: '#F5F3F0', //     borders, dividers, inset panels
          surface: '#FAFAF9', //  page background
        },
      },
      fontFamily: {
        // ⚠️ All three are deliberately Inter TODAY, and that is a recorded decision rather than an
        // oversight — see DESIGN.md §4. `display`/`body` are load-bearing (256 usages), so removing
        // them is a breaking change, and adding a second face mid-testing is a visual change the
        // operator explicitly deferred. The open decision is Lexend for `display`: chosen for
        // reading proficiency in a 60-70yo readership, not for fashion. Until it lands, hierarchy
        // comes from weight and size — and these aliases must not be read as promising two faces.
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
