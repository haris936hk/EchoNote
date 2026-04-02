const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, taskController.getTasks);
router.patch('/:id', authenticate, taskController.updateTaskStatus);

module.exports = router;
