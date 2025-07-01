const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  tasksCompleted: Number,
  minutesFocused: Number,
  xpEarned: Number,
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsSnapshot', snapshotSchema);
