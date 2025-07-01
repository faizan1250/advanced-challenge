//i also have src/system/cron.routes.js
const express = require('express');
const router = express.Router();
const Task = require('../tasks/task.model');
const AnalyticsSnapshot = require('../analytics/analyticsSnapshot.model');
const User = require('../auth/auth.model');
router.post('/repeat-tasks', async (req, res) => {
  try {
    const now = new Date();
if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
    const repeatingTasks = await Task.find({
      repeatRule: { $exists: true },
      dueDate: { $lte: now },
    });

    const newTasks = [];

    for (const task of repeatingTasks) {
      const newDueDate = getNextDueDate(task.dueDate, task.repeatRule);
      if (!newDueDate) continue;

      if (task.repeatUntil && newDueDate > task.repeatUntil) continue;

      const newTask = await Task.create({
        ...task.toObject(),
        _id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        isCompleted: false,
        dueDate: newDueDate,
        createdFrom: task._id,
      });

      newTasks.push(newTask);
    }

    res.json({ generated: newTasks.length });
  } catch (err) {
    console.error('Repeat task error:', err);
    res.status(500).json({ error: 'Failed to generate repeated tasks' });
  }
});

function getNextDueDate(currentDate, rule) {
  const d = new Date(currentDate);
  switch (rule) {
    case 'daily': d.setDate(d.getDate() + 1); return d;
    case 'weekly': d.setDate(d.getDate() + 7); return d;
    case 'monthly': d.setMonth(d.getMonth() + 1); return d;
    default: return null;
  }
}
router.post('/analytics-snapshot', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const users = await User.find();

  for (const user of users) {
    await AnalyticsSnapshot.create({
      userId: user._id,
      tasksCompleted: user.gamifiedStats?.tasksCompleted || 0,
      minutesFocused: user.gamifiedStats?.minutesFocused || 0,
      xpEarned: user.gamifiedStats?.xp || 0,
    });
  }

  res.json({ message: 'Snapshot complete', count: users.length });
});

router.post('/monthly-awards', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const topUsers = await User.find().sort({ 'gamifiedStats.xp': -1 }).limit(3);

  for (const user of topUsers) {
    user.gamifiedStats.xp += 100; // bonus XP
    user.monthlyWins = (user.monthlyWins || 0) + 1;
    await user.save();
  }

  res.json({ message: 'Monthly awards granted', winners: topUsers.map(u => u.name) });
});


module.exports = router;
