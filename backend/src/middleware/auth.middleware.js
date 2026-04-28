 
const { verifyToken, extractTokenFromHeader } = require('../config/auth');
const { prisma } = require('../config/database');
const winston = require('winston');
 
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});


const USER_CACHE_TTL_MS = 60 * 1000; 
const _userCache = new Map(); 

function _getCachedUser(userId) {
  const entry = _userCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _userCache.delete(userId);
    return null;
  }
  return entry.user;
}

function _setCachedUser(userId, user) {
  _userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}


function evictUserFromCache(userId) {
  _userCache.delete(userId);
}


setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of _userCache.entries()) {
      if (now > entry.expiresAt) _userCache.delete(key);
    }
  },
  5 * 60 * 1000
);


const authenticate = async (req, res, next) => {
  try {
    
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.',
      });
    }

    
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.message === 'Token has expired') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN',
      });
    }

    
    let user = _getCachedUser(decoded.id);
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          jiraDomain: true,
          jiraAutoSync: true,
        },
      });
      if (user) _setCachedUser(user.id, user);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Account may have been deleted.',
        code: 'USER_NOT_FOUND',
      });
    }

    
    req.user = user;
    req.userId = user.id;

    
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`✅ User authenticated: ${user.email}`);
    }

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.',
    });
  }
};


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
      let user = _getCachedUser(decoded.id);
      if (!user) {
        user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            name: true,
            picture: true,
            jiraDomain: true,
            jiraAutoSync: true,
          },
        });
        if (user) _setCachedUser(user.id, user);
      }

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
          error: 'Resource ID is required',
        });
      }

      let resource;

      switch (resourceType) {
        case 'meeting':
          resource = await prisma.meeting.findUnique({
            where: { id: resourceId },
            select: { userId: true }, 
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid resource type',
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: `${resourceType} not found`,
        });
      }


      if (resource.userId !== req.userId) {
        logger.warn(
          `⚠️ Unauthorized access attempt by ${req.user.email} to ${resourceType} ${resourceId}`
        );
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource',
          code: 'FORBIDDEN',
        });
      }

      
      req[resourceType] = resource;

      next();
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed',
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

  
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
  }, 60000);

  return (req, res, next) => {
    const identifier = req.userId || req.ip; 
    const now = Date.now();

    if (!requests.has(identifier)) {
      requests.set(identifier, {
        count: 1,
        resetTime: now,
      });
      return next();
    }

    const userData = requests.get(identifier);

    
    if (now - userData.resetTime > windowMs) {
      userData.count = 1;
      userData.resetTime = now;
      return next();
    }

    
    userData.count++;

    
    if (userData.count > maxRequests) {
      const resetIn = Math.ceil((windowMs - (now - userData.resetTime)) / 1000);

      logger.warn(`⚠️ Rate limit exceeded for ${identifier}`);

      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetIn,
      });
    }

    
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
        missing: missing,
      });
    }

    next();
  };
};


const requireVerifiedEmail = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    

    next();
  } catch (error) {
    logger.error(`Email verification check error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Email verification check failed',
    });
  }
};


const requestLogger = (req, res, next) => {
  const start = Date.now();

  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.userId || 'anonymous',
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};


const corsMiddleware = (req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); 

  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};


const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};


const requireCompletedMeeting = async (req, res, next) => {
  try {
    const meetingId = req.params.id || req.params.meetingId;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { status: true },
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    if (meeting.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Meeting is still processing',
        code: 'MEETING_PROCESSING',
        status: meeting.status,
      });
    }

    next();
  } catch (error) {
    logger.error(`Meeting status check error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to check meeting status',
    });
  }
};


const authenticateMedia = async (req, res, next) => {
  try {
    
    let token = extractTokenFromHeader(req.headers.authorization);

    
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.',
      });
    }

    
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.message === 'Token has expired') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN',
      });
    }

   
    let user = _getCachedUser(decoded.id);
    if (!user) {
      user = await prisma.user.findUnique({
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
          lastLoginAt: true,
        },
      });
      if (user) _setCachedUser(user.id, user);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Account may have been deleted.',
        code: 'USER_NOT_FOUND',
      });
    }

    
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error(`Media authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.',
    });
  }
};

module.exports = {
  authenticate,
  authenticateMedia,
  optionalAuth,
  authorize,
  rateLimit,
  validateRequired,
  requireVerifiedEmail,
  requestLogger,
  corsMiddleware,
  securityHeaders,
  requireCompletedMeeting,
  evictUserFromCache,
};
