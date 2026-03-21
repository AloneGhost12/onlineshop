const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const {
  getProductReviews,
  getReviewEligibility,
  createProductReview,
} = require('../controllers/reviewController');
const { protect, requireAdminAccess, checkPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/rbac');

// Public routes
router.get('/featured', getFeaturedProducts);
router.get('/', getProducts);
router.get('/:id/reviews', getProductReviews);
router.get('/:id/review-eligibility', protect, getReviewEligibility);
router.post('/:id/reviews', protect, createProductReview);
router.get('/:id', getProduct);

// Admin routes
router.post('/', protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_PRODUCTS), createProduct);
router.put('/:id', protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_PRODUCTS), updateProduct);
router.delete('/:id', protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_PRODUCTS), deleteProduct);

module.exports = router;
