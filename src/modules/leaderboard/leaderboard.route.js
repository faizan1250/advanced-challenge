// leaderboard/leaderboard.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const leaderboardController = require('../controllers/leaderboard.controller');

router.get('/leaderboard', auth, leaderboardController.getLeaderboard);

module.exports = router;
