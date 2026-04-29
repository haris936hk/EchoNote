const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { sanitizeBody } = require('../middleware/validation.middleware');

router.post('/google', authLimiter, sanitizeBody, authController.googleAuth);

router.get('/google/url', authController.getGoogleAuthUrl);

router.get('/google/callback', authController.googleCallback);

router.post('/refresh', authLimiter, sanitizeBody, authController.refreshToken);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getCurrentUser);

router.post('/verify', optionalAuth, authController.verifyToken);

router.post('/revoke', authenticate, authController.revokeGoogleAccess);

router.get('/calendar/status', authenticate, authController.getCalendarStatus);

router.post('/calendar/connect', authenticate, authController.connectCalendar);

router.post('/calendar/disconnect', authenticate, authController.disconnectCalendar);

router.get('/sessions', authenticate, authController.getActiveSessions);

router.delete('/sessions/revoke', authenticate, authController.revokeSession);

router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'authentication',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
