/**
 * Application Constants
 * Centralized configuration and constant values
 */

// ============================================
// APP METADATA
// ============================================

export const APP_NAME = 'EchoNote';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-powered meeting transcription and summarization';
export const APP_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ============================================
// RECORDING LIMITS
// ============================================

export const MAX_RECORDING_TIME = 600; // 10 minutes in seconds (updated from 180)
export const MAX_RECORDING_TIME_MS = MAX_RECORDING_TIME * 1000;
export const MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes (updated from 10MB)

export const RECORDING_CONFIG = {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000,
  sampleRate: 16000 // Whisper optimal sample rate
};

export const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
    channelCount: 1 // Mono
  }
};

// ============================================
// MEETING CATEGORIES
// ============================================

export const MEETING_CATEGORIES = {
  SALES: 'SALES',
  PLANNING: 'PLANNING',
  STANDUP: 'STANDUP',
  ONE_ON_ONE: 'ONE_ON_ONE',
  OTHER: 'OTHER'
};

export const CATEGORY_LABELS = {
  [MEETING_CATEGORIES.SALES]: 'Sales',
  [MEETING_CATEGORIES.PLANNING]: 'Planning',
  [MEETING_CATEGORIES.STANDUP]: 'Standup',
  [MEETING_CATEGORIES.ONE_ON_ONE]: 'One-on-One',
  [MEETING_CATEGORIES.OTHER]: 'Other'
};

export const CATEGORY_DESCRIPTIONS = {
  [MEETING_CATEGORIES.SALES]: 'Sales calls, demos, and client meetings',
  [MEETING_CATEGORIES.PLANNING]: 'Planning sessions, roadmap discussions',
  [MEETING_CATEGORIES.STANDUP]: 'Daily standups and sync meetings',
  [MEETING_CATEGORIES.ONE_ON_ONE]: '1:1 meetings with team members',
  [MEETING_CATEGORIES.OTHER]: 'Other types of meetings'
};

export const CATEGORIES_LIST = [
  {
    value: MEETING_CATEGORIES.SALES,
    label: CATEGORY_LABELS[MEETING_CATEGORIES.SALES],
    description: CATEGORY_DESCRIPTIONS[MEETING_CATEGORIES.SALES]
  },
  {
    value: MEETING_CATEGORIES.PLANNING,
    label: CATEGORY_LABELS[MEETING_CATEGORIES.PLANNING],
    description: CATEGORY_DESCRIPTIONS[MEETING_CATEGORIES.PLANNING]
  },
  {
    value: MEETING_CATEGORIES.STANDUP,
    label: CATEGORY_LABELS[MEETING_CATEGORIES.STANDUP],
    description: CATEGORY_DESCRIPTIONS[MEETING_CATEGORIES.STANDUP]
  },
  {
    value: MEETING_CATEGORIES.ONE_ON_ONE,
    label: CATEGORY_LABELS[MEETING_CATEGORIES.ONE_ON_ONE],
    description: CATEGORY_DESCRIPTIONS[MEETING_CATEGORIES.ONE_ON_ONE]
  },
  {
    value: MEETING_CATEGORIES.OTHER,
    label: CATEGORY_LABELS[MEETING_CATEGORIES.OTHER],
    description: CATEGORY_DESCRIPTIONS[MEETING_CATEGORIES.OTHER]
  }
];

// ============================================
// MEETING STATUS
// ============================================

export const MEETING_STATUS = {
  UPLOADING: 'UPLOADING',
  PENDING: 'PENDING',           // NEW: Queued for processing
  PROCESSING_AUDIO: 'PROCESSING_AUDIO',
  TRANSCRIBING: 'TRANSCRIBING',
  PROCESSING_NLP: 'PROCESSING_NLP',
  SUMMARIZING: 'SUMMARIZING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

export const STATUS_LABELS = {
  [MEETING_STATUS.UPLOADING]: 'Uploading',
  [MEETING_STATUS.PENDING]: 'Queued',       // NEW: Queued for processing
  [MEETING_STATUS.PROCESSING_AUDIO]: 'Processing Audio',
  [MEETING_STATUS.TRANSCRIBING]: 'Transcribing',
  [MEETING_STATUS.PROCESSING_NLP]: 'Processing NLP',
  [MEETING_STATUS.SUMMARIZING]: 'Summarizing',
  [MEETING_STATUS.COMPLETED]: 'Completed',
  [MEETING_STATUS.FAILED]: 'Failed'
};

export const STATUS_COLORS = {
  [MEETING_STATUS.UPLOADING]: 'default',
  [MEETING_STATUS.PENDING]: 'default',      // NEW: Queued for processing
  [MEETING_STATUS.PROCESSING_AUDIO]: 'warning',
  [MEETING_STATUS.TRANSCRIBING]: 'warning',
  [MEETING_STATUS.PROCESSING_NLP]: 'warning',
  [MEETING_STATUS.SUMMARIZING]: 'warning',
  [MEETING_STATUS.COMPLETED]: 'success',
  [MEETING_STATUS.FAILED]: 'danger'
};

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION = {
  MEETING_TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
    REQUIRED: true
  },
  MEETING_DESCRIPTION: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 500,
    REQUIRED: false
  },
  USER_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};

// ============================================
// STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  PREFERENCES: 'user_preferences',
  RECENT_MEETINGS: 'recent_meetings',
  FAVORITES: 'favorites',
  LAST_CATEGORY: 'last_selected_category'
};

// ============================================
// API ENDPOINTS
// ============================================

export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_LOGIN: '/auth/google',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify'
  },
  MEETINGS: {
    BASE: '/meetings',
    BY_ID: (id) => `/meetings/${id}`,
    SEARCH: '/meetings/search'
  },
  USER: {
    PROFILE: '/user/profile',
    PREFERENCES: '/user/preferences',
    DELETE_ACCOUNT: '/user/account',
    EXPORT_DATA: '/user/export'
  }
};

// ============================================
// PAGINATION
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZE_OPTIONS: [6, 12, 24, 48],
  MAX_PAGE_SIZE: 100
};

// ============================================
// DEBOUNCE / THROTTLE
// ============================================

export const TIMING = {
  DEBOUNCE_SEARCH: 500,      // ms
  DEBOUNCE_INPUT: 300,       // ms
  DEBOUNCE_RESIZE: 200,      // ms
  THROTTLE_SCROLL: 100,      // ms
  AUTO_SAVE_DELAY: 2000,     // ms
  TOAST_DURATION: 3000,      // ms
  REDIRECT_DELAY: 2000       // ms
};

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UPLOAD_FAILED: 'Failed to upload meeting. Please try again.',
  DELETE_FAILED: 'Failed to delete meeting. Please try again.',
  RECORDING_FAILED: 'Failed to start recording. Please check microphone permissions.',
  AUDIO_NOT_SUPPORTED: 'Audio recording is not supported in your browser.',
  MAX_DURATION_EXCEEDED: 'Audio duration exceeds 10-minute limit.',
  FILE_TOO_LARGE: 'File size exceeds 50MB limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an audio file.',
  TITLE_REQUIRED: 'Meeting title is required.',
  TITLE_TOO_SHORT: 'Title must be at least 3 characters.',
  TITLE_TOO_LONG: 'Title must be less than 100 characters.',
  CATEGORY_REQUIRED: 'Please select a category.'
};

// ============================================
// SUCCESS MESSAGES
// ============================================

export const SUCCESS_MESSAGES = {
  MEETING_UPLOADED: 'Meeting uploaded successfully!',
  MEETING_UPDATED: 'Meeting updated successfully!',
  MEETING_DELETED: 'Meeting deleted successfully!',
  PREFERENCES_SAVED: 'Preferences saved successfully!',
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'Logged out successfully!'
};

// ============================================
// ROUTES
// ============================================

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  MEETINGS: '/meetings',
  MEETING_DETAIL: '/meeting/:id',
  MEETING_DETAIL_PATH: (id) => `/meeting/${id}`,
  RECORD: '/record',
  SETTINGS: '/settings',
  NOT_FOUND: '*'
};

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURES = {
  ENABLE_DARK_MODE: true,
  ENABLE_EXPORT: true,
  ENABLE_FAVORITES: true,
  ENABLE_ANALYTICS: false,
  ENABLE_SHARING: false,
  ENABLE_REAL_TIME: false
};

// ============================================
// DATE FORMATS
// ============================================

export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',
  LONG: 'MMMM d, yyyy',
  FULL: 'EEEE, MMMM d, yyyy',
  WITH_TIME: 'MMM d, yyyy h:mm a',
  TIME_ONLY: 'h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss"
};

// ============================================
// SUPPORTED FILE TYPES
// ============================================

export const SUPPORTED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',      // M4A format
  'audio/x-m4a',    // M4A variant
  'audio/mp4'       // M4A uses MP4 container
];

export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.webm',
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a'
];

// ============================================
// ANALYTICS EVENTS
// ============================================

export const ANALYTICS_EVENTS = {
  // User events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SIGNUP: 'user_signup',

  // Meeting events
  MEETING_CREATED: 'meeting_created',
  MEETING_VIEWED: 'meeting_viewed',
  MEETING_UPDATED: 'meeting_updated',
  MEETING_DELETED: 'meeting_deleted',
  MEETING_SEARCHED: 'meeting_searched',

  // Recording events
  RECORDING_STARTED: 'recording_started',
  RECORDING_STOPPED: 'recording_stopped',
  RECORDING_FAILED: 'recording_failed',

  // Feature usage
  EXPORT_CLICKED: 'export_clicked',
  THEME_CHANGED: 'theme_changed',
  FILTER_APPLIED: 'filter_applied'
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

export const KEYBOARD_SHORTCUTS = {
  SEARCH: 'Ctrl+K',
  NEW_MEETING: 'Ctrl+N',
  TOGGLE_THEME: 'Ctrl+Shift+T',
  SETTINGS: 'Ctrl+,',
  HELP: '?'
};

// ============================================
// NOTIFICATION TYPES
// ============================================

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// ============================================
// CACHE DURATION
// ============================================

export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,        // 5 minutes
  MEDIUM: 15 * 60 * 1000,      // 15 minutes
  LONG: 60 * 60 * 1000,        // 1 hour
  DAY: 24 * 60 * 60 * 1000     // 24 hours
};

// ============================================
// RETENTION PERIODS (DAYS)
// ============================================

export const RETENTION_PERIODS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' }
];

// ============================================
// EXTERNAL LINKS
// ============================================

export const EXTERNAL_LINKS = {
  DOCUMENTATION: 'https://docs.echonote.com',
  SUPPORT: 'https://support.echonote.com',
  PRIVACY_POLICY: 'https://echonote.com/privacy',
  TERMS_OF_SERVICE: 'https://echonote.com/terms',
  GITHUB: 'https://github.com/echonote',
  FEEDBACK: 'https://echonote.com/feedback'
};

// ============================================
// REGEX PATTERNS
// ============================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^\+?[\d\s-()]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9-]+$/
};

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULTS = {
  THEME: 'light',
  LANGUAGE: 'en',
  CATEGORY: MEETING_CATEGORIES.OTHER,
  PAGE_SIZE: PAGINATION.DEFAULT_PAGE_SIZE,
  RETENTION_DAYS: 30,
  EMAIL_NOTIFICATIONS: true,
  AUTO_DELETE: false
};

// ============================================
// LIMITS
// ============================================

export const LIMITS = {
  MAX_FILE_SIZE: MAX_AUDIO_FILE_SIZE,
  MAX_RECORDING_TIME: MAX_RECORDING_TIME,
  MAX_TITLE_LENGTH: VALIDATION.MEETING_TITLE.MAX_LENGTH,
  MAX_DESCRIPTION_LENGTH: VALIDATION.MEETING_DESCRIPTION.MAX_LENGTH,
  MAX_SEARCH_QUERY_LENGTH: 100,
  MAX_RECENT_ITEMS: 10,
  MAX_FAVORITES: 50
};

// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// ============================================
// ENVIRONMENT
// ============================================

export const ENVIRONMENT = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  mode: process.env.NODE_ENV || 'development'
};

// ============================================
// GOOGLE OAUTH
// ============================================

export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// ============================================
// EXPORT ALL
// ============================================

export default {
  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,
  API_URL,
  MAX_RECORDING_TIME,
  RECORDING_CONFIG,
  AUDIO_CONSTRAINTS,
  MEETING_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORIES_LIST,
  MEETING_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  VALIDATION,
  STORAGE_KEYS,
  API_ENDPOINTS,
  PAGINATION,
  TIMING,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
  FEATURES,
  DATE_FORMATS,
  SUPPORTED_AUDIO_TYPES,
  ANALYTICS_EVENTS,
  KEYBOARD_SHORTCUTS,
  NOTIFICATION_TYPES,
  CACHE_DURATION,
  RETENTION_PERIODS,
  EXTERNAL_LINKS,
  REGEX_PATTERNS,
  DEFAULTS,
  LIMITS,
  HTTP_STATUS,
  ENVIRONMENT,
  GOOGLE_CLIENT_ID
};