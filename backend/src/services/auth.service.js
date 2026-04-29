const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const crypto = require('crypto');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

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
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    console.error('❌ Google token verification failed:', error.message);
    throw new Error('Invalid Google token');
  }
}

async function authenticateWithGoogle(authCode) {
  try {
    const { tokens } = await client.getToken(authCode);

    if (!tokens.id_token) {
      throw new Error('No ID token received from Google');
    }

    const googleProfile = await verifyGoogleToken(tokens.id_token);

    let user = await prisma.user.findUnique({
      where: { email: googleProfile.email },
    });

    const googleTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    const userId = user ? user.id : crypto.randomUUID();

    const tokenUser = { id: userId, email: googleProfile.email, name: googleProfile.name };
    const accessToken = generateAccessToken(tokenUser);
    const refreshToken = generateRefreshToken(tokenUser);

    if (user) {
      const updates = {
        name: googleProfile.name,
        picture: googleProfile.picture,
        lastLoginAt: new Date(),
        googleAccessToken: tokens.access_token,
        googleTokenExpiry,
      };

      if (tokens.refresh_token) {
        updates.googleRefreshToken = tokens.refresh_token;
      }

      updates.refreshToken = refreshToken;

      user = await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
      console.log(`✅ User logged in: ${user.email}`);
    } else {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: googleProfile.email,
          name: googleProfile.name,
          picture: googleProfile.picture,
          googleId: googleProfile.googleId,
          lastLoginAt: new Date(),
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry,
          refreshToken,
        },
      });
      console.log(`✅ New user created: ${user.email}`);

      const emailService = require('../config/email');
      try {
        await emailService.sendWelcomeEmail({
          to: user.email,
          userName: user.name,
        });
        console.log(`📧 Welcome email sent to ${user.email}`);
      } catch (error) {
        console.error('Failed to send welcome email:', error.message);
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '1h',
      issuer: 'echonote-api',
      audience: 'echonote-client',
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
      issuer: 'echonote-api',
      audience: 'echonote-client',
    }
  );
}

async function refreshAccessToken(refreshToken) {
  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, secret, {
      issuer: 'echonote-api',
      audience: 'echonote-client',
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(user);

    console.log(`✅ Access token refreshed for: ${user.email}`);

    return {
      success: true,
      accessToken: newAccessToken,
    };
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    return {
      success: false,
      error: 'Token refresh failed',
    };
  }
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return null;
  }
}

async function logout(userId) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    console.log(`✅ User logged out: ${userId}`);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    console.error('❌ Logout error:', error.message);
    return {
      success: false,
      error: 'Logout failed',
    };
  }
}

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
          select: { meetings: true },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      data: {
        ...user,
        totalMeetings: user._count.meetings,
      },
    };
  } catch (error) {
    console.error('❌ Get user profile error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function updateUserProfile(userId, updates) {
  try {
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
        picture: true,
      },
    });

    console.log(`✅ Profile updated for: ${user.email}`);

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('❌ Update user profile error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function deleteUserAccount(userId) {
  try {
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`✅ User account deleted: ${userId}`);

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  } catch (error) {
    console.error('❌ Delete user account error:', error.message);
    return {
      success: false,
      error: 'Account deletion failed',
    };
  }
}

async function userExists(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
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
  userExists,
};
