const User = require('../models/User');
const UserSession = require('../models/UserSession');
const ApiError = require('../utils/apiError');
const { extractClientInfo } = require('../utils/clientInfo');
const { getFraudBlockedMessage, recordFailedLoginAttempt } = require('../utils/fraudDetection');
const crypto = require('crypto');

// Helper to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateToken();

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user,
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(ApiError.badRequest('Email is already registered'));
    }

    const normalizedReferralCode = String(referralCode || '').trim().toUpperCase();
    let referredBy = null;

    if (normalizedReferralCode) {
      const referrer = await User.findOne({ 'referral.code': normalizedReferralCode }).select('_id');
      if (!referrer) {
        return next(ApiError.badRequest('Invalid referral code'));
      }
      referredBy = referrer._id;
    }

    const user = await User.create({
      name,
      email,
      password,
      referral: {
        referredBy,
      },
    });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!normalizedEmail || !password) {
      return next(ApiError.badRequest('Please provide email and password'));
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      await recordFailedLoginAttempt({
        req,
        email: normalizedEmail,
        reason: 'Login attempted with an unknown email address',
      });
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    if (user.isBanned) {
      return next(ApiError.forbidden(`Your account has been banned. ${user.banReason || 'Contact support.'}`));
    }

    if (user.isBlocked) {
      return next(ApiError.forbidden('Your account is temporarily blocked. Please contact support.'));
    }

    if (user.requiresVerification || user.isFraudFlagged) {
      return next(ApiError.forbidden(getFraudBlockedMessage()));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordFailedLoginAttempt({
        req,
        userId: user._id,
        email: normalizedEmail,
        reason: 'Incorrect password provided',
      });
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    const clientInfo = extractClientInfo(req);
    await UserSession.create({
      userId: user._id,
      ...clientInfo,
      loginTime: new Date(),
      isBlocked: false,
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user && !user.referral?.code) {
      await user.save();
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get loyalty and referral summary
// @route   GET /api/auth/loyalty
// @access  Private
exports.getLoyaltySummary = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('name loyalty referral');
    if (user && !user.referral?.code) {
      await user.save();
    }
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    res.json({
      success: true,
      data: {
        name: user?.name || '',
        loyalty: user?.loyalty || {},
        referral: user?.referral || {},
        referralLink: user?.referral?.code
          ? `${frontendBaseUrl}/auth/register?ref=${encodeURIComponent(user.referral.code)}`
          : '',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'avatar', 'address'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (clear cookie)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    await UserSession.findOneAndUpdate(
      {
        userId: req.user._id,
        logoutTime: null,
      },
      {
        $set: { logoutTime: new Date() },
      },
      {
        sort: { loginTime: -1 },
      }
    );

    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password (user/admin)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return next(ApiError.badRequest('Email is required'));
    }

    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpire');
    const genericMessage = 'If an account exists for this email, a password reset link has been generated.';

    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendBaseUrl}/auth/reset-password/${resetToken}`;

    res.json({
      success: true,
      message: genericMessage,
      data: {
        resetUrl,
        expiresInMinutes: 15,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password (user/admin)
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token) {
      return next(ApiError.badRequest('Reset token is required'));
    }

    if (password.length < 6) {
      return next(ApiError.badRequest('Password must be at least 6 characters'));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return next(ApiError.badRequest('Password reset token is invalid or has expired'));
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Password reset successful. You can now sign in with the new password.',
    });
  } catch (error) {
    next(error);
  }
};
