/**
 * Theme Configuration
 * Centralized theme settings for the application
 * Used with NextUI and custom styling
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Default primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    DEFAULT: '#3b82f6',
    foreground: '#ffffff'
  },

  secondary: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    DEFAULT: '#6b7280',
    foreground: '#ffffff'
  },

  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    DEFAULT: '#22c55e',
    foreground: '#ffffff'
  },

  warning: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    DEFAULT: '#eab308',
    foreground: '#000000'
  },

  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    DEFAULT: '#ef4444',
    foreground: '#ffffff'
  },

  // Neutral colors
  default: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    DEFAULT: '#d4d4d8',
    foreground: '#3f3f46'
  },

  // Background colors
  background: {
    light: '#ffffff',
    dark: '#000000'
  },

  foreground: {
    light: '#111827',
    dark: '#f9fafb'
  },

  content: {
    light: {
      1: '#ffffff',
      2: '#f9fafb',
      3: '#f3f4f6',
      4: '#e5e7eb'
    },
    dark: {
      1: '#18181b',
      2: '#27272a',
      3: '#3f3f46',
      4: '#52525b'
    }
  },

  divider: {
    light: '#e5e7eb',
    dark: '#3f3f46'
  }
};

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['Fira Code', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  }
};

// ============================================
// SPACING
// ============================================

export const spacing = {
  0: '0px',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  7: '1.75rem',   // 28px
  8: '2rem',      // 32px
  9: '2.25rem',   // 36px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  14: '3.5rem',   // 56px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  28: '7rem',     // 112px
  32: '8rem',     // 128px
  36: '9rem',     // 144px
  40: '10rem',    // 160px
  44: '11rem',    // 176px
  48: '12rem',    // 192px
  52: '13rem',    // 208px
  56: '14rem',    // 224px
  60: '15rem',    // 240px
  64: '16rem',    // 256px
  72: '18rem',    // 288px
  80: '20rem',    // 320px
  96: '24rem'     // 384px
};

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  none: '0px',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px'
};

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none'
};

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  duration: {
    fastest: '75ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '1000ms'
  },

  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear'
  }
};

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  auto: 'auto',
  // Named layers
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
};

// ============================================
// NEXTUI THEME CONFIG
// ============================================

export const nextUITheme = {
  layout: {
    fontSize: {
      tiny: '0.75rem',
      small: '0.875rem',
      medium: '1rem',
      large: '1.125rem'
    },
    lineHeight: {
      tiny: '1rem',
      small: '1.25rem',
      medium: '1.5rem',
      large: '1.75rem'
    },
    radius: {
      small: '0.5rem',
      medium: '0.75rem',
      large: '1rem'
    },
    borderWidth: {
      small: '1px',
      medium: '2px',
      large: '3px'
    }
  },

  themes: {
    light: {
      colors: {
        background: colors.background.light,
        foreground: colors.foreground.light,
        primary: {
          ...colors.primary,
          DEFAULT: colors.primary[500],
          foreground: colors.primary.foreground
        },
        secondary: {
          ...colors.secondary,
          DEFAULT: colors.secondary[500],
          foreground: colors.secondary.foreground
        },
        success: {
          ...colors.success,
          DEFAULT: colors.success[500],
          foreground: colors.success.foreground
        },
        warning: {
          ...colors.warning,
          DEFAULT: colors.warning[500],
          foreground: colors.warning.foreground
        },
        danger: {
          ...colors.danger,
          DEFAULT: colors.danger[500],
          foreground: colors.danger.foreground
        },
        default: {
          ...colors.default,
          DEFAULT: colors.default[300],
          foreground: colors.default.foreground
        },
        content1: colors.content.light[1],
        content2: colors.content.light[2],
        content3: colors.content.light[3],
        content4: colors.content.light[4],
        divider: colors.divider.light
      }
    },

    dark: {
      colors: {
        background: colors.background.dark,
        foreground: colors.foreground.dark,
        primary: {
          ...colors.primary,
          DEFAULT: colors.primary[500],
          foreground: colors.primary.foreground
        },
        secondary: {
          ...colors.secondary,
          DEFAULT: colors.secondary[400],
          foreground: colors.secondary.foreground
        },
        success: {
          ...colors.success,
          DEFAULT: colors.success[500],
          foreground: colors.success.foreground
        },
        warning: {
          ...colors.warning,
          DEFAULT: colors.warning[500],
          foreground: colors.warning.foreground
        },
        danger: {
          ...colors.danger,
          DEFAULT: colors.danger[500],
          foreground: colors.danger.foreground
        },
        default: {
          ...colors.default,
          DEFAULT: colors.default[700],
          foreground: colors.default.foreground
        },
        content1: colors.content.dark[1],
        content2: colors.content.dark[2],
        content3: colors.content.dark[3],
        content4: colors.content.dark[4],
        divider: colors.divider.dark
      }
    }
  }
};

// ============================================
// CATEGORY COLORS
// ============================================

export const categoryColors = {
  SALES: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    nextui: 'primary'
  },
  PLANNING: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    nextui: 'secondary'
  },
  STANDUP: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    nextui: 'success'
  },
  ONE_ON_ONE: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    nextui: 'warning'
  },
  OTHER: {
    bg: 'bg-gray-50 dark:bg-gray-950',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
    nextui: 'default'
  }
};

// ============================================
// STATUS COLORS
// ============================================

export const statusColors = {
  COMPLETED: {
    color: 'success',
    bg: 'bg-success-50 dark:bg-success-950',
    text: 'text-success-700 dark:text-success-300',
    icon: '✓'
  },
  PROCESSING: {
    color: 'warning',
    bg: 'bg-warning-50 dark:bg-warning-950',
    text: 'text-warning-700 dark:text-warning-300',
    icon: '⏳'
  },
  FAILED: {
    color: 'danger',
    bg: 'bg-danger-50 dark:bg-danger-950',
    text: 'text-danger-700 dark:text-danger-300',
    icon: '✕'
  }
};

// ============================================
// ANIMATION CONFIG
// ============================================

export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },

  slideInBottom: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 }
  },

  slideInTop: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  },

  scaleIn: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 }
  }
};

// ============================================
// EXPORT DEFAULT THEME
// ============================================

const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  breakpoints,
  zIndex,
  nextUITheme,
  categoryColors,
  statusColors,
  animations
};

export default theme;