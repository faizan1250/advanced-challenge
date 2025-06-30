// leaderboard.controller.js
const User = require('../auth/auth.model');
const FocusSession = require('../focus/focusSession.model');
const Task = require('../tasks/task.model');

const getStartOfScope = (scope) => {
  const now = new Date();
  if (scope === 'weekly') {
    const diff = now.getDay(); // days since Sunday
    return new Date(now.setDate(now.getDate() - diff));
  }
  if (scope === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null; // all-time
};

exports.getLeaderboard = async (req, res) => {
  const userId = req.user.id;
  const scope = req.query.scope || 'all';

  // Optional: fetch friends from user
  const user = await User.findById(userId);
  const friendIds = user.friends || [];

  const startDate = getStartOfScope(scope);

  const matchUserIds = [userId, ...friendIds];

  // Aggregate XP earned within time frame
  const focusXpAgg = FocusSession.aggregate([
    { $match: { userId: { $in: matchUserIds.map(id => id instanceof Object ? id : mongoose.Types.ObjectId(id)) } } },
    ...(startDate ? [{ $match: { startedAt: { $gte: startDate } } }] : []),
    {
      $group: {
        _id: '$userId',
        totalDuration: { $sum: '$duration' },
      },
    },
    {
      $project: {
        _id: 1,
        xpFromFocus: { $floor: { $divide: ['$totalDuration', 25 * 60 * 1000] } }, // 1 XP per 25 mins
      },
    },
  ]);

  const taskXpAgg = Task.aggregate([
    { $unwind: '$completions' },
    { $match: { 'completions.userId': { $in: matchUserIds.map(id => mongoose.Types.ObjectId(id)) } } },
    ...(startDate ? [{ $match: { 'completions.completedAt': { $gte: startDate } } }] : []),
    {
      $group: {
        _id: '$completions.userId',
        xpFromTasks: { $sum: '$completions.earnedXP' },
      },
    },
  ]);

  const [focusResults, taskResults] = await Promise.all([focusXpAgg, taskXpAgg]);

  // Combine focus + task XP
  const xpMap = {};

  for (const f of focusResults) {
    xpMap[f._id] = { xp: f.xpFromFocus };
  }

  for (const t of taskResults) {
    xpMap[t._id] = {
      xp: (xpMap[t._id]?.xp || 0) + t.xpFromTasks,
    };
  }

  // Final sorting
  const leaderboard = await Promise.all(
    Object.entries(xpMap).map(async ([id, data]) => {
      const user = await User.findById(id).select('name email');
      return {
        userId: id,
        name: user.name,
        email: user.email,
        xp: data.xp,
      };
    })
  );

  leaderboard.sort((a, b) => b.xp - a.xp);

  res.status(200).json(leaderboard);
};
