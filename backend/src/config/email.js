// backend/src/config/email.js
// Email configuration using Resend API

const { Resend } = require('resend');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'EchoNote <noreply@echonote.app>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@echonote.app',
  skipSend: process.env.SKIP_EMAIL_SEND === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

/**
 * Send email via Resend
 * @param {Object} options - Email options
 * @returns {Object} Send result
 */
const sendEmail = async (options) => {
  try {
    // Skip sending in development if configured
    if (EMAIL_CONFIG.skipSend) {
      logger.info('📧 Email sending skipped (SKIP_EMAIL_SEND=true)');
      logger.info(`Would have sent to: ${options.to}`);
      logger.info(`Subject: ${options.subject}`);
      return { skipped: true };
    }

    const emailData = {
      from: options.from || EMAIL_CONFIG.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo || EMAIL_CONFIG.replyTo,
      ...(options.attachments && { attachments: options.attachments })
    };

    const result = await resend.emails.send(emailData);
    
    logger.info(`✅ Email sent successfully to ${options.to}`);
    return result;
    
  } catch (error) {
    logger.error(`❌ Email send failed: ${error.message}`);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send meeting completion notification
 * @param {Object} params - Email parameters
 */
const sendMeetingCompletedEmail = async ({ to, userName, meeting }) => {
  const subject = `✅ Your meeting "${meeting.title}" is ready`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Ready</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .meeting-info {
          background-color: #f9fafb;
          border-left: 4px solid #2563eb;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .meeting-title {
          font-weight: bold;
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .meeting-meta {
          color: #6b7280;
          font-size: 14px;
        }
        .stats {
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        .stat {
          text-align: center;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #1d4ed8;
        }
        .summary-section {
          margin: 20px 0;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .summary-title {
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .action-items {
          list-style: none;
          padding: 0;
        }
        .action-item {
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .action-item:last-child {
          border-bottom: none;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎙️ EchoNote</div>
        </div>
        
        <h1>Hi ${userName || 'there'},</h1>
        
        <p>Great news! Your meeting has been processed and is ready to view.</p>
        
        <div class="meeting-info">
          <div class="meeting-title">${meeting.title}</div>
          <div class="meeting-meta">
            Category: ${meeting.category} • 
            Processed: ${new Date(meeting.processingCompletedAt).toLocaleString()}
          </div>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${Math.round(meeting.audioDuration / 60)}m</div>
            <div class="stat-label">Duration</div>
          </div>
          <div class="stat">
            <div class="stat-value">${meeting.transcriptWordCount || 0}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat">
            <div class="stat-value">${Math.round(meeting.processingDuration || 0)}s</div>
            <div class="stat-label">Processed in</div>
          </div>
        </div>
        
        ${meeting.summaryExecutive ? `
        <div class="summary-section">
          <div class="summary-title">📋 Executive Summary</div>
          <p>${meeting.summaryExecutive.substring(0, 200)}${meeting.summaryExecutive.length > 200 ? '...' : ''}</p>
        </div>
        ` : ''}
        
        ${meeting.summaryActionItems && meeting.summaryActionItems.length > 0 ? `
        <div class="summary-section">
          <div class="summary-title">✅ Action Items (${meeting.summaryActionItems.length})</div>
          <ul class="action-items">
            ${meeting.summaryActionItems.slice(0, 3).map(item => `
              <li class="action-item">
                ${item.task}
                ${item.assignee ? `<span style="color: #6b7280;"> • ${item.assignee}</span>` : ''}
              </li>
            `).join('')}
            ${meeting.summaryActionItems.length > 3 ? `<li class="action-item"><em>+${meeting.summaryActionItems.length - 3} more...</em></li>` : ''}
          </ul>
        </div>
        ` : ''}
        
        <center>
          <a href="${EMAIL_CONFIG.frontendUrl}/meetings/${meeting.id}" class="button">
            View Full Meeting Details
          </a>
        </center>
        
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          💡 <strong>Tip:</strong> Your audio file will be automatically deleted after ${meeting.user?.autoDeleteDays || 30} days, but transcripts and summaries are kept permanently.
        </p>
        
        <div class="footer">
          <p>This is an automated notification from EchoNote.</p>
          <p>If you have any questions, reply to this email or contact <a href="mailto:support@echonote.app">support@echonote.app</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hi ${userName || 'there'},

Your meeting "${meeting.title}" has been processed and is ready to view!

Meeting Details:
- Category: ${meeting.category}
- Duration: ${Math.round(meeting.audioDuration / 60)} minutes
- Word Count: ${meeting.transcriptWordCount || 0}
- Processed in: ${Math.round(meeting.processingDuration || 0)} seconds

${meeting.summaryExecutive ? `Executive Summary:\n${meeting.summaryExecutive}\n\n` : ''}

${meeting.summaryActionItems && meeting.summaryActionItems.length > 0 ? `Action Items:\n${meeting.summaryActionItems.map(item => `- ${item.task}${item.assignee ? ` (${item.assignee})` : ''}`).join('\n')}\n\n` : ''}

View full details: ${EMAIL_CONFIG.frontendUrl}/meetings/${meeting.id}

---
This is an automated notification from EchoNote.
For support, contact: support@echonote.app
  `;
  
  return sendEmail({ to, subject, html, text });
};

/**
 * Send meeting processing failed notification
 * @param {Object} params - Email parameters
 */
const sendMeetingFailedEmail = async ({ to, userName, meeting, error }) => {
  const subject = `❌ Processing failed for "${meeting.title}"`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .error-box {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚠️ Processing Error</h1>
        <p>Hi ${userName || 'there'},</p>
        <p>We encountered an issue while processing your meeting "${meeting.title}".</p>
        
        <div class="error-box">
          <strong>Error Details:</strong><br>
          ${error || 'An unexpected error occurred during processing.'}
        </div>
        
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Try uploading the recording again</li>
          <li>Ensure the audio file is clear and not corrupted</li>
          <li>Contact support if the issue persists</li>
        </ul>
        
        <center>
          <a href="${EMAIL_CONFIG.frontendUrl}/meetings/${meeting.id}" class="button">
            View Meeting Details
          </a>
        </center>
        
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Need help? Contact us at <a href="mailto:support@echonote.app">support@echonote.app</a>
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hi ${userName || 'there'},

Unfortunately, we encountered an issue while processing your meeting "${meeting.title}".

Error: ${error || 'An unexpected error occurred during processing.'}

What you can do:
- Try uploading the recording again
- Ensure the audio file is clear and not corrupted
- Contact support if the issue persists

View details: ${EMAIL_CONFIG.frontendUrl}/meetings/${meeting.id}

For support, contact: support@echonote.app
  `;
  
  return sendEmail({ to, subject, html, text });
};

/**
 * Send welcome email to new users
 * @param {Object} params - Email parameters
 */
const sendWelcomeEmail = async ({ to, userName }) => {
  const subject = '🎉 Welcome to EchoNote!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
        }
        .logo {
          font-size: 48px;
          text-align: center;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .feature {
          margin: 15px 0;
          padding-left: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎙️</div>
        <h1>Welcome to EchoNote, ${userName || 'there'}! 👋</h1>
        
        <p>We're excited to help you transform your meetings into actionable insights.</p>
        
        <h3>What you can do with EchoNote:</h3>
        <div class="feature">✅ Record meetings up to 3 minutes</div>
        <div class="feature">📝 Get accurate AI transcriptions</div>
        <div class="feature">🤖 Receive intelligent summaries</div>
        <div class="feature">🎯 Extract action items automatically</div>
        <div class="feature">🔍 Search through all your meetings</div>
        <div class="feature">📅 Sync with Google Calendar</div>
        
        <center>
          <a href="${EMAIL_CONFIG.frontendUrl}/dashboard" class="button">
            Start Your First Meeting
          </a>
        </center>
        
        <p style="margin-top: 30px; color: #6b7280;">
          Need help getting started? Check out our <a href="${EMAIL_CONFIG.frontendUrl}/help">Help Center</a> or reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Welcome to EchoNote, ${userName || 'there'}!

We're excited to help you transform your meetings into actionable insights.

What you can do with EchoNote:
✅ Record meetings up to 3 minutes
📝 Get accurate AI transcriptions
🤖 Receive intelligent summaries
🎯 Extract action items automatically
🔍 Search through all your meetings
📅 Sync with Google Calendar

Get started: ${EMAIL_CONFIG.frontendUrl}/dashboard

Need help? Reply to this email or visit our Help Center.
  `;
  
  return sendEmail({ to, subject, html, text });
};

/**
 * Test email configuration
 * @param {string} to - Test recipient email
 */
const testEmailConfig = async (to) => {
  return sendEmail({
    to,
    subject: '🧪 EchoNote Email Test',
    html: '<h1>Email Configuration Test</h1><p>If you received this, your email configuration is working correctly!</p>',
    text: 'Email Configuration Test\n\nIf you received this, your email configuration is working correctly!'
  });
};

module.exports = {
  resend,
  EMAIL_CONFIG,
  sendEmail,
  sendMeetingCompletedEmail,
  sendMeetingFailedEmail,
  sendWelcomeEmail,
  testEmailConfig
};