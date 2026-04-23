

const winston = require('winston');


const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});


class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; 
    Error.captureStackTrace(this, this.constructor);
  }
}


const notFound = (req, res, next) => {
  const error = new AppError(
    `Route not found - ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};


const handlePrismaError = (error) => {
  
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new AppError(`This ${field} already exists`, 409, 'DUPLICATE_ENTRY');
  }

  
  if (error.code === 'P2025') {
    return new AppError('The requested resource was not found', 404, 'RESOURCE_NOT_FOUND');
  }

  
  if (error.code === 'P2003') {
    return new AppError(
      'Cannot perform this action due to related data',
      400,
      'FOREIGN_KEY_CONSTRAINT'
    );
  }

  
  if (error.code === 'P2014') {
    return new AppError('Invalid relationship between resources', 400, 'INVALID_RELATION');
  }

  
  if (error.code === 'P2021') {
    return new AppError('Database configuration error', 500, 'DATABASE_ERROR');
  }

  
  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
};


const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
  }

  return new AppError('Authentication failed', 401, 'AUTH_ERROR');
};


const handleValidationError = (error) => {
  const errors = Object.values(error.errors || {}).map((err) => err.message);
  const message =
    errors.length > 0 ? `Validation failed: ${errors.join(', ')}` : 'Validation failed';

  return new AppError(message, 400, 'VALIDATION_ERROR');
};


const handleMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File is too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE');
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files uploaded', 400, 'TOO_MANY_FILES');
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  return new AppError('File upload failed', 400, 'UPLOAD_ERROR');
};


const handleAxiosError = (error) => {
  if (error.response) {
    
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
    
    return new AppError('External service is unavailable', 503, 'SERVICE_UNAVAILABLE');
  }

  return new AppError('Failed to communicate with external service', 500, 'EXTERNAL_API_ERROR');
};


const sendErrorDev = (err, req, res) => {
  logger.error('Error in development:', {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
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
      timestamp: new Date().toISOString(),
    },
  });
};


const sendErrorProd = (err, req, res) => {
  
  if (err.isOperational) {
    logger.error('Operational error:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      url: req.originalUrl,
      userId: req.userId,
    });

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }


  logger.error('Unknown error:', {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: 'Something went wrong. Please try again later.',
    code: 'INTERNAL_SERVER_ERROR',
  });
};


const errorHandler = (err, req, res, next) => {
 
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

 
  if (err.code && err.code.startsWith('P')) {
    error = handlePrismaError(err);
  }

  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  
  if (err.name === 'MulterError') {
    error = handleMulterError(err);
  }

  
  if (err.isAxiosError) {
    error = handleAxiosError(err);
  }

  
  if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', 400, 'INVALID_ID');
  }

 
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Invalid JSON in request body', 400, 'INVALID_JSON');
  }

 
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};


const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason.stack || reason,
  });

  
  if (process.env.NODE_ENV === 'production') {
    logger.error('Shutting down due to unhandled rejection...');
    process.exit(1);
  }
});


process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });

 
  logger.error('Shutting down due to uncaught exception...');
  process.exit(1);
});


const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000); 
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
  handleAxiosError,
};
