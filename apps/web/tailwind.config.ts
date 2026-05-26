import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        card: 'var(--card)',
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Pulsing indigo glow used by panel tiles in PanelsGrid while a
        // panel is being generated or regenerated. Applied via class.
        'panel-busy': 'panel-busy 2s ease-in-out infinite',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'panel-busy': {
          '0%, 100%': {
            'box-shadow':
              '0 0 0 1px rgba(99, 102, 241, 0.4), 0 0 12px 0 rgba(99, 102, 241, 0.15)',
          },
          '50%': {
            'box-shadow':
              '0 0 0 1.5px rgba(99, 102, 241, 0.9), 0 0 24px 2px rgba(99, 102, 241, 0.4)',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
