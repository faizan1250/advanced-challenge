const User = require('../auth/auth.model');

exports.getLeaderboard = async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select('friends');
  const ids = [userId, ...user.friends];

  const leaderboard = await User.find({ _id: { $in: ids } })
    .select('name gamifiedStats.xp gamifiedStats.streak gamifiedStats.totalPoints')
    .sort({ 'gamifiedStats.xp': -1 });

  res.json({ leaderboard });
};
