// backend/src/controllers/meeting.controller.js
// Meeting controller - handles HTTP requests for meetings

const meetingService = require('../services/meeting.service');
const queueService = require('../services/queue.service');
const supabaseStorage = require('../services/supabase-storage.service');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { convertWavToMp3, cleanupTempMp3 } = require('../utils/audioConverter');
const { generateDownloadFilename, ensureDirectoryExists } = require('../utils/fileUtils');

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

    // Add to queue for processing
    const queueResult = await queueService.addToQueue(meeting.id, userId, fileToProcess);

    if (!queueResult.success) {
      logger.error(`Failed to queue meeting ${meeting.id}: ${queueResult.error}`);
      await meetingService.updateMeetingStatus(meeting.id, 'FAILED', queueResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to queue meeting for processing'
      });
    }

    logger.info(`✅ Meeting ${meeting.id} queued for processing (position: ${queueResult.queuePosition})`);

    return res.status(201).json({
      success: true,
      data: { ...meeting, status: 'PENDING' },
      message: `Meeting created and queued for processing (position: ${queueResult.queuePosition})`
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

    // Validate file size (50MB max)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB
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
      limit = 100, // Default to 100 to show all meetings (max allowed by validation)
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
 * Download meeting audio (as MP3)
 * GET /api/meetings/:id/download/audio
 * FR.30: User shall be able to download processed audio file (MP3 format)
 * FR.33: System shall organize downloaded files with meeting title and timestamp
 */
const downloadAudio = async (req, res) => {
  let tempMp3Path = null;
  let tempWavPath = null;
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

    // Create temp directory if needed
    const tempDir = path.join(process.cwd(), 'storage', 'temp');
    ensureDirectoryExists(tempDir);

    let sourceWavPath;

    // Check if it's a Supabase URL or local file
    if (audioData.isRemote || audioData.url.startsWith('http')) {
      // Supabase URL - download to temp first
      logger.info(`📥 Downloading audio from Supabase for meeting ${meetingId}`);
      tempWavPath = path.join(tempDir, `${meetingId}_source.wav`);

      const downloadResult = await supabaseStorage.downloadAudioFromSupabase(audioData.url, tempWavPath);

      if (!downloadResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to download audio from storage',
          details: downloadResult.error
        });
      }

      sourceWavPath = tempWavPath;
    } else {
      // Local file - check if exists
      if (!fs.existsSync(audioData.url)) {
        return res.status(404).json({
          success: false,
          error: 'Audio file not found on server'
        });
      }
      sourceWavPath = audioData.url;
    }

    // Get meeting details for filename
    const meeting = await meetingService.getMeetingById(meetingId, userId);
    const downloadFilename = generateDownloadFilename(meeting.title, meeting.createdAt, 'audio', 'mp3');

    tempMp3Path = path.join(tempDir, `${meetingId}_audio.mp3`);

    // Convert WAV to MP3
    logger.info(`🎵 Converting audio to MP3 for meeting ${meetingId}`);
    const conversionResult = await convertWavToMp3(sourceWavPath, tempMp3Path);

    if (!conversionResult.success) {
      logger.error(`MP3 conversion failed: ${conversionResult.error}`);
      if (tempWavPath) cleanupTempMp3(tempWavPath);
      return res.status(500).json({
        success: false,
        error: 'Failed to convert audio to MP3 format',
        details: conversionResult.error
      });
    }

    // Cleanup temp WAV if downloaded from Supabase
    if (tempWavPath) cleanupTempMp3(tempWavPath);

    // Set headers for MP3 download
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', conversionResult.size);

    // Stream the MP3 file
    const fileStream = fs.createReadStream(tempMp3Path);
    fileStream.pipe(res);

    fileStream.on('close', () => {
      // Cleanup temp file after streaming completes
      cleanupTempMp3(tempMp3Path);
    });

    fileStream.on('error', (err) => {
      logger.error(`Error streaming MP3 file: ${err.message}`);
      cleanupTempMp3(tempMp3Path);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream audio file'
        });
      }
    });

  } catch (error) {
    logger.error(`Error downloading audio: ${error.message}`);
    if (tempWavPath) cleanupTempMp3(tempWavPath);
    if (tempMp3Path) cleanupTempMp3(tempMp3Path);
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
 * FR.31: User shall be able to download transcript (TXT format)
 * FR.33: System shall organize downloaded files with meeting title and timestamp
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
    const filename = generateDownloadFilename(meeting.title, meeting.createdAt, 'transcript', format);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(JSON.stringify(transcriptData, null, 2));
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
 * FR.32: User shall be able to download summary (TXT format)
 * FR.33: System shall organize downloaded files with meeting title and timestamp
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
    const filename = generateDownloadFilename(meeting.title, meeting.createdAt, 'summary', format);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(JSON.stringify(summary, null, 2));
    } else {
      // Format as readable text
      let textContent = `Meeting Summary: ${meeting.title}\n`;
      textContent += `Category: ${meeting.category}\n`;
      textContent += `Date: ${new Date(meeting.createdAt).toLocaleString()}\n\n`;
      textContent += `=== EXECUTIVE SUMMARY ===\n${summary.executiveSummary}\n\n`;

      // Format keyDecisions as numbered list
      if (Array.isArray(summary.keyDecisions) && summary.keyDecisions.length > 0) {
        textContent += '=== KEY DECISIONS ===\n';
        summary.keyDecisions.forEach((decision, index) => {
          textContent += `${index + 1}. ${decision}\n`;
        });
        textContent += '\n';
      } else {
        textContent += '=== KEY DECISIONS ===\nNo major decisions recorded.\n\n';
      }

      textContent += `=== ACTION ITEMS ===\n`;
      summary.actionItems.forEach((item, index) => {
        textContent += `${index + 1}. ${item.task}`;
        if (item.assignee) textContent += ` (${item.assignee})`;
        if (item.deadline) textContent += ` - Due: ${item.deadline}`;
        textContent += `\n`;
      });

      // Format nextSteps as numbered list
      if (Array.isArray(summary.nextSteps) && summary.nextSteps.length > 0) {
        textContent += '\n=== NEXT STEPS ===\n';
        summary.nextSteps.forEach((step, index) => {
          textContent += `${index + 1}. ${step}\n`;
        });
        textContent += '\n';
      } else {
        textContent += '\n=== NEXT STEPS ===\nNo next steps defined.\n\n';
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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

/**
 * Stream meeting audio (for audio player)
 * GET /api/meetings/:id/audio
 * Supports range requests for seeking
 */
const streamAudio = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    const audioData = await meetingService.getAudioDownloadUrl(meetingId, userId);

    if (!audioData || !audioData.url) {
      return res.status(404).json({
        success: false,
        error: 'Audio not available'
      });
    }

    const fs = require('fs');
    const path = require('path');

    let audioFilePath = audioData.url;
    let tempFile = null;

    // Check if it's a Supabase URL - need to download first
    if (audioData.isRemote || audioData.url.startsWith('http')) {
      logger.info(`📥 Downloading audio from Supabase for streaming: ${meetingId}`);

      // Create temp file path
      const tempDir = path.join(process.cwd(), 'storage', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      tempFile = path.join(tempDir, `stream_${meetingId}_${Date.now()}.wav`);

      // Download from Supabase
      const downloadResult = await supabaseStorage.downloadAudioFromSupabase(audioData.url, tempFile);

      if (!downloadResult.success) {
        logger.error(`Failed to download audio from Supabase: ${downloadResult.error}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve audio from storage',
          details: downloadResult.error
        });
      }

      audioFilePath = tempFile;
    } else {
      // Local file - check if exists
      if (!fs.existsSync(audioData.url)) {
        return res.status(404).json({
          success: false,
          error: 'Audio file not found on server'
        });
      }
    }

    const stat = fs.statSync(audioFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Set content type
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');

    // Cleanup function for temp file
    const cleanupTemp = () => {
      if (tempFile && fs.existsSync(tempFile)) {
        fs.unlink(tempFile, (err) => {
          if (err) logger.warn(`Failed to cleanup temp stream file: ${err.message}`);
        });
      }
    };

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      // Set partial content headers
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      // Stream the requested range
      const fileStream = fs.createReadStream(audioFilePath, { start, end });
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        logger.error(`Error streaming audio range: ${err.message}`);
        cleanupTemp();
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      fileStream.on('close', cleanupTemp);
    } else {
      // Stream entire file
      res.setHeader('Content-Length', fileSize);
      const fileStream = fs.createReadStream(audioFilePath);
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        logger.error(`Error streaming audio: ${err.message}`);
        cleanupTemp();
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      fileStream.on('close', cleanupTemp);
    }

  } catch (error) {
    logger.error(`Error streaming audio: ${error.message}`);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to stream audio',
        details: error.message
      });
    }
  }
};

/**
 * Download all meeting files (audio, transcript, summary) as ZIP
 * GET /api/meetings/:id/download/all
 * Creates a ZIP archive with:
 * - Audio file (MP3)
 * - Transcript (TXT)
 * - Summary (TXT)
 */
const downloadAll = async (req, res) => {
  let tempMp3Path = null;
  let tempZipPath = null;

  try {
    const meetingId = req.params.id;
    const userId = req.userId;

    // Get meeting details
    const meeting = await meetingService.getMeetingById(meetingId, userId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    // Ensure meeting is completed
    if (meeting.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Meeting processing is not complete. Please wait for processing to finish.'
      });
    }

    logger.info(`📦 Creating ZIP download for meeting ${meetingId}`);

    // Create temp directory
    const tempDir = path.join(process.cwd(), 'storage', 'temp');
    ensureDirectoryExists(tempDir);

    // Get filenames with timestamps
    const audioFilename = generateDownloadFilename(meeting.title, meeting.createdAt, 'audio', 'mp3');
    const transcriptFilename = generateDownloadFilename(meeting.title, meeting.createdAt, 'transcript', 'txt');
    const summaryFilename = generateDownloadFilename(meeting.title, meeting.createdAt, 'summary', 'txt');
    const zipFilename = generateDownloadFilename(meeting.title, meeting.createdAt, 'complete', 'zip');

    // Get audio data and convert to MP3
    const audioData = await meetingService.getAudioDownloadUrl(meetingId, userId);
    let audioAvailable = false;

    if (audioData && audioData.url && fs.existsSync(audioData.url)) {
      tempMp3Path = path.join(tempDir, `${meetingId}_audio.mp3`);
      const conversionResult = await convertWavToMp3(audioData.url, tempMp3Path);
      audioAvailable = conversionResult.success;
      if (!audioAvailable) {
        logger.warn(`MP3 conversion failed for ZIP, skipping audio: ${conversionResult.error}`);
      }
    }

    // Get transcript
    const transcriptData = await meetingService.getTranscript(meetingId, userId);

    // Get summary and format as text
    const summary = await meetingService.getSummary(meetingId, userId);
    let summaryText = '';
    if (summary) {
      summaryText = `Meeting Summary: ${meeting.title}\n`;
      summaryText += `Category: ${meeting.category}\n`;
      summaryText += `Date: ${new Date(meeting.createdAt).toLocaleString()}\n\n`;
      summaryText += `=== EXECUTIVE SUMMARY ===\n${summary.executiveSummary}\n\n`;

      if (Array.isArray(summary.keyDecisions) && summary.keyDecisions.length > 0) {
        summaryText += '=== KEY DECISIONS ===\n';
        summary.keyDecisions.forEach((decision, index) => {
          summaryText += `${index + 1}. ${decision}\n`;
        });
        summaryText += '\n';
      } else {
        summaryText += '=== KEY DECISIONS ===\nNo major decisions recorded.\n\n';
      }

      summaryText += `=== ACTION ITEMS ===\n`;
      if (summary.actionItems && summary.actionItems.length > 0) {
        summary.actionItems.forEach((item, index) => {
          summaryText += `${index + 1}. ${item.task}`;
          if (item.assignee) summaryText += ` (${item.assignee})`;
          if (item.deadline) summaryText += ` - Due: ${item.deadline}`;
          summaryText += `\n`;
        });
      } else {
        summaryText += 'No action items recorded.\n';
      }

      if (Array.isArray(summary.nextSteps) && summary.nextSteps.length > 0) {
        summaryText += '\n=== NEXT STEPS ===\n';
        summary.nextSteps.forEach((step, index) => {
          summaryText += `${index + 1}. ${step}\n`;
        });
      }
    }

    // Check if we have at least some content
    if (!audioAvailable && !transcriptData && !summary) {
      return res.status(404).json({
        success: false,
        error: 'No content available for download'
      });
    }

    // Create ZIP archive
    tempZipPath = path.join(tempDir, `${meetingId}_all.zip`);

    await new Promise((resolve, reject) => {
      const outputStream = fs.createWriteStream(tempZipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      outputStream.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(outputStream);

      // Add MP3 if available
      if (audioAvailable && fs.existsSync(tempMp3Path)) {
        archive.file(tempMp3Path, { name: audioFilename });
      }

      // Add transcript if available
      if (transcriptData && transcriptData.text) {
        archive.append(transcriptData.text, { name: transcriptFilename });
      }

      // Add summary if available
      if (summaryText) {
        archive.append(summaryText, { name: summaryFilename });
      }

      archive.finalize();
    });

    // Get ZIP file size
    const zipStats = fs.statSync(tempZipPath);

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', zipStats.size);

    // Stream ZIP file
    const zipStream = fs.createReadStream(tempZipPath);
    zipStream.pipe(res);

    zipStream.on('close', () => {
      // Cleanup temp files
      if (tempMp3Path) cleanupTempMp3(tempMp3Path);
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
    });

    zipStream.on('error', (err) => {
      logger.error(`Error streaming ZIP file: ${err.message}`);
      if (tempMp3Path) cleanupTempMp3(tempMp3Path);
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream ZIP file'
        });
      }
    });

  } catch (error) {
    logger.error(`Error creating download all ZIP: ${error.message}`);
    // Cleanup on error
    if (tempMp3Path) cleanupTempMp3(tempMp3Path);
    if (tempZipPath && fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create download package',
      details: error.message
    });
  }
};

/**
 * Export all meetings as ZIP archive
 * GET /api/meetings/download/all
 * Creates a ZIP with folders for each meeting containing:
 * - audio.mp3
 * - transcript.txt
 * - summary.txt
 */
const exportAllMeetings = async (req, res) => {
  const tempFiles = [];
  let tempZipPath = null;

  try {
    const userId = req.userId;

    // Get all completed meetings for user
    const allMeetings = await meetingService.getMeetings(userId, {
      page: 1,
      limit: 1000, // Get all meetings
      status: 'COMPLETED'
    });

    if (!allMeetings || allMeetings.meetings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No completed meetings found to export'
      });
    }

    const meetings = allMeetings.meetings;
    logger.info(`📦 Creating export ZIP for ${meetings.length} meetings for user ${userId}`);

    // Create temp directory
    const tempDir = path.join(process.cwd(), 'storage', 'temp');
    ensureDirectoryExists(tempDir);

    // Generate export filename
    const exportDate = new Date().toISOString().slice(0, 10);
    const zipFilename = `EchoNote_Export_${exportDate}.zip`;
    tempZipPath = path.join(tempDir, `export_${userId}_${Date.now()}.zip`);

    // Create ZIP archive
    await new Promise(async (resolve, reject) => {
      const outputStream = fs.createWriteStream(tempZipPath);
      const archive = archiver('zip', { zlib: { level: 6 } }); // Level 6 for balance of speed/compression

      outputStream.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(outputStream);

      // Process each meeting
      for (const meeting of meetings) {
        try {
          // Sanitize meeting title for folder name
          const folderName = meeting.title
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 50);

          const meetingFolder = `${folderName}_${meeting.id.substring(0, 8)}`;

          // Get audio and convert to MP3
          const audioData = await meetingService.getAudioDownloadUrl(meeting.id, userId);
          if (audioData && audioData.url) {
            let audioPath = audioData.url;

            // Handle Supabase URLs
            if (audioData.isRemote || audioData.url.startsWith('http')) {
              const tempAudioPath = path.join(tempDir, `export_${meeting.id}_audio.wav`);
              const downloadResult = await supabaseStorage.downloadAudioFromSupabase(audioData.url, tempAudioPath);
              if (downloadResult.success) {
                audioPath = tempAudioPath;
                tempFiles.push(tempAudioPath);
              } else {
                logger.warn(`Failed to download audio for meeting ${meeting.id}`);
                audioPath = null;
              }
            }

            if (audioPath && fs.existsSync(audioPath)) {
              const tempMp3Path = path.join(tempDir, `export_${meeting.id}_audio.mp3`);
              const conversionResult = await convertWavToMp3(audioPath, tempMp3Path);
              if (conversionResult.success) {
                archive.file(tempMp3Path, { name: `${meetingFolder}/audio.mp3` });
                tempFiles.push(tempMp3Path);
              }
            }
          }

          // Get transcript
          const transcriptData = await meetingService.getTranscript(meeting.id, userId);
          if (transcriptData && transcriptData.text) {
            const transcriptText = `Meeting: ${meeting.title}\nDate: ${new Date(meeting.createdAt).toLocaleString()}\nCategory: ${meeting.category}\n\n${'='.repeat(60)}\n\n${transcriptData.text}`;
            archive.append(transcriptText, { name: `${meetingFolder}/transcript.txt` });
          }

          // Get summary
          const summary = await meetingService.getSummary(meeting.id, userId);
          if (summary) {
            let summaryText = `Meeting Summary: ${meeting.title}\n`;
            summaryText += `Category: ${meeting.category}\n`;
            summaryText += `Date: ${new Date(meeting.createdAt).toLocaleString()}\n\n`;
            summaryText += `${'='.repeat(60)}\n\n`;
            summaryText += `EXECUTIVE SUMMARY\n${'-'.repeat(40)}\n${summary.executiveSummary || 'N/A'}\n\n`;

            if (Array.isArray(summary.keyDecisions) && summary.keyDecisions.length > 0) {
              summaryText += `KEY DECISIONS\n${'-'.repeat(40)}\n`;
              summary.keyDecisions.forEach((decision, i) => {
                summaryText += `${i + 1}. ${decision}\n`;
              });
              summaryText += '\n';
            }

            summaryText += `ACTION ITEMS\n${'-'.repeat(40)}\n`;
            if (summary.actionItems && summary.actionItems.length > 0) {
              summary.actionItems.forEach((item, i) => {
                summaryText += `${i + 1}. ${item.task}`;
                if (item.assignee) summaryText += ` (${item.assignee})`;
                if (item.deadline) summaryText += ` - Due: ${item.deadline}`;
                summaryText += '\n';
              });
            } else {
              summaryText += 'No action items recorded.\n';
            }

            if (Array.isArray(summary.nextSteps) && summary.nextSteps.length > 0) {
              summaryText += `\nNEXT STEPS\n${'-'.repeat(40)}\n`;
              summary.nextSteps.forEach((step, i) => {
                summaryText += `${i + 1}. ${step}\n`;
              });
            }

            archive.append(summaryText, { name: `${meetingFolder}/summary.txt` });
          }

        } catch (meetingError) {
          logger.warn(`Error processing meeting ${meeting.id} for export: ${meetingError.message}`);
          // Continue with other meetings
        }
      }

      archive.finalize();
    });

    // Stream ZIP to client
    const stat = fs.statSync(tempZipPath);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', stat.size);

    const fileStream = fs.createReadStream(tempZipPath);
    fileStream.pipe(res);

    fileStream.on('close', () => {
      // Cleanup all temp files
      tempFiles.forEach(file => {
        if (fs.existsSync(file)) {
          try { fs.unlinkSync(file); } catch (e) { }
        }
      });
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        try { fs.unlinkSync(tempZipPath); } catch (e) { }
      }
    });

    fileStream.on('error', (err) => {
      logger.error(`Error streaming export ZIP: ${err.message}`);
      // Cleanup on error
      tempFiles.forEach(file => {
        if (fs.existsSync(file)) {
          try { fs.unlinkSync(file); } catch (e) { }
        }
      });
      if (tempZipPath && fs.existsSync(tempZipPath)) {
        try { fs.unlinkSync(tempZipPath); } catch (e) { }
      }
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream export file'
        });
      }
    });

  } catch (error) {
    logger.error(`Error creating export ZIP: ${error.message}`);
    // Cleanup on error
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch (e) { }
      }
    });
    if (tempZipPath && fs.existsSync(tempZipPath)) {
      try { fs.unlinkSync(tempZipPath); } catch (e) { }
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create export package',
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
  downloadAll,
  exportAllMeetings,
  searchMeetings,
  getMeetingStats,
  getProcessingStatus,
  streamAudio
};