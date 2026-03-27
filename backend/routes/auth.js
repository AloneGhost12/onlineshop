const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
	register,
	login,
	getMe,
	getLoyaltySummary,
	updateProfile,
	logout,
	forgotPassword,
	resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { fraudLoginGuard } = require('../middleware/fraudDetection');
const { authLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validateRequest');

const forgotPasswordValidation = [
	body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
	validateRequest,
];

const resetPasswordValidation = [
	body('token').trim().notEmpty().withMessage('Reset token is required'),
	body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
	validateRequest,
];

router.post('/register', authLimiter, register);
router.post('/login', fraudLoginGuard, authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, resetPassword);
router.get('/me', protect, getMe);
router.get('/loyalty', protect, getLoyaltySummary);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

module.exports = router;
