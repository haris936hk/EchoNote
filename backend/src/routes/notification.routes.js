// backend/src/routes/notification.routes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { sanitizeBody } = require('../middleware/validation.middleware');

/**
 * @route   GET /api/notifications/vapidPublicKey
 * @desc    Get VAPID Public Key for subscription
 * @access  Private
 */
router.get('/vapidPublicKey', authenticate, notificationController.getVapidPublicKey);

/**
 * @route   POST /api/notifications/subscribe
 * @desc    Subscribe to push notifications
 * @access  Private
 * @body    { endpoint, keys: { p256dh, auth } }
 */
router.post('/subscribe', authenticate, sanitizeBody, notificationController.subscribe);

/**
 * @route   POST /api/notifications/unsubscribe
 * @desc    Unsubscribe from push notifications
 * @access  Private
 * @body    { endpoint }
 */
router.post('/unsubscribe', authenticate, sanitizeBody, notificationController.unsubscribe);

module.exports = router;
