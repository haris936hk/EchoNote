
export const colors = {
  primary: {
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
    DEFAULT: '#818CF8',
    foreground: '#FFFFFF',
  },

  secondary: {
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
    DEFAULT: '#A78BFA',
    foreground: '#FFFFFF',
  },

  success: {
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
    DEFAULT: '#22C55E',
    foreground: '#FFFFFF',
  },

  warning: {
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
    DEFAULT: '#FBBF24',
    foreground: '#000000',
  },

  danger: {
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
    DEFAULT: '#F87171',
    foreground: '#FFFFFF',
  },

  default: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    DEFAULT: '#334155',
    foreground: '#F8FAFC',
  },

  background: {
    dark: '#020617',
  },

  foreground: {
    dark: '#F8FAFC',
  },

  content: {
    dark: {
      1: '#0F172A',
      2: '#1E293B',
      3: '#334155',
      4: '#475569',
    },
  },

  divider: {
    dark: 'rgba(255,255,255,0.06)',
  },

  accent: {
    primary: '#818CF8',
    secondary: '#A78BFA',
    glow: 'rgba(129,140,248,0.12)',
  },

  cta: '#22C55E',
};

export const typography = {
  fontFamily: {
    sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  letterSpacing: {
    tighter: '-0.025em',
    tight: '-0.02em',
    normal: '0em',
    wide: '0.01em',
    wider: '0.02em',
    widest: '0.1em',
  },
};

export const spacing = {
  pagePadding: '24px',
  sectionGap: '48px',
  cardGap: '16px',
  cardPadding: '20px',
};

export const borderRadius = {
  card: '16px',
  btn: '10px',
  input: '10px',
  chip: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
  glow: '0 0 20px rgba(129,140,248,0.3)',
  none: 'none',
};

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  timing: {
    ease: 'ease',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const categoryColors = {
  SALES: {
    bg: 'bg-blue-950/50',
    text: 'text-blue-300',
    border: 'border-l-blue-400',
    chip: 'bg-blue-500/15 text-blue-300',
  },
  PLANNING: {
    bg: 'bg-violet-950/50',
    text: 'text-violet-300',
    border: 'border-l-violet-400',
    chip: 'bg-violet-500/15 text-violet-300',
  },
  STANDUP: {
    bg: 'bg-emerald-950/50',
    text: 'text-emerald-300',
    border: 'border-l-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-300',
  },
  ONE_ON_ONE: {
    bg: 'bg-orange-950/50',
    text: 'text-orange-300',
    border: 'border-l-orange-400',
    chip: 'bg-orange-500/15 text-orange-300',
  },
  OTHER: {
    bg: 'bg-slate-800/50',
    text: 'text-slate-300',
    border: 'border-l-slate-400',
    chip: 'bg-slate-500/15 text-slate-300',
  },
};

export const statusColors = {
  COMPLETED: {
    color: 'success',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'COMPLETED',
  },
  PROCESSING: {
    color: 'warning',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'PROCESSING',
  },
  UPLOADING: {
    color: 'warning',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'UPLOADING',
  },
  PROCESSING_AUDIO: {
    color: 'warning',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'PROCESSING',
  },
  TRANSCRIBING: {
    color: 'warning',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'TRANSCRIBING',
  },
  PROCESSING_NLP: {
    color: 'warning',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'ANALYZING',
  },
  SUMMARIZING: {
    color: 'warning',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'SUMMARIZING',
  },
  FAILED: {
    color: 'danger',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
    label: 'FAILED',
  },
};

export const sentimentColors = {
  positive: { color: '#34D399', label: 'Positive', dot: 'bg-emerald-400' },
  neutral: { color: '#818CF8', label: 'Neutral', dot: 'bg-indigo-400' },
  negative: { color: '#F87171', label: 'Negative', dot: 'bg-red-400' },
  mixed: { color: '#FBBF24', label: 'Mixed', dot: 'bg-amber-400' },
};

export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  slideInBottom: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  scaleIn: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  staggerChildren: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
};

const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  categoryColors,
  statusColors,
  sentimentColors,
  animations,
};

export default theme;
