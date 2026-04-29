const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const {
  validateUpdateProfile,
  validateUpdateSettings,
  validateAccountDeletion,
  validateLogActivity,
  sanitizeBody,
  sanitizeQuery,
} = require('../middleware/validation.middleware');

router.get('/me', authenticate, userController.getCurrentUser);

router.patch(
  '/me',
  authenticate,
  sanitizeBody,
  validateUpdateProfile,
  userController.updateUserProfile
);

router.delete(
  '/me',
  authenticate,
  sanitizeBody,
  validateAccountDeletion,
  userController.deleteUserAccount
);

router.get('/settings', authenticate, userController.getUserSettings);

router.patch(
  '/settings',
  authenticate,
  sanitizeBody,
  validateUpdateSettings,
  userController.updateUserSettings
);

router.post('/settings/slack/test', authenticate, userController.testSlackWebhook);

router.get('/stats', authenticate, userController.getUserStats);

router.get('/activity', authenticate, sanitizeQuery, userController.getUserActivity);

router.post(
  '/activity',
  authenticate,
  sanitizeBody,
  validateLogActivity,
  userController.logUserActivity
);

router.get('/export', authenticate, userController.exportUserData);

router.post('/login-timestamp', authenticate, userController.updateLastLogin);

router.get('/preferences', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Preferences feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.patch('/preferences', authenticate, sanitizeBody, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Preferences feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.post('/avatar', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Avatar upload not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.delete('/avatar', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Avatar removal not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.get('/notifications', authenticate, sanitizeQuery, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Notifications feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.patch('/notifications/:id/read', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Notifications feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.post('/notifications/mark-all-read', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Notifications feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.get('/subscription', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Subscription feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.post('/subscription/upgrade', authenticate, sanitizeBody, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Subscription feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.post('/subscription/cancel', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Subscription feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.get('/storage', authenticate, async (req, res) => {
  try {
    const { prisma } = require('../config/database');

    const storage = await prisma.meeting.aggregate({
      where: {
        userId: req.userId,
        audioUrl: { not: null },
      },
      _sum: {
        audioSize: true,
      },
    });

    const usedBytes = storage._sum.audioSize || 0;
    const usedMB = Math.round(usedBytes / (1024 * 1024));
    const limitMB = 1000;
    const percentage = Math.round((usedMB / limitMB) * 100);

    res.status(200).json({
      success: true,
      data: {
        used: usedBytes,
        usedMB,
        limit: limitMB * 1024 * 1024,
        limitMB,
        percentage,
        remaining: limitMB - usedMB,
        remainingMB: limitMB - usedMB,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate storage',
      details: error.message,
    });
  }
});

router.post('/feedback', authenticate, sanitizeBody, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Feedback feature not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

module.exports = router;
