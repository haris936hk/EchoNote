const express = require('express');
const router = express.Router();
const jiraController = require('../controllers/jira.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All Jira routes require authentication
router.use(authenticate);

// Test Jira connection
router.post('/test-connection', jiraController.testConnection);

// Manually sync action item to Jira
router.post('/sync/:actionItemId', jiraController.syncActionItem);

module.exports = router;
