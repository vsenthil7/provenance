import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // distinctive: editorial serif for display, refined sans for body
        display: ['"GT Sectra"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Söhne"', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'ui-monospace'],
      },
      colors: {
        ink: '#111111',
        paper: '#FAF9F6',
        accent: '#D14F1B', // burnt orange — used sparingly
      },
    },
  },
  plugins: [],
} satisfies Config;
