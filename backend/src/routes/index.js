// backend/src/routes/index.js
// Central route registry - combines all routes

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const meetingRoutes = require('./meeting.routes');
const userRoutes = require('./user.routes');

// API version and status
const API_VERSION = '1.0.0';
const API_PREFIX = '/api';

/**
 * Root endpoint
 * GET /
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EchoNote API',
    version: API_VERSION,
    documentation: 'https://docs.echonote.app',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      meetings: `${API_PREFIX}/meetings`,
      users: `${API_PREFIX}/users`,
      health: `${API_PREFIX}/health`
    }
  });
});

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', async (req, res) => {
  try {
    const { checkDatabaseHealth } = require('../config/database');
    const { checkGroqHealth } = require('../config/groq');

    // Check database
    const dbHealth = await checkDatabaseHealth();

    // Check Groq API (optional - don't fail if unavailable)
    let groqHealth = { status: 'unknown' };
    try {
      groqHealth = await checkGroqHealth();
    } catch (error) {
      groqHealth = { status: 'unavailable', error: error.message };
    }

    const overallHealth = dbHealth.status === 'healthy' ? 'healthy' : 'degraded';

    res.status(overallHealth === 'healthy' ? 200 : 503).json({
      success: true,
      status: overallHealth,
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      services: {
        database: dbHealth,
        groq: groqHealth,
        server: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
          }
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API status endpoint with statistics
 * GET /api/status
 */
router.get('/status', async (req, res) => {
  try {
    const { getDatabaseStats } = require('../config/database');
    const { getUploadStats } = require('../middleware/upload.middleware');

    const [dbStats, uploadStats] = await Promise.all([
      getDatabaseStats(),
      Promise.resolve(getUploadStats())
    ]);

    res.status(200).json({
      success: true,
      api: {
        version: API_VERSION,
        environment: process.env.NODE_ENV || 'development',
        uptime: {
          seconds: Math.floor(process.uptime()),
          formatted: formatUptime(process.uptime())
        }
      },
      statistics: {
        database: dbStats,
        uploads: uploadStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API documentation endpoint
 * GET /api/docs
 */
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EchoNote API Documentation',
    version: API_VERSION,
    baseUrl: process.env.BASE_URL || 'http://localhost:5000',
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      endpoints: {
        login: 'POST /api/auth/google',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      }
    },
    resources: {
      meetings: {
        list: 'GET /api/meetings',
        create: 'POST /api/meetings',
        get: 'GET /api/meetings/:id',
        update: 'PATCH /api/meetings/:id',
        delete: 'DELETE /api/meetings/:id',
        upload: 'POST /api/meetings/:id/upload',
        transcript: 'GET /api/meetings/:id/transcript',
        summary: 'GET /api/meetings/:id/summary',
        search: 'GET /api/meetings/search'
      },
      users: {
        profile: 'GET /api/users/me',
        updateProfile: 'PATCH /api/users/me',
        settings: 'GET /api/users/settings',
        updateSettings: 'PATCH /api/users/settings',
        stats: 'GET /api/users/stats',
        export: 'GET /api/users/export',
        delete: 'DELETE /api/users/me'
      }
    },
    rateLimits: {
      default: '100 requests per 15 minutes',
      upload: '5 requests per minute',
      auth: '10 requests per minute'
    },
    support: {
      email: 'support@echonote.app',
      documentation: 'https://docs.echonote.app'
    }
  });
});

/**
 * Test endpoint for development
 * GET /api/test
 */
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Test endpoint - Development only',
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        headers: {
          'user-agent': req.get('user-agent'),
          'content-type': req.get('content-type')
        }
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Register route modules
 */
router.use('/auth', authRoutes);
router.use('/meetings', meetingRoutes);
router.use('/users', userRoutes);

/**
 * Helper function to format uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Catch-all for undefined API routes
 * This will be caught by the notFound middleware in server.js
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
    suggestion: 'Check /api/docs for available endpoints'
  });
});

module.exports = router;