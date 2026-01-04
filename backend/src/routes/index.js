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

    // Check database
    const dbHealth = await checkDatabaseHealth();

    const overallHealth = dbHealth.status === 'healthy' ? 'healthy' : 'degraded';

    res.status(overallHealth === 'healthy' ? 200 : 503).json({
      success: true,
      status: overallHealth,
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      services: {
        database: dbHealth,
        customModel: {
          status: 'configured',
          note: 'Health check available at custom model API endpoint'
        },
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
 * Privacy Policy endpoint (FR.42 - GDPR compliance)
 * GET /api/privacy-policy
 */
router.get('/privacy-policy', (req, res) => {
  const privacyPolicy = {
    lastUpdated: '2026-01-04',
    version: '1.0.0',
    company: {
      name: 'EchoNote',
      contact: 'privacy@echonote.app'
    },
    introduction: 'EchoNote is committed to protecting your privacy. This policy explains how we collect, use, and protect your personal information.',
    dataCollection: {
      summary: 'We collect only the minimum data necessary to provide our service',
      types: [
        {
          category: 'Account Information',
          data: ['Email address', 'Name', 'Profile picture (from Google OAuth)'],
          purpose: 'To create and manage your account'
        },
        {
          category: 'Meeting Data',
          data: ['Audio recordings (temporary)', 'Transcripts (permanent)', 'AI-generated summaries', 'Meeting metadata (title, date, category)'],
          purpose: 'To provide transcription and summarization services'
        },
        {
          category: 'Usage Data',
          data: ['Login timestamps', 'Meeting statistics', 'User activity logs'],
          purpose: 'To improve our service and provide usage analytics'
        }
      ]
    },
    dataProcessing: {
      audioFiles: 'Audio files are processed using AI models (Whisper, SpaCy, Qwen2.5-7B) and automatically deleted after processing is complete. Only transcripts and summaries are permanently stored.',
      location: 'Data is stored in PostgreSQL databases hosted on Supabase (USA servers)',
      retention: 'Transcripts and summaries are retained until you delete your account or individual meetings',
      aiProcessing: 'Audio is processed through: (1) Audio optimization, (2) Speech-to-text transcription (Whisper), (3) NLP analysis (SpaCy), (4) Summarization (Custom fine-tuned Qwen2.5-7B model)'
    },
    dataRetention: {
      audioFiles: 'Automatically deleted immediately after successful processing (within minutes)',
      transcripts: 'Retained permanently unless manually deleted by user',
      summaries: 'Retained permanently unless manually deleted by user',
      userAccount: 'All data permanently deleted within 30 days of account deletion',
      userControl: `Users can configure auto-deletion period (1-365 days) in settings. Default: ${process.env.DEFAULT_AUTO_DELETE_DAYS || 30} days`
    },
    yourRights: {
      summary: 'Under GDPR and similar privacy laws, you have the following rights:',
      rights: [
        {
          right: 'Right to Access',
          description: 'You can view all your data at any time through the dashboard',
          implementation: 'Accessible via user profile and meetings list'
        },
        {
          right: 'Right to Data Portability',
          description: 'You can export all your data in JSON format',
          implementation: 'GET /api/users/export endpoint provides complete data export'
        },
        {
          right: 'Right to Erasure',
          description: 'You can delete your account and all associated data',
          implementation: 'DELETE /api/users/me endpoint with confirmation'
        },
        {
          right: 'Right to Rectification',
          description: 'You can update your personal information at any time',
          implementation: 'PATCH /api/users/me endpoint'
        },
        {
          right: 'Right to Object',
          description: 'You can disable email notifications and control data collection',
          implementation: 'Settings page allows granular control'
        }
      ]
    },
    dataSecurity: {
      encryption: 'All data is encrypted in transit (HTTPS/TLS) and at rest',
      authentication: 'Google OAuth 2.0 only - no passwords stored',
      accessControl: 'Strict user isolation - users can only access their own data',
      rateLimit: 'API rate limiting prevents abuse (100 requests/hour per user)',
      monitoring: 'Activity logs track all data access and modifications'
    },
    thirdPartyServices: {
      summary: 'We use the following third-party services:',
      services: [
        {
          name: 'Google OAuth',
          purpose: 'Authentication',
          dataShared: 'Email, name, profile picture',
          privacyPolicy: 'https://policies.google.com/privacy'
        },
        {
          name: 'Supabase',
          purpose: 'Database and storage',
          dataShared: 'All user data',
          privacyPolicy: 'https://supabase.com/privacy'
        },
        {
          name: 'Resend',
          purpose: 'Email notifications',
          dataShared: 'Email address, meeting completion status',
          privacyPolicy: 'https://resend.com/legal/privacy-policy'
        },
        {
          name: 'OpenAI Whisper',
          purpose: 'Speech-to-text transcription',
          dataShared: 'Audio files (processed locally, not sent to OpenAI servers)',
          privacyPolicy: 'Self-hosted model - no data sharing'
        },
        {
          name: 'SpaCy',
          purpose: 'NLP processing',
          dataShared: 'Transcripts (processed locally)',
          privacyPolicy: 'Self-hosted model - no data sharing'
        },
        {
          name: 'Custom Qwen2.5-7B Model',
          purpose: 'Meeting summarization',
          dataShared: 'Transcripts and NLP features',
          privacyPolicy: 'Self-hosted via NGROK - temporary processing only'
        }
      ]
    },
    cookies: {
      usage: 'We use minimal cookies for authentication only',
      types: [
        {
          name: 'JWT Access Token',
          purpose: 'Maintain user session',
          expiration: '1 hour',
          essential: true
        },
        {
          name: 'JWT Refresh Token',
          purpose: 'Renew access token',
          expiration: '7 days',
          essential: true
        }
      ]
    },
    changes: {
      policy: 'We may update this privacy policy from time to time. Material changes will be communicated via email.',
      notification: 'Users will be notified 30 days before significant changes take effect'
    },
    contact: {
      email: 'privacy@echonote.app',
      address: 'Data Protection Officer, EchoNote',
      response: 'We will respond to privacy inquiries within 30 days'
    },
    compliance: {
      regulations: ['GDPR (EU)', 'CCPA (California)', 'General privacy best practices'],
      dpo: 'Data Protection Officer available at privacy@echonote.app',
      supervisory: 'You have the right to lodge a complaint with your local data protection authority'
    }
  };

  return res.status(200).json({
    success: true,
    data: privacyPolicy
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