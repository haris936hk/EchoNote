const { prisma } = require('../config/database');
const audioService = require('./audio.service');
const transcriptionService = require('./transcription.service');
const nlpService = require('./nlp.service');
const summarizationService = require('./summarization.service');
const emailService = require('./email.service');
const path = require('path');
const fs = require('fs').promises;

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
        audioDuration: null
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    console.log(`✅ Meeting created: ${meeting.id}`);

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
 * @returns {Promise<Object>} Processing result
 */
async function uploadAndProcessAudio(meetingId, userId, audioFile) {
  let tempPath = null;

  try {
    console.log(`\n🎬 Starting audio processing for meeting: ${meetingId}`);

    // Verify meeting exists and belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
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

    // Step 3: Transcribe audio using Whisper
    await updateMeetingStatus(meetingId, 'TRANSCRIBING');
    console.log(`\n📝 Step 2/4: Transcribing audio...`);
    const transcriptionResult = await transcriptionService.transcribeAudio(processedAudioPath);

    if (!transcriptionResult.success) {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    }

    const transcript = transcriptionResult.text;
    const transcriptionConfidence = transcriptionResult.confidence;

    console.log(`✅ Transcription complete: ${transcript.length} characters, ${transcriptionConfidence}% confidence`);

    // Step 4: Process transcript with NLP (SpaCy)
    await updateMeetingStatus(meetingId, 'PROCESSING_NLP');
    console.log(`\n🧠 Step 3/4: Processing NLP...`);
    const nlpResult = await nlpService.processMeetingTranscript(transcript);

    if (!nlpResult.success) {
      console.warn(`⚠️ NLP processing failed: ${nlpResult.error}`);
    }

    console.log(`✅ NLP complete: ${nlpResult.entities?.length || 0} entities, ${nlpResult.actionItems?.length || 0} actions`);

    // Step 5: Generate AI summary using Groq/Mistral
    await updateMeetingStatus(meetingId, 'SUMMARIZING');
    console.log(`\n🤖 Step 4/4: Generating summary...`);
    const summaryResult = await summarizationService.generateSummary(transcript, {
      title: meeting.title,
      category: meeting.category,
      duration: audioDuration
    });

    if (!summaryResult.success) {
      throw new Error(`Summary generation failed: ${summaryResult.error}`);
    }

    const summary = summaryResult.summary;

    // Enhance summary with NLP data if available
    const enhancedSummary = nlpResult.success
      ? summarizationService.enhanceSummaryWithNLP(summary, nlpResult)
      : summary;

    console.log(`✅ Summary generated with ${enhancedSummary.actionItems?.length || 0} action items`);

    // Step 6: Store processed audio in permanent location
    const audioStoragePath = await storeAudioFile(processedAudioPath, meetingId);

    // Step 7: Update meeting with all processed data
    const wordCount = transcript.split(/\s+/).length;

    // Format NLP data to match dataset structure
    const nlpEntitiesText = nlpResult.success && nlpResult.entities
      ? nlpResult.entities.map(e => `${e.text} (${e.label})`).join(', ')
      : null;

    const nlpKeyPhrasesText = nlpResult.success && nlpResult.keyPhrases
      ? nlpResult.keyPhrases.join(', ')
      : null;

    const nlpActionPatternsText = nlpResult.success && nlpResult.actionPatterns
      ? nlpResult.actionPatterns.map(a => `${a.action}: ${a.object}`).join('\n  • ')
      : null;

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        audioUrl: audioStoragePath,
        audioDuration,
        transcriptText: transcript,
        transcriptWordCount: wordCount,

        // NLP Features
        nlpEntities: nlpEntitiesText,
        nlpKeyPhrases: nlpKeyPhrasesText,
        nlpActionPatterns: nlpActionPatternsText,
        nlpSentiment: nlpResult.success ? nlpResult.sentiment?.label : null,
        nlpSentimentScore: nlpResult.success ? nlpResult.sentiment?.score : null,
        nlpTopics: nlpResult.success ? nlpResult.topics : null,

        // Summary fields
        summaryExecutive: enhancedSummary.executiveSummary || null,
        summaryKeyDecisions: enhancedSummary.keyDecisions || null,
        summaryActionItems: enhancedSummary.actionItems || null,
        summaryNextSteps: enhancedSummary.nextSteps || null,
        summaryKeyTopics: enhancedSummary.keyTopics || null,
        summarySentiment: enhancedSummary.sentiment || null,

        status: 'COMPLETED'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    console.log(`✅ Meeting updated in database`);

    // Step 8: Clean up temporary files
    await cleanupTempFiles([tempPath, processedAudioPath]);

    // Step 9: Send completion email to user
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
        summaryExecutive: updatedMeeting.summaryExecutive,
        summaryKeyDecisions: updatedMeeting.summaryKeyDecisions,
        summaryActionItems: updatedMeeting.summaryActionItems,
        summaryNextSteps: updatedMeeting.summaryNextSteps,
        transcriptText: updatedMeeting.transcriptText
      }
    });

    console.log(`✅ Email sent to ${meeting.user.email}`);
    console.log(`\n🎉 Meeting processing complete! ID: ${meetingId}\n`);

    return updatedMeeting;

  } catch (error) {
    console.error(`\n❌ Meeting processing failed:`, error.message);

    // Update meeting status to FAILED
    await updateMeetingStatus(meetingId, 'FAILED', error.message);

    // Clean up temp file if exists
    if (tempPath) {
      await cleanupTempFiles([tempPath]);
    }

    // Send failure email
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (meeting && meeting.user) {
      await emailService.sendMeetingFailedEmail({
        to: meeting.user.email,
        userName: meeting.user.name,
        meetingTitle: meeting.title,
        errorMessage: error.message
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
        audioDuration: null
      }
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

    // Step 4: Transcribe audio using Whisper
    await updateMeetingStatus(meeting.id, 'TRANSCRIBING');
    console.log(`\n📝 Step 2/4: Transcribing audio...`);
    const transcriptionResult = await transcriptionService.transcribeAudio(processedAudioPath);

    if (!transcriptionResult.success) {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    }

    const transcript = transcriptionResult.text;
    const transcriptionConfidence = transcriptionResult.confidence;

    console.log(`✅ Transcription complete: ${transcript.length} characters, ${transcriptionConfidence}% confidence`);

    // Step 5: Process transcript with NLP (SpaCy)
    await updateMeetingStatus(meeting.id, 'PROCESSING_NLP');
    console.log(`\n🧠 Step 3/4: Processing NLP...`);
    const nlpResult = await nlpService.processMeetingTranscript(transcript);
    
    if (!nlpResult.success) {
      console.warn(`⚠️ NLP processing failed: ${nlpResult.error}`);
      // Continue without NLP data (not critical)
    }

    console.log(`✅ NLP complete: ${nlpResult.entities?.length || 0} entities, ${nlpResult.actionItems?.length || 0} actions`);

    // Step 6: Generate AI summary using Groq/Mistral
    await updateMeetingStatus(meeting.id, 'SUMMARIZING');
    console.log(`\n🤖 Step 4/4: Generating summary...`);
    const summaryResult = await summarizationService.generateSummary(transcript, {
      title,
      category,
      audioDuration
    });

    if (!summaryResult.success) {
      throw new Error(`Summary generation failed: ${summaryResult.error}`);
    }

    const summary = summaryResult.summary;

    // Enhance summary with NLP data if available
    const enhancedSummary = nlpResult.success
      ? summarizationService.enhanceSummaryWithNLP(summary, nlpResult)
      : summary;

    console.log(`✅ Summary generated with ${enhancedSummary.actionItems?.length || 0} action items`);

    // Step 7: Store processed audio in permanent location
    const audioStoragePath = await storeAudioFile(processedAudioPath, meeting.id);

    // Step 8: Update meeting with all processed data
    const wordCount = transcript.split(/\s+/).length;

    // Format NLP data to match dataset structure
    const nlpEntitiesText = nlpResult.success && nlpResult.entities
      ? nlpResult.entities.map(e => `${e.text} (${e.label})`).join(', ')
      : null;

    const nlpKeyPhrasesText = nlpResult.success && nlpResult.keyPhrases
      ? nlpResult.keyPhrases.join(', ')
      : null;

    const nlpActionPatternsText = nlpResult.success && nlpResult.actionPatterns
      ? nlpResult.actionPatterns.map(a => `${a.action}: ${a.object}`).join('\n  • ')
      : null;

    meeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        audioUrl: audioStoragePath,
        audioDuration,
        transcriptText: transcript,
        transcriptWordCount: wordCount,

        // NLP Features
        nlpEntities: nlpEntitiesText,
        nlpKeyPhrases: nlpKeyPhrasesText,
        nlpActionPatterns: nlpActionPatternsText,
        nlpSentiment: nlpResult.success ? nlpResult.sentiment?.label : null,
        nlpSentimentScore: nlpResult.success ? nlpResult.sentiment?.score : null,
        nlpTopics: nlpResult.success ? nlpResult.topics : null,

        // Summary fields
        summaryExecutive: enhancedSummary.executiveSummary || null,
        summaryKeyDecisions: enhancedSummary.keyDecisions || null,
        summaryActionItems: enhancedSummary.actionItems || null,
        summaryNextSteps: enhancedSummary.nextSteps || null,
        summaryKeyTopics: enhancedSummary.keyTopics || null,
        summarySentiment: enhancedSummary.sentiment || null,

        status: 'COMPLETED'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    console.log(`✅ Meeting updated in database`);

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
        transcriptText: meeting.transcriptText
      }
    });

    console.log(`✅ Email sent to ${meeting.user.email}`);
    console.log(`\n🎉 Meeting processing complete! ID: ${meeting.id}\n`);

    return {
      success: true,
      data: meeting
    };

  } catch (error) {
    console.error(`\n❌ Meeting processing failed:`, error.message);

    // Update meeting status to FAILED if meeting was created
    if (meeting) {
      await updateMeetingStatus(meeting.id, 'FAILED', error.message);

      // Send failure email
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user) {
        await emailService.sendMeetingFailedEmail({
          to: user.email,
          userName: user.name,
          meetingTitle: title,
          errorMessage: error.message
        });
      }
    }

    return {
      success: false,
      error: error.message,
      meetingId: meeting?.id
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
    // Map transcript field
    transcript: meeting.transcriptText || null,

    // Map duration field
    duration: meeting.audioDuration || null,

    // Combine summary fields into single object
    summary: (meeting.summaryExecutive || meeting.summaryKeyDecisions || meeting.summaryActionItems || meeting.summaryNextSteps)
      ? {
          executiveSummary: meeting.summaryExecutive,
          keyDecisions: meeting.summaryKeyDecisions,
          actionItems: meeting.summaryActionItems,
          nextSteps: meeting.summaryNextSteps,
          keyTopics: meeting.summaryKeyTopics,
          sentiment: meeting.summarySentiment
        }
      : null
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
        userId // Ensure user can only access their own meetings
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
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
      userId
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
        { transcript: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.meeting.count({ where });

    // Get paginated meetings
    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        audioDuration: true,
        createdAt: true,
        summaryExecutive: true // Include summary for preview
      }
    });

    // Transform meetings for frontend
    const transformedMeetings = meetings.map(m => transformMeetingForFrontend(m));

    return {
      meetings: transformedMeetings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
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
        { transcriptText: { contains: query, mode: 'insensitive' } }
      ]
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
        transcriptText: true // Include for highlighting matches
      }
    });

    return meetings.map(meeting => ({
      ...meeting,
      transcriptText: meeting.transcriptText?.substring(0, 200) + '...' // Preview only
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
        userId // Ensure user owns this meeting
      },
      data: allowedUpdates
    });

    if (updatedMeeting.count === 0) {
      return null; // Meeting not found or unauthorized
    }

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
        userId
      }
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Delete audio file if exists
    if (meeting.audioUrl) {
      try {
        await fs.unlink(meeting.audioUrl);
        console.log(`✅ Deleted audio file: ${meeting.audioUrl}`);
      } catch (error) {
        console.warn(`⚠️ Could not delete audio file: ${error.message}`);
      }
    }

    // Delete meeting record
    await prisma.meeting.delete({
      where: { id: meetingId }
    });

    console.log(`✅ Meeting deleted: ${meetingId}`);
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
    const [
      totalMeetings,
      completedMeetings,
      processingMeetings,
      failedMeetings,
      totalDuration
    ] = await Promise.all([
      prisma.meeting.count({ where: { userId } }),
      prisma.meeting.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.meeting.count({ where: { userId, status: 'PROCESSING_AUDIO' } }),
      prisma.meeting.count({ where: { userId, status: 'FAILED' } }),
      prisma.meeting.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { audioDuration: true }
      })
    ]);

    // Get meetings by category
    const categoryCounts = await prisma.meeting.groupBy({
      by: ['category'],
      where: { userId, status: 'COMPLETED' },
      _count: true
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMeetings = await prisma.meeting.count({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    return {
      overview: {
        total: totalMeetings,
        completed: completedMeetings,
        processing: processingMeetings,
        failed: failedMeetings
      },
      byCategory: categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {}),
      metrics: {
        totalDuration: totalDuration._sum.audioDuration || 0,
        averageDuration: completedMeetings > 0
          ? Math.round((totalDuration._sum.audioDuration || 0) / completedMeetings)
          : 0,
        recentActivity: recentMeetings
      }
    };
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
        status: 'COMPLETED'
      }
    });

    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found or not completed'
      };
    }

    console.log(`🔄 Regenerating summary for meeting: ${meetingId}`);

    // Generate new summary
    const summaryResult = await summarizationService.regenerateSummary(
      meeting.transcript,
      {
        title: meeting.title,
        category: meeting.category,
        duration: meeting.duration
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
        summary: summaryResult.summary
      }
    });

    console.log(`✅ Summary regenerated successfully`);

    return {
      success: true,
      data: updatedMeeting
    };
  } catch (error) {
    console.error('Regenerate summary error:', error.message);
    return {
      success: false,
      error: error.message
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
        userId
      },
      select: {
        transcriptText: true,
        transcriptWordCount: true,
        status: true
      }
    });

    if (!meeting) {
      return null;
    }

    if (!meeting.transcriptText) {
      return null;
    }

    return {
      text: meeting.transcriptText,
      wordCount: meeting.transcriptWordCount || meeting.transcriptText.split(/\s+/).length
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
        userId
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
        createdAt: true
      }
    });

    if (!meeting) {
      return null;
    }

    if (!meeting.summaryExecutive) {
      return null;
    }

    return {
      executiveSummary: meeting.summaryExecutive,
      keyDecisions: meeting.summaryKeyDecisions,
      actionItems: meeting.summaryActionItems || [],
      nextSteps: meeting.summaryNextSteps,
      keyTopics: meeting.summaryKeyTopics || [],
      sentiment: meeting.summarySentiment
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
        userId
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
        createdAt: true
      }
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
        keyDecisions: meeting.summaryKeyDecisions,
        actionItems: meeting.summaryActionItems || [],
        nextSteps: meeting.summaryNextSteps,
        keyTopics: meeting.summaryKeyTopics || [],
        sentiment: meeting.summarySentiment
      }
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
        userId
      },
      select: {
        audioUrl: true,
        title: true
      }
    });

    if (!meeting || !meeting.audioUrl) {
      return null;
    }

    // Check if file exists
    try {
      const stats = await fs.stat(meeting.audioUrl);

      return {
        url: meeting.audioUrl,
        filename: path.basename(meeting.audioUrl),
        size: stats.size,
        expiresAt: null // Local file, no expiration
      };
    } catch (error) {
      console.warn('Audio file not found:', meeting.audioUrl);
      return null;
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
        userId
      },
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
        processingError: true,
        processingStartedAt: true,
        processingCompletedAt: true
      }
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Calculate progress percentage based on status
    const statusProgress = {
      'UPLOADING': 10,
      'PROCESSING_AUDIO': 25,
      'TRANSCRIBING': 50,
      'PROCESSING_NLP': 75,
      'SUMMARIZING': 90,
      'COMPLETED': 100,
      'FAILED': 0
    };

    // Estimate time remaining (rough estimates in seconds)
    const statusTimeEstimates = {
      'UPLOADING': 85,
      'PROCESSING_AUDIO': 80,
      'TRANSCRIBING': 60,
      'PROCESSING_NLP': 10,
      'SUMMARIZING': 5,
      'COMPLETED': 0,
      'FAILED': 0
    };

    // Current stage descriptions
    const stageDescriptions = {
      'UPLOADING': 'Uploading audio file',
      'PROCESSING_AUDIO': 'Optimizing audio quality',
      'TRANSCRIBING': 'Converting speech to text',
      'PROCESSING_NLP': 'Extracting key information',
      'SUMMARIZING': 'Generating AI summary',
      'COMPLETED': 'Processing complete',
      'FAILED': 'Processing failed'
    };

    return {
      status: meeting.status,
      progress: statusProgress[meeting.status] || 0,
      estimatedTimeRemaining: statusTimeEstimates[meeting.status] || 0,
      currentStage: stageDescriptions[meeting.status] || 'Unknown',
      startedAt: meeting.processingStartedAt || meeting.createdAt,
      updatedAt: meeting.updatedAt,
      completedAt: meeting.processingCompletedAt,
      error: meeting.processingError || null
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

    await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData
    });
    console.log(`📊 Meeting status updated: ${status}`);
  } catch (error) {
    console.error('Update status error:', error.message);
  }
}

/**
 * Store audio file in permanent location
 */
async function storeAudioFile(tempPath, meetingId) {
  try {
    const storageDir = path.join(process.cwd(), 'storage', 'audio');
    await fs.mkdir(storageDir, { recursive: true });

    const extension = path.extname(tempPath);
    const filename = `${meetingId}${extension}`;
    const storagePath = path.join(storageDir, filename);

    await fs.copyFile(tempPath, storagePath);

    console.log(`✅ Audio file stored: ${storagePath}`);

    return storagePath;
  } catch (error) {
    console.error('Store audio file error:', error.message);
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

  // Advanced features
  regenerateSummary
};