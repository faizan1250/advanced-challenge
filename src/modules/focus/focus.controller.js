const FocusSession = require('./focus.model');
const { emitToUser } = require('../../sockets/pub');
const { awardXP } = require('../leaderboard/xp.service');

exports.startFocusSession = async (req, res) => {
  const { taskId } = req.body;
  const userId = req.user.id;

  const session = await FocusSession.create({ userId, taskId });

  emitToUser(userId, 'FOCUS_STARTED', {
    sessionId: session._id,
    taskId,
    startedAt: session.startedAt
  });

  res.status(201).json({ message: 'Focus session started', session });
};

exports.endFocusSession = async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.id;

  const session = await FocusSession.findOne({ _id: sessionId, userId });
  if (!session || session.endedAt) {
    return res.status(400).json({ error: 'Session not found or already ended' });
  }

  session.endedAt = new Date();
  session.durationMinutes = Math.round((session.endedAt - session.startedAt) / 60000);

  // Award XP: 1 XP per 5 mins (customize as needed)
  const earnedXP = Math.floor(session.durationMinutes / 5);
  session.pointsEarned = earnedXP;

  await session.save();

  if (earnedXP > 0) await awardXP(userId, earnedXP);

  emitToUser(userId, 'FOCUS_ENDED', {
    sessionId: session._id,
    durationMinutes: session.durationMinutes,
    earnedXP
  });

  res.status(200).json({ message: 'Focus session ended', session });
};
