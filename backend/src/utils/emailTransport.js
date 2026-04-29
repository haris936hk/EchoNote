
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

let gmailTransport = null;

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth credentials. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in .env'
    );
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

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

    oAuth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { token } = await oAuth2Client.getAccessToken();

    if (!token) {
      throw new Error('Failed to obtain access token from refresh token');
    }

    return token;
  } catch (error) {

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
      accessToken: accessToken,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
  });
}

async function getGmailTransport() {
  if (!gmailTransport) {
    console.log('🔧 Initializing Gmail OAuth2 transport...');
    gmailTransport = await createGmailTransport();
    console.log('✅ Gmail transport initialized successfully');
  }
  return gmailTransport;
}

async function closeGmailTransport() {
  if (gmailTransport) {
    console.log('🔌 Closing Gmail transport...');
    gmailTransport.close();
    gmailTransport = null;
    console.log('✅ Gmail transport closed');
  }
}

async function verifyGmailTransport() {
  const transport = await getGmailTransport();
  return await transport.verify();
}

module.exports = {
  getGmailTransport,
  closeGmailTransport,
  verifyGmailTransport,
  createOAuth2Client,
  getGmailAccessToken,
};
