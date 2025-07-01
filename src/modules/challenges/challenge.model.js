const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  goalTime: { type: Number, required: true }, // in minutes
  durationDays: { type: Number, required: true },
  rewardPoints: { type: Number, default: 50 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
