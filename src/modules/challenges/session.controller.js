const Challenge = require('./challenge.model');
const ChallengeSession = require('./session.model');
const { emitToUser } = require('../../sockets/pub');
const { CHALLENGE_PROGRESS } = require('../../sockets/events');
const {CHALLENGE_LEADERBOARD_UPDATED} = require('../../sockets/events');
const User = require('../auth/auth.model');

exports.startSession = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;

  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const activeSession = await ChallengeSession.findOne({
      challengeId,
      userId,
      endedAt: null,
    });

    if (activeSession) {
      return res.status(400).json({ error: 'Session already in progress' });
    }

    const session = await ChallengeSession.create({
      challengeId,
      userId,
      startedAt: new Date(),
    });

    res.status(201).json({ message: 'Session started', sessionId: session._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start session' });
  }
};



exports.stopSession = async (req, res) => {
async function awardChallengeXP(userId, challengeId, minutes) {
  const xp = minutes;

  const user = await User.findById(userId);
  let progress = user.challengeProgress.find(p => p.challengeId.toString() === challengeId);

  if (progress) {
    progress.totalMinutes += minutes;
    progress.totalXP += xp;
  } else {
    progress = { challengeId, totalMinutes: minutes, totalXP: xp };
    user.challengeProgress.push(progress);
  }

  await user.save();
  return { xp, progress }; // return fresh copy for immediate use
}

  const challengeId = req.params.id;
  const userId = req.user.id;

  try {
    const session = await ChallengeSession.findOne({
      challengeId,
      userId,
      endedAt: null,
    });

    if (!session) {
      return res.status(400).json({ error: 'No active session found' });
    }

    session.endedAt = new Date();
    const durationMs = new Date(session.endedAt) - new Date(session.startedAt);
    session.duration = Math.round(durationMs / 60000); // to minutes
    await session.save();

    // Award XP and update user progress
   const { xp, progress } = await awardChallengeXP(userId, challengeId, session.duration);

    // Fetch updated leaderboard
    const users = await User.find({ 'challengeProgress.challengeId': challengeId });

    const leaderboard = users.map(user => {
     
      if (!progress) return null; // skip user if no progress

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        totalXP: progress.totalXP,
        totalMinutes: progress.totalMinutes,
      };
    }).filter(Boolean).sort((a, b) => b.totalXP - a.totalXP);

    // Emit to all participants
    const challenge = await Challenge.findById(challengeId);
    challenge.participants.forEach(participantId => {
      emitToUser(participantId.toString(), CHALLENGE_PROGRESS, {
        challengeId,
        userId,
        duration: session.duration,
        earnedXP: xp,
      });

     emitToUser(participantId.toString(), CHALLENGE_LEADERBOARD_UPDATED, {
  challengeId,
  leaderboard
});
    });

    res.status(200).json({
      message: 'Session stopped',
      duration: session.duration,
      sessionId: session._id,
    });
  } catch (err) {
    console.error('Error stopping session:', err);
    res.status(500).json({ error: 'Failed to stop session' });
  }
};
