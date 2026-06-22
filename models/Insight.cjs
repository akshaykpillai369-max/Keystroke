const mongoose = require('mongoose');

const InsightSchema = new mongoose.Schema({
  type: { type: String, enum: ['Calendar Gap', 'Productivity Dip', 'Focus Match'], required: true },
  message: { type: String, required: true },
  actionablePayload: {
    suggestedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    timeGapMinutes: { type: Number }
  },
  isResolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Insight', InsightSchema);
