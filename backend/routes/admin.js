const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getDashboard,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  getAllSellers,
  updateSellerStatus,
  getFraudMonitor,
  markFraudLogSafe,
  getRbacConfig,
  createAdminUser,
  updateUserRole,
  getUserSessions,
  updateUserAccess,
  getCategories,
  createCategory,
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  assignCoupon,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdminAccess, checkPermission } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { ROLES, PERMISSIONS } = require('../utils/rbac');

const validRoles = Object.values(ROLES);
const validPermissions = new Set(Object.values(PERMISSIONS));

const adminCreationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().custom((value) => nonUserRoleValidation(value)),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('permissions.*').optional().custom((value) => validPermissions.has(String(value || '').trim().toUpperCase())).withMessage('Invalid permission value'),
  validateRequest,
];

const roleUpdateValidation = [
  body('role').optional().custom((value) => validRoles.includes(String(value || '').trim().toUpperCase())).withMessage('Invalid role value'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('permissions.*').optional().custom((value) => validPermissions.has(String(value || '').trim().toUpperCase())).withMessage('Invalid permission value'),
  validateRequest,
];

const accessUpdateValidation = [
  body('action').trim().isIn(['block', 'unblock', 'ban']).withMessage('Action must be block, unblock, or ban'),
  body('reason').optional().trim().isLength({ max: 250 }).withMessage('Reason cannot exceed 250 characters'),
  validateRequest,
];

const sellerStatusValidation = [
  body().custom((_, { req }) => {
    const normalizedAction = String(req.body?.action || req.body?.status || '').trim().toLowerCase();
    const allowedActions = ['verify', 'unverify', 'suspend', 'unsuspend', 'revert'];

    if (!allowedActions.includes(normalizedAction)) {
      throw new Error('Action must be verify, unverify, suspend, unsuspend, or revert');
    }

    req.body.action = normalizedAction;
    return true;
  }),
  body('reason').optional().trim().isLength({ max: 250 }).withMessage('Reason cannot exceed 250 characters'),
  validateRequest,
];

const fraudSafeValidation = [
  body('note').optional().trim().isLength({ max: 300 }).withMessage('Note cannot exceed 300 characters'),
  validateRequest,
];

function nonUserRoleValidation(value) {
  const normalizedRole = String(value || '').trim().toUpperCase();
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MODERATOR, ROLES.SUPPORT].includes(normalizedRole);
}

// All admin routes require authentication and admin role
router.use(protect, requireAdminAccess);

router.get('/dashboard', checkPermission(PERMISSIONS.VIEW_ANALYTICS), getDashboard);
router.get('/rbac', checkPermission(PERMISSIONS.MANAGE_ADMINS), getRbacConfig);
router.get('/orders', checkPermission(PERMISSIONS.MANAGE_ORDERS), getAllOrders);
router.put('/orders/:id', checkPermission(PERMISSIONS.MANAGE_ORDERS), updateOrderStatus);
router.get('/users', checkPermission(PERMISSIONS.MANAGE_USERS), getAllUsers);
router.get('/sellers', checkPermission(PERMISSIONS.MANAGE_USERS), getAllSellers);
router.get('/fraud-monitor', checkPermission(PERMISSIONS.MANAGE_USERS), getFraudMonitor);
router.post('/admins', checkPermission(PERMISSIONS.MANAGE_ADMINS), adminCreationValidation, createAdminUser);
router.patch('/users/:id/role', checkPermission(PERMISSIONS.MANAGE_ADMINS), roleUpdateValidation, updateUserRole);
router.get('/users/:id/sessions', checkPermission(PERMISSIONS.MANAGE_USERS), getUserSessions);
router.patch('/users/:id/access', checkPermission(PERMISSIONS.MANAGE_USERS), accessUpdateValidation, updateUserAccess);
router.patch('/sellers/:id/status', checkPermission(PERMISSIONS.MANAGE_USERS), sellerStatusValidation, updateSellerStatus);
router.patch('/fraud-logs/:id/mark-safe', checkPermission(PERMISSIONS.MANAGE_USERS), fraudSafeValidation, markFraudLogSafe);
router.get('/categories', checkPermission(PERMISSIONS.MANAGE_PRODUCTS), getCategories);
router.post('/categories', checkPermission(PERMISSIONS.MANAGE_PRODUCTS), createCategory);
router.post('/coupons/create', checkPermission(PERMISSIONS.MANAGE_COUPONS), createCoupon);
router.get('/coupons', checkPermission(PERMISSIONS.MANAGE_COUPONS), getCoupons);
router.patch('/coupons/:id', checkPermission(PERMISSIONS.MANAGE_COUPONS), updateCoupon);
router.delete('/coupons/:id', checkPermission(PERMISSIONS.MANAGE_COUPONS), deleteCoupon);
router.post('/coupons/assign', checkPermission(PERMISSIONS.MANAGE_COUPONS), assignCoupon);

module.exports = router;
