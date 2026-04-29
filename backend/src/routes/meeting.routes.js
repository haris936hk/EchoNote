const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meeting.controller');
const {
  authenticate,
  authenticateMedia,
  authorize,
  requireCompletedMeeting,
} = require('../middleware/auth.middleware');
const { uploadLimiter, searchLimiter } = require('../middleware/rateLimit.middleware');
const {
  validateCreateMeeting,
  validateUpdateMeeting,
  validatePagination,
  validateSearch,
  validateUUIDParam,
  validateDownloadFormat,
  sanitizeBody,
  sanitizeQuery,
} = require('../middleware/validation.middleware');
const {
  uploadAudio,
  validateAudioFile,
  validateAudioDuration,
  handleMulterError,
} = require('../middleware/upload.middleware');

router.get('/stats', authenticate, meetingController.getMeetingStats);

router.get(
  '/search',
  authenticate,
  searchLimiter,
  sanitizeQuery,
  validateSearch,
  meetingController.searchMeetings
);

router.get('/export', authenticate, meetingController.exportAllMeetings);

router.get('/decisions', authenticate, meetingController.getAllDecisions);

router.get('/', authenticate, sanitizeQuery, validatePagination, meetingController.getMeetings);

router.post(
  '/upload',
  authenticate,
  uploadLimiter,
  uploadAudio,
  handleMulterError,
  validateAudioFile,
  validateAudioDuration,
  sanitizeBody,
  meetingController.createMeetingWithAudio
);

router.post(
  '/',
  authenticate,
  sanitizeBody,
  validateCreateMeeting,
  meetingController.createMeeting
);

router.get('/:id', authenticate, validateUUIDParam('id'), meetingController.getMeetingById);

router.patch(
  '/:id',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  sanitizeBody,
  validateUpdateMeeting,
  meetingController.updateMeeting
);

router.patch(
  '/:id/speakers',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  sanitizeBody,
  meetingController.updateSpeakerMap
);

router.patch(
  '/:id/summary',
  authenticate,
  validateUUIDParam('id'),
  sanitizeBody,
  meetingController.updateMeetingSummary
);

router.delete(
  '/:id',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  meetingController.deleteMeeting
);

router.post(
  '/:id/upload',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  uploadLimiter,
  uploadAudio,
  handleMulterError,
  validateAudioFile,
  validateAudioDuration,
  meetingController.uploadAudio
);

router.get(
  '/:id/transcript',
  authenticate,
  validateUUIDParam('id'),
  requireCompletedMeeting,
  meetingController.getTranscript
);

router.get(
  '/:id/summary',
  authenticate,
  validateUUIDParam('id'),
  requireCompletedMeeting,
  meetingController.getSummary
);

router.post(
  '/:id/followup',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  requireCompletedMeeting,
  meetingController.generateFollowUp
);

router.get(
  '/:id/status',
  authenticate,
  validateUUIDParam('id'),
  meetingController.getProcessingStatus
);

router.get(
  '/:id/audio',
  authenticateMedia,
  validateUUIDParam('id'),
  authorize('meeting'),
  meetingController.streamAudio
);

router.get(
  '/:id/download/audio',
  authenticate,
  validateUUIDParam('id'),
  meetingController.downloadAudio
);

router.get(
  '/:id/download/transcript',
  authenticate,
  validateUUIDParam('id'),
  requireCompletedMeeting,
  validateDownloadFormat,
  meetingController.downloadTranscript
);

router.get(
  '/:id/download/summary',
  authenticate,
  validateUUIDParam('id'),
  requireCompletedMeeting,
  validateDownloadFormat,
  meetingController.downloadSummary
);

router.get(
  '/:id/download/all',
  authenticate,
  validateUUIDParam('id'),
  requireCompletedMeeting,
  meetingController.downloadAll
);

router.post(
  '/:id/reprocess',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  sanitizeBody,
  meetingController.reprocessMeeting
);

router.post(
  '/:id/share/slack',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  requireCompletedMeeting,
  meetingController.shareToSlack
);

router.post(
  '/:id/share',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  meetingController.generateShareLink
);

router.delete(
  '/:id/share',
  authenticate,
  validateUUIDParam('id'),
  authorize('meeting'),
  meetingController.revokeShareLink
);

router.get(
  '/:id/analytics',
  authenticate,
  validateUUIDParam('id'),
  requireCompletedMeeting,
  meetingController.getMeetingAnalytics
);

router.post('/batch-delete', authenticate, sanitizeBody, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Batch delete not yet implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

router.get('/categories', (req, res) => {
  res.status(200).json({
    success: true,
    data: ['SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER'],
    message: 'Available meeting categories',
  });
});

module.exports = router;
