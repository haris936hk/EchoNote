// backend/src/routes/meeting.routes.js
// Meeting routes for CRUD operations and processing

const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meeting.controller');
const {
  authenticate,
  authenticateMedia,
  authorize,
  rateLimit,
  requireCompletedMeeting
} = require('../middleware/auth.middleware');
const {
  validateCreateMeeting,
  validateUpdateMeeting,
  validatePagination,
  validateSearch,
  validateUUIDParam,
  validateDownloadFormat,
  sanitizeBody,
  sanitizeQuery
} = require('../middleware/validation.middleware');
const {
  uploadAudio,
  validateAudioFile,
  handleMulterError
} = require('../middleware/upload.middleware');

/**
 * @route   GET /api/meetings/stats
 * @desc    Get user's meeting statistics
 * @access  Private
 * @returns { success, data: { overview, byCategory, metrics } }
 */
router.get(
  '/stats',
  authenticate,
  meetingController.getMeetingStats
);

/**
 * @route   GET /api/meetings/search
 * @desc    Search meetings
 * @access  Private
 * @query   q=<query>&category=<category>&limit=<number>
 * @returns { success, data: [meetings], count }
 */
router.get(
  '/search',
  authenticate,
  sanitizeQuery,
  validateSearch,
  meetingController.searchMeetings
);

/**
 * @route   GET /api/meetings
 * @desc    Get all meetings for authenticated user
 * @access  Private
 * @query   page=<number>&limit=<number>&category=<category>&status=<status>&search=<query>&sortBy=<field>&sortOrder=<asc|desc>
 * @returns { success, data: [meetings], pagination }
 */
router.get(
  '/',
  authenticate,
  sanitizeQuery,
  validatePagination,
  meetingController.getMeetings
);

/**
 * @route   POST /api/meetings/upload
 * @desc    Create new meeting and upload audio (combined endpoint)
 * @access  Private
 * @body    FormData with 'audio', 'title', 'description', 'category'
 * @returns { success, data: meeting, message }
 */
router.post(
  '/upload',
  authenticate,
  rateLimit(10, 60000), // 10 uploads per minute
  uploadAudio,
  handleMulterError,
  validateAudioFile,
  sanitizeBody,
  meetingController.createMeetingWithAudio
);

/**
 * @route   POST /api/meetings
 * @desc    Create new meeting
 * @access  Private
 * @body    { title, description?, category? }
 * @returns { success, data: meeting, message }
 */
router.post(
  '/',
  authenticate,
  rateLimit(30, 60000), // 30 meetings per minute
  sanitizeBody,
  validateCreateMeeting,
  meetingController.createMeeting
);

/**
 * @route   GET /api/meetings/:id
 * @desc    Get single meeting by ID
 * @access  Private (owner only)
 * @returns { success, data: meeting }
 */
router.get(
  '/:id',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  meetingController.getMeetingById
);

/**
 * @route   PATCH /api/meetings/:id
 * @desc    Update meeting metadata
 * @access  Private (owner only)
 * @body    { title?, description?, category? }
 * @returns { success, data: meeting, message }
 */
router.patch(
  '/:id',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  sanitizeBody,
  validateUpdateMeeting,
  meetingController.updateMeeting
);

/**
 * @route   DELETE /api/meetings/:id
 * @desc    Delete meeting and associated data
 * @access  Private (owner only)
 * @returns { success, message }
 */
router.delete(
  '/:id',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  meetingController.deleteMeeting
);

/**
 * @route   POST /api/meetings/:id/upload
 * @desc    Upload audio file for meeting
 * @access  Private (owner only)
 * @body    FormData with 'audio' field
 * @returns { success, data: { meetingId, status }, message }
 */
router.post(
  '/:id/upload',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  rateLimit(5, 60000), // 5 uploads per minute
  uploadAudio,
  handleMulterError,
  validateAudioFile,
  meetingController.uploadAudio
);

/**
 * @route   GET /api/meetings/:id/transcript
 * @desc    Get meeting transcript
 * @access  Private (owner only)
 * @returns { success, data: { text, wordCount } }
 */
router.get(
  '/:id/transcript',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  requireCompletedMeeting,
  meetingController.getTranscript
);

/**
 * @route   GET /api/meetings/:id/summary
 * @desc    Get AI-generated meeting summary
 * @access  Private (owner only)
 * @returns { success, data: { executiveSummary, keyDecisions, actionItems, nextSteps } }
 */
router.get(
  '/:id/summary',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  requireCompletedMeeting,
  meetingController.getSummary
);

/**
 * @route   GET /api/meetings/:id/status
 * @desc    Get processing status of meeting
 * @access  Private (owner only)
 * @returns { success, data: { status, progress, estimatedTimeRemaining, currentStage } }
 */
router.get(
  '/:id/status',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  meetingController.getProcessingStatus
);

/**
 * @route   GET /api/meetings/:id/audio
 * @desc    Stream meeting audio file (for audio player)
 * @access  Private (owner only)
 * @query   token=<jwt_token> (optional, for audio elements that can't send headers)
 * @returns Audio file stream (inline)
 */
router.get(
  '/:id/audio',
  authenticateMedia,
  validateUUIDParam('id'),
  authorize('meeting'),
  rateLimit(30, 60000), // 30 streams per minute
  meetingController.streamAudio
);

/**
 * @route   GET /api/meetings/:id/download/audio
 * @desc    Download meeting audio file
 * @access  Private (owner only)
 * @returns { success, data: { url, filename, size, expiresAt } }
 */
router.get(
  '/:id/download/audio',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  rateLimit(20, 60000), // 20 downloads per minute
  meetingController.downloadAudio
);

/**
 * @route   GET /api/meetings/:id/download/transcript
 * @desc    Download meeting transcript
 * @access  Private (owner only)
 * @query   format=<txt|json>
 * @returns File download (text or JSON)
 */
router.get(
  '/:id/download/transcript',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  requireCompletedMeeting,
  validateDownloadFormat,
  rateLimit(20, 60000),
  meetingController.downloadTranscript
);

/**
 * @route   GET /api/meetings/:id/download/summary
 * @desc    Download meeting summary
 * @access  Private (owner only)
 * @query   format=<txt|json>
 * @returns File download (text or JSON)
 */
router.get(
  '/:id/download/summary',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  requireCompletedMeeting,
  validateDownloadFormat,
  rateLimit(20, 60000),
  meetingController.downloadSummary
);

/**
 * @route   POST /api/meetings/:id/reprocess
 * @desc    Reprocess meeting (regenerate summary/transcript)
 * @access  Private (owner only)
 * @body    { regenerateTranscript?, regenerateSummary? }
 * @returns { success, message }
 */
router.post(
  '/:id/reprocess',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  rateLimit(3, 60000), // 3 reprocesses per minute
  sanitizeBody,
  (req, res) => {
    // Future feature - reprocess failed or update summary
    res.status(501).json({
      success: false,
      error: 'Reprocessing feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   POST /api/meetings/:id/share
 * @desc    Generate shareable link for meeting (future feature)
 * @access  Private (owner only)
 * @body    { expiresIn?, password? }
 * @returns { success, data: { shareUrl, expiresAt } }
 */
router.post(
  '/:id/share',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  (req, res) => {
    // Future feature - generate public share link
    res.status(501).json({
      success: false,
      error: 'Sharing feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   GET /api/meetings/:id/analytics
 * @desc    Get meeting analytics (speaker time, topics, sentiment)
 * @access  Private (owner only)
 * @returns { success, data: { speakerTime, topics, sentiment, engagement } }
 */
router.get(
  '/:id/analytics',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  requireCompletedMeeting,
  (req, res) => {
    // Future feature - detailed analytics
    res.status(501).json({
      success: false,
      error: 'Analytics feature not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   POST /api/meetings/batch-delete
 * @desc    Delete multiple meetings at once
 * @access  Private
 * @body    { meetingIds: [id1, id2, ...] }
 * @returns { success, data: { deleted, failed }, message }
 */
router.post(
  '/batch-delete',
  authenticate,
  rateLimit(5, 60000), // 5 batch operations per minute
  sanitizeBody,
  (req, res) => {
    // Future feature - batch operations
    res.status(501).json({
      success: false,
      error: 'Batch delete not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * @route   GET /api/meetings/categories
 * @desc    Get list of available categories
 * @access  Public
 * @returns { success, data: [categories] }
 */
router.get(
  '/categories',
  (req, res) => {
    res.status(200).json({
      success: true,
      data: ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'],
      message: 'Available meeting categories'
    });
  }
);

module.exports = router;