
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const { ipKeyGenerator } = require('express-rate-limit');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests from this user/IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {

    return req.userId || ipKeyGenerator(req, res);
  },
  handler: (req, res) => {
    logger.warn(`⚠️ Rate limit exceeded for ${req.userId || req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests. You have exceeded the rate limit of 100 requests per hour.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000),
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req, res) => {
    return ipKeyGenerator(req, res);
  },
  handler: (req, res) => {
    logger.warn(`⚠️ Auth rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000),
    });
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many upload attempts. Please wait before uploading again.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.userId || ipKeyGenerator(req, res);
  },
  handler: (req, res) => {
    const identifier = req.userId || req.ip;
    logger.warn(`⚠️ Upload rate limit exceeded for ${identifier}`);
    res.status(429).json({
      success: false,
      error: 'Too many upload attempts. You can upload up to 5 files per minute.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000),
    });
  },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many search requests. Please slow down.',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.userId || ipKeyGenerator(req, res);
  },
  handler: (req, res) => {
    const identifier = req.userId || req.ip;
    logger.warn(`⚠️ Search rate limit exceeded for ${identifier}`);
    res.status(429).json({
      success: false,
      error: 'Too many search requests. Please wait before searching again.',
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000),
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
};
