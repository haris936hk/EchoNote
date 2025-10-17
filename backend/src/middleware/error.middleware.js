// backend/src/middleware/error.middleware.js
// Centralized error handling middleware

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
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Mark as operational error (not programming error)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found error handler
 * Catches all 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Route not found - ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Prisma error handler
 * Converts Prisma errors to user-friendly messages
 */
const handlePrismaError = (error) => {
  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new AppError(
      `This ${field} already exists`,
      409,
      'DUPLICATE_ENTRY'
    );
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return new AppError(
      'The requested resource was not found',
      404,
      'RESOURCE_NOT_FOUND'
    );
  }

  // P2003: Foreign key constraint violation
  if (error.code === 'P2003') {
    return new AppError(
      'Cannot perform this action due to related data',
      400,
      'FOREIGN_KEY_CONSTRAINT'
    );
  }

  // P2014: Invalid relation
  if (error.code === 'P2014') {
    return new AppError(
      'Invalid relationship between resources',
      400,
      'INVALID_RELATION'
    );
  }

  // P2021: Table does not exist
  if (error.code === 'P2021') {
    return new AppError(
      'Database configuration error',
      500,
      'DATABASE_ERROR'
    );
  }

  // Generic Prisma error
  return new AppError(
    'Database operation failed',
    500,
    'DATABASE_ERROR'
  );
};

/**
 * JWT error handler
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError(
      'Invalid authentication token',
      401,
      'INVALID_TOKEN'
    );
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError(
      'Authentication token has expired',
      401,
      'TOKEN_EXPIRED'
    );
  }

  return new AppError(
    'Authentication failed',
    401,
    'AUTH_ERROR'
  );
};

/**
 * Validation error handler
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors || {}).map(err => err.message);
  const message = errors.length > 0 
    ? `Validation failed: ${errors.join(', ')}`
    : 'Validation failed';
  
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

/**
 * Multer/File upload error handler
 */
const handleMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(
      'File is too large. Maximum size is 10MB',
      400,
      'FILE_TOO_LARGE'
    );
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError(
      'Too many files uploaded',
      400,
      'TOO_MANY_FILES'
    );
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(
      'Unexpected file field',
      400,
      'UNEXPECTED_FILE'
    );
  }

  return new AppError(
    'File upload failed',
    400,
    'UPLOAD_ERROR'
  );
};

/**
 * Axios/HTTP error handler (for external API calls)
 */
const handleAxiosError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.error || error.message;
    
    if (status === 401) {
      return new AppError('External API authentication failed', 401, 'EXTERNAL_API_AUTH_ERROR');
    }
    
    if (status === 429) {
      return new AppError('Rate limit exceeded on external service', 429, 'EXTERNAL_RATE_LIMIT');
    }
    
    return new AppError(
      `External service error: ${message}`,
      status >= 500 ? 503 : status,
      'EXTERNAL_API_ERROR'
    );
  }

  if (error.request) {
    // Request made but no response
    return new AppError(
      'External service is unavailable',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  return new AppError(
    'Failed to communicate with external service',
    500,
    'EXTERNAL_API_ERROR'
  );
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  logger.error('Error in development:', {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
    details: {
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.error('Operational error:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      url: req.originalUrl,
      userId: req.userId
    });

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }

  // Programming or unknown error: don't leak error details
  logger.error('Unknown error:', {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  return res.status(500).json({
    success: false,
    error: 'Something went wrong. Please try again later.',
    code: 'INTERNAL_SERVER_ERROR'
  });
};

/**
 * Global error handler middleware
 * Must be placed after all routes
 */
const errorHandler = (err, req, res, next) => {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    error = handlePrismaError(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    error = handleMulterError(err);
  }

  // Axios errors (external API calls)
  if (err.isAxiosError) {
    error = handleAxiosError(err);
  }

  // Cast errors (MongoDB, if ever used)
  if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', 400, 'INVALID_ID');
  }

  // Syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  // Send appropriate response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason.stack || reason
  });
  
  // In production, you might want to restart the server
  if (process.env.NODE_ENV === 'production') {
    logger.error('Shutting down due to unhandled rejection...');
    process.exit(1);
  }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Always exit on uncaught exceptions
  logger.error('Shutting down due to uncaught exception...');
  process.exit(1);
});

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Close server and database connections
  // This should be called in server.js
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000); // 10 second timeout
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
  handlePrismaError,
  handleJWTError,
  handleValidationError,
  handleMulterError,
  handleAxiosError
};