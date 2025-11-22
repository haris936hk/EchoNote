// backend/src/controllers/auth.controller.js
// Authentication controller - handles HTTP requests for auth routes

const authService = require('../services/auth.service');

/**
 * Google OAuth authentication (client-side flow)
 * POST /api/auth/google
 * @body { idToken: string }
 */
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Google ID token is required'
      });
    }

    const result = await authService.authenticateWithGoogle(idToken);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      },
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Google auth controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.'
    });
  }
};

/**
 * Get Google OAuth URL (server-side flow - placeholder)
 * GET /api/auth/google/url
 */
const getGoogleAuthUrl = async (req, res) => {
  try {
    // This is for server-side OAuth flow
    // For now, returning not implemented as we use client-side flow
    return res.status(501).json({
      success: false,
      error: 'Server-side OAuth flow not implemented. Use client-side flow instead.'
    });
  } catch (error) {
    console.error('Get Google auth URL error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL'
    });
  }
};

/**
 * Google OAuth callback (server-side flow - placeholder)
 * GET /api/auth/google/callback
 */
const googleCallback = async (req, res) => {
  try {
    // This is for server-side OAuth flow
    // For now, returning not implemented as we use client-side flow
    return res.status(501).json({
      success: false,
      error: 'Server-side OAuth flow not implemented. Use client-side flow instead.'
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).json({
      success: false,
      error: 'OAuth callback failed'
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
        error: 'Refresh token is required'
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken
      },
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh token controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed'
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
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed'
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
    // User is already attached by authenticate middleware
    return res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user'
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
        error: 'Token is required'
      });
    }

    const decoded = authService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(200).json({
        success: true,
        data: {
          valid: false
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        user: {
          userId: decoded.id,  // Changed from decoded.userId to decoded.id
          email: decoded.email,
          name: decoded.name
        }
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token verification failed'
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
    // This would revoke Google OAuth permissions
    // For now, just logout
    const result = await authService.logout(req.userId);

    return res.status(200).json({
      success: true,
      message: 'Google access revoked successfully'
    });

  } catch (error) {
    console.error('Revoke Google access error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke Google access'
    });
  }
};

/**
 * Get Google Calendar connection status (placeholder)
 * GET /api/auth/calendar/status
 * @requires authenticate middleware
 */
const getCalendarStatus = async (req, res) => {
  try {
    // Calendar integration is not part of MVP
    return res.status(501).json({
      success: false,
      error: 'Calendar integration not implemented in MVP'
    });
  } catch (error) {
    console.error('Get calendar status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get calendar status'
    });
  }
};

/**
 * Connect Google Calendar (placeholder)
 * POST /api/auth/calendar/connect
 * @requires authenticate middleware
 */
const connectCalendar = async (req, res) => {
  try {
    // Calendar integration is not part of MVP
    return res.status(501).json({
      success: false,
      error: 'Calendar integration not implemented in MVP'
    });
  } catch (error) {
    console.error('Connect calendar error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to connect calendar'
    });
  }
};

/**
 * Disconnect Google Calendar (placeholder)
 * POST /api/auth/calendar/disconnect
 * @requires authenticate middleware
 */
const disconnectCalendar = async (req, res) => {
  try {
    // Calendar integration is not part of MVP
    return res.status(501).json({
      success: false,
      error: 'Calendar integration not implemented in MVP'
    });
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to disconnect calendar'
    });
  }
};

/**
 * Get active sessions (placeholder)
 * GET /api/auth/sessions
 * @requires authenticate middleware
 */
const getActiveSessions = async (req, res) => {
  try {
    // Session management is not part of MVP
    return res.status(501).json({
      success: false,
      error: 'Session management not implemented in MVP'
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    });
  }
};

/**
 * Revoke specific session (placeholder)
 * DELETE /api/auth/sessions/:sessionId
 * @requires authenticate middleware
 */
const revokeSession = async (req, res) => {
  try {
    // Session management is not part of MVP
    return res.status(501).json({
      success: false,
      error: 'Session management not implemented in MVP'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
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
  revokeSession
};
