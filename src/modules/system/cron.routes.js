const express = require('express');
const router = express.Router();
const Task = require('../tasks/task.model');

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

module.exports = router;
