const { heroui } = require('@heroui/react');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    './node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── EchoNote OLED Dark Mode Palette ──
        'echo-base': '#020617',
        'echo-surface': '#0F172A',
        'echo-surface-hover': '#1E293B',
        'echo-elevated': '#1E293B',
        'echo-border': 'rgba(255,255,255,0.06)',
        'echo-border-subtle': 'rgba(255,255,255,0.03)',

        // Accent colors
        accent: {
          primary: '#818CF8',
          secondary: '#A78BFA',
          glow: 'rgba(129,140,248,0.12)',
        },
        cta: {
          DEFAULT: '#22C55E',
          hover: '#16A34A',
        },

        // Semantic status
        status: {
          success: '#34D399',
          warning: '#FBBF24',
          danger: '#F87171',
          info: '#60A5FA',
        },

        // Sentiment
        sentiment: {
          positive: '#34D399',
          neutral: '#818CF8',
          negative: '#F87171',
          mixed: '#FBBF24',
        },

        // Text hierarchy
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
        'text-muted': '#64748B',

        // Stitch surface tokens (from code.html)
        surface: {
          DEFAULT: '#0c1324',
          bright: '#33394c',
          container: '#191f31',
          'container-low': '#151b2d',
          'container-high': '#23293c',
          'container-highest': '#2e3447',
          'container-lowest': '#070d1f',
          dim: '#0c1324',
        },
        'on-surface': '#dce1fb',
        'on-surface-variant': '#c6c5d5',
        'outline-variant': '#454653',

        // HeroUI overrides
        primary: {
          DEFAULT: '#818CF8',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#A78BFA',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#22C55E',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#FBBF24',
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
          foreground: '#000000',
        },
        danger: {
          DEFAULT: '#F87171',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          foreground: '#FFFFFF',
        },
      },

      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        gradient: 'gradient 3s ease infinite',
        'halo-pulse': 'haloPulse 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
        'ai-glow': 'aiGlow 1.5s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        haloPulse: {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 20px rgba(129,140,248,0.3), 0 0 40px rgba(167,139,250,0.15)',
          },
          '50%': {
            transform: 'scale(1.05)',
            boxShadow: '0 0 30px rgba(129,140,248,0.5), 0 0 60px rgba(167,139,250,0.25)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        aiGlow: {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(129,140,248,0.4)',
            opacity: '1',
          },
          '50%': {
            boxShadow: '0 0 16px rgba(129,140,248,0.6)',
            opacity: '0.8',
          },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(129,140,248,0.4), 0 0 25px rgba(167,139,250,0.3)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 25px rgba(129,140,248,0.6), 0 0 40px rgba(167,139,250,0.5)',
            transform: 'scale(1.02)',
          },
        },
      },

      spacing: {
        128: '32rem',
        144: '36rem',
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
        input: '10px',
        chip: '9999px',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      backgroundSize: {
        200: '200% 200%',
        300: '300% 300%',
      },
    },
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
