const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const audioService = require('./audio.service');
const transcriptionService = require('./transcription.service');
const nlpService = require('./nlp.service');
const summarizationService = require('./summarization.service');
const emailService = require('./email.service');
const supabaseStorage = require('./supabase-storage.service');
const slackService = require('./slack.service');
const notificationService = require('./notification.service');
const jiraService = require('./jira.service');
const path = require('path');
const fs = require('fs').promises;

function deserializeArrayField(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Failed to parse JSON array:', e);
      return value;
    }
  }
  return value;
}

function mapSentimentToScore(sentiment) {
  if (!sentiment) return 0.5;
  const s = String(sentiment).toLowerCase();
  if (s === 'positive') return 0.85;
  if (s === 'negative') return 0.15;
  return 0.5;
}

async function createMeeting({ userId, title, description, category }) {
  try {
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description: description || null,
        category,
        status: 'UPLOADING',
        userId,
        audioUrl: null,
        transcriptText: null,
        summaryExecutive: null,
        audioDuration: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`✅ Meeting created: ${meeting.id}`);

    return meeting;
  } catch (error) {
    console.error('Create meeting error:', error.message);
    throw error;
  }
}

async function uploadAndProcessAudio(meetingId, userId, audioFile, options = {}) {
  let tempPath = null;
  let processedAudioPath = null;

  try {
    console.log(`\n🎬 Starting audio processing for meeting: ${meetingId}`);

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found or unauthorized');
    }

    tempPath = audioFile.path;
    const originalFileName = audioFile.originalname || audioFile.filename;

    console.log(`📁 Audio file saved: ${originalFileName} at ${tempPath}`);

    await updateMeetingStatus(meetingId, 'PROCESSING_AUDIO');

    console.log(`\n🔊 Step 1/4: Processing audio...`);
    const audioResult = await audioService.processAudioFile(tempPath);

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    processedAudioPath = audioResult.outputPath;
    const audioDuration = audioResult.duration;

    console.log(`✅ Audio processed: ${audioDuration}s duration`);

    await updateMeetingStatus(meetingId, 'TRANSCRIBING');
    console.log(`\n📝 Step 2/4: Transcribing audio...`);
    const transcriptionResult = await transcriptionService.transcribeAudio(processedAudioPath);

    if (!transcriptionResult.success) {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    }

    const transcript = transcriptionResult.text;
    const transcriptionSegments = transcriptionResult.segments || [];
    const diarizedTranscriptText =
      transcriptionSegments.length > 0
        ? transcriptionSegments
            .map((s) => {
              const mins = Math.floor(s.start / 60);
              const secs = Math.floor(s.start % 60)
                .toString()
                .padStart(2, '0');
              return `[${mins}:${secs}] [${s.speaker}]: ${s.text}`;
            })
            .join('\n')
        : transcript;
    const transcriptionConfidence = transcriptionResult.confidence;
    const deepgramEntities = transcriptionResult.deepgramEntities || [];
    const deepgramTopics = transcriptionResult.deepgramTopics || [];
    const deepgramIntents = transcriptionResult.deepgramIntents || [];
    const lowConfidenceWords = transcriptionResult.lowConfidenceWords || [];

    console.log(
      `✅ Transcription complete: ${transcript.length} characters, ${(transcriptionConfidence * 100).toFixed(1)}% confidence`
    );

    await updateMeetingStatus(meetingId, 'PROCESSING_NLP');
    console.log(`\n🧠 Step 3/4: Processing NLP...`);
    const nlpResult = await nlpService.processMeetingTranscript(diarizedTranscriptText);

    if (!nlpResult.success) {
      logger.warn(`⚠️ NLP processing failed: ${nlpResult.error}`);
    }

    console.log(
      `✅ NLP complete: ${nlpResult.entities?.length || 0} entities, ${nlpResult.svoTriplets?.length || 0} SVOs, ${nlpResult.actionSignals?.length || 0} action signals, ${nlpResult.questions?.length || 0} questions`
    );

    await updateMeetingStatus(meetingId, 'SUMMARIZING');
    console.log(`\n🤖 Step 4/4: Generating summary...`);
    const summaryResult = await summarizationService.generateSummary(diarizedTranscriptText, {
      title: meeting.title,
      category: meeting.category,
      duration: audioDuration,

      entities: nlpResult.success ? nlpResult.entities : [],
      svoTriplets: nlpResult.success ? nlpResult.svoTriplets : [],
      actionSignals: nlpResult.success ? nlpResult.actionSignals : [],
      questions: nlpResult.success ? nlpResult.questions : [],
      speakerEntityMap: nlpResult.success ? nlpResult.speakerEntityMap : {},
      nlpMetadata: nlpResult.success ? nlpResult.nlpMetadata : {},

      deepgramEntities,
      deepgramTopics,
      deepgramIntents,
      lowConfidenceWords,
    });

    if (!summaryResult.success) {
      throw new Error(`Summary generation failed: ${summaryResult.error}`);
    }

    const summary = {
      executiveSummary: summaryResult.executiveSummary,
      keyDecisions: summaryResult.keyDecisions,
      actionItems: summaryResult.actionItems,
      nextSteps: summaryResult.nextSteps,
      keyTopics: summaryResult.keyTopics,
      sentiment: summaryResult.sentiment,
    };

    const enhancedSummary = nlpResult.success
      ? summarizationService.enhanceSummaryWithNLP(summary, nlpResult)
      : summary;

    console.log(
      `✅ Summary generated with ${enhancedSummary.actionItems?.length || 0} action items`
    );
    console.log(`📝 Summary data to save:`, {
      executiveSummary: enhancedSummary.executiveSummary
        ? enhancedSummary.executiveSummary.substring(0, 50) + '...'
        : 'null',
      keyDecisions: Array.isArray(enhancedSummary.keyDecisions)
        ? `[${enhancedSummary.keyDecisions.length} items]`
        : 'null',
      actionItemsCount: enhancedSummary.actionItems?.length || 0,
      nextSteps: Array.isArray(enhancedSummary.nextSteps)
        ? `[${enhancedSummary.nextSteps.length} items]`
        : 'null',
      keyTopicsCount: enhancedSummary.keyTopics?.length || 0,
      sentiment: enhancedSummary.sentiment || 'null',
    });

    const audioStoragePath = await storeAudioFile(processedAudioPath, meetingId);

    const wordCount = transcript.split(/\s+/).length;

    const audioFormat =
      path
        .extname(audioFile.originalname || audioFile.filename)
        .toLowerCase()
        .replace('.', '') || 'unknown';

    const processingEndTime = new Date();
    const processingDurationSeconds = meeting.processingStartedAt
      ? Math.round((processingEndTime - new Date(meeting.processingStartedAt)) / 1000)
      : null;

    const nlpEntitiesText =
      nlpResult.success && nlpResult.entities
        ? nlpResult.entities.map((e) => `${e.text} (${e.label})`).join(', ')
        : null;

    const nlpActionPatternsText =
      nlpResult.success && nlpResult.svoTriplets
        ? '  • ' +
          nlpResult.svoTriplets.map((t) => `${t.subject} ${t.verb} ${t.object}`).join('\n  • ')
        : null;

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        audioUrl: audioStoragePath,
        audioDuration,
        audioSize: audioFile.size,
        audioFormat: audioFormat,
        transcriptText: transcript,
        transcriptSegments: transcriptionSegments,
        speakerMap: {},
        transcriptWordCount: wordCount,
        transcriptConfidence: transcriptionConfidence,

        nlpEntities: nlpEntitiesText,
        nlpActionPatterns: nlpActionPatternsText,

        nlpSentiment: enhancedSummary.sentiment || null,
        nlpSentimentScore: mapSentimentToScore(enhancedSummary.sentiment),

        summaryExecutive: enhancedSummary.executiveSummary || null,
        summaryKeyDecisions: Array.isArray(enhancedSummary.keyDecisions)
          ? JSON.stringify(enhancedSummary.keyDecisions)
          : enhancedSummary.keyDecisions || null,
        summaryActionItems: enhancedSummary.actionItems || null,
        summaryNextSteps: Array.isArray(enhancedSummary.nextSteps)
          ? JSON.stringify(enhancedSummary.nextSteps)
          : enhancedSummary.nextSteps || null,
        summaryKeyTopics: enhancedSummary.keyTopics || null,
        summarySentiment: enhancedSummary.sentiment || null,

        processingDuration: processingDurationSeconds,
        processingCompletedAt: processingEndTime,
        status: 'COMPLETED',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`✅ Meeting updated in database`);

    if (enhancedSummary.actionItems && enhancedSummary.actionItems.length > 0) {
      const actionItemsData = enhancedSummary.actionItems.map((item) => ({
        task: item.task,
        assignee: item.assignee || null,
        deadline: item.deadline || null,
        priority: item.priority || 'medium',
        confidence: item.confidence || 'medium',
        sourceQuote: item.sourceQuote || null,
        status: 'TODO',
        meetingId: updatedMeeting.id,
        userId: userId,
      }));

      await prisma.actionItem.createMany({
        data: actionItemsData,
      });
      console.log(`✅ Created ${actionItemsData.length} Action Items for Kanban board`);

      const allActionItems1 = await prisma.actionItem.findMany({
        where: { meetingId: updatedMeeting.id },
        orderBy: { createdAt: 'asc' },
      });

      const summaryActionItems1 = allActionItems1.map((item) => ({
        id: item.id,
        task: item.task,
        assignee: item.assignee,
        deadline: item.deadline,
        priority: item.priority,
        confidence: item.confidence,
        status: item.status,
      }));

      await prisma.meeting.update({
        where: { id: updatedMeeting.id },
        data: { summaryActionItems: summaryActionItems1 },
      });

      const userWithJira = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          jiraDomain: true,
          jiraEmail: true,
          jiraApiToken: true,
          jiraProjectKey: true,
          jiraAutoSync: true,
        },
      });

      if (userWithJira && userWithJira.jiraAutoSync && userWithJira.jiraApiToken) {
        console.log(`\n🚀 Starting Jira auto-sync for ${allActionItems1.length} items...`);
        for (const item of allActionItems1) {
          try {
            await jiraService.createIssue(userWithJira, item);
            console.log(`✅ Synced item "${item.task.substring(0, 20)}..." to Jira`);
          } catch (err) {
            logger.error(`⚠️ Jira sync failed for item ${item.id}:`, err.message);
          }
        }
      }
    }

    await cleanupTempFiles([tempPath, processedAudioPath]);

    console.log(`\n📧💬 Sending notifications in parallel...`);

    const notificationPromises = [];

    notificationPromises.push(
      emailService
        .sendMeetingCompletedEmail({
          to: meeting.user.email,
          userName: meeting.user.name,
          meeting: {
            id: updatedMeeting.id,
            title: updatedMeeting.title,
            createdAt: updatedMeeting.createdAt,
            audioDuration: updatedMeeting.audioDuration,
            category: updatedMeeting.category,
            processingDuration: updatedMeeting.processingDuration,
            summaryExecutive: updatedMeeting.summaryExecutive,
            summaryKeyDecisions: updatedMeeting.summaryKeyDecisions,
            summaryActionItems: updatedMeeting.summaryActionItems,
            summaryNextSteps: updatedMeeting.summaryNextSteps,
            transcriptText: updatedMeeting.transcriptText,
          },
        })
        .then(async () => {
          console.log(`✅ Email sent to ${meeting.user.email}`);
          await prisma.meeting.update({
            where: { id: meetingId },
            data: { emailSent: true, emailSentAt: new Date() },
          });
        })
        .catch((err) => logger.error(`⚠️ Email send failed:`, err.message))
    );

    const userWithWebhook = await prisma.user.findUnique({
      where: { id: userId },
      select: { slackWebhookUrl: true },
    });
    if (userWithWebhook && userWithWebhook.slackWebhookUrl) {
      notificationPromises.push(
        slackService
          .sendMeetingCompletedNotification(userWithWebhook.slackWebhookUrl, updatedMeeting)
          .then(() => console.log(`✅ Slack notification sent`))
          .catch((err) => logger.error(`⚠️ Slack send failed:`, err.message))
      );
    }

    notificationPromises.push(
      notificationService
        .sendMeetingCompletedPush(userId, updatedMeeting)
        .then((res) => {
          if (res.success) console.log(`✅ Web Push notification sent`);
          else logger.debug(`ℹ️ Web Push skipped: ${res.message || res.error}`);
        })
        .catch((err) => logger.error(`⚠️ Web Push failed:`, err.message))
    );

    await Promise.allSettled(notificationPromises);

    console.log(`\n🎉 Meeting processing complete! ID: ${meetingId}\n`);

    return updatedMeeting;
  } catch (error) {
    logger.error(`\n❌ Meeting processing failed:`, error.message);

    await updateMeetingStatus(meetingId, 'FAILED', error.message);

    if (tempPath && !options.keepTempOnError) {
      const pathsToClean = [tempPath];
      if (processedAudioPath) pathsToClean.push(processedAudioPath);
      await cleanupTempFiles(pathsToClean);
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (meeting && meeting.user) {
      await emailService.sendMeetingFailedEmail({
        to: meeting.user.email,
        userName: meeting.user.name,
        meeting,
        error: error.message,
      });
    }

    throw error;
  }
}

async function createAndProcessMeeting({ userId, title, category, audioPath, originalFilename }) {
  let meeting = null;
  let processedAudioPath = null;

  try {
    console.log(`\n🎬 Starting meeting processing pipeline for: ${title}`);
    console.log(`📁 Audio file: ${originalFilename}`);

    meeting = await prisma.meeting.create({
      data: {
        title,
        category,
        status: 'UPLOADING',
        userId,
        audioUrl: null,
        transcriptText: null,
        summaryExecutive: null,
        audioDuration: null,
      },
    });

    console.log(`✅ Meeting record created: ${meeting.id}`);

    await updateMeetingStatus(meeting.id, 'PROCESSING_AUDIO');

    console.log(`\n🔊 Step 1/4: Processing audio...`);
    const audioResult = await audioService.processAudioFile(audioPath);

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    processedAudioPath = audioResult.outputPath;
    const audioDuration = audioResult.duration;

    console.log(`✅ Audio processed: ${audioDuration}s duration`);

    await updateMeetingStatus(meeting.id, 'TRANSCRIBING');
    console.log(`\n📝 Step 2/4: Transcribing audio...`);
    const transcriptionResult = await transcriptionService.transcribeAudio(processedAudioPath);

    if (!transcriptionResult.success) {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    }

    const transcript = transcriptionResult.text;
    const transcriptionSegments = transcriptionResult.segments || [];
    const diarizedTranscriptText =
      transcriptionSegments.length > 0
        ? transcriptionSegments
            .map((s) => {
              const mins = Math.floor(s.start / 60);
              const secs = Math.floor(s.start % 60)
                .toString()
                .padStart(2, '0');
              return `[${mins}:${secs}] [${s.speaker}]: ${s.text}`;
            })
            .join('\n')
        : transcript;
    const transcriptionConfidence = transcriptionResult.confidence;
    const deepgramEntities = transcriptionResult.deepgramEntities || [];
    const deepgramTopics = transcriptionResult.deepgramTopics || [];
    const deepgramIntents = transcriptionResult.deepgramIntents || [];
    const lowConfidenceWords = transcriptionResult.lowConfidenceWords || [];

    console.log(
      `✅ Transcription complete: ${transcript.length} characters, ${(transcriptionConfidence * 100).toFixed(1)}% confidence`
    );

    await updateMeetingStatus(meeting.id, 'PROCESSING_NLP');
    console.log(`\n🧠 Step 3/4: Processing NLP...`);
    const nlpResult = await nlpService.processMeetingTranscript(diarizedTranscriptText);

    if (!nlpResult.success) {
      logger.warn(`⚠️ NLP processing failed: ${nlpResult.error}`);
    }

    console.log(
      `✅ NLP complete: ${nlpResult.entities?.length || 0} entities, ${nlpResult.svoTriplets?.length || 0} SVOs, ${nlpResult.actionSignals?.length || 0} action signals, ${nlpResult.questions?.length || 0} questions`
    );

    await updateMeetingStatus(meeting.id, 'SUMMARIZING');
    console.log(`\n🤖 Step 4/4: Generating summary...`);
    const summaryResult = await summarizationService.generateSummary(diarizedTranscriptText, {
      title,
      category,
      audioDuration,

      entities: nlpResult.success ? nlpResult.entities : [],
      svoTriplets: nlpResult.success ? nlpResult.svoTriplets : [],
      actionSignals: nlpResult.success ? nlpResult.actionSignals : [],
      questions: nlpResult.success ? nlpResult.questions : [],
      speakerEntityMap: nlpResult.success ? nlpResult.speakerEntityMap : {},
      nlpMetadata: nlpResult.success ? nlpResult.nlpMetadata : {},

      deepgramEntities,
      deepgramTopics,
      deepgramIntents,
      lowConfidenceWords,
    });

    if (!summaryResult.success) {
      throw new Error(`Summary generation failed: ${summaryResult.error}`);
    }

    const summary = {
      executiveSummary: summaryResult.executiveSummary,
      keyDecisions: summaryResult.keyDecisions,
      actionItems: summaryResult.actionItems,
      nextSteps: summaryResult.nextSteps,
      keyTopics: summaryResult.keyTopics,
      sentiment: summaryResult.sentiment,
    };

    const enhancedSummary = nlpResult.success
      ? summarizationService.enhanceSummaryWithNLP(summary, nlpResult)
      : summary;

    console.log(
      `✅ Summary generated with ${enhancedSummary.actionItems?.length || 0} action items`
    );

    const audioStoragePath = await storeAudioFile(processedAudioPath, meeting.id);

    const wordCount = transcript.split(/\s+/).length;

    const nlpEntitiesText =
      nlpResult.success && nlpResult.entities
        ? nlpResult.entities.map((e) => `${e.text} (${e.label})`).join(', ')
        : null;

    const nlpActionPatternsText =
      nlpResult.success && nlpResult.svoTriplets
        ? '  • ' +
          nlpResult.svoTriplets.map((t) => `${t.subject} ${t.verb} ${t.object}`).join('\n  • ')
        : null;

    meeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        audioUrl: audioStoragePath,
        audioDuration,
        transcriptText: transcript,
        transcriptSegments: transcriptionSegments,
        speakerMap: {},
        transcriptWordCount: wordCount,
        transcriptConfidence: transcriptionConfidence,

        nlpEntities: nlpEntitiesText,
        nlpActionPatterns: nlpActionPatternsText,

        nlpSentiment: enhancedSummary.sentiment || null,
        nlpSentimentScore: mapSentimentToScore(enhancedSummary.sentiment),

        summaryExecutive: enhancedSummary.executiveSummary || null,
        summaryKeyDecisions: Array.isArray(enhancedSummary.keyDecisions)
          ? JSON.stringify(enhancedSummary.keyDecisions)
          : enhancedSummary.keyDecisions || null,
        summaryActionItems: enhancedSummary.actionItems || null,
        summaryNextSteps: Array.isArray(enhancedSummary.nextSteps)
          ? JSON.stringify(enhancedSummary.nextSteps)
          : enhancedSummary.nextSteps || null,
        summaryKeyTopics: enhancedSummary.keyTopics || null,
        summarySentiment: enhancedSummary.sentiment || null,

        status: 'COMPLETED',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`✅ Meeting updated in database`);

    if (enhancedSummary.actionItems && enhancedSummary.actionItems.length > 0) {
      const actionItemsData = enhancedSummary.actionItems.map((item) => ({
        task: item.task,
        assignee: item.assignee || null,
        deadline: item.deadline || null,
        priority: item.priority || 'medium',
        confidence: item.confidence || 'medium',
        sourceQuote: item.sourceQuote || null,
        status: 'TODO',
        meetingId: meeting.id,
        userId: userId,
      }));

      await prisma.actionItem.createMany({
        data: actionItemsData,
      });
      console.log(`✅ Created ${actionItemsData.length} Action Items for Kanban board`);

      const allActionItems2 = await prisma.actionItem.findMany({
        where: { meetingId: meeting.id },
        orderBy: { createdAt: 'asc' },
      });

      const summaryActionItems2 = allActionItems2.map((item) => ({
        id: item.id,
        task: item.task,
        assignee: item.assignee,
        deadline: item.deadline,
        priority: item.priority,
        confidence: item.confidence,
        status: item.status,
      }));

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { summaryActionItems: summaryActionItems2 },
      });

      const userWithJira = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          jiraDomain: true,
          jiraEmail: true,
          jiraApiToken: true,
          jiraProjectKey: true,
          jiraAutoSync: true,
        },
      });

      if (userWithJira && userWithJira.jiraAutoSync && userWithJira.jiraApiToken) {
        console.log(`\n🚀 Starting Jira auto-sync for ${allActionItems2.length} items...`);
        for (const item of allActionItems2) {
          try {
            await jiraService.createIssue(userWithJira, item);
            console.log(`✅ Synced item "${item.task.substring(0, 20)}..." to Jira`);
          } catch (err) {
            logger.error(`⚠️ Jira sync failed for item ${item.id}:`, err.message);
          }
        }
      }
    }

    await cleanupTempFiles([audioPath, processedAudioPath]);

    console.log(`\n📧💬 Sending notifications in parallel...`);

    const notificationPromises = [];

    notificationPromises.push(
      emailService
        .sendMeetingCompletedEmail({
          to: meeting.user.email,
          userName: meeting.user.name,
          meeting: {
            id: meeting.id,
            title: meeting.title,
            createdAt: meeting.createdAt,
            audioDuration: meeting.audioDuration,
            category: meeting.category,
            summaryExecutive: meeting.summaryExecutive,
            summaryKeyDecisions: meeting.summaryKeyDecisions,
            summaryActionItems: meeting.summaryActionItems,
            summaryNextSteps: meeting.summaryNextSteps,
            transcriptText: meeting.transcriptText,
          },
        })
        .then(async () => {
          console.log(`✅ Email sent to ${meeting.user.email}`);
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { emailSent: true, emailSentAt: new Date() },
          });
        })
        .catch((err) => logger.error(`⚠️ Email send failed:`, err.message))
    );

    const userWithWebhook = await prisma.user.findUnique({
      where: { id: userId },
      select: { slackWebhookUrl: true },
    });
    if (userWithWebhook && userWithWebhook.slackWebhookUrl) {
      notificationPromises.push(
        slackService
          .sendMeetingCompletedNotification(userWithWebhook.slackWebhookUrl, meeting)
          .then(() => console.log(`✅ Slack notification sent`))
          .catch((err) => logger.error(`⚠️ Slack send failed:`, err.message))
      );
    }

    notificationPromises.push(
      notificationService
        .sendMeetingCompletedPush(userId, meeting)
        .then((res) => {
          if (res.success) console.log(`✅ Web Push notification sent`);
          else logger.debug(`ℹ️ Web Push skipped: ${res.message || res.error}`);
        })
        .catch((err) => logger.error(`⚠️ Web Push failed:`, err.message))
    );

    await Promise.allSettled(notificationPromises);

    console.log(`\n🎉 Meeting processing complete! ID: ${meeting.id}\n`);

    return {
      success: true,
      data: meeting,
    };
  } catch (error) {
    logger.error(`\n❌ Meeting processing failed:`, error.message);

    if (meeting) {
      await updateMeetingStatus(meeting.id, 'FAILED', error.message);

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        await emailService.sendMeetingFailedEmail({
          to: user.email,
          userName: user.name,
          meeting,
          error: error.message,
        });
      }
    }

    const pathsToClean = [];
    if (audioPath) pathsToClean.push(audioPath);
    if (processedAudioPath) pathsToClean.push(processedAudioPath);

    if (pathsToClean.length > 0) {
      await cleanupTempFiles(pathsToClean);
    }

    return {
      success: false,
      error: error.message,
      meetingId: meeting?.id,
    };
  }
}

function transformMeetingForFrontend(meeting) {
  if (!meeting) return null;

  const actionItems = meeting.actionItems || meeting.summaryActionItems || [];

  return {
    ...meeting,

    transcript: meeting.transcriptText || null,
    transcriptSegments: meeting.transcriptSegments || null,
    speakerMap: meeting.speakerMap || {},

    duration: meeting.audioDuration || null,

    summary:
      meeting.summaryExecutive ||
      meeting.summaryKeyDecisions ||
      actionItems.length > 0 ||
      meeting.summaryNextSteps
        ? {
            executiveSummary: meeting.summaryExecutive,
            keyDecisions: deserializeArrayField(meeting.summaryKeyDecisions),
            actionItems: actionItems,
            nextSteps: deserializeArrayField(meeting.summaryNextSteps),
            keyTopics: meeting.summaryKeyTopics,
            sentiment: meeting.summarySentiment,
          }
        : null,
  };
}

async function getMeetingById(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actionItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!meeting) return null;

    return transformMeetingForFrontend(meeting);
  } catch (error) {
    logger.error('Get meeting error:', error.message);
    throw error;
  }
}

async function getUserMeetings({ userId, category, status, search, page = 1, limit = 10 }) {
  try {
    const skip = (page - 1) * limit;

    const where = {
      userId,
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { transcriptText: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, meetings] = await Promise.all([
      prisma.meeting.count({ where }),
      prisma.meeting.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          status: true,
          audioDuration: true,
          createdAt: true,
          summaryExecutive: true,
          summaryKeyTopics: true,
          processingError: true,
        },
      }),
    ]);

    const transformedMeetings = meetings.map((m) => transformMeetingForFrontend(m));

    return {
      meetings: transformedMeetings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Get user meetings error:', error.message);
    throw error;
  }
}

async function searchMeetings(userId, query, options = {}) {
  try {
    const where = {
      userId,
      status: 'COMPLETED',
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { transcriptText: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (options.category && options.category !== 'ALL') {
      where.category = options.category;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        audioDuration: true,
        transcriptText: true,
      },
    });

    return meetings.map((meeting) => ({
      ...meeting,
      transcriptText: meeting.transcriptText?.substring(0, 200) + '...',
    }));
  } catch (error) {
    logger.error('Search meetings error:', error.message);
    throw error;
  }
}

async function updateMeeting(meetingId, userId, updates) {
  try {
    const allowedUpdates = {};
    if (updates.title !== undefined) allowedUpdates.title = updates.title;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;
    if (updates.category) allowedUpdates.category = updates.category;

    if (updates.shareToken !== undefined) allowedUpdates.shareToken = updates.shareToken;
    if (updates.shareEnabled !== undefined) allowedUpdates.shareEnabled = updates.shareEnabled;
    if (updates.sharedAt !== undefined) allowedUpdates.sharedAt = updates.sharedAt;

    const updatedMeeting = await prisma.meeting.updateMany({
      where: {
        id: meetingId,
        userId,
      },
      data: allowedUpdates,
    });

    if (updatedMeeting.count === 0) {
      return null;
    }

    return await getMeetingById(meetingId, userId);
  } catch (error) {
    logger.error('Update meeting error:', error.message);
    throw error;
  }
}

async function deleteMeeting(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (meeting.audioUrl) {
      try {
        if (meeting.audioUrl.startsWith('http')) {
          const result = await supabaseStorage.deleteAudioFromSupabase(meeting.audioUrl);
          if (result.success) {
            console.log(`✅ Deleted audio from Supabase: ${meeting.audioUrl}`);
          } else {
            logger.warn(`⚠️ Could not delete from Supabase: ${result.error}`);
          }
        } else {
          await fs.unlink(meeting.audioUrl);
          console.log(`✅ Deleted local audio file: ${meeting.audioUrl}`);
        }
      } catch (error) {
        logger.warn(`⚠️ Could not delete audio file: ${error.message}`);
      }
    }

    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    console.log(`✅ Meeting deleted: ${meetingId}`);
  } catch (error) {
    logger.error('Delete meeting error:', error.message);
    throw error;
  }
}

async function getMeetingStatistics(userId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalMeetings,
      completedMeetings,
      processingMeetings,
      failedMeetings,
      totalDuration,
      actionItemsStatus,
      meetingsLast30Days,
      categoryCounts,
      recentMeetings,
    ] = await Promise.all([
      prisma.meeting.count({ where: { userId } }),
      prisma.meeting.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.meeting.count({
        where: {
          userId,
          status: {
            in: ['UPLOADING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING'],
          },
        },
      }),
      prisma.meeting.count({ where: { userId, status: 'FAILED' } }),
      prisma.meeting.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { audioDuration: true },
      }),
      prisma.actionItem.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      prisma.meeting.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          createdAt: true,
          nlpSentimentScore: true,
          nlpEntities: true,
          audioDuration: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      prisma.meeting.groupBy({
        by: ['category'],
        where: { userId, status: 'COMPLETED' },
        _count: true,
      }),
      prisma.meeting.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const totalItems = actionItemsStatus.reduce((acc, item) => acc + item._count, 0);
    const doneItems = actionItemsStatus.find((item) => item.status === 'DONE')?._count || 0;
    const productivityScore = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    const sentimentTrend = [];
    const entityCounts = {};
    const dailyData = {};

    meetingsLast30Days.forEach((meeting) => {
      const date = meeting.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { sum: 0, count: 0 };
      }
      if (meeting.nlpSentimentScore !== null && meeting.nlpSentimentScore !== undefined) {
        dailyData[date].sum += meeting.nlpSentimentScore;
        dailyData[date].count += 1;
      }

      if (meeting.nlpEntities) {
        const entities = meeting.nlpEntities.split(',').map((e) => e.trim());
        entities.forEach((entity) => {
          if (entity && entity !== 'None') {
            entityCounts[entity] = (entityCounts[entity] || 0) + 1;
          }
        });
      }
    });

    Object.keys(dailyData)
      .sort()
      .forEach((date) => {
        sentimentTrend.push({
          date,
          score:
            dailyData[date].count > 0
              ? parseFloat((dailyData[date].sum / dailyData[date].count).toFixed(2))
              : 0,
        });
      });

    const topEntities = Object.entries(entityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const result = {
      overview: {
        total: totalMeetings,
        completed: completedMeetings,
        processing: processingMeetings,
        failed: failedMeetings,
      },
      byCategory: categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {}),
      metrics: {
        totalDuration: totalDuration._sum.audioDuration || 0,
        averageDuration:
          completedMeetings > 0
            ? Math.round((totalDuration._sum.audioDuration || 0) / completedMeetings)
            : 0,
        recentActivity: recentMeetings,
        productivityScore,
      },
      sentimentTrend,
      topEntities,
    };

    return result;
  } catch (error) {
    logger.error('Get meeting statistics error:', error.message);
    throw error;
  }
}

async function regenerateSummary(meetingId, userId, options = {}) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
        status: 'COMPLETED',
      },
    });

    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found or not completed',
      };
    }

    console.log(`🔄 Regenerating summary for meeting: ${meetingId}`);

    const summaryResult = await summarizationService.regenerateSummary(
      meeting.transcriptText,
      {
        title: meeting.title,
        category: meeting.category,
        duration: meeting.audioDuration,
      },
      options
    );

    if (!summaryResult.success) {
      throw new Error(`Summary regeneration failed: ${summaryResult.error}`);
    }

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        summaryExecutive: summaryResult.summary.executiveSummary,
        summaryKeyDecisions: JSON.stringify(summaryResult.summary.keyDecisions),
        summaryActionItems: summaryResult.summary.actionItems,
        summaryNextSteps: JSON.stringify(summaryResult.summary.nextSteps),
        summaryKeyTopics: summaryResult.summary.keyTopics,
        summarySentiment: summaryResult.summary.sentiment,
      },
    });

    console.log(`✅ Summary regenerated successfully`);

    return {
      success: true,
      data: updatedMeeting,
    };
  } catch (error) {
    logger.error('Regenerate summary error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function getTranscript(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      select: {
        transcriptText: true,
        transcriptWordCount: true,
        status: true,
      },
    });

    if (!meeting) {
      return null;
    }

    if (!meeting.transcriptText) {
      return null;
    }

    return {
      text: meeting.transcriptText,
      wordCount: meeting.transcriptWordCount || meeting.transcriptText.split(/\s+/).length,
    };
  } catch (error) {
    logger.error('Get transcript error:', error.message);
    throw error;
  }
}

async function getSummary(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      include: {
        actionItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!meeting) {
      return null;
    }

    if (!meeting.summaryExecutive) {
      return null;
    }

    return {
      executiveSummary: meeting.summaryExecutive,
      keyDecisions: deserializeArrayField(meeting.summaryKeyDecisions),
      actionItems:
        meeting.actionItems.length > 0 ? meeting.actionItems : meeting.summaryActionItems || [],
      nextSteps: deserializeArrayField(meeting.summaryNextSteps),
      keyTopics: meeting.summaryKeyTopics || [],
      sentiment: meeting.summarySentiment,
    };
  } catch (error) {
    logger.error('Get summary error:', error.message);
    throw error;
  }
}

async function getMeetingWithNLP(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      select: {
        id: true,
        title: true,
        category: true,
        transcriptText: true,
        transcriptWordCount: true,
        nlpEntities: true,
        nlpActionPatterns: true,
        nlpSentiment: true,
        nlpSentimentScore: true,
        summaryExecutive: true,
        summaryKeyDecisions: true,
        summaryActionItems: true,
        summaryNextSteps: true,
        summaryKeyTopics: true,
        summarySentiment: true,
        createdAt: true,
      },
    });

    if (!meeting) {
      return null;
    }

    const response = {
      transcript: meeting.transcriptText
        ? `MEETING TRANSCRIPT:\n${meeting.transcriptText}\n\nNLP FEATURES:\n**Entities:** ${meeting.nlpEntities || 'None'}\n\n**Action Patterns:**\n  • ${meeting.nlpActionPatterns || 'None'}\n\n**Sentiment:** ${meeting.nlpSentiment || 'Unknown'} (polarity: ${meeting.nlpSentimentScore || 0})`
        : null,
      summary: {
        executiveSummary: meeting.summaryExecutive,
        keyDecisions: deserializeArrayField(meeting.summaryKeyDecisions),
        actionItems: meeting.summaryActionItems || [],
        nextSteps: deserializeArrayField(meeting.summaryNextSteps),
        keyTopics: meeting.summaryKeyTopics || [],
        sentiment: meeting.summarySentiment,
      },
    };

    return response;
  } catch (error) {
    logger.error('Get meeting with NLP error:', error.message);
    throw error;
  }
}

async function getAudioDownloadUrl(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      select: {
        audioUrl: true,
        title: true,
        audioSize: true,
      },
    });

    if (!meeting || !meeting.audioUrl) {
      return null;
    }

    if (meeting.audioUrl.startsWith('http')) {
      return {
        url: meeting.audioUrl,
        filename: `${meetingId}.wav`,
        size: meeting.audioSize || null,
        isRemote: true,
        expiresAt: null,
      };
    } else {
      try {
        const stats = await fs.stat(meeting.audioUrl);

        return {
          url: meeting.audioUrl,
          filename: path.basename(meeting.audioUrl),
          size: stats.size,
          isRemote: false,
          expiresAt: null,
        };
      } catch (error) {
        logger.warn('Audio file not found:', meeting.audioUrl);
        return null;
      }
    }
  } catch (error) {
    logger.error('Get audio download URL error:', error.message);
    throw error;
  }
}

async function getProcessingStatus(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
        processingError: true,
        processingStartedAt: true,
        processingCompletedAt: true,
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const statusProgress = {
      UPLOADING: 10,
      PROCESSING_AUDIO: 25,
      TRANSCRIBING: 50,
      PROCESSING_NLP: 75,
      SUMMARIZING: 90,
      COMPLETED: 100,
      FAILED: 0,
    };

    const statusTimeEstimates = {
      UPLOADING: 85,
      PROCESSING_AUDIO: 80,
      TRANSCRIBING: 60,
      PROCESSING_NLP: 10,
      SUMMARIZING: 5,
      COMPLETED: 0,
      FAILED: 0,
    };

    const stageDescriptions = {
      UPLOADING: 'Uploading audio file',
      PROCESSING_AUDIO: 'Optimizing audio quality',
      TRANSCRIBING: 'Converting speech to text',
      PROCESSING_NLP: 'Extracting key information',
      SUMMARIZING: 'Generating AI summary',
      COMPLETED: 'Processing complete',
      FAILED: 'Processing failed',
    };

    return {
      status: meeting.status,
      progress: statusProgress[meeting.status] || 0,
      estimatedTimeRemaining: statusTimeEstimates[meeting.status] || 0,
      currentStage: stageDescriptions[meeting.status] || 'Unknown',
      startedAt: meeting.processingStartedAt || meeting.createdAt,
      updatedAt: meeting.updatedAt,
      completedAt: meeting.processingCompletedAt,
      error: meeting.processingError || null,
    };
  } catch (error) {
    logger.error('Get processing status error:', error.message);
    throw error;
  }
}

async function updateMeetingStatus(meetingId, status, errorMessage = null) {
  try {
    const updateData = { status };

    if (errorMessage) {
      updateData.processingError = errorMessage;
    }

    if (status === 'PROCESSING_AUDIO' && !errorMessage) {
      updateData.processingStartedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.processingCompletedAt = new Date();
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData,
    });
    console.log(`📊 Meeting status updated: ${status}`);
  } catch (error) {
    logger.error('Update status error:', error.message);
  }
}

async function storeAudioFile(tempPath, meetingId) {
  try {
    if (supabaseStorage.isSupabaseConfigured()) {
      console.log('📤 Uploading audio to Supabase Storage...');
      const result = await supabaseStorage.uploadAudioToSupabase(tempPath, meetingId);

      if (result.success) {
        console.log(`✅ Audio uploaded to Supabase: ${result.url}`);
        return result.url;
      } else {
        logger.warn(`⚠️ Supabase upload failed: ${result.error}. Falling back to local storage.`);
      }
    }

    console.log('📁 Using local storage for audio file...');
    const storageDir = path.join(process.cwd(), 'storage', 'audio');
    await fs.mkdir(storageDir, { recursive: true });

    const extension = path.extname(tempPath);
    const filename = `${meetingId}${extension}`;
    const storagePath = path.join(storageDir, filename);

    await fs.copyFile(tempPath, storagePath);

    console.log(`✅ Audio file stored locally: ${storagePath}`);

    return storagePath;
  } catch (error) {
    logger.error('Store audio file error:', error.message);
    throw error;
  }
}

async function getGlobalDecisions(userId) {
  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        summaryKeyDecisions: { not: null },
      },
      select: {
        id: true,
        title: true,
        summaryKeyDecisions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const allDecisions = [];
    meetings.forEach((m) => {
      const decisions = deserializeArrayField(m.summaryKeyDecisions);
      if (Array.isArray(decisions)) {
        decisions.forEach((d, index) => {
          allDecisions.push({
            id: `${m.id}-dec-${index}`,
            decision: typeof d === 'string' ? d : d.decision || d.text || JSON.stringify(d),
            meetingId: m.id,
            meetingTitle: m.title,
            createdAt: m.createdAt,
          });
        });
      }
    });

    return allDecisions;
  } catch (error) {
    logger.error('Get global decisions error:', error.message);
    throw error;
  }
}

async function cleanupTempFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Cleaned up temp file: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Could not delete temp file ${filePath}: ${error.message}`);
    }
  }
}

module.exports = {
  createMeeting,
  createAndProcessMeeting,
  uploadAndProcessAudio,
  getMeetingById,
  getMeetings: getUserMeetings,
  getUserMeetings,
  updateMeeting,
  deleteMeeting,

  searchMeetings,

  getTranscript,
  getSummary,
  getMeetingWithNLP,
  getAudioDownloadUrl,

  getProcessingStatus,
  getMeetingStatistics,
  getUserMeetingStats: getMeetingStatistics,
  updateMeetingStatus,

  regenerateSummary,
  getGlobalDecisions,

  transformMeetingForFrontend,
  deserializeArrayField,
};
