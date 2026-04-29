
const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/events', calendarController.getEvents);

module.exports = router;
