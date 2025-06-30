const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  isDone: { type: Boolean, default: false },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },

  attachments: [
  {
    downloadURL: String,
    filePath: String,
    uploadedAt: { type: Date, default: Date.now },
  },
],

  isCompleted: { type: Boolean, default: false },
  isStarred: { type: Boolean, default: false },

  category: { type: String },
  notes: { type: String },
  reminderTime: { type: Date },
  hasReminder: { type: Boolean, default: false },
  subtasks: [subtaskSchema],

  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Shared task members

groupId: { type: String }, // Optional label for shared group

completions: [{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date, default: Date.now },
  earnedXP: { type: Number, default: 10 } // You can make this dynamic later
}],


  // Recurrence settings
  repeatRule: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
  },
  repeatInterval: { 
    type: Number, 
    default: 1, // Repeat every X days/weeks/months
    min: 1 
  },
  repeatUntil: Date, // Optional end date for recurrence
  repeatDays: { // For weekly recurrence (e.g., [1,3,5] for Mon, Wed, Fri)
    type: [Number],
    enum: [0, 1, 2, 3, 4, 5, 6], // 0=Sunday, 1=Monday, etc.
    validate: {
      validator: function(v) {
        return !this.repeatRule || this.repeatRule !== 'weekly' || v.length > 0;
      },
      message: 'Repeat days required for weekly recurrence'
    }
  },
  createdFrom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task' 
  }, // For tracking recurring task origin
  isRecurringInstance: { 
    type: Boolean, 
    default: false 
  }, // Flag for individual instances

  // System fields
  updatedAt: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Virtual for checking if task is recurring
taskSchema.virtual('isRecurring').get(function() {
  return !!this.repeatRule;
});

// Indexes for better performance
taskSchema.index({ userId: 1, isCompleted: 1, dueDate: 1 });
taskSchema.index({ createdFrom: 1 });
taskSchema.index({ repeatUntil: 1 });

module.exports = mongoose.model('Task', taskSchema);