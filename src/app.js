const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const taskRoutes = require('./modules/tasks/task.routes');
const categoryRoutes = require('./modules/tasks/category.routes');
const attachmentRoutes = require('./modules/tasks/attachment.routes');
const systemRoutes = require('./modules/system/system.routes');
const cronRoutes = require('./modules/system/cron.routes');
const focusRoutes = require('./modules/focus/focus.routes');
const rateLimit = require('express-rate-limit');
const leaderboardRoutes = require('./modules/leaderboard/leaderboard.route');
const challengeRoutes = require('./modules/challenges/challenge.routes');
const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: 'Too many requests, please try again later.',
});

app.use(cors());
app.use(express.json());
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/challenges', challengeRoutes);
module.exports = app;
