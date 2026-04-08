const { heroui } = require('@heroui/react');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    './node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [
    heroui({
      themes: {
        dark: {
          colors: {
            background: '#020617',
            foreground: '#F8FAFC',
            primary: {
              DEFAULT: '#818CF8',
              foreground: '#FFFFFF',
            },
            secondary: {
              DEFAULT: '#A78BFA',
              foreground: '#FFFFFF',
            },
            success: {
              DEFAULT: '#22C55E',
              foreground: '#FFFFFF',
            },
            warning: {
              DEFAULT: '#FBBF24',
              foreground: '#000000',
            },
            danger: {
              DEFAULT: '#F87171',
              foreground: '#FFFFFF',
            },
            content1: '#0F172A',
            content2: '#1E293B',
            content3: '#334155',
            content4: '#475569',
            divider: 'rgba(255,255,255,0.06)',
            focus: '#818CF8',
          },
        },
      },
    }),
    require('@tailwindcss/typography'),
  ],
};
