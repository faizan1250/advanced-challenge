const { Worker } = require('bullmq');
const redis = require('../config/redis');
const User = require('../modules/auth/auth.model');
const { admin } = require('../config/firebase');

const reminderWorker = new Worker('reminderQueue', async job => {
  const { userId, title } = job.data;
  const user = await User.findById(userId);
  if (!user?.fcmToken) return;

  await admin.messaging().send({
    token: user.fcmToken,
    notification: {
      title: 'Task Reminder',
      body: title,
    },
  });
}, { connection: redis });

reminderWorker.on('completed', job => {
  console.log(`Reminder sent for task ${job.id}`);
});

reminderWorker.on('failed', (job, err) => {
  console.error(`Reminder failed for task ${job.id}`, err.message);
});

module.exports = reminderWorker;
