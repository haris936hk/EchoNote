// backend/src/controllers/calendar.controller.js
const { google } = require('googleapis');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

// We need a fresh client per request to safely manage tokens without polluting a singleton
const createOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );
};

/**
 * Get upcoming calendar events for the authenticated user
 * GET /api/calendar/events
 */
const getEvents = async (req, res) => {
  try {
    const userId = req.userId; // Provided by authenticate middleware

    // Get user from DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 1. Check if user has connected Calendar (has refresh token)
    if (!user.googleRefreshToken) {
      logger.warn(`User ${userId} attempted to access calendar without connecting.`);
      return res.status(403).json({
        success: false,
        error: 'Calendar not connected. Please connect your Google Calendar.',
        code: 'CALENDAR_NOT_CONNECTED',
      });
    }

    const client = createOAuthClient();

    // 2. Set credentials
    client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : null,
    });

    // 3. Passive Refresh Listener
    client.on('tokens', async (tokens) => {
      try {
        const updates = {
          googleAccessToken: tokens.access_token,
        };
        if (tokens.expiry_date) {
          updates.googleTokenExpiry = new Date(tokens.expiry_date);
        }
        // Null Guarding: Only update googleRefreshToken if explicitly provided by Google
        if (tokens.refresh_token) {
          updates.googleRefreshToken = tokens.refresh_token;
        }

        await prisma.user.update({
          where: { id: userId },
          data: updates,
        });
        logger.info(`Passive token refresh successful for user ${userId}`);
      } catch (err) {
        logger.error(
          `Failed to passively save refreshed tokens for user ${userId}: ${err.message}`
        );
      }
    });

    // 4. Explicit Refresh Logic
    if (user.googleTokenExpiry && new Date() > user.googleTokenExpiry) {
      logger.info(`Tokens expired for user ${userId}, explicitly refreshing...`);
      try {
        const { credentials } = await client.refreshAccessToken();

        // Update credentials block (the listener ABOVE will also fire and handle the DB save)
        client.setCredentials(credentials);
        logger.info(`Explicit token refresh successful for user ${userId}`);
      } catch (refreshErr) {
        logger.error(`Failed to refresh calendar token for user ${userId}: ${refreshErr.message}`);
        // If refresh fails (e.g., token revoked), we return 401 so the frontend prompts them to log in again
        return res.status(401).json({
          success: false,
          error: 'Calendar session expired. Please connect your Google Calendar again.',
          code: 'CALENDAR_SESSION_EXPIRED',
        });
      }
    }

    // 5. Query Calendar API
    const calendar = google.calendar({ version: 'v3', auth: client });

    // Fetch from now to +7 days
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 7);

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      // Parse into standard format
      const parsedEvents = events.map((event) => {
        // Handle full-day events vs specific time events safely
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;

        const attendees = (event.attendees || [])
          // filter out resource rooms
          .filter((a) => !a.resource)
          .map((a) => ({
            name: a.displayName || (a.email ? a.email.split('@')[0] : 'Unknown'), // fallback to email prefix if no name
            email: a.email || '',
          }));

        return {
          id: event.id,
          title: event.summary || 'Untitled Event',
          start,
          end,
          attendees,
          hangoutLink: event.hangoutLink || null,
        };
      });

      return res.status(200).json({
        success: true,
        data: parsedEvents,
      });
    } catch (apiErr) {
      logger.error(`Google Calendar API error for user ${userId}: ${apiErr.message}`);
      throw apiErr;
    }
  } catch (error) {
    logger.error('Calendar controller getEvents error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events',
      details: error.message,
    });
  }
};

module.exports = {
  getEvents,
};
