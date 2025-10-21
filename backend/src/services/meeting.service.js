const prisma = require('../config/database');
const audioService = require('./audio.service');
const transcriptionService = require('./transcription.service');
const nlpService = require('./nlp.service');
const summarizationService = require('./summarization.service');
const emailService = require('./email.service');
const path = require('path');
const fs = require('fs').promises;

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

    // Step 1: Create meeting record with PENDING status
    meeting = await prisma.meeting.create({
      data: {
        title,
        category,
        status: 'PENDING',
        userId,
        audioUrl: null, // Will be updated after processing
        transcript: null,
        summary: null,
        duration: 0
      }
    });

    console.log(`✅ Meeting record created: ${meeting.id}`);

    // Step 2: Update status to PROCESSING
    await updateMeetingStatus(meeting.id, 'PROCESSING');

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
    console.log(`\n📝 Step 2/4: Transcribing audio...`);
    const transcriptionResult = await transcriptionService.transcribeAudio(processedAudioPath);
    
    if (!transcriptionResult.success) {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    }

    const transcript = transcriptionResult.text;
    const transcriptionConfidence = transcriptionResult.confidence;

    console.log(`✅ Transcription complete: ${transcript.length} characters, ${transcriptionConfidence}% confidence`);

    // Step 5: Process transcript with NLP (SpaCy)
    console.log(`\n🧠 Step 3/4: Processing NLP...`);
    const nlpResult = await nlpService.processMeetingTranscript(transcript);
    
    if (!nlpResult.success) {
      console.warn(`⚠️ NLP processing failed: ${nlpResult.error}`);
      // Continue without NLP data (not critical)
    }

    console.log(`✅ NLP complete: ${nlpResult.entities?.length || 0} entities, ${nlpResult.actionItems?.length || 0} actions`);

    // Step 6: Generate AI summary using Groq/Mistral
    console.log(`\n🤖 Step 4/4: Generating summary...`);
    const summaryResult = await summarizationService.generateSummary(transcript, {
      title,
      category,
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

    // Step 7: Store processed audio in permanent location
    const audioStoragePath = await storeAudioFile(processedAudioPath, meeting.id);

    // Step 8: Update meeting with all processed data
    meeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        audioUrl: audioStoragePath,
        transcript,
        summary: enhancedSummary,
        duration: audioDuration,
        status: 'COMPLETED',
        nlpData: nlpResult.success ? nlpResult : null,
        transcriptionConfidence
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
        duration: meeting.duration,
        category: meeting.category,
        summary: meeting.summary,
        transcript: meeting.transcript
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
 * Get meeting by ID with user validation
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Meeting object
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

    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found'
      };
    }

    return {
      success: true,
      data: meeting
    };
  } catch (error) {
    console.error('Get meeting error:', error.message);
    return {
      success: false,
      error: error.message
    };
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
        duration: true,
        createdAt: true,
        summary: true // Include summary for preview
      }
    });

    return {
      success: true,
      data: {
        meetings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error) {
    console.error('Get user meetings error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search meetings by keyword in title or transcript
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @returns {Promise<Object>} Search results
 */
async function searchMeetings(userId, query) {
  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        status: 'COMPLETED', // Only search completed meetings
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { transcript: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit search results
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        duration: true,
        transcript: true // Include for highlighting matches
      }
    });

    return {
      success: true,
      data: meetings.map(meeting => ({
        ...meeting,
        transcript: meeting.transcript?.substring(0, 200) + '...' // Preview only
      }))
    };
  } catch (error) {
    console.error('Search meetings error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update meeting metadata (title, category only)
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated meeting
 */
async function updateMeeting(meetingId, userId, updates) {
  try {
    // Only allow updating title and category
    const allowedUpdates = {};
    if (updates.title) allowedUpdates.title = updates.title;
    if (updates.category) allowedUpdates.category = updates.category;

    const meeting = await prisma.meeting.updateMany({
      where: {
        id: meetingId,
        userId // Ensure user owns this meeting
      },
      data: allowedUpdates
    });

    if (meeting.count === 0) {
      return {
        success: false,
        error: 'Meeting not found or unauthorized'
      };
    }

    return {
      success: true,
      data: await getMeetingById(meetingId, userId)
    };
  } catch (error) {
    console.error('Update meeting error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete meeting and associated files
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Delete result
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
      return {
        success: false,
        error: 'Meeting not found'
      };
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

    return {
      success: true,
      message: 'Meeting deleted successfully'
    };
  } catch (error) {
    console.error('Delete meeting error:', error.message);
    return {
      success: false,
      error: error.message
    };
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
      prisma.meeting.count({ where: { userId, status: 'PROCESSING' } }),
      prisma.meeting.count({ where: { userId, status: 'FAILED' } }),
      prisma.meeting.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { duration: true }
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
      success: true,
      data: {
        total: totalMeetings,
        completed: completedMeetings,
        processing: processingMeetings,
        failed: failedMeetings,
        totalDuration: totalDuration._sum.duration || 0,
        averageDuration: completedMeetings > 0 
          ? Math.round((totalDuration._sum.duration || 0) / completedMeetings) 
          : 0,
        byCategory: categoryCounts.reduce((acc, item) => {
          acc[item.category] = item._count;
          return acc;
        }, {}),
        recentActivity: recentMeetings
      }
    };
  } catch (error) {
    console.error('Get meeting statistics error:', error.message);
    return {
      success: false,
      error: error.message
    };
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update meeting status
 */
async function updateMeetingStatus(meetingId, status, errorMessage = null) {
  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status,
        ...(errorMessage && { errorMessage })
      }
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
  createAndProcessMeeting,
  getMeetingById,
  getUserMeetings,
  searchMeetings,
  updateMeeting,
  deleteMeeting,
  getMeetingStatistics,
  regenerateSummary
};