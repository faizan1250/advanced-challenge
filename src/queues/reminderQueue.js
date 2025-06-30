const { Queue } = require('bullmq');
const redis = require('../config/redis');

const reminderQueue = new Queue('reminderQueue', { connection: redis });
module.exports = reminderQueue;
