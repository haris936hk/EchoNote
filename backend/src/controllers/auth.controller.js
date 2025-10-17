// backend/src/middleware/auth.middleware.js
// Authentication and authorization middleware

const { verifyToken, extractTokenFromHeader } = require('../config/auth');
const { prisma } = require('../config/database');
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
 * Authenticate user with JWT token
 * Validates token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }
    
    // Verify JWT token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.message === 'Token has expired') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        googleId: true,
        autoDeleteDays: true,
        emailNotifications: true,
        createdAt: true,
        lastLoginAt: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Account may have been deleted.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Attach user to request object
    req.user = user;
    req.userId = user.id;
    
    // Log authentication (optional, disable in production for performance)
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`✅ User authenticated: ${user.email}`);
    }
    
    next();
    
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that work differently for logged-in users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }
    
    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          picture: true
        }
      });
      
      req.user = user;
      req.userId = user?.id || null;
    } catch (error) {
      req.user = null;
      req.userId = null;
    }
    
    next();
    
  } catch (error) {
    logger.error(`Optional auth error: ${error.message}`);
    req.user = null;
    req.userId = null;
    next();
  }
};

/**
 * Check if user owns the resource
 * @param {string} resourceType - Type of resource (meeting, etc.)
 */
const authorize = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.meetingId;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        });
      }
      
      let resource;
      
      switch (resourceType) {
        case 'meeting':
          resource = await prisma.meeting.findUnique({
            where: { id: resourceId },
            select: { userId: true, id: true, title: true }
          });
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid resource type'
          });
      }
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: `${resourceType} not found`
        });
      }
      
      // Check ownership
      if (resource.userId !== req.userId) {
        logger.warn(`⚠️ Unauthorized access attempt by ${req.user.email} to ${resourceType} ${resourceId}`);
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource',
          code: 'FORBIDDEN'
        });
      }
      
      // Attach resource to request for downstream use
      req[resourceType] = resource;
      
      next();
      
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
};

/**
 * Rate limiting middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  // Cleanup old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
  }, 60000);
  
  return (req, res, next) => {
    const identifier = req.userId || req.ip; // Use userId if authenticated, else IP
    const now = Date.now();
    
    if (!requests.has(identifier)) {
      requests.set(identifier, {
        count: 1,
        resetTime: now
      });
      return next();
    }
    
    const userData = requests.get(identifier);
    
    // Reset if window expired
    if (now - userData.resetTime > windowMs) {
      userData.count = 1;
      userData.resetTime = now;
      return next();
    }
    
    // Increment counter
    userData.count++;
    
    // Check if limit exceeded
    if (userData.count > maxRequests) {
      const resetIn = Math.ceil((windowMs - (now - userData.resetTime)) / 1000);
      
      logger.warn(`⚠️ Rate limit exceeded for ${identifier}`);
      
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetIn
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - userData.count);
    res.setHeader('X-RateLimit-Reset', new Date(userData.resetTime + windowMs).toISOString());
    
    next();
  };
};

/**
 * Validate request has required fields
 * @param {Array} requiredFields - Array of required field names
 * @param {string} location - Where to check ('body', 'query', 'params')
 */
const validateRequired = (requiredFields, location = 'body') => {
  return (req, res, next) => {
    const data = req[location];
    const missing = [];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing: missing
      });
    }
    
    next();
  };
};

/**
 * Check if user's email is verified
 */
const requireVerifiedEmail = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Google OAuth users are always verified
    // Add additional checks here if you implement email verification
    
    next();
    
  } catch (error) {
    logger.error(`Email verification check error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Email verification check failed'
    });
  }
};

/**
 * Log API requests for monitoring
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.userId || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  
  next();
};

/**
 * CORS configuration middleware
 */
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

/**
 * Check if meeting processing is complete
 */
const requireCompletedMeeting = async (req, res, next) => {
  try {
    const meetingId = req.params.id || req.params.meetingId;
    
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { status: true }
    });
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }
    
    if (meeting.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Meeting is still processing',
        code: 'MEETING_PROCESSING',
        status: meeting.status
      });
    }
    
    next();
    
  } catch (error) {
    logger.error(`Meeting status check error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to check meeting status'
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  rateLimit,
  validateRequired,
  requireVerifiedEmail,
  requestLogger,
  corsMiddleware,
  securityHeaders,
  requireCompletedMeeting
};