// backend/src/config/email.js
// Email configuration using Gmail OAuth2

const { getGmailTransport } = require('../utils/emailTransport');
const { prisma } = require('./database');
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

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'EchoNote <hariskhan936.hk@gmail.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'hariskhan936.hk@gmail.com',
  skipSend: process.env.SKIP_EMAIL_SEND === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

/**
 * Check if user has email notifications enabled
 * @param {string} email - User email address
 * @returns {Promise<boolean>} - True if enabled or user not found
 */
async function isEmailNotificationsEnabled(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailNotifications: true }
    });

    // If user not found, return true (fail open for system emails)
    if (!user) return true;

    return user.emailNotifications !== false; // Default true if null
  } catch (error) {
    logger.error('Error checking email preferences:', error);
    return true; // Fail open on error
  }
}

/**
 * Send email via Gmail OAuth2 SMTP
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email content
 * @param {string} [options.text] - Plain text email content
 * @param {boolean} [options.skipPreferenceCheck=false] - Skip user preference check for critical emails
 * @returns {Object} Send result
 */
const sendEmail = async (options) => {
  const { to, subject, html, text, skipPreferenceCheck = false } = options;

  try {
    // Check user preference (unless bypassed for critical emails like welcome email)
    if (!skipPreferenceCheck) {
      const notificationsEnabled = await isEmailNotificationsEnabled(to);
      if (!notificationsEnabled) {
        logger.info(`📧 Email skipped for ${to} - notifications disabled`);
        return { success: true, skipped: true, reason: 'User preference' };
      }
    }

    // Development mode - log but don't send
    if (EMAIL_CONFIG.skipSend) {
      logger.info('📧 [DEV MODE] Email would be sent:', { to, subject });
      return { success: true, dev: true };
    }

    // Get Gmail transport
    const transporter = await getGmailTransport();

    // Send email via Gmail OAuth2 SMTP
    const info = await transporter.sendMail({
      from: options.from || EMAIL_CONFIG.from,
      to,
      subject,
      html,
      text,
      replyTo: options.replyTo || EMAIL_CONFIG.replyTo
    });

    logger.info(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    logger.error('❌ Email send failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send meeting completion notification
 * @param {Object} params - Email parameters
 */
const sendMeetingCompletedEmail = async ({ to, userName, meeting }) => {
  const subject = `✅ Your meeting "${meeting.title}" is ready`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 48px; line-height: 1;">🎙️</td>
                </tr>
                <tr>
                  <td style="font-size: 28px; font-weight: bold; color: #ffffff; padding-top: 12px; letter-spacing: -0.5px;">EchoNote</td>
                </tr>
                <tr>
                  <td style="font-size: 16px; color: rgba(255,255,255,0.9); padding-top: 8px;">Your meeting is ready!</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 20px; font-weight: 600; color: #111827; padding-bottom: 12px;">
                    Hi ${userName || 'there'} 👋
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 16px; color: #4b5563; line-height: 1.6; padding-bottom: 24px;">
                    Great news! Your meeting has been processed and is ready to view.
                  </td>
                </tr>
              </table>

              <!-- Meeting info card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-left: 4px solid #667eea; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 18px; font-weight: 600; color: #111827; padding-bottom: 8px;">
                          ${meeting.title}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #6b7280;">
                          ${meeting.category} • ${new Date(meeting.processingCompletedAt || meeting.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Stats -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="33%" align="center" style="padding: 0 10px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="font-size: 28px; font-weight: bold; color: #667eea; padding-bottom: 4px;">
                                ${Math.round(meeting.audioDuration / 60)}m
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                                Duration
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="33%" align="center" style="padding: 0 10px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="font-size: 28px; font-weight: bold; color: #667eea; padding-bottom: 4px;">
                                ${meeting.transcriptWordCount || 0}
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                                Words
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="33%" align="center" style="padding: 0 10px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="font-size: 28px; font-weight: bold; color: #667eea; padding-bottom: 4px;">
                                ${Math.round(meeting.processingDuration || 0)}s
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                                Processed
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${meeting.summaryExecutive ? `
              <!-- Executive Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 12px;">
                          📋 Executive Summary
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #374151; line-height: 1.6;">
                          ${meeting.summaryExecutive.substring(0, 250)}${meeting.summaryExecutive.length > 250 ? '...' : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${meeting.summaryActionItems && meeting.summaryActionItems.length > 0 ? `
              <!-- Action Items -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 16px;">
                          ✅ Action Items (${meeting.summaryActionItems.length})
                        </td>
                      </tr>
                      ${meeting.summaryActionItems.slice(0, 3).map((item, index) => `
                      <tr>
                        <td style="padding: 12px 0; border-top: ${index > 0 ? '1px solid #f3f4f6' : 'none'};">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 15px; color: #111827; line-height: 1.5;">
                                ${item.task}
                              </td>
                            </tr>
                            ${item.assignee ? `
                            <tr>
                              <td style="font-size: 13px; color: #6b7280; padding-top: 4px;">
                                👤 ${item.assignee}${item.deadline ? ` • 📅 ${item.deadline}` : ''}
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                      `).join('')}
                      ${meeting.summaryActionItems.length > 3 ? `
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #f3f4f6;">
                          <span style="font-size: 14px; color: #6b7280; font-style: italic;">
                            +${meeting.summaryActionItems.length - 3} more action items...
                          </span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 12px 0 32px 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                          <a href="${EMAIL_CONFIG.frontendUrl}/meetings/${meeting.id}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">
                            View Full Meeting Details →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tip -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 14px; color: #92400e; line-height: 1.5;">
                          <strong>💡 Tip:</strong> Your audio file will be automatically deleted after ${meeting.user?.autoDeleteDays || 30} days, but transcripts and summaries are kept permanently.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                    This is an automated notification from EchoNote.<br>
                    Questions? Reply to this email or contact <a href="mailto:${process.env.EMAIL_REPLY_TO || 'hariskhan936.hk@gmail.com'}" style="color: #667eea; text-decoration: none;">support</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  
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

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EchoNote</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 64px; line-height: 1; padding-bottom: 16px;">🎙️</td>
                </tr>
                <tr>
                  <td style="font-size: 32px; font-weight: bold; color: #ffffff; padding-bottom: 8px; letter-spacing: -0.5px;">EchoNote</td>
                </tr>
                <tr>
                  <td style="font-size: 18px; color: rgba(255,255,255,0.95); font-weight: 500;">Transform your meetings into insights</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Welcome message -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 24px; font-weight: 600; color: #111827; padding-bottom: 8px; text-align: center;">
                    Welcome, ${userName || 'there'}! 👋
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 16px; color: #4b5563; line-height: 1.6; padding-bottom: 32px; text-align: center;">
                    We're excited to help you capture and organize your meeting insights with AI-powered transcription and summaries.
                  </td>
                </tr>
              </table>

              <!-- Features section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="font-size: 18px; font-weight: 600; color: #111827; padding-bottom: 20px;">
                    What you can do with EchoNote:
                  </td>
                </tr>

                <!-- Feature 1 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size: 24px; line-height: 1;">🎤</td>
                        <td style="padding-left: 12px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 4px;">
                                Record meetings up to 10 minutes
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                                Capture your meetings with high-quality audio recording
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature 2 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size: 24px; line-height: 1;">📝</td>
                        <td style="padding-left: 12px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 4px;">
                                Accurate AI transcriptions
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                                Powered by Whisper AI for industry-leading accuracy
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature 3 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size: 24px; line-height: 1;">🤖</td>
                        <td style="padding-left: 12px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 4px;">
                                Intelligent summaries
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                                Get executive summaries, key decisions, and next steps
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature 4 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size: 24px; line-height: 1;">✅</td>
                        <td style="padding-left: 12px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 4px;">
                                Automatic action item extraction
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                                Never miss a task with AI-detected action items and assignees
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature 5 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size: 24px; line-height: 1;">🔍</td>
                        <td style="padding-left: 12px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 4px;">
                                Search & organize
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                                Find any meeting instantly with powerful search and filters
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 24px 0 32px 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                          <a href="${EMAIL_CONFIG.frontendUrl}/record" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">
                            Record Your First Meeting →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Help section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 14px; color: #1e40af; line-height: 1.6;">
                          <strong>💬 Need help?</strong><br>
                          We're here to help you get started! Reply to this email or check out our help center for tips and guides.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                    Welcome aboard! We can't wait to see what you build.<br>
                    Questions? Contact us at <a href="mailto:${process.env.EMAIL_REPLY_TO || 'hariskhan936.hk@gmail.com'}" style="color: #667eea; text-decoration: none;">support</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  
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
  EMAIL_CONFIG,
  sendEmail,
  sendMeetingCompletedEmail,
  sendMeetingFailedEmail,
  sendWelcomeEmail,
  testEmailConfig
};