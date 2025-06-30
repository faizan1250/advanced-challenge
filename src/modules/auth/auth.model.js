const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
      name: { type: String, required: true }, // 👈 add this line
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fcmToken: { type: String },
  refreshToken: { type: String },
  gamifiedStats: {
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  totalFocusTime: { type: Number, default: 0 }, // ms
  lastCompletedDate: Date,
},

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
