
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const meetingService = require('../src/services/meeting.service');

async function verify() {
  console.log('🧪 Starting verification...');
  try {
    
    const user = await prisma.user.findFirst({
      where: { meetings: { some: {} } }
    });

    if (!user) {
      console.log('❌ No user with meetings found in database.');
      return;
    }

    console.log(`Checking stats for user: ${user.email}`);
    const stats = await meetingService.getUserMeetingStats(user.id);

    console.log('Sentiment Trend:');
    console.log(JSON.stringify(stats.sentimentTrend, null, 2));

    const hasValidScores = stats.sentimentTrend.some(t => t.score > 0);
    if (hasValidScores) {
      console.log('✅ Verification passed: Sentiment trend contains valid scores.');
    } else {
      console.log('❌ Verification failed: Sentiment trend contains only 0 scores or is empty.');
    }

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
