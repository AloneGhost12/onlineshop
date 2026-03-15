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

export const hasPermission = (user, permission) =>
  Boolean(user?.permissions?.includes(permission) || user?.role === 'SUPER_ADMIN');