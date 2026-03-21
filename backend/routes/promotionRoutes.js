const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { requireAdminAccess, checkPermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../utils/rbac');
const validateRequest = require('../middleware/validateRequest');
const {
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  applyPromotionsPreview,
} = require('../controllers/promotionController');

const router = express.Router();

const promotionValidation = [
  body('promotionName').trim().notEmpty().withMessage('Promotion name is required'),
  body('type').trim().notEmpty().withMessage('Promotion type is required'),
  body('discountType').trim().notEmpty().withMessage('Discount type is required'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
  body('startDate').notEmpty().withMessage('Start date is required'),
  body('endDate').notEmpty().withMessage('End date is required'),
  body('eligibleProducts').optional().isArray().withMessage('eligibleProducts must be an array'),
  body('eligibleCategories').optional().isArray().withMessage('eligibleCategories must be an array'),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('minOrderAmount must be non-negative'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('maxDiscount must be non-negative'),
  body('combinable').optional().isBoolean().withMessage('combinable must be boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  validateRequest,
];

const promotionUpdateValidation = [
  body('promotionName').optional().trim().notEmpty().withMessage('Promotion name cannot be empty'),
  body('discountValue').optional().isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
  body('eligibleProducts').optional().isArray().withMessage('eligibleProducts must be an array'),
  body('eligibleCategories').optional().isArray().withMessage('eligibleCategories must be an array'),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('minOrderAmount must be non-negative'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('maxDiscount must be non-negative'),
  body('combinable').optional().isBoolean().withMessage('combinable must be boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  validateRequest,
];

router.post('/checkout/apply-promotions', protect, applyPromotionsPreview);

router.get('/admin/promotions', protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_COUPONS), getPromotions);
router.post('/admin/promotions', protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_COUPONS), promotionValidation, createPromotion);
router.patch('/admin/promotions/:id', protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_COUPONS), promotionUpdateValidation, updatePromotion);
router.delete('/admin/promotions/:id', protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_COUPONS), deletePromotion);

module.exports = router;
