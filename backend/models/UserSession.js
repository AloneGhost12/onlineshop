const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
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
    country: {
      type: String,
      default: 'unknown',
      trim: true,
    },
    city: {
      type: String,
      default: 'unknown',
      trim: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSessionSchema.index({ userId: 1, loginTime: -1 });

module.exports = mongoose.model('UserSession', userSessionSchema);
