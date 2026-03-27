const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Seller = require('../models/Seller');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const {
  ensureCouponUsable,
  calculateCouponDiscount,
} = require('../utils/couponValidation');
const {
  evaluateOrderFraud,
  getFraudBlockedMessage,
  recordFailedPaymentAttempt,
} = require('../utils/fraudDetection');
const { calculateCommissionBreakdown, round2 } = require('../services/commissionService');
const { calculatePromotionsForItems, recordPromotionUsage } = require('../services/promotionEngine');
const {
  REFERRER_REWARD_POINTS,
  REFEREE_REWARD_POINTS,
  calculateEarnedPoints,
  rollbackDeliveryRewards,
} = require('../services/loyaltyService');
const { createOrderMailboxMessage } = require('../services/mailboxService');

// @desc    Create order from cart
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  let incrementedCouponId = null;

  try {
    const {
      shippingAddress,
      paymentMethod = 'card',
      paymentStatus: requestedPaymentStatus = 'pending',
      paymentResult,
      paymentId = '',
      notes = '',
      referralCode = '',
    } = req.body;

    const normalizedPaymentMethod = String(paymentMethod || '').trim().toLowerCase();
    const normalizedPaymentId = String(paymentId || '').trim();
    const normalizedReferralCode = String(referralCode || '').trim().toUpperCase();

    if (normalizedPaymentMethod === 'upi' && !normalizedPaymentId) {
      return next(ApiError.badRequest('UPI transaction/reference ID is required'));
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.street ||
        !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode ||
        !shippingAddress.phone) {
      return next(ApiError.badRequest('Complete shipping address is required'));
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'title price images stock isActive sellerId sellerStoreName commissionPercentage category');

    if (!cart || cart.items.length === 0) {
      return next(ApiError.badRequest('Cart is empty'));
    }

    // Validate items and calculate totals
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        return next(ApiError.badRequest(`Product "${item.product?.title || 'Unknown'}" is no longer available`));
      }

      if (item.product.stock < item.quantity) {
        return next(
          ApiError.badRequest(
            `"${item.product.title}" only has ${item.product.stock} in stock`
          )
        );
      }

      const orderItem = {
        product: item.product._id,
        sellerId: item.product.sellerId || null,
        sellerStoreName: item.product.sellerStoreName || 'ShopVault',
        commissionPercentage: Number(item.product.commissionPercentage || 0),
        sellerRevenue: 0,
        platformRevenue: 0,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.images?.[0]?.url || '',
      };

      const { itemSubtotal, platformRevenue, sellerRevenue } = calculateCommissionBreakdown({
        price: item.product.price,
        quantity: item.quantity,
        commissionPercentage: orderItem.commissionPercentage,
      });

      orderItem.platformRevenue = platformRevenue;
      orderItem.sellerRevenue = sellerRevenue;

      orderItems.push(orderItem);
      subtotal += itemSubtotal;
    }

    let couponDiscount = 0;
    let couponData = undefined;

    if (cart.appliedCoupon && cart.appliedCoupon.coupon) {
      const coupon = await Coupon.findById(cart.appliedCoupon.coupon).select(
        'code discountType discountValue minOrderAmount maxDiscount expiryDate usageLimit usedCount isActive visibility allowedUsers'
      );

      ensureCouponUsable({
        coupon,
        userId: req.user._id,
        subtotal,
      });

      couponDiscount = calculateCouponDiscount({ coupon, subtotal });

      const usageFilter = {
        _id: coupon._id,
        isActive: true,
        expiryDate: { $gte: new Date() },
      };

      if (coupon.usageLimit > 0) {
        usageFilter.usedCount = { $lt: coupon.usageLimit };
      }

      const usageUpdateResult = await Coupon.updateOne(usageFilter, {
        $inc: { usedCount: 1 },
      });

      if (usageUpdateResult.modifiedCount === 0) {
        return next(ApiError.badRequest('Coupon usage limit reached'));
      }

      incrementedCouponId = coupon._id;
      couponData = {
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      };
    }

    const subtotalAfterCoupon = round2(Math.max(0, subtotal - couponDiscount));

    const promotionResult = await calculatePromotionsForItems({
      userId: req.user._id,
      items: cart.items,
      subtotal: subtotalAfterCoupon,
    });

    const promotionDiscount = round2(Math.min(subtotalAfterCoupon, promotionResult.promotionDiscount || 0));
    const totalDiscount = round2(Math.min(subtotal, couponDiscount + promotionDiscount));
    const discountedSubtotal = round2(Math.max(0, subtotal - totalDiscount));

    // Calculate tax and shipping
    const tax = round2(discountedSubtotal * 0.18); // 18% GST
    const shippingCost = discountedSubtotal >= 500 ? 0 : 49; // Free shipping over ₹500
    const totalPrice = round2(discountedSubtotal + tax + shippingCost);

    const normalizedPaymentStatus = String(requestedPaymentStatus || '').trim().toLowerCase();
    const normalizedPaymentResult = String(paymentResult?.status || '').trim().toLowerCase();
    const paymentFailed =
      normalizedPaymentMethod !== 'cod' &&
      (normalizedPaymentStatus === 'failed' || normalizedPaymentResult === 'failed');

    if (paymentFailed) {
      const failedPaymentEvent = await recordFailedPaymentAttempt({
        req,
        userId: req.user._id,
        amount: totalPrice,
        paymentMethod: normalizedPaymentMethod,
        reason: String(paymentResult?.message || 'Payment processor declined the checkout request'),
      });

      if (incrementedCouponId) {
        await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usedCount: -1 } });
        incrementedCouponId = null;
      }

      if (failedPaymentEvent.userState?.requiresVerification) {
        return next(ApiError.forbidden(getFraudBlockedMessage()));
      }

      return next(ApiError.badRequest('Payment failed. Please try again with a different payment method.'));
    }

    const fraudReview = await evaluateOrderFraud({
      req,
      userId: req.user._id,
      totalPrice,
      paymentMethod: normalizedPaymentMethod,
    });

    if (fraudReview.blocked) {
      if (incrementedCouponId) {
        await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usedCount: -1 } });
        incrementedCouponId = null;
      }

      return next(ApiError.forbidden(getFraudBlockedMessage()));
    }

    const customer = await User.findById(req.user._id);
    if (!customer) {
      return next(ApiError.unauthorized('User no longer exists'));
    }

    let pendingReferrer = null;
    const hasExistingReferrer = Boolean(customer.referral?.referredBy);

    if (normalizedReferralCode) {
      if (hasExistingReferrer) {
        return next(ApiError.badRequest('Referral already linked to your account'));
      }

      pendingReferrer = await User.findOne({
        'referral.code': normalizedReferralCode,
        _id: { $ne: customer._id },
      }).select('_id referral.code');

      if (!pendingReferrer) {
        return next(ApiError.badRequest('Invalid referral code'));
      }
    }

    const earnedPoints = calculateEarnedPoints(totalPrice);
    const pendingReferrerId = pendingReferrer?._id || customer.referral?.referredBy || null;

    if (pendingReferrer && !customer.referral?.referredBy) {
      customer.referral = customer.referral || {};
      customer.referral.referredBy = pendingReferrer._id;
      await customer.save();
    }

    // Create order (rewards are credited only after delivery)
    const order = await Order.create({
      user: req.user._id,
      dataPartition: 'live',
      items: orderItems,
      subtotal,
      discount: totalDiscount,
      couponDiscount,
      promotionDiscount,
      promotions: promotionResult.appliedPromotions,
      coupon: couponData,
      tax,
      shippingCost,
      totalPrice,
      shippingAddress,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === 'cod' ? 'pending' : normalizedPaymentStatus === 'paid' || normalizedPaymentResult === 'paid' ? 'paid' : 'pending',
      paymentId: normalizedPaymentId,
      clientInfo: fraudReview.clientInfo,
      notes,
      loyaltyPointsEarned: earnedPoints,
      loyaltyRewardProcessed: false,
      referral: pendingReferrerId
        ? {
            referralCodeUsed: normalizedReferralCode,
            referrerUserId: pendingReferrerId,
            rewardGranted: false,
            referrerRewardPoints: REFERRER_REWARD_POINTS,
            refereeRewardPoints: REFEREE_REWARD_POINTS,
          }
        : undefined,
      expectedDeliveryAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const sellerRevenueMap = new Map();
    for (const item of orderItems) {
      if (item.sellerId) {
        const key = String(item.sellerId);
        sellerRevenueMap.set(key, (sellerRevenueMap.get(key) || 0) + item.sellerRevenue);
      }
    }

    await recordPromotionUsage(promotionResult.appliedPromotions);

    for (const [sellerId, revenue] of sellerRevenueMap.entries()) {
      await Seller.findByIdAndUpdate(sellerId, {
        $inc: { totalSales: round2(revenue) },
      });
    }

    // Clear cart
    cart.items = [];
    cart.appliedCoupon = undefined;
    await cart.save();

    await createOrderMailboxMessage({
      order,
      action: 'order_created',
      title: `Order placed: ${order.orderNumber}`,
      message: `Your order has been placed successfully. Total amount: INR ${Number(order.totalPrice || 0).toLocaleString('en-IN')}.`,
      createdBy: {
        role: 'system',
        userId: null,
        name: 'ShopVault',
      },
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (incrementedCouponId) {
      await Coupon.findByIdAndUpdate(incrementedCouponId, { $inc: { usedCount: -1 } });
    }
    next(error);
  }
};

const USER_CANCELLABLE_STATUSES = new Set(['pending', 'confirmed', 'processing']);

// @desc    Cancel user's order
// @route   PATCH /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    if (!USER_CANCELLABLE_STATUSES.has(order.status)) {
      return next(ApiError.badRequest('This order can no longer be cancelled'));
    }

    for (const item of order.items || []) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }

      if (item.sellerId && Number(item.sellerRevenue || 0) > 0) {
        await Seller.findByIdAndUpdate(item.sellerId, {
          $inc: { totalSales: -round2(Number(item.sellerRevenue || 0)) },
        });
      }
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

    if (order.loyaltyRewardProcessed) {
      await rollbackDeliveryRewards(order);
    }

    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    }

    await order.save();

    await createOrderMailboxMessage({
      order,
      action: 'order_cancelled',
      title: `Order cancelled: ${order.orderNumber}`,
      message: 'Your order has been cancelled. Any eligible payment refund will be processed shortly.',
      createdBy: {
        role: 'system',
        userId: null,
        name: 'ShopVault',
      },
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
