const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send meeting processing completion email with summary
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.userName - User's name
 * @param {Object} params.meeting - Meeting object with title, summary, transcript
 * @returns {Promise<Object>} Send result
 */
async function sendMeetingCompletedEmail({ to, userName, meeting }) {
  try {
    const emailHtml = generateMeetingCompletedHTML({
      userName,
      meetingTitle: meeting.title,
      meetingDate: meeting.createdAt,
      duration: meeting.duration,
      category: meeting.category,
      summary: meeting.summary,
      transcriptPreview: meeting.transcript?.substring(0, 500) + '...',
      meetingUrl: `${process.env.FRONTEND_URL}/meetings/${meeting.id}`
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'EchoNote <noreply@echonote.app>',
      to: [to],
      subject: `Meeting Processed: ${meeting.title}`,
      html: emailHtml
    });

    console.log(`✅ Meeting completion email sent to: ${to}`);

    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    console.error('❌ Send meeting completed email error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send meeting processing failed email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.userName - User's name
 * @param {string} params.meetingTitle - Meeting title
 * @param {string} params.errorMessage - Error description
 * @returns {Promise<Object>} Send result
 */
async function sendMeetingFailedEmail({ to, userName, meetingTitle, errorMessage }) {
  try {
    const emailHtml = generateMeetingFailedHTML({
      userName,
      meetingTitle,
      errorMessage
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'EchoNote <noreply@echonote.app>',
      to: [to],
      subject: `Meeting Processing Failed: ${meetingTitle}`,
      html: emailHtml
    });

    console.log(`✅ Meeting failed email sent to: ${to}`);

    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    console.error('❌ Send meeting failed email error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send welcome email to new users
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.userName - User's name
 * @returns {Promise<Object>} Send result
 */
async function sendWelcomeEmail({ to, userName }) {
  try {
    const emailHtml = generateWelcomeHTML({ userName });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'EchoNote <welcome@echonote.app>',
      to: [to],
      subject: 'Welcome to EchoNote - AI Meeting Transcription',
      html: emailHtml
    });

    console.log(`✅ Welcome email sent to: ${to}`);

    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    console.error('❌ Send welcome email error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send test email (for testing email configuration)
 * @param {string} to - Recipient email
 * @returns {Promise<Object>} Send result
 */
async function sendTestEmail(to) {
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'EchoNote <noreply@echonote.app>',
      to: [to],
      subject: 'EchoNote Email Service Test',
      html: '<h1>Email Service Working!</h1><p>If you received this, your email configuration is correct.</p>'
    });

    console.log(`✅ Test email sent to: ${to}`);

    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    console.error('❌ Send test email error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// HTML EMAIL TEMPLATES
// ============================================

/**
 * Generate HTML for meeting completed email
 */
function generateMeetingCompletedHTML({ userName, meetingTitle, meetingDate, duration, category, summary, transcriptPreview, meetingUrl }) {
  const formattedDate = new Date(meetingDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Processed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">EchoNote</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">AI Meeting Transcription</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hi ${userName},</h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Your meeting has been successfully processed! Here's what we captured:
              </p>

              <!-- Meeting Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 20px;">${meetingTitle}</h3>
                    <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;">
                      <strong>Date:</strong> ${formattedDate}
                    </p>
                    <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;">
                      <strong>Duration:</strong> ${formatDuration(duration)}
                    </p>
                    <p style="margin: 0; color: #666666; font-size: 14px;">
                      <strong>Category:</strong> ${category}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Summary Section -->
              ${summary ? `
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">📋 Summary</h3>
                <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px;">
                  ${formatSummaryHTML(summary)}
                </div>
              </div>
              ` : ''}

              <!-- Transcript Preview -->
              ${transcriptPreview ? `
              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">📝 Transcript Preview</h3>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #555555; line-height: 1.6;">
                  ${transcriptPreview}
                </div>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${meetingUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      View Full Meeting
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                Your meeting data is securely stored and can be accessed anytime from your dashboard.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} EchoNote. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                <a href="${process.env.FRONTEND_URL}/settings" style="color: #667eea; text-decoration: none;">Manage Notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate HTML for meeting failed email
 */
function generateMeetingFailedHTML({ userName, meetingTitle, errorMessage }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Processing Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">EchoNote</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">AI Meeting Transcription</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hi ${userName},</h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                We encountered an issue processing your meeting: <strong>${meetingTitle}</strong>
              </p>

              <!-- Error Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border-left: 4px solid #f5576c; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px 0; color: #c53030; font-size: 16px;">❌ Error Details</h3>
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">
                      ${errorMessage}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                <strong>What you can do:</strong>
              </p>

              <ul style="color: #666666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>Ensure your audio file is clear and under 3 minutes</li>
                <li>Check that the audio format is supported (MP3, WAV, M4A)</li>
                <li>Try uploading a different audio file</li>
                <li>Contact support if the issue persists</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${process.env.FRONTEND_URL}/meetings/new" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Try Again
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5; text-align: center;">
                Need help? <a href="mailto:support@echonote.app" style="color: #667eea; text-decoration: none;">Contact Support</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} EchoNote. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate HTML for welcome email
 */
function generateWelcomeHTML({ userName }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EchoNote</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">Welcome to EchoNote! 🎉</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hi ${userName},</h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Welcome to <strong>EchoNote</strong> - your AI-powered meeting assistant! We're excited to help you transform meeting audio into organized, searchable knowledge.
              </p>

              <h3 style="margin: 30px 0 15px 0; color: #333333; font-size: 18px;">✨ What you can do:</h3>
              
              <ul style="color: #666666; font-size: 15px; line-height: 2; padding-left: 20px;">
                <li><strong>Record meetings</strong> up to 3 minutes (perfect for standups, quick syncs)</li>
                <li><strong>Get AI-powered transcripts</strong> with 88%+ accuracy</li>
                <li><strong>Smart summaries</strong> with action items and key decisions</li>
                <li><strong>Search your meetings</strong> and never lose important information</li>
                <li><strong>Privacy-first</strong> with automatic data deletion options</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/meetings/new" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 50px; border-radius: 6px; font-size: 18px; font-weight: bold;">
                      Record Your First Meeting
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5; text-align: center;">
                Questions? We're here to help! <a href="mailto:support@echonote.app" style="color: #667eea; text-decoration: none;">Contact Support</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} EchoNote. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format duration from seconds to readable string
 */
function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins === 0) {
    return `${secs} seconds`;
  }
  return `${mins} min ${secs} sec`;
}

/**
 * Format summary object to HTML
 */
function formatSummaryHTML(summary) {
  if (typeof summary === 'string') {
    return `<p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.6;">${summary}</p>`;
  }

  let html = '';

  if (summary.executiveSummary) {
    html += `<p style="margin: 0 0 15px 0; color: #555555; font-size: 14px; line-height: 1.6;"><strong>Executive Summary:</strong><br>${summary.executiveSummary}</p>`;
  }

  if (summary.keyDecisions && summary.keyDecisions.length > 0) {
    html += `<p style="margin: 15px 0 5px 0; color: #555555; font-size: 14px;"><strong>Key Decisions:</strong></p><ul style="margin: 5px 0 15px 20px; padding: 0; color: #555555; font-size: 14px; line-height: 1.8;">`;
    summary.keyDecisions.forEach(decision => {
      html += `<li>${decision}</li>`;
    });
    html += `</ul>`;
  }

  if (summary.actionItems && summary.actionItems.length > 0) {
    html += `<p style="margin: 15px 0 5px 0; color: #555555; font-size: 14px;"><strong>Action Items:</strong></p><ul style="margin: 5px 0 0 20px; padding: 0; color: #555555; font-size: 14px; line-height: 1.8;">`;
    summary.actionItems.forEach(item => {
      html += `<li>${item.description || item}${item.assignee ? ` (${item.assignee})` : ''}</li>`;
    });
    html += `</ul>`;
  }

  return html || '<p style="margin: 0; color: #999999; font-size: 14px;">No summary available</p>';
}

module.exports = {
  sendMeetingCompletedEmail,
  sendMeetingFailedEmail,
  sendWelcomeEmail,
  sendTestEmail
};