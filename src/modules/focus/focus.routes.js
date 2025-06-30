const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const focusController = require('./focus.controller');

router.post('/focus/start', authMiddleware, focusController.startFocus);
router.post('/focus/stop', authMiddleware, focusController.stopFocus);

module.exports = router;