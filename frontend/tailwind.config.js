/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Helvetica Neue"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      // Apple's typography scale — exact values per DESIGN.md §3
      fontSize: {
        'hero':       ['3.5rem',    { lineHeight: '1.07', letterSpacing: '-0.005em', fontWeight: '600' }],  // 56px Display Hero
        'section':    ['2.5rem',    { lineHeight: '1.10', letterSpacing: '-0.003em', fontWeight: '600' }],  // 40px Section Heading
        'tile':       ['1.75rem',   { lineHeight: '1.14', letterSpacing: '0.007em',  fontWeight: '400' }],  // 28px Tile Heading
        'card-title': ['1.3125rem', { lineHeight: '1.19', letterSpacing: '0.011em',  fontWeight: '700' }],  // 21px Card Title
        'sub-head':   ['1.3125rem', { lineHeight: '1.19', letterSpacing: '0.011em',  fontWeight: '400' }],  // 21px Sub-heading
        'body':       ['1.0625rem', { lineHeight: '1.47', letterSpacing: '-0.022em', fontWeight: '400' }],  // 17px Body
        'caption':    ['0.875rem',  { lineHeight: '1.29', letterSpacing: '-0.016em', fontWeight: '400' }],  // 14px Caption
        'micro':      ['0.75rem',   { lineHeight: '1.33', letterSpacing: '-0.01em',  fontWeight: '400' }],  // 12px Micro
        'nano':       ['0.625rem',  { lineHeight: '1.47', letterSpacing: '-0.008em', fontWeight: '400' }],  // 10px Nano
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Apple's raw color palette — for direct use
        apple: {
          blue: '#0071e3',
          link: '#0066cc',
          'link-dark': '#2997ff',
          black: '#000000',
          'near-black': '#1d1d1f',
          'light-gray': '#f5f5f7',
          'filter-bg': '#fafafc',
          'btn-pressed': '#ededf2',
          'dark-surface-1': '#272729',
          'dark-surface-2': '#2a2a2d',
        },
      },
      borderRadius: {
        DEFAULT: '0.5rem',       // 8px — Apple's standard
        sm: '0.3125rem',         // 5px — micro
        md: '0.5rem',            // 8px — buttons, cards
        lg: '0.6875rem',         // 11px — search/filter
        xl: '0.75rem',           // 12px — feature panels
        '2xl': '1rem',
        pill: '980px',           // Apple signature pill
      },
      boxShadow: {
        // Apple's soft diffused shadow — 0.22 opacity per DESIGN.md §2
        apple: '3px 5px 30px 0 rgba(0, 0, 0, 0.22)',
        'apple-sm': '0 1px 4px 0 rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
