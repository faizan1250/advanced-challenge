const User = require('../auth/auth.model');
const moment = require('moment');

exports.awardXP = async (userId, amount) => {
  const user = await User.findById(userId);
  const now = moment().startOf('day');
  const last = user.gamifiedStats.lastCompletedDate
    ? moment(user.gamifiedStats.lastCompletedDate).startOf('day')
    : null;

  let streak = user.gamifiedStats.streak || 0;

  if (last) {
    if (now.diff(last, 'days') === 1) {
      streak += 1;
    } else if (now.diff(last, 'days') > 1) {
      streak = 1;
    } // else same day — no streak increase
  } else {
    streak = 1;
  }

  await User.findByIdAndUpdate(userId, {
    $inc: {
      'gamifiedStats.xp': amount,
      'gamifiedStats.totalPoints': amount
    },
    $set: {
      'gamifiedStats.streak': streak,
      'gamifiedStats.lastCompletedDate': now.toDate()
    }
  });
};
