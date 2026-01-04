// backend/src/routes/auth.routes.js
// Authentication routes for Google OAuth

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { sanitizeBody } = require('../middleware/validation.middleware');

/**
 * @route   POST /api/auth/google
 * @desc    Google OAuth login/signup (client-side flow)
 * @access  Public
 * @body    { idToken: string }
 * @returns { success, data: { user, accessToken, refreshToken }, message }
 */
router.post(
  '/google',
  authLimiter, // 10 requests per 15 minutes
  sanitizeBody,
  authController.googleAuth
);

/**
 * @route   GET /api/auth/google/url
 * @desc    Get Google OAuth authorization URL (server-side flow)
 * @access  Public
 * @returns { success, data: { url }, message }
 */
router.get(
  '/google/url',
  authController.getGoogleAuthUrl
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback (server-side flow)
 * @access  Public
 * @query   code=<authorization_code>
 * @returns Redirects to frontend with tokens
 */
router.get(
  '/google/callback',
  authController.googleCallback
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken: string }
 * @returns { success, data: { accessToken, refreshToken }, message }
 */
router.post(
  '/refresh',
  authLimiter, // 10 requests per 15 minutes
  sanitizeBody,
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (optional - client-side can just delete tokens)
 * @access  Private
 * @returns { success, message }
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 * @returns { success, data: { user } }
 */
router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify if token is valid
 * @access  Public
 * @body    { token: string }
 * @returns { success, data: { valid, user? } }
 */
router.post(
  '/verify',
  optionalAuth,
  authController.verifyToken
);

/**
 * @route   POST /api/auth/revoke
 * @desc    Revoke Google OAuth access (disconnect account)
 * @access  Private
 * @returns { success, message }
 */
router.post(
  '/revoke',
  authenticate,
  authController.revokeGoogleAccess
);

/**
 * @route   GET /api/auth/calendar/status
 * @desc    Check Google Calendar connection status
 * @access  Private
 * @returns { success, data: { connected, scopes } }
 */
router.get(
  '/calendar/status',
  authenticate,
  authController.getCalendarStatus
);

/**
 * @route   POST /api/auth/calendar/connect
 * @desc    Connect Google Calendar (request additional scopes)
 * @access  Private
 * @returns { success, data: { authUrl } }
 */
router.post(
  '/calendar/connect',
  authenticate,
  authController.connectCalendar
);

/**
 * @route   POST /api/auth/calendar/disconnect
 * @desc    Disconnect Google Calendar
 * @access  Private
 * @returns { success, message }
 */
router.post(
  '/calendar/disconnect',
  authenticate,
  authController.disconnectCalendar
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get active sessions for user (future feature)
 * @access  Private
 * @returns { success, data: { sessions } }
 */
router.get(
  '/sessions',
  authenticate,
  authController.getActiveSessions
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke specific session (future feature)
 * @access  Private
 * @returns { success, message }
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  authController.revokeSession
);

/**
 * Health check for auth service
 * @route   GET /api/auth/health
 * @desc    Check if auth service is working
 * @access  Public
 * @returns { success, status, timestamp }
 */
router.get(
  '/health',
  (req, res) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      service: 'authentication',
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;