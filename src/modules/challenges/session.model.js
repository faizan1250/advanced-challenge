const mongoose = require('mongoose');

const challengeSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date }, // added when stopped
  duration: { type: Number }, // in minutes, computed
}, { timestamps: true });

module.exports = mongoose.model('ChallengeSession', challengeSessionSchema);
