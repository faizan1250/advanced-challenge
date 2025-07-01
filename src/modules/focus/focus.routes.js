const express = require('express');
const router = express.Router();
const auth = require('../../middleware/authMiddleware');
const focusController = require('./focus.controller');

router.post('/start', auth, focusController.startFocusSession);
router.post('/end', auth, focusController.endFocusSession);

module.exports = router;
