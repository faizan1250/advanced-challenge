const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
      name: { type: String, required: true }, // 👈 add this line
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fcmToken: { type: String },
  refreshToken: { type: String },
  gamifiedStats: {
  xp: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastCompletedDate: Date
},
challengeProgress: [
  {
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
    totalMinutes: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
  }
],
friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
monthlyWins: { type: Number, default: 0 },



}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
