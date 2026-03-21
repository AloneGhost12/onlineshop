const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, cancelOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { fraudCheckoutGuard } = require('../middleware/fraudDetection');

router.use(protect); // All order routes require auth

router.post('/', fraudCheckoutGuard, createOrder);
router.get('/', getMyOrders);
router.patch('/:id/cancel', cancelOrder);
router.get('/:id', getOrder);

module.exports = router;
