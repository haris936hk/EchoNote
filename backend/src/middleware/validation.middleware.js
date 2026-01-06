// backend/src/middleware/validation.middleware.js
// Request validation middleware

const { AppError } = require('./error.middleware');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Validation rules
 */
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format'
  },
  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    message: 'Invalid ID format'
  },
  meetingCategory: {
    values: ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'],
    message: 'Invalid category. Must be one of: SALES, PLANNING, STANDUP, ONE_ON_ONE, OTHER'
  },
  meetingStatus: {
    values: ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING', 'COMPLETED', 'FAILED'],
    message: 'Invalid status'
  },
  userAction: {
    values: ['login', 'logout', 'record', 'view_meeting', 'download', 'delete', 'update'],
    message: 'Invalid action'
  }
};

/**
 * Generic field validator
 */
class Validator {
  constructor(data, location = 'body') {
    this.data = data;
    this.location = location;
    this.errors = [];
  }

  /**
   * Check if field is required and present
   */
  required(field, customMessage) {
    if (this.data[field] === undefined || this.data[field] === null || this.data[field] === '') {
      this.errors.push({
        field,
        message: customMessage || `${field} is required`
      });
    }
    return this;
  }

  /**
   * Check if field is a string
   */
  isString(field, customMessage) {
    if (this.data[field] !== undefined && typeof this.data[field] !== 'string') {
      this.errors.push({
        field,
        message: customMessage || `${field} must be a string`
      });
    }
    return this;
  }

  /**
   * Check if field is a number
   */
  isNumber(field, customMessage) {
    if (this.data[field] !== undefined && typeof this.data[field] !== 'number') {
      this.errors.push({
        field,
        message: customMessage || `${field} must be a number`
      });
    }
    return this;
  }

  /**
   * Check if field is a boolean
   */
  isBoolean(field, customMessage) {
    if (this.data[field] !== undefined && typeof this.data[field] !== 'boolean') {
      this.errors.push({
        field,
        message: customMessage || `${field} must be true or false`
      });
    }
    return this;
  }

  /**
   * Check if field is an email
   */
  isEmail(field, customMessage) {
    if (this.data[field] && !VALIDATION_RULES.email.pattern.test(this.data[field])) {
      this.errors.push({
        field,
        message: customMessage || VALIDATION_RULES.email.message
      });
    }
    return this;
  }

  /**
   * Check if field is a UUID
   */
  isUUID(field, customMessage) {
    if (this.data[field] && !VALIDATION_RULES.uuid.pattern.test(this.data[field])) {
      this.errors.push({
        field,
        message: customMessage || VALIDATION_RULES.uuid.message
      });
    }
    return this;
  }

  /**
   * Check minimum length
   */
  minLength(field, min, customMessage) {
    if (this.data[field] && this.data[field].length < min) {
      this.errors.push({
        field,
        message: customMessage || `${field} must be at least ${min} characters`
      });
    }
    return this;
  }

  /**
   * Check maximum length
   */
  maxLength(field, max, customMessage) {
    if (this.data[field] && this.data[field].length > max) {
      this.errors.push({
        field,
        message: customMessage || `${field} must not exceed ${max} characters`
      });
    }
    return this;
  }

  /**
   * Check if value is in allowed list
   */
  isIn(field, allowedValues, customMessage) {
    if (this.data[field] && !allowedValues.includes(this.data[field])) {
      this.errors.push({
        field,
        message: customMessage || `${field} must be one of: ${allowedValues.join(', ')}`
      });
    }
    return this;
  }

  /**
   * Check minimum value
   */
  min(field, minValue, customMessage) {
    if (this.data[field] !== undefined && this.data[field] < minValue) {
      this.errors.push({
        field,
        message: customMessage || `${field} must be at least ${minValue}`
      });
    }
    return this;
  }

  /**
   * Check maximum value
   */
  max(field, maxValue, customMessage) {
    if (this.data[field] !== undefined && this.data[field] > maxValue) {
      this.errors.push({
        field,
        message: customMessage || `${field} must not exceed ${maxValue}`
      });
    }
    return this;
  }

  /**
   * Custom validation function
   */
  custom(field, validatorFn, customMessage) {
    if (this.data[field] !== undefined) {
      const isValid = validatorFn(this.data[field]);
      if (!isValid) {
        this.errors.push({
          field,
          message: customMessage || `${field} is invalid`
        });
      }
    }
    return this;
  }

  /**
   * Get validation errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Check if validation passed
   */
  isValid() {
    return this.errors.length === 0;
  }
}

/**
 * Create validation middleware
 */
const validate = (validationFn) => {
  return (req, res, next) => {
    try {
      validationFn(req);
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(error.message, 400, 'VALIDATION_ERROR'));
      }
    }
  };
};

/**
 * Validate meeting creation
 */
const validateCreateMeeting = (req, res, next) => {
  const validator = new Validator(req.body);

  validator
    .required('title', 'Meeting title is required')
    .isString('title')
    .minLength('title', 2, 'Title must be at least 2 characters')
    .maxLength('title', 200, 'Title must not exceed 200 characters');

  if (req.body.description !== undefined) {
    validator
      .isString('description')
      .maxLength('description', 1000, 'Description must not exceed 1000 characters');
  }

  if (req.body.category) {
    validator.isIn('category', VALIDATION_RULES.meetingCategory.values, VALIDATION_RULES.meetingCategory.message);
  }

  if (!validator.isValid()) {
    return next(new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR'
    ).setDetails(validator.getErrors()));
  }

  next();
};

/**
 * Validate meeting update
 */
const validateUpdateMeeting = (req, res, next) => {
  const validator = new Validator(req.body);

  if (req.body.title !== undefined) {
    validator
      .isString('title')
      .minLength('title', 2, 'Title must be at least 2 characters')
      .maxLength('title', 200, 'Title must not exceed 200 characters');
  }

  if (req.body.description !== undefined) {
    validator
      .isString('description')
      .maxLength('description', 1000, 'Description must not exceed 1000 characters');
  }

  if (req.body.category) {
    validator.isIn('category', VALIDATION_RULES.meetingCategory.values, VALIDATION_RULES.meetingCategory.message);
  }

  if (!validator.isValid()) {
    return next(new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR'
    ).setDetails(validator.getErrors()));
  }

  // Check if at least one field is provided
  if (Object.keys(req.body).length === 0) {
    return next(new AppError(
      'At least one field must be provided for update',
      400,
      'VALIDATION_ERROR'
    ));
  }

  next();
};

/**
 * Validate user profile update
 */
const validateUpdateProfile = (req, res, next) => {
  const validator = new Validator(req.body);

  if (req.body.name !== undefined) {
    validator
      .isString('name')
      .minLength('name', 2, 'Name must be at least 2 characters')
      .maxLength('name', 100, 'Name must not exceed 100 characters');
  }

  if (req.body.autoDeleteDays !== undefined) {
    validator
      .isNumber('autoDeleteDays')
      .min('autoDeleteDays', 1, 'Auto-delete days must be at least 1')
      .max('autoDeleteDays', 365, 'Auto-delete days must not exceed 365');
  }

  if (req.body.emailNotifications !== undefined) {
    validator.isBoolean('emailNotifications');
  }

  if (!validator.isValid()) {
    return next(new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR'
    ).setDetails(validator.getErrors()));
  }

  next();
};

/**
 * Validate user settings update
 */
const validateUpdateSettings = (req, res, next) => {
  const validator = new Validator(req.body);

  // autoDeleteDays can be null (disable) or a number between 1-365
  if (req.body.autoDeleteDays !== undefined && req.body.autoDeleteDays !== null) {
    validator
      .isNumber('autoDeleteDays')
      .min('autoDeleteDays', 1, 'Auto-delete days must be at least 1')
      .max('autoDeleteDays', 365, 'Auto-delete days must not exceed 365');
  }

  if (req.body.emailNotifications !== undefined) {
    validator.isBoolean('emailNotifications');
  }

  if (!validator.isValid()) {
    return next(new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR'
    ).setDetails(validator.getErrors()));
  }

  // Check if at least one field is provided
  if (Object.keys(req.body).length === 0) {
    return next(new AppError(
      'At least one setting must be provided',
      400,
      'VALIDATION_ERROR'
    ));
  }

  next();
};

/**
 * Validate query parameters for pagination
 */
const validatePagination = (req, res, next) => {
  const validator = new Validator(req.query, 'query');

  if (req.query.page !== undefined) {
    const page = parseInt(req.query.page);
    if (isNaN(page) || page < 1) {
      return next(new AppError('Page must be a positive number', 400, 'VALIDATION_ERROR'));
    }
    req.query.page = page;
  }

  if (req.query.limit !== undefined) {
    const limit = parseInt(req.query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return next(new AppError('Limit must be between 1 and 100', 400, 'VALIDATION_ERROR'));
    }
    req.query.limit = limit;
  }

  if (req.query.category) {
    validator.isIn('category', VALIDATION_RULES.meetingCategory.values, VALIDATION_RULES.meetingCategory.message);
  }

  if (req.query.status) {
    validator.isIn('status', VALIDATION_RULES.meetingStatus.values, VALIDATION_RULES.meetingStatus.message);
  }

  if (!validator.isValid()) {
    return next(new AppError(
      'Invalid query parameters',
      400,
      'VALIDATION_ERROR'
    ).setDetails(validator.getErrors()));
  }

  next();
};

/**
 * Validate search query
 */
const validateSearch = (req, res, next) => {
  const { q, limit } = req.query;

  if (!q) {
    return next(new AppError(
      'Search query (q) is required',
      400,
      'VALIDATION_ERROR'
    ));
  }

  if (q.trim().length < 2) {
    return next(new AppError(
      'Search query must be at least 2 characters',
      400,
      'VALIDATION_ERROR'
    ));
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return next(new AppError(
        'Limit must be between 1 and 100',
        400,
        'VALIDATION_ERROR'
      ));
    }
    req.query.limit = limitNum;
  }

  next();
};

/**
 * Validate UUID parameter
 */
const validateUUIDParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return next(new AppError(
        `${paramName} is required`,
        400,
        'VALIDATION_ERROR'
      ));
    }

    if (!VALIDATION_RULES.uuid.pattern.test(id)) {
      return next(new AppError(
        `Invalid ${paramName} format`,
        400,
        'INVALID_ID'
      ));
    }

    next();
  };
};

/**
 * Validate user activity logging
 */
const validateLogActivity = (req, res, next) => {
  const validator = new Validator(req.body);

  validator
    .required('action', 'Action is required')
    .isIn('action', VALIDATION_RULES.userAction.values, VALIDATION_RULES.userAction.message);

  if (!validator.isValid()) {
    return next(new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR'
    ).setDetails(validator.getErrors()));
  }

  next();
};

/**
 * Validate account deletion confirmation
 */
const validateAccountDeletion = (req, res, next) => {
  const { confirmation } = req.body;

  if (!confirmation) {
    return next(new AppError(
      'Confirmation is required',
      400,
      'VALIDATION_ERROR'
    ));
  }

  if (confirmation !== 'DELETE_MY_ACCOUNT') {
    return next(new AppError(
      'Invalid confirmation. You must send: { "confirmation": "DELETE_MY_ACCOUNT" }',
      400,
      'INVALID_CONFIRMATION'
    ));
  }

  next();
};

/**
 * Validate download format
 */
const validateDownloadFormat = (req, res, next) => {
  const { format } = req.query;

  if (format && !['txt', 'json'].includes(format)) {
    return next(new AppError(
      'Invalid format. Must be "txt" or "json"',
      400,
      'INVALID_FORMAT'
    ));
  }

  next();
};

/**
 * Sanitize string input (remove dangerous characters)
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Trim whitespace
  str = str.trim();

  return str;
};

/**
 * Sanitize request body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
};

/**
 * Sanitize query parameters
 */
const sanitizeQuery = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }
  next();
};

/**
 * Extend AppError to support validation details
 */
AppError.prototype.setDetails = function (details) {
  this.details = details;
  return this;
};

module.exports = {
  Validator,
  validate,
  validateCreateMeeting,
  validateUpdateMeeting,
  validateUpdateProfile,
  validateUpdateSettings,
  validatePagination,
  validateSearch,
  validateUUIDParam,
  validateLogActivity,
  validateAccountDeletion,
  validateDownloadFormat,
  sanitizeString,
  sanitizeBody,
  sanitizeQuery,
  VALIDATION_RULES
};