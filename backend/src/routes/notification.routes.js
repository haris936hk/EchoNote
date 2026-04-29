
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { sanitizeBody } = require('../middleware/validation.middleware');

router.get('/vapidPublicKey', authenticate, notificationController.getVapidPublicKey);

router.post('/subscribe', authenticate, sanitizeBody, notificationController.subscribe);

router.post('/unsubscribe', authenticate, sanitizeBody, notificationController.unsubscribe);

module.exports = router;
