const { prisma } = require('../config/database');
const audioService = require('./audio.service');
const transcriptionService = require('./transcription.service');
const nlpService = require('./nlp.service');
const summarizationService = require('./summarization.service');
const emailService = require('./email.service');
const supabaseStorage = require('./supabase-storage.service');
const slackService = require('./slack.service');
const path = require('path');
const fs = require('fs').promises;
const { getStats, setStats, invalidateUserStats } = require('../utils/statsCache');

/**
 * Helper function to deserialize JSON string fields back to arrays
 * Used for keyDecisions and nextSteps which are stored as JSON strings in the database
 * @param {string|Array} value - The value from database (JSON string or already parsed array)
 * @returns {Array|null} Parsed array or original value
 */
function deserializeArrayField(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Failed to parse JSON array:', e);
      return value; // Return original if parse fails
    }
  }
  return value; // Already an array or other value
}

/**
 * Create new meeting without audio (separate from processing)
 * @param {Object} params - Meeting parameters
 * @param {string} params.userId - User ID
 * @param {string} params.title - Meeting title
 * @param {string} params.description - Meeting description (optional)
 * @param {string} params.category - Meeting category (SALES, PLANNING, etc.)
 * @returns {Promise<Object>} Created meeting object
 */
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
    invalidateUserStats(userId);

    return meeting;
  } catch (error) {
    console.error('Create meeting error:', error.message);
    throw error;
  }
}

/**
 * Upload and process audio for existing meeting
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @param {Object} audioFile - Uploaded audio file object
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
async function uploadAndProcessAudio(meetingId, userId, audioFile, options = {}) {
  let tempPath = null;

  try {
    console.log(`\n🎬 Starting audio processing for meeting: ${meetingId}`);

    // Verify meeting exists and belongs to user
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

    // With multer, file is already saved to disk
    // audioFile can be either req.uploadedFile (after validateAudioFile) or req.file
    tempPath = audioFile.path; // Multer saves file here
    const originalFileName = audioFile.originalname || audioFile.filename;

    console.log(`📁 Audio file saved: ${originalFileName} at ${tempPath}`);

    // Step 1: Update status to PROCESSING_AUDIO
    await updateMeetingStatus(meetingId, 'PROCESSING_AUDIO');

    // Step 2: Process audio (noise reduction + optimization)
    console.log(`\n🔊 Step 1/4: Processing audio...`);
    const audioResult = await audioService.processAudioFile(tempPath);

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    const processedAudioPath = audioResult.outputPath;
    const audioDuration = audioResult.duration;

    console.log(`✅ Audio processed: ${audioDuration}s duration`);

    // Step 3: Transcribe audio using Deepgram
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

    // Step 4: Process transcript with NLP (SpaCy)
    await updateMeetingStatus(meetingId, 'PROCESSING_NLP');
    console.log(`\n🧠 Step 3/4: Processing NLP...`);
    const nlpResult = await nlpService.processMeetingTranscript(diarizedTranscriptText);

    if (!nlpResult.success) {
      console.warn(`⚠️ NLP processing failed: ${nlpResult.error}`);
    }

    console.log(
      `✅ NLP complete: ${nlpResult.entities?.length || 0} entities, ${nlpResult.svoTriplets?.length || 0} SVOs, ${nlpResult.actionSignals?.length || 0} action signals, ${nlpResult.questions?.length || 0} questions`
    );

    // Step 5: Generate AI summary using Groq
    await updateMeetingStatus(meetingId, 'SUMMARIZING');
    console.log(`\n🤖 Step 4/4: Generating summary...`);
    const summaryResult = await summarizationService.generateSummary(diarizedTranscriptText, {
      title: meeting.title,
      category: meeting.category,
      duration: audioDuration,
      // SpaCy NLP features
      entities: nlpResult.success ? nlpResult.entities : [],
      svoTriplets: nlpResult.success ? nlpResult.svoTriplets : [],
      actionSignals: nlpResult.success ? nlpResult.actionSignals : [],
      questions: nlpResult.success ? nlpResult.questions : [],
      speakerEntityMap: nlpResult.success ? nlpResult.speakerEntityMap : {},
      nlpMetadata: nlpResult.success ? nlpResult.nlpMetadata : {},
      // Deepgram native intelligence (high-confidence ASR-derived data)
      deepgramEntities,
      deepgramTopics,
      deepgramIntents,
      lowConfidenceWords,
    });

    if (!summaryResult.success) {
      throw new Error(`Summary generation failed: ${summaryResult.error}`);
    }

    // Extract summary fields (they're at top level of summaryResult, not nested)
    const summary = {
      executiveSummary: summaryResult.executiveSummary,
      keyDecisions: summaryResult.keyDecisions,
      actionItems: summaryResult.actionItems,
      nextSteps: summaryResult.nextSteps,
      keyTopics: summaryResult.keyTopics,
      sentiment: summaryResult.sentiment,
    };

    // Enhance summary with NLP data if available
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

    // Step 6: Store processed audio in permanent location
    const audioStoragePath = await storeAudioFile(processedAudioPath, meetingId);

    // Step 7: Update meeting with all processed data
    const wordCount = transcript.split(/\s+/).length;

    // Extract audio metadata
    const audioFormat =
      path
        .extname(audioFile.originalname || audioFile.filename)
        .toLowerCase()
        .replace('.', '') || 'unknown';

    // Calculate processing duration
    const processingEndTime = new Date();
    const processingDurationSeconds = meeting.processingStartedAt
      ? Math.round((processingEndTime - new Date(meeting.processingStartedAt)) / 1000)
      : null;

    // Format NLP data to match dataset structure
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

        // NLP Features
        nlpEntities: nlpEntitiesText,
        nlpActionPatterns: nlpActionPatternsText,
        // Sentiment is now derived from Groq summary output (authoritative, full-context)
        nlpSentiment: enhancedSummary.sentiment || null,
        nlpSentimentScore: null,

        // Summary fields - serialize arrays to JSON strings for text fields
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

        // Processing timestamps
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

    // --- NEW: Create relational Action Items ---
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
    }

    // Step 8: Clean up temporary files
    await cleanupTempFiles([tempPath, processedAudioPath]);

    // Step 9: Send completion email to user
    try {
      console.log(`\n📧 Sending completion email...`);
      await emailService.sendMeetingCompletedEmail({
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
      });

      console.log(`✅ Email sent to ${meeting.user.email}`);

      // Update email tracking fields
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
        },
      });
    } catch (emailError) {
      console.error(`⚠️ Email send failed:`, emailError.message);
      // Don't fail the entire processing if email fails
      // Meeting is still marked as COMPLETED
    }

    // --- NEW: Send Slack Notification ---
    try {
      const userWithWebhook = await prisma.user.findUnique({
        where: { id: userId },
        select: { slackWebhookUrl: true },
      });
      if (userWithWebhook && userWithWebhook.slackWebhookUrl) {
        console.log(`\n💬 Sending Slack notification...`);
        await slackService.sendMeetingCompletedNotification(
          userWithWebhook.slackWebhookUrl,
          updatedMeeting
        );
      }
    } catch (slackError) {
      console.error(`⚠️ Slack send failed:`, slackError.message);
    }

    console.log(`\n🎉 Meeting processing complete! ID: ${meetingId}\n`);

    return updatedMeeting;
  } catch (error) {
    console.error(`\n❌ Meeting processing failed:`, error.message);

    // Update meeting status to FAILED
    await updateMeetingStatus(meetingId, 'FAILED', error.message);

    // Clean up temp file if exists and not keeping it for retries
    if (tempPath && !options.keepTempOnError) {
      await cleanupTempFiles([tempPath]);
    }

    // Send failure email
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

/**
 * Create new meeting and process audio through complete pipeline
 * @param {Object} params - Meeting parameters
 * @param {string} params.userId - User ID
 * @param {string} params.title - Meeting title
 * @param {string} params.category - Meeting category (SALES, PLANNING, etc.)
 * @param {string} params.audioPath - Path to uploaded audio file
 * @param {string} params.originalFilename - Original filename
 * @returns {Promise<Object>} Created meeting object
 */
async function createAndProcessMeeting({ userId, title, category, audioPath, originalFilename }) {
  let meeting = null;

  try {
    console.log(`\n🎬 Starting meeting processing pipeline for: ${title}`);
    console.log(`📁 Audio file: ${originalFilename}`);

    // Step 1: Create meeting record with UPLOADING status
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

    // Step 2: Update status to PROCESSING_AUDIO
    await updateMeetingStatus(meeting.id, 'PROCESSING_AUDIO');

    // Step 3: Process audio (noise reduction + optimization)
    console.log(`\n🔊 Step 1/4: Processing audio...`);
    const audioResult = await audioService.processAudioFile(audioPath);

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    const processedAudioPath = audioResult.outputPath;
    const audioDuration = audioResult.duration;

    console.log(`✅ Audio processed: ${audioDuration}s duration`);

    // Step 4: Transcribe audio using Deepgram
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

    // Step 5: Process transcript with NLP (SpaCy)
    await updateMeetingStatus(meeting.id, 'PROCESSING_NLP');
    console.log(`\n🧠 Step 3/4: Processing NLP...`);
    const nlpResult = await nlpService.processMeetingTranscript(diarizedTranscriptText);

    if (!nlpResult.success) {
      console.warn(`⚠️ NLP processing failed: ${nlpResult.error}`);
      // Continue without NLP data (not critical)
    }

    console.log(
      `✅ NLP complete: ${nlpResult.entities?.length || 0} entities, ${nlpResult.svoTriplets?.length || 0} SVOs, ${nlpResult.actionSignals?.length || 0} action signals, ${nlpResult.questions?.length || 0} questions`
    );

    // Step 6: Generate AI summary using Groq
    await updateMeetingStatus(meeting.id, 'SUMMARIZING');
    console.log(`\n🤖 Step 4/4: Generating summary...`);
    const summaryResult = await summarizationService.generateSummary(diarizedTranscriptText, {
      title,
      category,
      audioDuration,
      // SpaCy NLP features
      entities: nlpResult.success ? nlpResult.entities : [],
      svoTriplets: nlpResult.success ? nlpResult.svoTriplets : [],
      actionSignals: nlpResult.success ? nlpResult.actionSignals : [],
      questions: nlpResult.success ? nlpResult.questions : [],
      speakerEntityMap: nlpResult.success ? nlpResult.speakerEntityMap : {},
      nlpMetadata: nlpResult.success ? nlpResult.nlpMetadata : {},
      // Deepgram native intelligence
      deepgramEntities,
      deepgramTopics,
      deepgramIntents,
      lowConfidenceWords,
    });

    if (!summaryResult.success) {
      throw new Error(`Summary generation failed: ${summaryResult.error}`);
    }

    // Extract summary fields (they're at top level of summaryResult, not nested)
    const summary = {
      executiveSummary: summaryResult.executiveSummary,
      keyDecisions: summaryResult.keyDecisions,
      actionItems: summaryResult.actionItems,
      nextSteps: summaryResult.nextSteps,
      keyTopics: summaryResult.keyTopics,
      sentiment: summaryResult.sentiment,
    };

    // Enhance summary with NLP data if available
    const enhancedSummary = nlpResult.success
      ? summarizationService.enhanceSummaryWithNLP(summary, nlpResult)
      : summary;

    console.log(
      `✅ Summary generated with ${enhancedSummary.actionItems?.length || 0} action items`
    );

    // Step 7: Store processed audio in permanent location
    const audioStoragePath = await storeAudioFile(processedAudioPath, meeting.id);

    // Step 8: Update meeting with all processed data
    const wordCount = transcript.split(/\s+/).length;

    // Format NLP data to match dataset structure
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

        // NLP Features
        nlpEntities: nlpEntitiesText,
        nlpActionPatterns: nlpActionPatternsText,
        // Sentiment from Groq summary output (authoritative, full-context)
        nlpSentiment: enhancedSummary.sentiment || null,
        nlpSentimentScore: null,

        // Summary fields - serialize arrays to JSON strings for text fields
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

    // --- NEW: Create relational Action Items ---
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
    }

    // Step 9: Clean up temporary files
    await cleanupTempFiles([audioPath, processedAudioPath]);

    // Step 10: Send completion email to user
    console.log(`\n📧 Sending completion email...`);
    await emailService.sendMeetingCompletedEmail({
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
    });

    console.log(`✅ Email sent to ${meeting.user.email}`);

    // --- NEW: Send Slack Notification ---
    try {
      const userWithWebhook = await prisma.user.findUnique({
        where: { id: userId },
        select: { slackWebhookUrl: true },
      });
      if (userWithWebhook && userWithWebhook.slackWebhookUrl) {
        console.log(`\n💬 Sending Slack notification...`);
        await slackService.sendMeetingCompletedNotification(
          userWithWebhook.slackWebhookUrl,
          meeting
        );
      }
    } catch (slackError) {
      console.error(`⚠️ Slack send failed:`, slackError.message);
    }

    console.log(`\n🎉 Meeting processing complete! ID: ${meeting.id}\n`);

    return {
      success: true,
      data: meeting,
    };
  } catch (error) {
    console.error(`\n❌ Meeting processing failed:`, error.message);

    // Update meeting status to FAILED if meeting was created
    if (meeting) {
      await updateMeetingStatus(meeting.id, 'FAILED', error.message);

      // Send failure email
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

    // Clean up temp file if exists
    if (audioPath) {
      await cleanupTempFiles([audioPath]);
    }

    return {
      success: false,
      error: error.message,
      meetingId: meeting?.id,
    };
  }
}

/**
 * Transform meeting data from database format to frontend format
 * @param {Object} meeting - Raw meeting from database
 * @returns {Object} Transformed meeting
 */
function transformMeetingForFrontend(meeting) {
  if (!meeting) return null;

  return {
    ...meeting,
    // Map transcript fields
    transcript: meeting.transcriptText || null,
    transcriptSegments: meeting.transcriptSegments || null,
    speakerMap: meeting.speakerMap || {},

    // Map duration field
    duration: meeting.audioDuration || null,

    // Combine summary fields into single object - deserialize JSON strings back to arrays
    summary:
      meeting.summaryExecutive ||
      meeting.summaryKeyDecisions ||
      meeting.summaryActionItems ||
      meeting.summaryNextSteps
        ? {
            executiveSummary: meeting.summaryExecutive,
            keyDecisions: deserializeArrayField(meeting.summaryKeyDecisions),
            actionItems: meeting.summaryActionItems,
            nextSteps: deserializeArrayField(meeting.summaryNextSteps),
            keyTopics: meeting.summaryKeyTopics,
            sentiment: meeting.summarySentiment,
          }
        : null,
  };
}

/**
 * Get meeting by ID with user validation
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object|null>} Meeting object or null if not found
 */
async function getMeetingById(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId, // Ensure user can only access their own meetings
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!meeting) return null;

    // Transform meeting data for frontend
    return transformMeetingForFrontend(meeting);
  } catch (error) {
    console.error('Get meeting error:', error.message);
    throw error;
  }
}

/**
 * Get all meetings for a user with filters
 * @param {Object} params - Query parameters
 * @param {string} params.userId - User ID
 * @param {string} params.category - Filter by category (optional)
 * @param {string} params.status - Filter by status (optional)
 * @param {string} params.search - Search in title/transcript (optional)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 10)
 * @returns {Promise<Object>} Paginated meetings list
 */
async function getUserMeetings({ userId, category, status, search, page = 1, limit = 10 }) {
  try {
    const skip = (page - 1) * limit;

    // Build where clause
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
        { transcript: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Run count and findMany in parallel — they are independent queries
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

    // Transform meetings for frontend
    const transformedMeetings = meetings.map((m) => transformMeetingForFrontend(m));

    return {
      meetings: transformedMeetings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Get user meetings error:', error.message);
    throw error;
  }
}

/**
 * Search meetings by keyword in title or transcript
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {Object} options - Search options (category, limit)
 * @returns {Promise<Array>} Search results
 */
async function searchMeetings(userId, query, options = {}) {
  try {
    const where = {
      userId,
      status: 'COMPLETED', // Only search completed meetings
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { transcriptText: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Add category filter if provided
    if (options.category && options.category !== 'ALL') {
      where.category = options.category;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20, // Limit search results
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        audioDuration: true,
        transcriptText: true, // Include for highlighting matches
      },
    });

    return meetings.map((meeting) => ({
      ...meeting,
      transcriptText: meeting.transcriptText?.substring(0, 200) + '...', // Preview only
    }));
  } catch (error) {
    console.error('Search meetings error:', error.message);
    throw error;
  }
}

/**
 * Update meeting metadata (title, category, description)
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated meeting
 */
async function updateMeeting(meetingId, userId, updates) {
  try {
    // Only allow updating title, description, and category
    const allowedUpdates = {};
    if (updates.title !== undefined) allowedUpdates.title = updates.title;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;
    if (updates.category) allowedUpdates.category = updates.category;

    const updatedMeeting = await prisma.meeting.updateMany({
      where: {
        id: meetingId,
        userId, // Ensure user owns this meeting
      },
      data: allowedUpdates,
    });

    if (updatedMeeting.count === 0) {
      return null; // Meeting not found or unauthorized
    }

    invalidateUserStats(userId);

    // Return the updated meeting
    return await getMeetingById(meetingId, userId);
  } catch (error) {
    console.error('Update meeting error:', error.message);
    throw error;
  }
}

/**
 * Delete meeting and associated files
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function deleteMeeting(meetingId, userId) {
  try {
    // Get meeting to delete associated files
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Delete audio file if exists
    if (meeting.audioUrl) {
      try {
        // Check if it's a Supabase URL or local path
        if (meeting.audioUrl.startsWith('http')) {
          // Supabase URL - delete from cloud storage
          const result = await supabaseStorage.deleteAudioFromSupabase(meeting.audioUrl);
          if (result.success) {
            console.log(`✅ Deleted audio from Supabase: ${meeting.audioUrl}`);
          } else {
            console.warn(`⚠️ Could not delete from Supabase: ${result.error}`);
          }
        } else {
          // Local file path - delete from filesystem
          await fs.unlink(meeting.audioUrl);
          console.log(`✅ Deleted local audio file: ${meeting.audioUrl}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not delete audio file: ${error.message}`);
      }
    }

    // Delete meeting record
    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    console.log(`✅ Meeting deleted: ${meetingId}`);
    invalidateUserStats(userId);
  } catch (error) {
    console.error('Delete meeting error:', error.message);
    throw error;
  }
}

/**
 * Get meeting statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Statistics
 */
async function getMeetingStatistics(userId) {
  try {
    const cacheKey = `meeting-stats:${userId}`;
    const cached = getStats(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // All queries run in parallel — 0 serial DB round-trips
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
      // Previously serial — now parallel
      prisma.meeting.groupBy({
        by: ['category'],
        where: { userId, status: 'COMPLETED' },
        _count: true,
      }),
      prisma.meeting.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    // Calculate productivity score: (Done Items / Total Items) * 100
    const totalItems = actionItemsStatus.reduce((acc, item) => acc + item._count, 0);
    const doneItems = actionItemsStatus.find((item) => item.status === 'DONE')?._count || 0;
    const productivityScore = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    // Process Sentiment Trends & Entities
    const sentimentTrend = [];
    const entityCounts = {};
    const dailyData = {};

    meetingsLast30Days.forEach((meeting) => {
      const date = meeting.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { sum: 0, count: 0 };
      }
      if (meeting.nlpSentimentScore !== null) {
        dailyData[date].sum += meeting.nlpSentimentScore;
        dailyData[date].count += 1;
      }

      // Aggregate Entities
      if (meeting.nlpEntities) {
        const entities = meeting.nlpEntities.split(',').map((e) => e.trim());
        entities.forEach((entity) => {
          if (entity && entity !== 'None') {
            entityCounts[entity] = (entityCounts[entity] || 0) + 1;
          }
        });
      }
    });

    // Fill in sentiment trend array
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

    // Sort and limit top entities
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

    setStats(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Get meeting statistics error:', error.message);
    throw error;
  }
}

/**
 * Regenerate summary for existing meeting
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @param {Object} options - Summary generation options
 * @returns {Promise<Object>} Updated meeting with new summary
 */
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

    // Generate new summary
    const summaryResult = await summarizationService.regenerateSummary(
      meeting.transcript,
      {
        title: meeting.title,
        category: meeting.category,
        duration: meeting.duration,
      },
      options
    );

    if (!summaryResult.success) {
      throw new Error(`Summary regeneration failed: ${summaryResult.error}`);
    }

    // Update meeting
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        summary: summaryResult.summary,
      },
    });

    console.log(`✅ Summary regenerated successfully`);

    return {
      success: true,
      data: updatedMeeting,
    };
  } catch (error) {
    console.error('Regenerate summary error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get meeting transcript
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Transcript data
 */
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
    console.error('Get transcript error:', error.message);
    throw error;
  }
}

/**
 * Get meeting summary
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Summary data
 */
async function getSummary(meetingId, userId) {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      select: {
        summaryExecutive: true,
        summaryKeyDecisions: true,
        summaryActionItems: true,
        summaryNextSteps: true,
        summaryKeyTopics: true,
        summarySentiment: true,
        status: true,
        title: true,
        category: true,
        createdAt: true,
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
      actionItems: meeting.summaryActionItems || [],
      nextSteps: deserializeArrayField(meeting.summaryNextSteps),
      keyTopics: meeting.summaryKeyTopics || [],
      sentiment: meeting.summarySentiment,
    };
  } catch (error) {
    console.error('Get summary error:', error.message);
    throw error;
  }
}

/**
 * Get full meeting data with NLP features formatted like dataset
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Complete meeting data in dataset format
 */
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
        nlpKeyPhrases: true,
        nlpActionPatterns: true,
        nlpSentiment: true,
        nlpSentimentScore: true,
        nlpTopics: true,
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

    // Format the response to match dataset structure
    const response = {
      transcript: meeting.transcriptText
        ? `MEETING TRANSCRIPT:\n${meeting.transcriptText}\n\nNLP FEATURES:\n**Entities:** ${meeting.nlpEntities || 'None'}\n\n**Key Phrases:** ${meeting.nlpKeyPhrases || 'None'}\n\n**Action Patterns:**\n  • ${meeting.nlpActionPatterns || 'None'}\n\n**Sentiment:** ${meeting.nlpSentiment || 'Unknown'} (polarity: ${meeting.nlpSentimentScore || 0})\n\n**Topics:** ${meeting.nlpTopics ? meeting.nlpTopics.join(', ') : 'None'}`
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
    console.error('Get meeting with NLP error:', error.message);
    throw error;
  }
}

/**
 * Get audio download URL for meeting
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Audio download info
 */
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

    // Check if it's a Supabase URL or local path
    if (meeting.audioUrl.startsWith('http')) {
      // Supabase URL - return directly or get signed URL
      return {
        url: meeting.audioUrl,
        filename: `${meetingId}.wav`,
        size: meeting.audioSize || null,
        isRemote: true,
        expiresAt: null, // Public URL, no expiration
      };
    } else {
      // Local file - check if exists
      try {
        const stats = await fs.stat(meeting.audioUrl);

        return {
          url: meeting.audioUrl,
          filename: path.basename(meeting.audioUrl),
          size: stats.size,
          isRemote: false,
          expiresAt: null, // Local file, no expiration
        };
      } catch (error) {
        console.warn('Audio file not found:', meeting.audioUrl);
        return null;
      }
    }
  } catch (error) {
    console.error('Get audio download URL error:', error.message);
    throw error;
  }
}

/**
 * Get processing status for meeting
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Processing status
 */
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

    // Calculate progress percentage based on status
    const statusProgress = {
      UPLOADING: 10,
      PROCESSING_AUDIO: 25,
      TRANSCRIBING: 50,
      PROCESSING_NLP: 75,
      SUMMARIZING: 90,
      COMPLETED: 100,
      FAILED: 0,
    };

    // Estimate time remaining (rough estimates in seconds)
    const statusTimeEstimates = {
      UPLOADING: 85,
      PROCESSING_AUDIO: 80,
      TRANSCRIBING: 60,
      PROCESSING_NLP: 10,
      SUMMARIZING: 5,
      COMPLETED: 0,
      FAILED: 0,
    };

    // Current stage descriptions
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
    console.error('Get processing status error:', error.message);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update meeting status
 */
async function updateMeetingStatus(meetingId, status, errorMessage = null) {
  try {
    const updateData = { status };

    if (errorMessage) {
      updateData.processingError = errorMessage;
    }

    // Update processing timestamps
    if (status === 'PROCESSING_AUDIO' && !errorMessage) {
      updateData.processingStartedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.processingCompletedAt = new Date();
    }

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData,
      select: { userId: true },
    });
    console.log(`📊 Meeting status updated: ${status}`);
    if (updatedMeeting && updatedMeeting.userId) {
      invalidateUserStats(updatedMeeting.userId);
    }
  } catch (error) {
    console.error('Update status error:', error.message);
  }
}

/**
 * Store audio file in permanent location (Supabase or local fallback)
 */
async function storeAudioFile(tempPath, meetingId) {
  try {
    // Try uploading to Supabase Storage first
    if (supabaseStorage.isSupabaseConfigured()) {
      console.log('📤 Uploading audio to Supabase Storage...');
      const result = await supabaseStorage.uploadAudioToSupabase(tempPath, meetingId);

      if (result.success) {
        console.log(`✅ Audio uploaded to Supabase: ${result.url}`);
        return result.url; // Return Supabase public URL
      } else {
        console.warn(`⚠️ Supabase upload failed: ${result.error}. Falling back to local storage.`);
      }
    }

    // Fallback to local storage
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
    console.error('Store audio file error:', error.message);
    throw error;
  }
}

/**
 * Get all decisions across all meetings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of decisions with meeting context
 */
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
    });

    const allDecisions = [];
    meetings.forEach((m) => {
      const decisions = deserializeArrayField(m.summaryKeyDecisions);
      if (Array.isArray(decisions)) {
        decisions.forEach((d, index) => {
          allDecisions.push({
            id: `${m.id}-dec-${index}`, // Unique ID for keying
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
    console.error('Get global decisions error:', error.message);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
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
  // Meeting CRUD
  createMeeting,
  createAndProcessMeeting,
  uploadAndProcessAudio,
  getMeetingById,
  getMeetings: getUserMeetings, // Export as getMeetings to match controller
  getUserMeetings,
  updateMeeting,
  deleteMeeting,

  // Search and filters
  searchMeetings,

  // Content retrieval
  getTranscript,
  getSummary,
  getMeetingWithNLP, // Get meeting in dataset format
  getAudioDownloadUrl,

  // Status and stats
  getProcessingStatus,
  getMeetingStatistics,
  getUserMeetingStats: getMeetingStatistics, // Export as getUserMeetingStats to match controller
  updateMeetingStatus, // Needed by queue service

  // Advanced features
  regenerateSummary,
  getGlobalDecisions,
};
