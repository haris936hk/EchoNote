// backend/src/routes/public.routes.js
// Public routes containing endpoints that bypass authentication entirely

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

/**
 * @route   GET /api/public/meetings/:token
 * @desc    Fetch a shared meeting by its shareToken
 * @access  Public
 * @returns { success: true, data: { ... } }
 */
router.get('/meetings/:token', apiLimiter, publicController.getPublicMeetingByToken);

module.exports = router;
