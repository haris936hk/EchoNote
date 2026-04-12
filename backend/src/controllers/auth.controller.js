
const authService = require('../services/auth.service');
const { prisma } = require('../config/database');

/**
 * Google OAuth authentication (client-side flow)
 * POST /api/auth/google
 * @body { code: string }
 */
const googleAuth = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    const result = await authService.authenticateWithGoogle(code);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      message: 'Authentication successful',
    });
  } catch (error) {
    console.error('Google auth controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.',
    });
  }
};


const getGoogleAuthUrl = async (req, res) => {
  try {
    
    
    return res.status(501).json({
      success: false,
      error: 'Server-side OAuth flow not implemented. Use client-side flow instead.',
    });
  } catch (error) {
    console.error('Get Google auth URL error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL',
    });
  }
};


const googleCallback = async (req, res) => {
  try {
    
    return res.status(501).json({
      success: false,
      error: 'Server-side OAuth flow not implemented. Use client-side flow instead.',
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).json({
      success: false,
      error: 'OAuth callback failed',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 * @body { refreshToken: string }
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Refresh token controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 * @requires authenticate middleware (req.userId)
 */
const logout = async (req, res) => {
  try {
    const result = await authService.logout(req.userId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 * @requires authenticate middleware (req.user, req.userId)
 */
const getCurrentUser = async (req, res) => {
  try {
    
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
};

/**
 * Verify token validity
 * POST /api/auth/verify
 * @body { token: string }
 */
const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const decoded = authService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(200).json({
        success: true,
        data: {
          valid: false,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        user: {
          userId: decoded.id, 
          email: decoded.email,
          name: decoded.name,
        },
      },
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token verification failed',
    });
  }
};

/**
 * Revoke Google OAuth access (placeholder)
 * POST /api/auth/revoke
 * @requires authenticate middleware
 */
const revokeGoogleAccess = async (req, res) => {
  try {
    
    await authService.logout(req.userId);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Revoke Google access error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke Google access',
    });
  }
};

/**
 * Get Google Calendar connection status (B4)
 * GET /api/auth/calendar/status
 * @requires authenticate middleware
 */
const getCalendarStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { googleAccessToken: true, googleTokenExpiry: true },
    });
    const connected = !!(user && user.googleAccessToken);
    const tokenExpired =
      connected && user.googleTokenExpiry && new Date(user.googleTokenExpiry) < new Date();
    return res.status(200).json({
      success: true,
      data: { connected, tokenExpired: !!tokenExpired },
    });
  } catch (error) {
    console.error('Get calendar status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get calendar status' });
  }
};

/**
 * Connect Google Calendar (B4)
 * POST /api/auth/calendar/connect
 * Informs client of the calendar scope — re-consent is handled client-side.
 * @requires authenticate middleware
 */
const connectCalendar = async (req, res) => {
  try {
    const calendarScope = 'https://www.googleapis.com/auth/calendar.readonly';
    return res.status(200).json({
      success: true,
      data: { scope: calendarScope },
      message: 'Trigger re-consent on the client with this scope',
    });
  } catch (error) {
    console.error('Connect calendar error:', error);
    return res.status(500).json({ success: false, error: 'Failed to initiate calendar connect' });
  }
};

/**
 * Disconnect Google Calendar (B4)
 * POST /api/auth/calendar/disconnect
 * @requires authenticate middleware
 */
const disconnectCalendar = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { googleAccessToken: null, googleTokenExpiry: null },
    });
    return res.status(200).json({ success: true, message: 'Calendar disconnected successfully' });
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    return res.status(500).json({ success: false, error: 'Failed to disconnect calendar' });
  }
};

/**
 * Get active sessions (B5)
 * GET /api/auth/sessions
 * Single refresh-token model — returns current session from lastLoginAt.
 * @requires authenticate middleware
 */
const getActiveSessions = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { lastLoginAt: true, email: true },
    });
    return res.status(200).json({
      success: true,
      data: {
        sessions: [
          {
            id: 'current',
            label: 'Current session',
            email: user.email,
            lastActive: user.lastLoginAt,
            isCurrent: true,
          },
        ],
      },
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
};

/**
 * Revoke all other sessions (B5)
 * DELETE /api/auth/sessions/:sessionId
 * Nulls the stored refresh token, invalidating all non-current sessions.
 * @requires authenticate middleware
 */
const revokeSession = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { refreshToken: null },
    });
    return res.status(200).json({ success: true, message: 'All other sessions have been revoked' });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
};

module.exports = {
  googleAuth,
  getGoogleAuthUrl,
  googleCallback,
  refreshToken,
  logout,
  getCurrentUser,
  verifyToken,
  revokeGoogleAccess,
  getCalendarStatus,
  connectCalendar,
  disconnectCalendar,
  getActiveSessions,
  revokeSession,
};
