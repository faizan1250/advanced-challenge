const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  color: { type: String }, // optional color code (e.g., '#FFD700')
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
