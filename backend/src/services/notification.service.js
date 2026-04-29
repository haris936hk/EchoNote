const webpush = require('web-push');
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

const configureWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  let adminEmail = process.env.GMAIL_USER || 'mailto:admin@echonote.ai';

  if (adminEmail && !adminEmail.startsWith('mailto:')) {
    adminEmail = `mailto:${adminEmail}`;
  }

  if (!publicKey || !privateKey) {
    logger.warn('⚠️ VAPID keys not configured. Web Push notifications will be disabled.');
    return false;
  }

  webpush.setVapidDetails(adminEmail, publicKey, privateKey);
  return true;
};

const isConfigured = configureWebPush();

const sendPushNotificationToUser = async (userId, payload) => {
  if (!isConfigured) return { success: false, error: 'Web Push not configured' };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotifications: true },
    });

    if (!user || !user.pushNotifications) {
      logger.debug(`Push notifications disabled for user ${userId}`);
      return { success: false, message: 'Push disabled by user' };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { success: false, message: 'No active subscriptions' };
    }

    const payloadString = JSON.stringify(payload);

    const notificationPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, payloadString);
        return { endpoint: sub.endpoint, success: true };
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          logger.info(`🗑️ Removing expired push subscription: ${sub.endpoint}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          logger.error(`Error sending push to ${sub.endpoint}: ${error.message}`);
        }
        return { endpoint: sub.endpoint, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(notificationPromises);

    logger.info(`📤 Sent push notifications to user ${userId} (${subscriptions.length} devices)`);

    return { success: true, results };
  } catch (error) {
    logger.error(`Error in sendPushNotificationToUser: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const sendMeetingCompletedPush = async (userId, meeting) => {
  const payload = {
    title: 'Meeting Ready 🎬',
    body: `"${meeting.title}" is ready for review.`,
    url: `/meetings/${meeting.id}`,
    icon: '/logo192.png',
    badge: '/badge.png',
    data: {
      meetingId: meeting.id,
      url: `/meetings/${meeting.id}`,
    },
  };

  return sendPushNotificationToUser(userId, payload);
};

module.exports = {
  sendPushNotificationToUser,
  sendMeetingCompletedPush,
};
