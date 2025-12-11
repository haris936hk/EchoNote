// backend/src/controllers/meeting.controller.js
// Meeting controller - handles HTTP requests for meetings

const meetingService = require('../services/meeting.service');
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

/**
 * Create new meeting with audio upload (combined endpoint)
 * POST /api/meetings/upload
 */
const createMeetingWithAudio = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Check if file was uploaded (after validateAudioFile middleware, file is in req.uploadedFile or req.file)
    if (!req.file && !req.uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const audioFile = req.uploadedFile || req.file;

    // Validate category
    const validCategories = ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories
      });
    }

    // Note: File validation (size, type) is already done by upload middleware
    logger.info(`📤 Creating meeting with audio for user ${userId}: ${audioFile.filename || audioFile.originalname}`);

    // Create meeting first
    const meeting = await meetingService.createMeeting({
      userId,
      title: title.trim(),
      description: description?.trim() || '',
      category: category || 'OTHER'
    });

    logger.info(`✅ Meeting created: ${meeting.id}`);

    // Use uploadedFile if available (after validation), otherwise use req.file
    const fileToProcess = req.uploadedFile || req.file;

    // Start audio processing pipeline in the background
    // We don't await this to allow the response to return quickly
    meetingService.uploadAndProcessAudio(meeting.id, userId, fileToProcess)
      .then(() => {
        logger.info(`✅ Audio processing completed for meeting ${meeting.id}`);
      })
      .catch((error) => {
        logger.error(`❌ Audio processing failed for meeting ${meeting.id}: ${error.message}`);
      });

    return res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created and audio processing started'
    });

  } catch (error) {
    logger.error(`Error creating meeting with audio: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to create meeting',
      details: error.message
    });
  }
};

/**
 * Create new meeting
 * POST /api/meetings
 */
const createMeeting = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const userId = req.userId;

    // Validate category
    const validCategories = ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories
      });
    }

    const meeting = await meetingService.createMeeting({
      userId,
      title,
      description,
      category: category || 'OTHER'
    });

    logger.info(`✅ Meeting created: ${meeting.id} by user ${userId}`);

    return res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created successfully'
    });

  } catch (error) {
    logger.error(`Error creating meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to create meeting',
      details: error.message
    });
  }
};

/**
 * Upload audio file for meeting
 * POST /api/meetings/:id/upload
 */
const uploadAudio = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    // Check if file was uploaded (after validateAudioFile middleware, file is in req.uploadedFile or req.file)
    if (!req.file && !req.uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const audioFile = req.uploadedFile || req.file;

    // Validate file size (10MB max)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
    if (audioFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`
      });
    }

    // Validate file type
    const allowedFormats = (process.env.ALLOWED_AUDIO_FORMATS || 'audio/mpeg,audio/wav,audio/mp3,audio/webm,audio/ogg').split(',');
    if (!allowedFormats.includes(audioFile.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audio format',
        allowedFormats
      });
    }

    logger.info(`📤 Uploading audio for meeting ${meetingId}`);

    // Start processing pipeline
    const result = await meetingService.uploadAndProcessAudio(meetingId, userId, audioFile);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Audio uploaded. Processing started.'
    });

  } catch (error) {
    logger.error(`Error uploading audio: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload audio',
      details: error.message
    });
  }
};

/**
 * Get all meetings for user
 * GET /api/meetings?page=1&limit=10&category=STANDUP&search=team&status=COMPLETED
 */
const getMeetings = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 10,
      category,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      search,
      status,
      sortBy,
      sortOrder
    };

    const result = await meetingService.getMeetings(filters);

    return res.status(200).json({
      success: true,
      data: result.meetings,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });

  } catch (error) {
    logger.error(`Error getting meetings: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve meetings',
      details: error.message
    });
  }
};

/**
 * Get single meeting by ID
 * GET /api/meetings/:id
 */
const getMeetingById = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    const meeting = await meetingService.getMeetingById(meetingId, userId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting
    });

  } catch (error) {
    logger.error(`Error getting meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve meeting',
      details: error.message
    });
  }
};

/**
 * Update meeting
 * PATCH /api/meetings/:id
 */
const updateMeeting = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;
    const { title, description, category } = req.body;

    // Validate category if provided
    if (category) {
      const validCategories = ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category',
          validCategories
        });
      }
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;

    const meeting = await meetingService.updateMeeting(meetingId, userId, updateData);

    logger.info(`✅ Meeting updated: ${meetingId}`);

    return res.status(200).json({
      success: true,
      data: meeting,
      message: 'Meeting updated successfully'
    });

  } catch (error) {
    logger.error(`Error updating meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to update meeting',
      details: error.message
    });
  }
};

/**
 * Delete meeting
 * DELETE /api/meetings/:id
 */
const deleteMeeting = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    await meetingService.deleteMeeting(meetingId, userId);

    logger.info(`🗑️ Meeting deleted: ${meetingId}`);

    return res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    logger.error(`Error deleting meeting: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete meeting',
      details: error.message
    });
  }
};

/**
 * Get meeting transcript
 * GET /api/meetings/:id/transcript
 */
const getTranscript = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    const transcript = await meetingService.getTranscript(meetingId, userId);

    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not available. Meeting may still be processing.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        text: transcript.text,
        wordCount: transcript.wordCount
      }
    });

  } catch (error) {
    logger.error(`Error getting transcript: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve transcript',
      details: error.message
    });
  }
};

/**
 * Get meeting summary
 * GET /api/meetings/:id/summary
 */
const getSummary = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    const summary = await meetingService.getSummary(meetingId, userId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not available. Meeting may still be processing.'
      });
    }

    return res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error(`Error getting summary: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve summary',
      details: error.message
    });
  }
};

/**
 * Download meeting audio
 * GET /api/meetings/:id/download/audio
 */
const downloadAudio = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    const audioData = await meetingService.getAudioDownloadUrl(meetingId, userId);

    if (!audioData || !audioData.url) {
      return res.status(404).json({
        success: false,
        error: 'Audio not available. It may have been deleted.'
      });
    }

    // Redirect to Supabase URL or return download URL
    return res.status(200).json({
      success: true,
      data: {
        url: audioData.url,
        filename: audioData.filename,
        size: audioData.size,
        expiresAt: audioData.expiresAt // Signed URL expiration
      }
    });

  } catch (error) {
    logger.error(`Error downloading audio: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to download audio',
      details: error.message
    });
  }
};

/**
 * Download meeting transcript (TXT format)
 * GET /api/meetings/:id/download/transcript
 */
const downloadTranscript = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;
    const format = req.query.format || 'txt'; // txt, json

    const transcriptData = await meetingService.getTranscript(meetingId, userId);

    if (!transcriptData) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not available'
      });
    }

    const meeting = await meetingService.getMeetingById(meetingId, userId);
    const filename = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_transcript`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.send(JSON.stringify(transcriptData, null, 2));
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
      return res.send(transcriptData.text);
    }

  } catch (error) {
    logger.error(`Error downloading transcript: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to download transcript',
      details: error.message
    });
  }
};

/**
 * Download meeting summary (TXT format)
 * GET /api/meetings/:id/download/summary
 */
const downloadSummary = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;
    const format = req.query.format || 'txt'; // txt, json

    const summary = await meetingService.getSummary(meetingId, userId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not available'
      });
    }

    const meeting = await meetingService.getMeetingById(meetingId, userId);
    const filename = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_summary`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.send(JSON.stringify(summary, null, 2));
    } else {
      // Format as readable text
      let textContent = `Meeting Summary: ${meeting.title}\n`;
      textContent += `Category: ${meeting.category}\n`;
      textContent += `Date: ${new Date(meeting.createdAt).toLocaleString()}\n\n`;
      textContent += `=== EXECUTIVE SUMMARY ===\n${summary.executiveSummary}\n\n`;
      textContent += `=== KEY DECISIONS ===\n${summary.keyDecisions}\n\n`;
      textContent += `=== ACTION ITEMS ===\n`;
      summary.actionItems.forEach((item, index) => {
        textContent += `${index + 1}. ${item.task}`;
        if (item.assignee) textContent += ` (${item.assignee})`;
        if (item.deadline) textContent += ` - Due: ${item.deadline}`;
        textContent += `\n`;
      });
      textContent += `\n=== NEXT STEPS ===\n${summary.nextSteps}\n`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
      return res.send(textContent);
    }

  } catch (error) {
    logger.error(`Error downloading summary: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to download summary',
      details: error.message
    });
  }
};

/**
 * Search meetings
 * GET /api/meetings/search?q=team&category=STANDUP
 */
const searchMeetings = async (req, res) => {
  try {
    const userId = req.userId;
    const { q, category, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const results = await meetingService.searchMeetings(userId, q, {
      category,
      limit: parseInt(limit)
    });

    return res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });

  } catch (error) {
    logger.error(`Error searching meetings: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Search failed',
      details: error.message
    });
  }
};

/**
 * Get meeting statistics for user
 * GET /api/meetings/stats
 */
const getMeetingStats = async (req, res) => {
  try {
    const userId = req.userId;

    const stats = await meetingService.getUserMeetingStats(userId);

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`Error getting meeting stats: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
};

/**
 * Get processing status for meeting
 * GET /api/meetings/:id/status
 */
const getProcessingStatus = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    const status = await meetingService.getProcessingStatus(meetingId, userId);

    return res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error(`Error getting processing status: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve status',
      details: error.message
    });
  }
};

module.exports = {
  createMeeting,
  createMeetingWithAudio,
  uploadAudio,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  getTranscript,
  getSummary,
  downloadAudio,
  downloadTranscript,
  downloadSummary,
  searchMeetings,
  getMeetingStats,
  getProcessingStatus
};