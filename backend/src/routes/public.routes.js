const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

router.get('/meetings/:token', apiLimiter, publicController.getPublicMeetingByToken);

module.exports = router;
