// backend/src/config/auth.js
// Authentication configuration for Google OAuth and JWT

const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

// Google OAuth Client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Google OAuth Scopes
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Verify Google ID Token
 * @param {string} token - Google ID token from frontend
 * @returns {Object} Decoded token payload with user info
 */
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name,
      locale: payload.locale
    };
  } catch (error) {
    throw new Error(`Google token verification failed: ${error.message}`);
  }
};

/**
 * Exchange authorization code for tokens (server-side flow)
 * @param {string} code - Authorization code from Google
 * @returns {Object} Access token, refresh token, and user info
 */
const exchangeCodeForTokens = async (code) => {
  try {
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);
    
    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      idToken: tokens.id_token,
      userInfo: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    };
  } catch (error) {
    throw new Error(`Token exchange failed: ${error.message}`);
  }
};

/**
 * Get Google authorization URL for server-side flow
 * @returns {string} Authorization URL
 */
const getAuthUrl = () => {
  return googleClient.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Force consent screen to get refresh token
    scope: GOOGLE_SCOPES
  });
};

/**
 * Refresh Google access token
 * @param {string} refreshToken - User's refresh token
 * @returns {Object} New access token and expiry
 */
const refreshGoogleToken = async (refreshToken) => {
  try {
    googleClient.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await googleClient.refreshAccessToken();
    
    return {
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date
    };
  } catch (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
};

/**
 * Generate JWT access token
 * @param {Object} payload - User data to encode
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'echonote-api',
      audience: 'echonote-client'
    }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - User data to encode
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
      issuer: 'echonote-api',
      audience: 'echonote-client'
    }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'echonote-api',
      audience: 'echonote-client'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object from database
 * @returns {Object} Access and refresh tokens
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };
  
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: process.env.JWT_EXPIRE || '7d'
  };
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate random token (for verification codes, etc.)
 * @param {number} length - Token length
 * @returns {string} Random token
 */
const generateRandomToken = (length = 32) => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
const hashData = (data) => {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
};

/**
 * Get token expiry time in milliseconds
 * @param {string} token - JWT token
 * @returns {number|null} Expiry time or null
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    return decoded.exp * 1000; // Convert to milliseconds
  } catch (error) {
    return null;
  }
};

/**
 * Create OAuth2 client with user's tokens
 * @param {string} accessToken - User's access token
 * @param {string} refreshToken - User's refresh token
 * @returns {OAuth2Client} Configured OAuth2 client
 */
const createUserOAuthClient = (accessToken, refreshToken) => {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  return client;
};

module.exports = {
  googleClient,
  GOOGLE_SCOPES,
  
  // Google OAuth functions
  verifyGoogleToken,
  exchangeCodeForTokens,
  getAuthUrl,
  refreshGoogleToken,
  createUserOAuthClient,
  
  // JWT functions
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  
  // Token utilities
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiry,
  
  // General utilities
  isValidEmail,
  generateRandomToken,
  hashData
};