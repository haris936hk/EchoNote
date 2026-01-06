/**
 * Gmail OAuth2 Email Transport Utility
 *
 * Handles OAuth2 authentication and Nodemailer transport creation for Gmail SMTP.
 * Uses singleton pattern for efficiency and includes automatic access token refresh.
 *
 * @module emailTransport
 */

const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

// Singleton transport instance
let gmailTransport = null;

/**
 * Create OAuth2 client for Gmail API
 *
 * @returns {OAuth2Client} Configured OAuth2 client
 * @throws {Error} If environment variables are missing
 */
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth credentials. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in .env'
    );
  }

  return new OAuth2Client(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Get Gmail access token using refresh token
 * Automatically refreshes the access token when needed
 *
 * @returns {Promise<string>} Valid Gmail access token
 * @throws {Error} If refresh token is invalid or token fetch fails
 */
async function getGmailAccessToken() {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!refreshToken || refreshToken === 'YOUR_REFRESH_TOKEN_HERE') {
    throw new Error(
      'Missing or invalid GMAIL_REFRESH_TOKEN in .env\n\n' +
      'Please follow these steps to obtain a refresh token:\n' +
      '1. Visit https://developers.google.com/oauthplayground/\n' +
      '2. Click ⚙️ Settings and check "Use your own OAuth credentials"\n' +
      '3. Enter your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET\n' +
      '4. Select scope: https://mail.google.com/\n' +
      '5. Authorize with your Gmail account (hariskhan936.hk@gmail.com)\n' +
      '6. Exchange code for tokens and copy the refresh_token\n' +
      '7. Update GMAIL_REFRESH_TOKEN in .env and restart the server'
    );
  }

  try {
    const oAuth2Client = createOAuth2Client();

    // Set refresh token credentials
    oAuth2Client.setCredentials({
      refresh_token: refreshToken
    });

    // Get access token (automatically refreshes if expired)
    const { token } = await oAuth2Client.getAccessToken();

    if (!token) {
      throw new Error('Failed to obtain access token from refresh token');
    }

    return token;
  } catch (error) {
    // Enhanced error messages for common issues
    if (error.message.includes('invalid_grant')) {
      throw new Error(
        'Invalid or expired refresh token.\n' +
        'Please regenerate the refresh token via OAuth Playground:\n' +
        'https://developers.google.com/oauthplayground/'
      );
    }

    if (error.message.includes('quota')) {
      throw new Error(
        'Gmail API quota exceeded.\n' +
        'Daily sending limit: 500 emails/day (free tier)\n' +
        'Please wait 24 hours or upgrade to Google Workspace.'
      );
    }

    throw new Error(`Failed to get Gmail access token: ${error.message}`);
  }
}

/**
 * Create Nodemailer transport with Gmail OAuth2 authentication
 *
 * @returns {Promise<nodemailer.Transporter>} Configured Nodemailer transport
 */
async function createGmailTransport() {
  const accessToken = await getGmailAccessToken();
  const gmailUser = process.env.GMAIL_USER;

  if (!gmailUser) {
    throw new Error('Missing GMAIL_USER in .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: gmailUser,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: accessToken
    },
    pool: true, // Use connection pooling for better performance
    maxConnections: 5, // Max simultaneous connections
    maxMessages: 100, // Max messages per connection before reconnecting
    rateDelta: 1000, // 1 second
    rateLimit: 5 // 5 emails per second (Gmail guideline)
  });
}

/**
 * Get Gmail transport singleton
 * Creates transport on first call, reuses on subsequent calls
 *
 * @returns {Promise<nodemailer.Transporter>} Gmail transport instance
 */
async function getGmailTransport() {
  if (!gmailTransport) {
    console.log('🔧 Initializing Gmail OAuth2 transport...');
    gmailTransport = await createGmailTransport();
    console.log('✅ Gmail transport initialized successfully');
  }
  return gmailTransport;
}

/**
 * Close Gmail transport connection
 * Call this during graceful server shutdown
 *
 * @returns {Promise<void>}
 */
async function closeGmailTransport() {
  if (gmailTransport) {
    console.log('🔌 Closing Gmail transport...');
    gmailTransport.close();
    gmailTransport = null;
    console.log('✅ Gmail transport closed');
  }
}

/**
 * Verify Gmail transport connection
 * Useful for health checks and testing
 *
 * @returns {Promise<boolean>} True if connection is valid
 * @throws {Error} If verification fails
 */
async function verifyGmailTransport() {
  const transport = await getGmailTransport();
  return await transport.verify();
}

module.exports = {
  getGmailTransport,
  closeGmailTransport,
  verifyGmailTransport,
  createOAuth2Client,
  getGmailAccessToken
};
