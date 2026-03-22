const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const moderationEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['verify', 'unverify', 'suspend', 'unsuspend', 'revert'],
      required: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [250, 'Moderation reason cannot exceed 250 characters'],
    },
    performedBy: {
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
      },
      role: {
        type: String,
        default: '',
        trim: true,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const sellerSchema = new mongoose.Schema(
  {
    sellerName: {
      type: String,
      required: [true, 'Seller name is required'],
      trim: true,
      maxlength: [80, 'Seller name cannot exceed 80 characters'],
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      unique: true,
      maxlength: [120, 'Store name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    applicationSource: {
      type: String,
      enum: ['direct', 'user_apply'],
      default: 'direct',
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspensionReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [250, 'Suspension reason cannot exceed 250 characters'],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    moderationHistory: {
      type: [moderationEntrySchema],
      default: [],
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

sellerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

sellerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

sellerSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, type: 'seller' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

sellerSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

sellerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

sellerSchema.index({ storeName: 'text', sellerName: 'text' });
sellerSchema.index({ isVerified: 1, isSuspended: 1, createdAt: -1 });
sellerSchema.index({ userId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Seller', sellerSchema);