const express = require('express');
const router = express.Router();
const jiraController = require('../controllers/jira.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/test-connection', jiraController.testConnection);

router.post('/sync/:actionItemId', jiraController.syncActionItem);

module.exports = router;
