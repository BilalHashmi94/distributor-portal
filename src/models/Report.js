const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  distributor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  headers: [{
    type: String
  }],
  data: [{
    type: mongoose.Schema.Types.Mixed
  }],
  rowCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
