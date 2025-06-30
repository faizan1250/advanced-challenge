const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  contentType: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Attachment', attachmentSchema);
