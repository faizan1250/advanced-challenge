const express = require('express');
const auth = require('../../middleware/authMiddleware');
const controller = require('./challenge.controller');
const sessionController = require('./session.controller');
const router = express.Router();

router.post('/', auth, controller.createChallenge);
router.post('/:id/join', auth, controller.joinChallenge);
router.post('/:id/leave', auth, controller.leaveChallenge);
router.post('/:id/start', auth, sessionController.startSession);
router.post('/:id/stop', auth, sessionController.stopSession);
router.get('/:id/leaderboard', auth, controller.getLeaderboard);
module.exports = router;
