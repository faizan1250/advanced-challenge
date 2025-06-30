const Task = require('./task.model');
const { uploadToFirebase } = require('../../config/firebase');
const reminderQueue = require('../../queues/reminderQueue');
exports.createTask = async (req, res) => {
  try {
    // Create the task
    const task = await Task.create({ ...req.body, userId: req.user.id });

    // If reminderTime is provided, add to queue
    if (req.body.reminderTime) {
      const delayDuration = new Date(req.body.reminderTime) - Date.now();
      
      // Only add to queue if reminder is in the future
      if (delayDuration > 0) {
        await reminderQueue.add(
          'sendReminder',
          {
            taskId: task._id,
            userId: req.user.id,
            title: task.title,
            email: req.user.email, // Assuming user has email
            reminderTime: req.body.reminderTime
          },
          {
            delay: delayDuration,
            jobId: `reminder-${task._id}`, // Unique job ID for later reference
            attempts: 3, // Retry 3 times if fails
            backoff: {
              type: 'exponential',
              delay: 1000 // 1 second delay between retries
            }
          }
        );
      }
    }

    res.status(201).json({
      ...task.toObject(),
      hasReminder: !!req.body.reminderTime
    });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ 
      error: 'Failed to create task',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { isCompleted, isStarred, category, from, to, q, updatedSince } = req.query;

    const filter = { userId: req.user.id };

    if (isCompleted !== undefined) filter.isCompleted = isCompleted === 'true';
    if (isStarred !== undefined) filter.isStarred = isStarred === 'true';
    if (category) filter.category = category;
    if (updatedSince) filter.updatedAt = { $gte: new Date(updatedSince) };

    if (from || to) {
      filter.dueDate = {};
      if (from) filter.dueDate.$gte = new Date(from);
      if (to) filter.dueDate.$lte = new Date(to);
    }

    if (q) {
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { notes: new RegExp(q, 'i') },
      ];
    }

    const tasks = await Task.find(filter).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};



exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // 🛑 Conflict Detection
    if (req.body.updatedAt && new Date(req.body.updatedAt) < task.updatedAt) {
      return res.status(409).json({ error: 'Conflict: Task was updated elsewhere' });
    }

    // ✅ Proceed with update
    Object.assign(task, req.body);
    task.updatedAt = new Date();
    await task.save();

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

   await reminderQueue.remove?.(`task-${req.params.id}`);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('❌ Delete task error:', err.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

exports.toggleStarred = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.isStarred = !task.isStarred;
    await task.save();
    res.json({ isStarred: task.isStarred });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle starred' });
  }
};


exports.uploadAttachment = async (req, res) => {
  try {
    console.log('📥 File:', req.file);
    console.log('📌 Params:', req.params);
    console.log('📝 Body:', req.body);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileMeta = await uploadToFirebase(req.file.buffer, req.file.originalname);
    
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $push: { attachments: fileMeta } },
      { new: true }
    );

    if (!task) return res.status(404).json({ error: 'Task not found' });

    res.json(task);
  } catch (err) {
    console.error('❌ Attachment upload error:', err);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

// task.controller.js
exports.completeSharedTask = async (req, res) => {
  const { task } = req; // from middleware
  const userId = req.user.id;

  // Prevent double completion
  const alreadyCompleted = task.completions.find(c => c.userId.toString() === userId);
  if (alreadyCompleted) {
    return res.status(400).json({ error: 'Already completed by this user' });
  }

  const earnedXP = 10; // later calculate based on difficulty/time/etc

  task.completions.push({ userId, earnedXP });
  await task.save();

  // Update user XP
  await User.findByIdAndUpdate(userId, {
    $inc: { 'gamifiedStats.xp': earnedXP },
    $set: { 'gamifiedStats.lastCompletedDate': new Date() },
  });

  // Emit WebSocket event
  req.io?.to(userId).emit('TASK_UPDATED', {
    taskId: task._id,
    type: 'completed',
    userId,
  });

  res.status(200).json({ message: 'Task completed', earnedXP });
};
