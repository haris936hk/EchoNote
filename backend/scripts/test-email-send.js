/**
 * Test Simple Email Sending
 *
 * This script sends a test email via Gmail OAuth2 to verify email sending works.
 * Run: node backend/scripts/test-email-send.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const emailService = require('../src/config/email');

async function testEmail() {
  try {
    console.log('🧪 Sending test email...\n');

    const testRecipient = process.env.GMAIL_USER || 'hariskhan936.hk@gmail.com';

    console.log(`📧 Recipient: ${testRecipient}`);
    console.log('📝 Subject: EchoNote Gmail OAuth2 Test');
    console.log('⏳ Sending...\n');

    const result = await emailService.sendEmail({
      to: testRecipient,
      subject: 'EchoNote Gmail OAuth2 Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">✅ Success!</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            Gmail OAuth2 SMTP is working correctly for EchoNote.
          </p>
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Test Details:</strong>
            <ul style="margin: 10px 0;">
              <li>Transport: Gmail OAuth2</li>
              <li>From: ${process.env.EMAIL_FROM}</li>
              <li>Timestamp: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated test email from EchoNote backend.
          </p>
        </div>
      `,
      text: 'Success! Gmail OAuth2 SMTP is working correctly for EchoNote.',
      skipPreferenceCheck: true // Skip preference check for test email
    });

    if (result.success) {
      console.log('✅ Email sent successfully!\n');
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      console.log(`\n📬 Check your inbox at ${testRecipient}\n`);
      process.exit(0);
    } else {
      throw new Error(result.error || 'Email send failed');
    }

  } catch (error) {
    console.error('❌ Test email failed:\n');
    console.error(`   Error: ${error.message}\n`);

    console.log('💡 Troubleshooting:');
    console.log('   1. Verify GMAIL_REFRESH_TOKEN is set in .env');
    console.log('   2. Check Gmail API is enabled in Google Console');
    console.log('   3. Ensure refresh token is not expired');
    console.log('   4. Run: node scripts/test-gmail-transport.js first\n');

    process.exit(1);
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('   Gmail OAuth2 Email Send Test');
console.log('═══════════════════════════════════════════════════\n');

testEmail();
