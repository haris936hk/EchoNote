// backend/src/controllers/notification.controller.js
const { prisma } = require('../config/database');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

/**
 * Get VAPID Public Key
 * GET /api/notifications/vapidPublicKey
 */
const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(500).json({
        success: false,
        error: 'VAPID public key not configured'
      });
    }

    return res.status(200).json({
      success: true,
      publicKey
    });
  } catch (error) {
    logger.error(`Error getting VAPID public key: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve VAPID public key'
    });
  }
};

/**
 * Subscribe to Push Notifications
 * POST /api/notifications/subscribe
 */
const subscribe = async (req, res) => {
  try {
    const userId = req.userId;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription object'
      });
    }

    // Upsert subscription (endpoint is unique)
    const savedSubscription = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId
      }
    });

    logger.info(`✅ User subscribed to push: ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Subscribed successfully',
      data: savedSubscription
    });
  } catch (error) {
    logger.error(`Error subscribing to notifications: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to subscribe',
      details: error.message
    });
  }
};

/**
 * Unsubscribe from Push Notifications
 * POST /api/notifications/unsubscribe
 */
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required'
      });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint }
    });

    logger.info(`🚫 Device unsubscribed: ${endpoint}`);

    return res.status(200).json({
      success: true,
      message: 'Unsubscribed successfully'
    });
  } catch (error) {
    logger.error(`Error unsubscribing: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe'
    });
  }
};

module.exports = {
  getVapidPublicKey,
  subscribe,
  unsubscribe
};
