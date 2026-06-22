const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ['Active', 'Paused', 'Completed'], default: 'Active' },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  aiHealthMetrics: {
    velocity: { type: Number, default: 100 },
    blockersDetected: { type: Boolean, default: false },
    projectedCompletion: { type: Date }
  },
  createdAt: { type: Date, default: Date.now }
});

ProjectSchema.index({ _id: 1, status: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
