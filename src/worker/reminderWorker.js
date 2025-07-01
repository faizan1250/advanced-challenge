//i already have src/worker/remainderWorker
const { Worker } = require('bullmq');
const redis = require('../config/redis');
const User = require('../modules/auth/auth.model');
const { admin } = require('../config/firebase');
const { emitToUser } = require('../sockets/pub');
const { REMINDER_PUSH } = require('../sockets/events');

const reminderWorker = new Worker('reminderQueue', async job => {
  const { userId, title, taskId } = job.data;
const user = await User.findById(userId);

if (!user || !user.fcmToken) {
  if (user) {
    emitToUser(user._id.toString(), 'REMINDER_PUSH', {
      message: `Reminder: ${title}`,
      taskId,
    });
  }
  return;
}



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
