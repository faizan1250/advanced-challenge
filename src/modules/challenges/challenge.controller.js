const Challenge = require('./challenge.model');
const User = require('../auth/auth.model');
exports.createChallenge = async (req, res) => {
  const { title, goalTime, durationDays, rewardPoints } = req.body;
  const userId = req.user.id;

  try {
    const challenge = await Challenge.create({
      title,
      goalTime,
      durationDays,
      rewardPoints,
      createdBy: userId,
      participants: [userId],
    });

  res.status(201).json({ message: 'Challenge created', challenge });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

exports.joinChallenge = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;

  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    if (!challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
      await challenge.save();
    }

    res.status(200).json({ message: 'Joined challenge' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join challenge' });
  }
};

exports.leaveChallenge = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;

  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    challenge.participants = challenge.participants.filter(
      id => id.toString() !== userId
    );

    await challenge.save();
    res.status(200).json({ message: 'Left challenge' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave challenge' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const challengeId = req.params.id;
    const users = await User.find({ 'challengeProgress.challengeId': challengeId });

    const leaderboard = users.map(user => {
      const progress = user.challengeProgress.find(p => p.challengeId.toString() === challengeId);
     if (!progress) {
  console.warn(`⚠️ No progress found for user ${user._id} in challenge ${challengeId}`);
  return null;
}
      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email, // Optional: remove if too sensitive
        },
        totalXP: progress.totalXP,
        totalMinutes: progress.totalMinutes,
      };
    }).filter(Boolean);

    leaderboard.sort((a, b) => b.totalXP - a.totalXP);

    res.status(200).json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};
