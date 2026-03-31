// backend/src/routes/calendar.routes.js
const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All calendar routes require authentication
router.use(authenticate);

// GET /api/calendar/events - Get upcoming calendar events
router.get('/events', calendarController.getEvents);

module.exports = router;
