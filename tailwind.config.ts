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
        // THE VALUES NOW LIVE IN app/tokens.css, and this maps Tailwind's names onto them.
        //
        // The class names are unchanged on purpose — `kira-600` and `kira-mist` appear 256 times,
        // and renaming them in the same change that introduces tokens would make the diff
        // unreviewable. What changed is where the value comes from: a designer edits ONE file, and
        // `[data-theme="dark"]` re-points the roles without touching a component.
        //
        // rgb(var(--x) / <alpha-value>) rather than the bare var, because Tailwind opacity
        // modifiers cannot work from a hex string. Six exist today (`ring-kira-600/50`,
        // `bg-kira-surface/90`, `bg-kira-mist/80`, `border-kira-mist/50`) and they would have
        // silently rendered wrong.
        //
        // Contrast figures stay with the values in tokens.css, where they were computed rather
        // than estimated.
        kira: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',

          dark: 'rgb(var(--neutral-900) / <alpha-value>)',
          charcoal: 'rgb(var(--neutral-700) / <alpha-value>)',
          soft: 'rgb(var(--neutral-500) / <alpha-value>)',
          mist: 'rgb(var(--neutral-100) / <alpha-value>)',
          surface: 'rgb(var(--neutral-50) / <alpha-value>)',
          line: 'rgb(var(--neutral-200) / <alpha-value>)',
          'on-dark': 'rgb(var(--neutral-on-dark) / <alpha-value>)',
          'on-dark-muted': 'rgb(var(--neutral-on-dark-muted) / <alpha-value>)',
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
