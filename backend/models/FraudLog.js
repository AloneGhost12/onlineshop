const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  ipAddress: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  device: {
    type: String,
    default: 'unknown',
    trim: true,
  },
  browser: {
    type: String,
    default: 'unknown',
    trim: true,
  },
  os: {
    type: String,
    default: 'unknown',
    trim: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  reason: {
    type: String,
    default: '',
    trim: true,
    maxlength: [300, 'Fraud reason cannot exceed 300 characters'],
  },
  riskScore: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  totalRiskScore: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['open', 'safe'],
    default: 'open',
    index: true,
  },
  requiresVerification: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
  },
  reviewNote: {
    type: String,
    default: '',
    trim: true,
    maxlength: [300, 'Review note cannot exceed 300 characters'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

fraudLogSchema.index({ action: 1, timestamp: -1 });
fraudLogSchema.index({ userId: 1, status: 1, timestamp: -1 });
fraudLogSchema.index({ ipAddress: 1, timestamp: -1 });

module.exports = mongoose.model('FraudLog', fraudLogSchema);