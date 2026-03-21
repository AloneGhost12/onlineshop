const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { requireAdminAccess, checkPermission } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { PERMISSIONS } = require('../utils/rbac');
const { getFraudMonitor, markFraudLogSafe } = require('../controllers/fraudController');

const router = express.Router();

const markSafeValidation = [
  body('note').optional().trim().isLength({ max: 300 }).withMessage('Note cannot exceed 300 characters'),
  validateRequest,
];

router.use(protect, requireAdminAccess, checkPermission(PERMISSIONS.MANAGE_USERS));

router.get('/monitor', getFraudMonitor);
router.patch('/logs/:id/mark-safe', markSafeValidation, markFraudLogSafe);

module.exports = router;
