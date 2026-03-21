const express = require('express');
const { body } = require('express-validator');
const {
  registerSeller,
  applySellerAccount,
  getSellerApplicationStatus,
  loginSeller,
  forgotSellerPassword,
  resetSellerPassword,
  getSellerMe,
  getSellerDashboard,
  createSellerProduct,
  getSellerProducts,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerOrders,
  getSellerAnalytics,
  logoutSeller,
} = require('../controllers/sellerController');
const { authLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/auth');
const { protectSeller } = require('../middleware/sellerAuth');

const router = express.Router();

const sellerValidation = [
  body('sellerName').trim().notEmpty().withMessage('Seller name is required'),
  body('storeName').trim().notEmpty().withMessage('Store name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest,
];

const sellerLoginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  validateRequest,
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest,
];

const sellerApplyValidation = [
  body('storeName').trim().notEmpty().withMessage('Store name is required'),
  body('sellerName').optional().trim(),
  body('phone').optional().trim(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest,
];

const productValidation = [
  body('title').trim().notEmpty().withMessage('Product title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or greater'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('commissionPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission must be between 0 and 100'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  validateRequest,
];

const productUpdateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Product title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be zero or greater'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('commissionPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission must be between 0 and 100'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  validateRequest,
];

router.post('/register', authLimiter, sellerValidation, registerSeller);
router.post('/login', authLimiter, sellerLoginValidation, loginSeller);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, forgotSellerPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, resetSellerPassword);
router.post('/apply', protect, sellerApplyValidation, applySellerAccount);
router.get('/application-status', protect, getSellerApplicationStatus);

router.use(protectSeller);

router.get('/me', getSellerMe);
router.post('/logout', logoutSeller);
router.get('/dashboard', getSellerDashboard);
router.get('/products', getSellerProducts);
router.post('/products', productValidation, createSellerProduct);
router.patch('/products/:id', productUpdateValidation, updateSellerProduct);
router.delete('/products/:id', deleteSellerProduct);
router.get('/orders', getSellerOrders);
router.get('/analytics', getSellerAnalytics);

module.exports = router;