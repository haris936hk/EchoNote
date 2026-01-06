const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google OAuth token and extract user profile
 * @param {string} token - Google ID token from @react-oauth/google
 * @returns {Promise<Object>} User profile data from Google
 */
async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified
    };
  } catch (error) {
    console.error('❌ Google token verification failed:', error.message);
    throw new Error('Invalid Google token');
  }
}

/**
 * Authenticate user with Google OAuth (create or login)
 * @param {string} googleToken - Google ID token from frontend
 * @returns {Promise<Object>} User object with JWT tokens
 */
async function authenticateWithGoogle(googleToken) {
  try {
    // Step 1: Verify Google token
    const googleProfile = await verifyGoogleToken(googleToken);
    
    // Step 2: Find or create user
    let user = await prisma.user.findUnique({
      where: { email: googleProfile.email }
    });

    if (user) {
      // Update existing user's info and last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleProfile.name,
          picture: googleProfile.picture,
          lastLoginAt: new Date()
        }
      });
      console.log(`✅ User logged in: ${user.email}`);
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: googleProfile.email,
          name: googleProfile.name,
          picture: googleProfile.picture,
          googleId: googleProfile.googleId,
          lastLoginAt: new Date()
        }
      });
      console.log(`✅ New user created: ${user.email}`);

      // Send welcome email (non-blocking)
      const emailService = require('../config/email');
      try {
        await emailService.sendWelcomeEmail({
          to: user.email,
          userName: user.name
        });
        console.log(`📧 Welcome email sent to ${user.email}`);
      } catch (error) {
        // Don't fail auth if email fails
        console.error('Failed to send welcome email:', error.message);
      }
    }

    // Step 3: Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Step 4: Store refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate JWT access token (short-lived, 1 hour)
 * @param {Object} user - User object from database
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '1h',
      issuer: 'echonote-api',
      audience: 'echonote-client'
    }
  );
}

/**
 * Generate JWT refresh token (long-lived, 7 days)
 * @param {Object} user - User object from database
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
      issuer: 'echonote-api',
      audience: 'echonote-client'
    }
  );
}

/**
 * Refresh access token using valid refresh token
 * @param {string} refreshToken - Refresh token from client
 * @returns {Promise<Object>} New access token or error
 */
async function refreshAccessToken(refreshToken) {
  try {
    // Step 1: Verify refresh token signature
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, secret, {
      issuer: 'echonote-api',
      audience: 'echonote-client'
    });

    // Step 2: Find user and verify stored refresh token matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Step 3: Generate new access token
    const newAccessToken = generateAccessToken(user);

    console.log(`✅ Access token refreshed for: ${user.email}`);

    return {
      success: true,
      accessToken: newAccessToken
    };
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    return {
      success: false,
      error: 'Token refresh failed'
    };
  }
}

/**
 * Verify JWT access token
 * @param {string} token - JWT access token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return null;
  }
}

/**
 * Logout user by invalidating refresh token
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Success status
 */
async function logout(userId) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });

    console.log(`✅ User logged out: ${userId}`);

    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('❌ Logout error:', error.message);
    return {
      success: false,
      error: 'Logout failed'
    };
  }
}

/**
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile with meeting count
 */
async function getUserProfile(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: { meetings: true }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: {
        ...user,
        totalMeetings: user._count.meetings
      }
    };
  } catch (error) {
    console.error('❌ Get user profile error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update user profile (only name allowed)
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user profile
 */
async function updateUserProfile(userId, updates) {
  try {
    // Only allow updating name (email/picture controlled by Google)
    const allowedUpdates = {};
    if (updates.name) {
      allowedUpdates.name = updates.name;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: allowedUpdates,
      select: {
        id: true,
        email: true,
        name: true,
        picture: true
      }
    });

    console.log(`✅ Profile updated for: ${user.email}`);

    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('❌ Update user profile error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete user account and all associated data (GDPR compliance)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Success status
 */
async function deleteUserAccount(userId) {
  try {
    // Prisma cascade will delete all meetings due to onDelete: Cascade
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`✅ User account deleted: ${userId}`);

    return {
      success: true,
      message: 'Account deleted successfully'
    };
  } catch (error) {
    console.error('❌ Delete user account error:', error.message);
    return {
      success: false,
      error: 'Account deletion failed'
    };
  }
}

/**
 * Check if user exists by email
 * @param {string} email - User email
 * @returns {Promise<boolean>} True if user exists
 */
async function userExists(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return !!user;
  } catch (error) {
    console.error('❌ User exists check error:', error.message);
    return false;
  }
}

module.exports = {
  verifyGoogleToken,
  authenticateWithGoogle,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  verifyAccessToken,
  logout,
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  userExists
};