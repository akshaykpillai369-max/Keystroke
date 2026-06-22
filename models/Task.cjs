const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ['Todo', 'In Progress', 'Completed'], default: 'Todo' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  category: { type: String, enum: ['Work', 'Personal', 'Side Project', 'Health', 'Uncategorized'], default: 'Uncategorized' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  durationLogged: { type: Number, default: 0 },
  dueDate: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) },
  aiOptimizedOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

TaskSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model('Task', TaskSchema);
