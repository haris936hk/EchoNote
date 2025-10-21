/**
 * Formatters Utility
 * Functions for formatting dates, numbers, file sizes, durations, etc.
 */

// ============================================
// DATE & TIME FORMATTING
// ============================================

/**
 * Format date to locale string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };
    return dateObj.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('Date format error:', error);
    return '';
  }
};

/**
 * Format date with time
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    return dateObj.toLocaleString('en-US', defaultOptions);
  } catch (error) {
    console.error('DateTime format error:', error);
    return '';
  }
};

/**
 * Format time only
 */
export const formatTime = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Time format error:', error);
    return '';
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error('Relative time format error:', error);
    return '';
  }
};

/**
 * Get friendly date (Today, Yesterday, or formatted date)
 */
export const getFriendlyDate = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare dates only
    dateObj.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (dateObj.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateObj.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return formatDate(date);
    }
  } catch (error) {
    console.error('Friendly date format error:', error);
    return '';
  }
};

/**
 * Format ISO date string to readable format
 */
export const formatISODate = (isoString) => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('ISO date format error:', error);
    return '';
  }
};

// ============================================
// DURATION FORMATTING
// ============================================

/**
 * Format seconds to MM:SS
 */
export const formatDurationShort = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format seconds to human-readable duration
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Format seconds to long format (e.g., "2 hours, 30 minutes")
 */
export const formatDurationLong = (seconds) => {
  if (!seconds || seconds === 0) return '0 seconds';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

  if (parts.length === 0) return '0 seconds';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts.join(' and ');
  
  const last = parts.pop();
  return parts.join(', ') + ', and ' + last;
};

/**
 * Format milliseconds to seconds
 */
export const msToSeconds = (ms) => {
  return Math.floor(ms / 1000);
};

// ============================================
// FILE SIZE FORMATTING
// ============================================

/**
 * Format bytes to human-readable size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format bytes to KB
 */
export const bytesToKB = (bytes) => {
  return (bytes / 1024).toFixed(2);
};

/**
 * Format bytes to MB
 */
export const bytesToMB = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2);
};

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with commas
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  return number.toLocaleString('en-US');
};

/**
 * Format number as percentage
 */
export const formatPercentage = (value, decimals = 0) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format number as currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Format large numbers with suffixes (K, M, B)
 */
export const formatCompactNumber = (number) => {
  if (!number || number === 0) return '0';
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const tier = Math.floor(Math.log10(Math.abs(number)) / 3);
  
  if (tier === 0) return number.toString();
  
  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = number / scale;
  
  return scaled.toFixed(1) + suffix;
};

// ============================================
// TEXT FORMATTING
// ============================================

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Truncate text by word count
 */
export const truncateWords = (text, maxWords = 10, suffix = '...') => {
  if (!text) return '';
  
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + suffix;
};

/**
 * Capitalize first letter
 */
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Title case (capitalize each word)
 */
export const titleCase = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Convert to kebab-case
 */
export const toKebabCase = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
};

/**
 * Convert to snake_case
 */
export const toSnakeCase = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '');
};

/**
 * Convert to camelCase
 */
export const toCamelCase = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
};

/**
 * Extract initials from name
 */
export const getInitials = (name, maxLength = 2) => {
  if (!name) return '';
  
  const words = name.trim().split(/\s+/);
  const initials = words
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, maxLength);
  
  return initials;
};

/**
 * Pluralize word based on count
 */
export const pluralize = (word, count, suffix = 's') => {
  if (!word) return '';
  return count === 1 ? word : word + suffix;
};

// ============================================
// CATEGORY & STATUS FORMATTING
// ============================================

/**
 * Format category name
 */
export const formatCategory = (category) => {
  if (!category) return '';
  
  const categoryMap = {
    SALES: 'Sales',
    PLANNING: 'Planning',
    STANDUP: 'Standup',
    ONE_ON_ONE: 'One-on-One',
    OTHER: 'Other'
  };
  
  return categoryMap[category] || capitalize(category);
};

/**
 * Format status name
 */
export const formatStatus = (status) => {
  if (!status) return '';
  
  const statusMap = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
    FAILED: 'Failed'
  };
  
  return statusMap[status] || capitalize(status);
};

// ============================================
// URL & EMAIL FORMATTING
// ============================================

/**
 * Format URL for display (remove protocol)
 */
export const formatURL = (url) => {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

/**
 * Mask email address
 */
export const maskEmail = (email) => {
  if (!email) return '';
  
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  const maskedUsername = username.charAt(0) + 
    '*'.repeat(Math.min(username.length - 1, 3)) + 
    username.charAt(username.length - 1);
  
  return `${maskedUsername}@${domain}`;
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if value is valid date
 */
export const isValidDate = (date) => {
  try {
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj);
  } catch {
    return false;
  }
};

/**
 * Check if string is valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ============================================
// ARRAY FORMATTING
// ============================================

/**
 * Format array to comma-separated string
 */
export const formatList = (array, conjunction = 'and') => {
  if (!array || array.length === 0) return '';
  if (array.length === 1) return array[0];
  if (array.length === 2) return array.join(` ${conjunction} `);
  
  const last = array[array.length - 1];
  const rest = array.slice(0, -1);
  return `${rest.join(', ')}, ${conjunction} ${last}`;
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  // Date & Time
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  getFriendlyDate,
  formatISODate,
  
  // Duration
  formatDurationShort,
  formatDuration,
  formatDurationLong,
  msToSeconds,
  
  // File Size
  formatFileSize,
  bytesToKB,
  bytesToMB,
  
  // Numbers
  formatNumber,
  formatPercentage,
  formatCurrency,
  formatCompactNumber,
  
  // Text
  truncateText,
  truncateWords,
  capitalize,
  titleCase,
  toKebabCase,
  toSnakeCase,
  toCamelCase,
  getInitials,
  pluralize,
  
  // Category & Status
  formatCategory,
  formatStatus,
  
  // URL & Email
  formatURL,
  maskEmail,
  
  // Validation
  isValidDate,
  isValidEmail,
  
  // Array
  formatList
};