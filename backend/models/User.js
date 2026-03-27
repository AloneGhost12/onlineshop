const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ROLES, normalizeRole, sanitizePermissions, getEffectivePermissions } = require('../utils/rbac');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
      set: (value) => normalizeRole(value),
    },
    permissions: {
      type: [String],
      default: [],
      set: (value) => sanitizePermissions(value),
    },
    avatar: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    fraudRiskScore: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isFraudFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    requiresVerification: {
      type: Boolean,
      default: false,
      index: true,
    },
    fraudLastEventAt: {
      type: Date,
      default: null,
    },
    banReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [250, 'Ban reason cannot exceed 250 characters'],
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
    loyalty: {
      points: {
        type: Number,
        default: 0,
        min: 0,
      },
      lifetimePoints: {
        type: Number,
        default: 0,
        min: 0,
      },
      tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze',
      },
      totalReferralBonus: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    referral: {
      code: {
        type: String,
        uppercase: true,
        trim: true,
        unique: true,
        sparse: true,
        index: true,
      },
      referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
      },
      rewardGranted: {
        type: Boolean,
        default: false,
      },
      successfulReferrals: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalReferralRewards: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

const getLoyaltyTier = (lifetimePoints) => {
  const points = Number(lifetimePoints || 0);
  if (points >= 2500) return 'platinum';
  if (points >= 1200) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
};

const generateReferralCode = (userId) => {
  const suffix = String(userId || '').slice(-6).toUpperCase();
  return `SV${suffix}`;
};

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.pre('save', function () {
  if (!this.referral?.code) {
    this.referral = this.referral || {};
    this.referral.code = generateReferralCode(this._id);
  }

  this.loyalty = this.loyalty || {};
  this.loyalty.tier = getLoyaltyTier(this.loyalty.lifetimePoints);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: normalizeRole(this.role) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.getEffectivePermissions = function () {
  return getEffectivePermissions(this.get('role'), this.permissions);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

userSchema.methods.refreshLoyaltyTier = function () {
  this.loyalty = this.loyalty || {};
  this.loyalty.tier = getLoyaltyTier(this.loyalty.lifetimePoints);
};

// Remove sensitive data from JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  const rawRole = obj.role;
  obj.role = normalizeRole(obj.role);
  obj.permissions = getEffectivePermissions(rawRole, obj.permissions);
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
