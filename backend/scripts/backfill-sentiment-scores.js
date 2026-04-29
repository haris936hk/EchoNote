
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function mapSentimentToScore(sentiment) {
  if (!sentiment) return 0.5;
  const s = String(sentiment).toLowerCase();
  if (s === 'positive') return 0.85;
  if (s === 'negative') return 0.15;
  return 0.5;
}

async function backfill() {
  console.log('🚀 Starting sentiment score backfill...');
  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        nlpSentiment: { not: null },
        nlpSentimentScore: null,
      },
      select: {
        id: true,
        nlpSentiment: true,
      },
    });

    console.log(`Found ${meetings.length} meetings to update.`);

    let updatedCount = 0;
    for (const meeting of meetings) {
      const score = mapSentimentToScore(meeting.nlpSentiment);
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { nlpSentimentScore: score },
      });
      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount}/${meetings.length} meetings...`);
      }
    }

    console.log(`✅ Successfully updated ${updatedCount} meetings.`);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfill();
