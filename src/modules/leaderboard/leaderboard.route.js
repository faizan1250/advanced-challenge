const express = require('express');
const router = express.Router();
const auth = require('../../middleware/authMiddleware');
const { getLeaderboard } = require('./leaderboard.controller');

router.use(auth);
router.get('/', getLeaderboard);

module.exports = router;
