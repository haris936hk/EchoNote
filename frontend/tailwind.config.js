const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006FEE',
          50: '#E6F1FE',
          100: '#CCE3FD',
          200: '#99C7FB',
          300: '#66AAF9',
          400: '#338EF7',
          500: '#006FEE',
          600: '#005BC4',
          700: '#004493',
          800: '#002E62',
          900: '#001731'
        },
        secondary: {
          DEFAULT: '#9353D3',
          50: '#F2EAFA',
          100: '#E4D4F4',
          200: '#C9A9E9',
          300: '#AE7EDE',
          400: '#9353D3',
          500: '#7828C8',
          600: '#6020A0',
          700: '#481878',
          800: '#301050',
          900: '#180828'
        },
        success: {
          DEFAULT: '#17C964',
          50: '#E8FAF0',
          100: '#D1F4E0',
          200: '#A2E9C1',
          300: '#74DFA2',
          400: '#45D483',
          500: '#17C964',
          600: '#12A150',
          700: '#0E793C',
          800: '#095028',
          900: '#052814'
        },
        warning: {
          DEFAULT: '#F5A524',
          50: '#FEF7E6',
          100: '#FDEFCC',
          200: '#FBDF99',
          300: '#F9CF66',
          400: '#F7BF33',
          500: '#F5A524',
          600: '#C4841D',
          700: '#936316',
          800: '#62420E',
          900: '#312107'
        },
        danger: {
          DEFAULT: '#F31260',
          50: '#FEE7EF',
          100: '#FDD0DF',
          200: '#FAA0BF',
          300: '#F871A0',
          400: '#F54180',
          500: '#F31260',
          600: '#C20E4D',
          700: '#920B3A',
          800: '#610726',
          900: '#310413'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 3s ease infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 111, 238, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 111, 238, 0.8), 0 0 40px rgba(147, 83, 211, 0.5)' }
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(0, 111, 238, 0.4), 0 0 25px rgba(147, 83, 211, 0.3)',
            transform: 'scale(1)'
          },
          '50%': {
            boxShadow: '0 0 25px rgba(0, 111, 238, 0.6), 0 0 40px rgba(147, 83, 211, 0.5)',
            transform: 'scale(1.02)'
          }
        }
      },
      spacing: {
        '128': '32rem',
        '144': '36rem'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem'
      },
      backgroundSize: {
        '200': '200% 200%',
        '300': '300% 300%'
      }
    }
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#FFFFFF",
            foreground: "#11181C",
            primary: {
              DEFAULT: "#006FEE",
              foreground: "#FFFFFF"
            },
            focus: "#006FEE"
          }
        },
        dark: {
          colors: {
            background: "#000000",
            foreground: "#ECEDEE",
            primary: {
              DEFAULT: "#006FEE",
              foreground: "#FFFFFF"
            },
            focus: "#006FEE"
          }
        }
      }
    }),
    require('@tailwindcss/typography')
  ]
};
