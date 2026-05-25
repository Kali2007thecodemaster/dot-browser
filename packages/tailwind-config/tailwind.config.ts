import type { Config } from 'tailwindcss/types/config';

export default {
  theme: {
    extend: {
      colors: {
        ground: 'var(--bg)',
        ink: 'var(--text)',
        amber: 'var(--accent)',
        surface: 'var(--surface)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        glass: 'var(--glass)',
        'glass-border': 'var(--glass-border)',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
    },
  },
  plugins: [],
} as Omit<Config, 'content'>;
