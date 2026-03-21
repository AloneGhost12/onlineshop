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
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
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
