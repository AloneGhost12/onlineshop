const ROLES = Object.freeze({
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  MODERATOR: 'MODERATOR',
  SUPPORT: 'SUPPORT',
});

const PERMISSIONS = Object.freeze({
  MANAGE_PRODUCTS: 'MANAGE_PRODUCTS',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ORDERS: 'MANAGE_ORDERS',
  MANAGE_COUPONS: 'MANAGE_COUPONS',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_ADMINS: 'MANAGE_ADMINS',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.USER]: [],
  [ROLES.SUPPORT]: [PERMISSIONS.MANAGE_ORDERS, PERMISSIONS.MANAGE_USERS],
  [ROLES.MODERATOR]: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_COUPONS],
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_ADMINS,
  ],
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
});

const LEGACY_ROLE_MAP = Object.freeze({
  user: ROLES.USER,
  admin: ROLES.ADMIN,
  super_admin: ROLES.SUPER_ADMIN,
  moderator: ROLES.MODERATOR,
  support: ROLES.SUPPORT,
});

const normalizeRole = (role) => {
  if (!role) return ROLES.USER;
  const trimmedRole = String(role).trim();
  return LEGACY_ROLE_MAP[trimmedRole.toLowerCase()] || trimmedRole.toUpperCase();
};

const sanitizePermissions = (permissions = []) => {
  const validPermissions = new Set(Object.values(PERMISSIONS));
  return [...new Set((Array.isArray(permissions) ? permissions : [])
    .map((permission) => String(permission || '').trim().toUpperCase())
    .filter((permission) => validPermissions.has(permission)))];
};

const getDefaultPermissions = (role) => ROLE_PERMISSIONS[normalizeRole(role)] || [];

const getEffectivePermissions = (role, permissions = []) => {
  const explicitPermissions = sanitizePermissions(permissions);

  if (explicitPermissions.length > 0) {
    return explicitPermissions;
  }

  return getDefaultPermissions(role);
};

const hasPermission = (user, permission) => {
  if (!user) return false;
  const normalizedPermission = String(permission || '').trim().toUpperCase();
  return getEffectivePermissions(user.role, user.permissions).includes(normalizedPermission);
};

const hasAdminAccess = (user) => normalizeRole(user?.role) !== ROLES.USER;

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  normalizeRole,
  sanitizePermissions,
  getDefaultPermissions,
  getEffectivePermissions,
  hasPermission,
  hasAdminAccess,
};