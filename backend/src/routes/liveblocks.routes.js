const express = require('express');
const router = express.Router();
const liveblocksController = require('../controllers/liveblocks.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/auth', authenticate, liveblocksController.auth);

module.exports = router;
