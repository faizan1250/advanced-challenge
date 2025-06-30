const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // optional for general focus
  startedAt: { type: Date, required: true },
  endedAt: { type: Date }, // set on stop
  duration: { type: Number }, // ms, calculated at end
}, { timestamps: true });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
