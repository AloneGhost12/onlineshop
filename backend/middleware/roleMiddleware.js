const ApiError = require('../utils/apiError');
const { normalizeRole, hasPermission, hasAdminAccess } = require('../utils/rbac');

const authorizeRoles = (...roles) => {
  const allowedRoles = roles.map((role) => normalizeRole(role));

  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(normalizeRole(req.user.role))) {
      return next(ApiError.forbidden('You do not have the required role for this action.'));
    }

    return next();
  };
};

const requireAdminAccess = (req, res, next) => {
  if (!hasAdminAccess(req.user)) {
    return next(ApiError.forbidden('Admin access required.'));
  }

  return next();
};

const checkPermission = (permissionName) => {
  return (req, res, next) => {
    if (!hasPermission(req.user, permissionName)) {
      return next(ApiError.forbidden(`Missing permission: ${permissionName}`));
    }

    return next();
  };
};

module.exports = {
  authorizeRoles,
  requireAdminAccess,
  checkPermission,
};