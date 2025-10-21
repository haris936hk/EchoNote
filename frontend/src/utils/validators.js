/**
 * Validators Utility
 * Functions for validating user input, forms, and data
 */

import { VALIDATION, REGEX_PATTERNS, SUPPORTED_AUDIO_TYPES, MAX_AUDIO_FILE_SIZE } from './constants';

// ============================================
// MEETING VALIDATION
// ============================================

/**
 * Validate meeting title
 */
export const validateMeetingTitle = (title) => {
  if (!title || title.trim() === '') {
    return {
      isValid: false,
      error: 'Meeting title is required'
    };
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length < VALIDATION.MEETING_TITLE.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Title must be at least ${VALIDATION.MEETING_TITLE.MIN_LENGTH} characters`
    };
  }

  if (trimmedTitle.length > VALIDATION.MEETING_TITLE.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Title must be less than ${VALIDATION.MEETING_TITLE.MAX_LENGTH} characters`
    };
  }

  return { isValid: true };
};

/**
 * Validate meeting description
 */
export const validateMeetingDescription = (description) => {
  if (!description) {
    return { isValid: true }; // Optional field
  }

  if (description.length > VALIDATION.MEETING_DESCRIPTION.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Description must be less than ${VALIDATION.MEETING_DESCRIPTION.MAX_LENGTH} characters`
    };
  }

  return { isValid: true };
};

/**
 * Validate meeting category
 */
export const validateMeetingCategory = (category) => {
  const validCategories = ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'];

  if (!category) {
    return {
      isValid: false,
      error: 'Category is required'
    };
  }

  if (!validCategories.includes(category)) {
    return {
      isValid: false,
      error: 'Invalid category selected'
    };
  }

  return { isValid: true };
};

/**
 * Validate complete meeting data
 */
export const validateMeetingData = (data) => {
  const errors = {};

  // Validate title
  const titleValidation = validateMeetingTitle(data.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error;
  }

  // Validate description
  const descValidation = validateMeetingDescription(data.description);
  if (!descValidation.isValid) {
    errors.description = descValidation.error;
  }

  // Validate category
  const categoryValidation = validateMeetingCategory(data.category);
  if (!categoryValidation.isValid) {
    errors.category = categoryValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ============================================
// AUDIO FILE VALIDATION
// ============================================

/**
 * Validate audio file type
 */
export const validateAudioFileType = (file) => {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload an audio file (MP3, WAV, WEBM, OGG, M4A)'
    };
  }

  return { isValid: true };
};

/**
 * Validate audio file size
 */
export const validateAudioFileSize = (file) => {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  if (file.size > MAX_AUDIO_FILE_SIZE) {
    const maxSizeMB = (MAX_AUDIO_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty'
    };
  }

  return { isValid: true };
};

/**
 * Validate audio file completely
 */
export const validateAudioFile = (file) => {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'No audio file provided'
    };
  }

  // Validate type
  const typeValidation = validateAudioFileType(file);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Validate size
  const sizeValidation = validateAudioFileSize(file);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return { isValid: true };
};

// ============================================
// USER INPUT VALIDATION
// ============================================

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  if (!REGEX_PATTERNS.EMAIL.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  return { isValid: true };
};

/**
 * Validate name
 */
export const validateName = (name) => {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      error: 'Name is required'
    };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < VALIDATION.USER_NAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Name must be at least ${VALIDATION.USER_NAME.MIN_LENGTH} characters`
    };
  }

  if (trimmedName.length > VALIDATION.USER_NAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Name must be less than ${VALIDATION.USER_NAME.MAX_LENGTH} characters`
    };
  }

  return { isValid: true };
};

/**
 * Validate URL
 */
export const validateURL = (url) => {
  if (!url || url.trim() === '') {
    return {
      isValid: false,
      error: 'URL is required'
    };
  }

  if (!REGEX_PATTERNS.URL.test(url)) {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }

  return { isValid: true };
};

/**
 * Validate phone number
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  if (!REGEX_PATTERNS.PHONE.test(phone)) {
    return {
      isValid: false,
      error: 'Invalid phone number format'
    };
  }

  return { isValid: true };
};

// ============================================
// PASSWORD VALIDATION
// ============================================

/**
 * Validate password strength
 */
export const validatePassword = (password, minLength = 8) => {
  if (!password) {
    return {
      isValid: false,
      error: 'Password is required',
      strength: 'none'
    };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters`,
      strength: 'weak'
    };
  }

  let strength = 0;
  const checks = {
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasLength: password.length >= 12
  };

  // Calculate strength
  if (checks.hasLower) strength++;
  if (checks.hasUpper) strength++;
  if (checks.hasNumber) strength++;
  if (checks.hasSpecial) strength++;
  if (checks.hasLength) strength++;

  let strengthLabel = 'weak';
  if (strength >= 4) strengthLabel = 'strong';
  else if (strength >= 3) strengthLabel = 'medium';

  return {
    isValid: strength >= 3,
    error: strength < 3 ? 'Password is too weak' : null,
    strength: strengthLabel,
    checks
  };
};

/**
 * Validate password confirmation
 */
export const validatePasswordConfirmation = (password, confirmation) => {
  if (!confirmation) {
    return {
      isValid: false,
      error: 'Password confirmation is required'
    };
  }

  if (password !== confirmation) {
    return {
      isValid: false,
      error: 'Passwords do not match'
    };
  }

  return { isValid: true };
};

// ============================================
// SEARCH VALIDATION
// ============================================

/**
 * Validate search query
 */
export const validateSearchQuery = (query, minLength = 2, maxLength = 100) => {
  if (!query || query.trim() === '') {
    return {
      isValid: false,
      error: 'Search query is required'
    };
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length < minLength) {
    return {
      isValid: false,
      error: `Search query must be at least ${minLength} characters`
    };
  }

  if (trimmedQuery.length > maxLength) {
    return {
      isValid: false,
      error: `Search query must be less than ${maxLength} characters`
    };
  }

  return { isValid: true };
};

// ============================================
// NUMBER VALIDATION
// ============================================

/**
 * Validate number range
 */
export const validateNumberRange = (value, min, max) => {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: 'Value is required'
    };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: 'Value must be a number'
    };
  }

  if (min !== undefined && num < min) {
    return {
      isValid: false,
      error: `Value must be at least ${min}`
    };
  }

  if (max !== undefined && num > max) {
    return {
      isValid: false,
      error: `Value must be at most ${max}`
    };
  }

  return { isValid: true };
};

/**
 * Validate positive number
 */
export const validatePositiveNumber = (value) => {
  const num = Number(value);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: 'Value must be a number'
    };
  }

  if (num <= 0) {
    return {
      isValid: false,
      error: 'Value must be positive'
    };
  }

  return { isValid: true };
};

// ============================================
// DATE VALIDATION
// ============================================

/**
 * Validate date
 */
export const validateDate = (date) => {
  if (!date) {
    return {
      isValid: false,
      error: 'Date is required'
    };
  }

  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date format'
    };
  }

  return { isValid: true };
};

/**
 * Validate date range
 */
export const validateDateRange = (startDate, endDate) => {
  const startValidation = validateDate(startDate);
  if (!startValidation.isValid) {
    return {
      isValid: false,
      error: 'Invalid start date'
    };
  }

  const endValidation = validateDate(endDate);
  if (!endValidation.isValid) {
    return {
      isValid: false,
      error: 'Invalid end date'
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return {
      isValid: false,
      error: 'Start date must be before end date'
    };
  }

  return { isValid: true };
};

/**
 * Validate future date
 */
export const validateFutureDate = (date) => {
  const dateValidation = validateDate(date);
  if (!dateValidation.isValid) {
    return dateValidation;
  }

  const dateObj = new Date(date);
  const now = new Date();

  if (dateObj <= now) {
    return {
      isValid: false,
      error: 'Date must be in the future'
    };
  }

  return { isValid: true };
};

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validate required field
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`
    };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`
    };
  }

  return { isValid: true };
};

/**
 * Validate min length
 */
export const validateMinLength = (value, minLength, fieldName = 'Field') => {
  if (!value) {
    return { isValid: true }; // Let required validator handle this
  }

  if (value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`
    };
  }

  return { isValid: true };
};

/**
 * Validate max length
 */
export const validateMaxLength = (value, maxLength, fieldName = 'Field') => {
  if (!value) {
    return { isValid: true };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be less than ${maxLength} characters`
    };
  }

  return { isValid: true };
};

/**
 * Validate pattern match
 */
export const validatePattern = (value, pattern, errorMessage) => {
  if (!value) {
    return { isValid: true };
  }

  if (!pattern.test(value)) {
    return {
      isValid: false,
      error: errorMessage || 'Invalid format'
    };
  }

  return { isValid: true };
};

// ============================================
// COMPOSITE VALIDATORS
// ============================================

/**
 * Run multiple validators on a value
 */
export const runValidators = (value, validators) => {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
};

/**
 * Validate entire form
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;

  for (const [field, validators] of Object.entries(validationRules)) {
    const value = formData[field];
    const result = runValidators(value, validators);
    
    if (!result.isValid) {
      errors[field] = result.error;
      isValid = false;
    }
  }

  return { isValid, errors };
};

// ============================================
// SANITIZATION (bonus)
// ============================================

/**
 * Sanitize string input
 */
export const sanitizeString = (str) => {
  if (!str) return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return '';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  // Meeting validation
  validateMeetingTitle,
  validateMeetingDescription,
  validateMeetingCategory,
  validateMeetingData,

  // Audio validation
  validateAudioFileType,
  validateAudioFileSize,
  validateAudioFile,

  // User input validation
  validateEmail,
  validateName,
  validateURL,
  validatePhone,

  // Password validation
  validatePassword,
  validatePasswordConfirmation,

  // Search validation
  validateSearchQuery,

  // Number validation
  validateNumberRange,
  validatePositiveNumber,

  // Date validation
  validateDate,
  validateDateRange,
  validateFutureDate,

  // Form validation
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  runValidators,
  validateForm,

  // Sanitization
  sanitizeString,
  sanitizeFilename
};