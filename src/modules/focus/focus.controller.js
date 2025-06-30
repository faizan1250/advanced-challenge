exports.startFocus = async (req, res) => {
  const { taskId } = req.body;
  const userId = req.user.id;

  const existing = await FocusSession.findOne({ userId, endedAt: null });
  if (existing) {
    return res.status(400).json({ error: 'Focus session already running' });
  }

  const session = await FocusSession.create({
    userId,
    taskId,
    startedAt: new Date(),
  });

  req.io?.to(userId).emit('FOCUS_STARTED', { sessionId: session._id });

  res.status(201).json({ sessionId: session._id });
};

exports.stopFocus = async (req, res) => {
  const userId = req.user.id;

  const session = await FocusSession.findOne({ userId, endedAt: null });
  if (!session) {
    return res.status(404).json({ error: 'No active focus session' });
  }

  session.endedAt = new Date();
  session.duration = session.endedAt - session.startedAt;
  await session.save();

  const earnedXP = Math.floor(session.duration / (25 * 60 * 1000)) * 5; // 5 XP per 25 mins

  await User.findByIdAndUpdate(userId, {
    $inc: {
      'gamifiedStats.xp': earnedXP,
      'gamifiedStats.totalFocusTime': session.duration,
    },
  });

  req.io?.to(userId).emit('FOCUS_ENDED', {
    sessionId: session._id,
    earnedXP,
  });

  res.status(200).json({ message: 'Focus ended', duration: session.duration, earnedXP });
};
