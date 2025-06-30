const Task = require('../modules/tasks/task.model');

module.exports = async function (req, res, next) {
  const task = await Task.findById(req.params.id);
  const userId = req.user.id;

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isOwner = task.userId.toString() === userId;
  const isParticipant = task.participants?.some(p => p.toString() === userId);

  if (!isOwner && !isParticipant) {
    return res.status(403).json({ error: 'Access denied: not a participant' });
  }

  req.task = task; // Attach task to request for future use
  next();
};
