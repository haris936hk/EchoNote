// backend/src/utils/logger.js
// Centralized Winston logger configuration for all services

const winston = require('winston');

/**
 * Create and configure Winston logger instance
 * Used across all backend services for consistent logging
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'echonote-backend' },
  transports: [
    // Console transport with colored output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;

          // Add metadata if present
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }

          return msg;
        })
      )
    })
  ]
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

module.exports = logger;
