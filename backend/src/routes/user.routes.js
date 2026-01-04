// backend/src/routes/user.routes.js
// User routes for profile, settings, and account management

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const {
  authenticate
} = require('../middleware/auth.middleware');
const {
  validateUpdateProfile,
  validateUpdateSettings,
  validateAccountDeletion,
  validateLogActivity,
  sanitizeBody,
  sanitizeQuery
} = require('../middleware/validation.middleware');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 * @returns { success, data: { user } }
 */
router.get(
  '/me',
  authenticate,
  userController.getCurrentUser
);

/**
 * @route   PATCH /api/users/me
 * @desc    Update user profile
 * @access  Private
 * @body    { name?, autoDeleteDays?, emailNotifications? }
 * @returns { success, data: { user }, message }
 */
router.patch(
  '/me',
  authenticate,
  sanitizeBody,
  validateUpdateProfile,
  userController.updateUserProfile
);

/**
 * @route   DELETE /api/users/me
 * @desc    Delete user account and all data
 * @access  Private
 * @body    { confirmation: "DELETE_MY_ACCOUNT" }
 * @returns { success, message, metadata }
 */
router.delete(
  '/me',
  authenticate,
  sanitizeBody,
  validateAccountDeletion,
  userController.deleteUserAccount
);

/**
 * @route   GET /api/users/settings
 * @desc    Get user settings
 * @access  Private
 * @returns { success, data: { autoDeleteDays, emailNotifications } }
 */
router.get(
  '/settings',
  authenticate,
  userController.getUserSettings
);

/**
 * @route   PATCH /api/users/settings
 * @desc    Update user settings
 * @access  Private
 * @body    { autoDeleteDays?, emailNotifications? }
 * @returns { success, data: { settings }, message }
 */
router.patch(
  '/settings',
  authenticate,
  sanitizeBody,
  validateUpdateSettings,
  userController.updateUserSettings
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private
 * @returns { success, data: { overview, byCategory, metrics } }
 */
router.get(
  '/stats',
  authenticate,
  userController.getUserStats
);

/**
 * @route   GET /api/users/activity
 * @desc    Get user activity log
 * @access  Private
 * @query   limit=<number>
 * @returns { success, data: [activities], count }
 */
router.get(
  '/activity',
  authenticate,
  sanitizeQuery,
  userController.getUserActivity
);

/**
 * @route   POST /api/users/activity
 * @desc    Log user activity
 * @access  Private
 * @body    { action, metadata? }
 * @returns { success, message }
 */
router.post(
  '/activity',
  authenticate,
  sanitizeBody,
  validateLogActivity,
  userController.logUserActivity
);

/**
 * @route   GET /api/users/export
 * @desc    Export all user data (GDPR compliance)
 * @access  Private
 * @returns JSON file download with all user data
 */
router.get(
  '/export',
  authenticate,
  userController.exportUserData
);

/**
 * @route   POST /api/users/login-timestamp
 * @desc    Update last login timestamp
 * @access  Private
 * @returns { success, message }
 */
router.post(
  '/login-timestamp',
  authenticate,
  userController.updateLastLogin
);

/**
 * @route   GET /api/users/preferences
 * @desc    Get user preferences (future feature)
 * @access  Private
 * @returns { success, data: { theme, language, notifications } }
 */
router.get(
  '/preferences',
  authenticate,
  (req, res) => {
    // Future feature - additional user preferences
    res.status(501).json({
      success: false,
      error: 'Preferences feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   PATCH /api/users/preferences
 * @desc    Update user preferences (future feature)
 * @access  Private
 * @body    { theme?, language?, notificationSettings? }
 * @returns { success, data: { preferences }, message }
 */
router.patch(
  '/preferences',
  authenticate,
  sanitizeBody,
  (req, res) => {
    // Future feature - update preferences
    res.status(501).json({
      success: false,
      error: 'Preferences feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   POST /api/users/avatar
 * @desc    Upload user avatar (future feature)
 * @access  Private
 * @body    FormData with 'avatar' field
 * @returns { success, data: { avatarUrl }, message }
 */
router.post(
  '/avatar',
  authenticate,
  (req, res) => {
    // Future feature - custom avatar upload
    res.status(501).json({
      success: false,
      error: 'Avatar upload not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   DELETE /api/users/avatar
 * @desc    Remove user avatar (future feature)
 * @access  Private
 * @returns { success, message }
 */
router.delete(
  '/avatar',
  authenticate,
  (req, res) => {
    // Future feature - remove custom avatar
    res.status(501).json({
      success: false,
      error: 'Avatar removal not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   GET /api/users/notifications
 * @desc    Get user notifications (future feature)
 * @access  Private
 * @query   unreadOnly=<boolean>&limit=<number>
 * @returns { success, data: [notifications], unreadCount }
 */
router.get(
  '/notifications',
  authenticate,
  sanitizeQuery,
  (req, res) => {
    // Future feature - in-app notifications
    res.status(501).json({
      success: false,
      error: 'Notifications feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   PATCH /api/users/notifications/:id/read
 * @desc    Mark notification as read (future feature)
 * @access  Private
 * @returns { success, message }
 */
router.patch(
  '/notifications/:id/read',
  authenticate,
  (req, res) => {
    // Future feature - mark notification as read
    res.status(501).json({
      success: false,
      error: 'Notifications feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   POST /api/users/notifications/mark-all-read
 * @desc    Mark all notifications as read (future feature)
 * @access  Private
 * @returns { success, message }
 */
router.post(
  '/notifications/mark-all-read',
  authenticate,
  (req, res) => {
    // Future feature - mark all as read
    res.status(501).json({
      success: false,
      error: 'Notifications feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   GET /api/users/subscription
 * @desc    Get user subscription details (future feature)
 * @access  Private
 * @returns { success, data: { plan, status, expiresAt } }
 */
router.get(
  '/subscription',
  authenticate,
  (req, res) => {
    // Future feature - subscription management
    res.status(501).json({
      success: false,
      error: 'Subscription feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   POST /api/users/subscription/upgrade
 * @desc    Upgrade subscription plan (future feature)
 * @access  Private
 * @body    { plan, paymentMethod }
 * @returns { success, data: { subscription }, message }
 */
router.post(
  '/subscription/upgrade',
  authenticate,
  sanitizeBody,
  (req, res) => {
    // Future feature - upgrade plan
    res.status(501).json({
      success: false,
      error: 'Subscription feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   POST /api/users/subscription/cancel
 * @desc    Cancel subscription (future feature)
 * @access  Private
 * @returns { success, message }
 */
router.post(
  '/subscription/cancel',
  authenticate,
  (req, res) => {
    // Future feature - cancel subscription
    res.status(501).json({
      success: false,
      error: 'Subscription feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   GET /api/users/storage
 * @desc    Get storage usage details
 * @access  Private
 * @returns { success, data: { used, limit, percentage } }
 */
router.get(
  '/storage',
  authenticate,
  async (req, res) => {
    try {
      const { prisma } = require('../config/database');
      
      // Calculate storage used by user's meetings
      const storage = await prisma.meeting.aggregate({
        where: { 
          userId: req.userId,
          audioUrl: { not: null }
        },
        _sum: {
          audioSize: true
        }
      });

      const usedBytes = storage._sum.audioSize || 0;
      const usedMB = Math.round(usedBytes / (1024 * 1024));
      const limitMB = 1000; // 1GB free tier limit (configurable)
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
          remainingMB: limitMB - usedMB
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to calculate storage',
        details: error.message
      });
    }
  }
);

/**
 * @route   POST /api/users/feedback
 * @desc    Submit user feedback (future feature)
 * @access  Private
 * @body    { type, message, rating? }
 * @returns { success, message }
 */
router.post(
  '/feedback',
  authenticate,
  sanitizeBody,
  (req, res) => {
    // Future feature - user feedback
    res.status(501).json({
      success: false,
      error: 'Feedback feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

module.exports = router;