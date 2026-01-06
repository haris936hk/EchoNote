/**
 * Test Meeting Email Templates
 *
 * This script tests all three email templates:
 * - Meeting Completion Email
 * - Meeting Failed Email
 * - Welcome Email
 *
 * Run: node backend/scripts/test-meeting-emails.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const emailService = require('../src/config/email');

async function testMeetingEmails() {
  const testRecipient = process.env.GMAIL_USER || 'hariskhan936.hk@gmail.com';
  let successCount = 0;
  let failureCount = 0;

  console.log(`📧 Test recipient: ${testRecipient}\n`);

  // Test 1: Meeting Completion Email
  try {
    console.log('1️⃣ Testing Meeting Completion Email...');
    await emailService.sendMeetingCompletedEmail({
      to: testRecipient,
      userName: 'Haris Khan',
      meeting: {
        id: 'test-123',
        title: 'Test Standup Meeting',
        category: 'STANDUP',
        createdAt: new Date(),
        audioDuration: 178,
        summaryExecutive: 'This is a test summary of the meeting. We discussed project progress, blockers, and next steps for the upcoming sprint.',
        summaryActionItems: [
          { task: 'Review pull request #42', assignee: 'John Doe', deadline: '2026-01-10', priority: 'high' },
          { task: 'Update API documentation', assignee: 'Sarah Smith', deadline: null, priority: 'medium' },
          { task: 'Schedule architecture review', assignee: null, deadline: '2026-01-15', priority: 'low' }
        ],
        transcriptText: 'This is a sample transcript text for testing purposes. '.repeat(50)
      }
    });
    console.log('   ✅ Meeting Completion Email sent\n');
    successCount++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    failureCount++;
  }

  // Test 2: Meeting Failed Email
  try {
    console.log('2️⃣ Testing Meeting Failed Email...');
    await emailService.sendMeetingFailedEmail({
      to: testRecipient,
      userName: 'Haris Khan',
      meeting: {
        title: 'Failed Test Meeting'
      },
      error: 'Audio processing timeout - file size exceeded limits'
    });
    console.log('   ✅ Meeting Failed Email sent\n');
    successCount++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    failureCount++;
  }

  // Test 3: Welcome Email
  try {
    console.log('3️⃣ Testing Welcome Email...');
    await emailService.sendWelcomeEmail({
      to: testRecipient,
      userName: 'Haris Khan'
    });
    console.log('   ✅ Welcome Email sent\n');
    successCount++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}\n`);
    failureCount++;
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Test Summary: ${successCount} passed, ${failureCount} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  if (successCount === 3) {
    console.log('✅ All template emails sent successfully!');
    console.log(`📬 Check your inbox at ${testRecipient}\n`);
    console.log('📋 Verify:');
    console.log('   - Email formatting and styling');
    console.log('   - All dynamic content rendered correctly');
    console.log('   - Links are clickable');
    console.log('   - Emails not in spam folder\n');
    process.exit(0);
  } else {
    console.log(`⚠️ ${failureCount} template(s) failed. Check errors above.\n`);
    process.exit(1);
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('   Meeting Email Templates Test');
console.log('═══════════════════════════════════════════════════\n');

testMeetingEmails();
