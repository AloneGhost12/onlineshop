export const ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];

export const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'SUPPORT'];

export const PERMISSIONS = [
  'MANAGE_PRODUCTS',
  'MANAGE_USERS',
  'MANAGE_ORDERS',
  'MANAGE_COUPONS',
  'VIEW_ANALYTICS',
  'MANAGE_ADMINS',
];

export const hasAdminAccess = (user) => Boolean(user && user.role && user.role !== 'USER');

const ADMIN_DEFAULT_PERMISSIONS = new Set(PERMISSIONS);

export const hasPermission = (user, permission) => {
  if (!user || !permission) return false;

  if (user?.role === 'SUPER_ADMIN') {
    return true;
  }

  if (Array.isArray(user?.permissions) && user.permissions.includes(permission)) {
    return true;
  }

  if (user?.role === 'ADMIN') {
    return ADMIN_DEFAULT_PERMISSIONS.has(permission);
  }

  return false;
};