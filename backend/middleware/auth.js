const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { normalizeRole, hasPermission, hasAdminAccess } = require('../utils/rbac');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(ApiError.unauthorized('Not authorized. Please log in.'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists.'));
    }

    if (user.isBanned) {
      return next(ApiError.forbidden(`Your account has been banned. ${user.banReason || 'Contact support.'}`));
    }

    if (user.isBlocked) {
      return next(ApiError.forbidden('Your account is temporarily blocked. Please contact support.'));
    }

    const effectivePermissions = user.getEffectivePermissions();
    user.role = normalizeRole(user.role);
    user.permissions = effectivePermissions;

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired. Please log in again.'));
    }
    next(error);
  }
};

// Restrict to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    const normalizedRoles = roles.map((role) => normalizeRole(role));
    if (!normalizedRoles.includes(normalizeRole(req.user.role))) {
      return next(ApiError.forbidden('You do not have permission to perform this action.'));
    }
    next();
  };
};

const requireAdminAccess = (req, res, next) => {
  if (!hasAdminAccess(req.user)) {
    return next(ApiError.forbidden('Admin access required.'));
  }

  next();
};

const checkPermission = (permissionName) => {
  return (req, res, next) => {
    if (!hasPermission(req.user, permissionName)) {
      return next(ApiError.forbidden(`Missing permission: ${permissionName}`));
    }

    next();
  };
};

module.exports = { protect, authorize, requireAdminAccess, checkPermission };
