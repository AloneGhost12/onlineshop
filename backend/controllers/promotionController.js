const { Promotion, PROMOTION_TYPES, DISCOUNT_TYPES } = require('../models/Promotion');
const Cart = require('../models/Cart');
const ApiError = require('../utils/apiError');
const { calculatePromotionsForItems } = require('../services/promotionEngine');

const normalizePromotionPayload = (payload = {}) => {
  const normalized = { ...payload };

  if (normalized.type) {
    normalized.type = String(normalized.type).trim().toUpperCase();
  }

  if (normalized.discountType) {
    normalized.discountType = String(normalized.discountType).trim().toLowerCase();
  }

  if (normalized.startDate) {
    normalized.startDate = new Date(normalized.startDate);
  }

  if (normalized.endDate) {
    normalized.endDate = new Date(normalized.endDate);
  }

  if (normalized.discountValue !== undefined) {
    normalized.discountValue = Number(normalized.discountValue);
  }

  if (normalized.minOrderAmount !== undefined) {
    normalized.minOrderAmount = Number(normalized.minOrderAmount);
  }

  if (normalized.maxDiscount !== undefined) {
    normalized.maxDiscount = Number(normalized.maxDiscount);
  }

  return normalized;
};

const validatePromotionDates = ({ startDate, endDate }) => {
  if (!startDate || !endDate) {
    return 'Start date and end date are required';
  }

  if (Number.isNaN(new Date(startDate).getTime()) || Number.isNaN(new Date(endDate).getTime())) {
    return 'Start date and end date must be valid dates';
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return 'End date must be later than start date';
  }

  return null;
};

// @desc    Create promotion
// @route   POST /api/admin/promotions
// @access  Admin
exports.createPromotion = async (req, res, next) => {
  try {
    const payload = normalizePromotionPayload(req.body);
    const dateError = validatePromotionDates(payload);
    if (dateError) {
      return next(ApiError.badRequest(dateError));
    }

    if (!Object.values(PROMOTION_TYPES).includes(payload.type)) {
      return next(ApiError.badRequest('Invalid promotion type'));
    }

    if (!Object.values(DISCOUNT_TYPES).includes(payload.discountType)) {
      return next(ApiError.badRequest('Invalid discount type'));
    }

    const promotion = await Promotion.create(payload);

    res.status(201).json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get promotions
// @route   GET /api/admin/promotions
// @access  Admin
exports.getPromotions = async (req, res, next) => {
  try {
    const { status = 'all' } = req.query;
    const now = new Date();
    const filter = {};

    if (status === 'active') {
      filter.isActive = true;
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    }

    if (status === 'scheduled') {
      filter.isActive = true;
      filter.startDate = { $gt: now };
    }

    if (status === 'expired') {
      filter.$or = [{ isActive: false }, { endDate: { $lt: now } }];
    }

    const promotions = await Promotion.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: promotions,
      summary: {
        total: promotions.length,
        active: promotions.filter((promotion) => promotion.isActive && new Date(promotion.startDate) <= now && now <= new Date(promotion.endDate)).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update promotion
// @route   PATCH /api/admin/promotions/:id
// @access  Admin
exports.updatePromotion = async (req, res, next) => {
  try {
    const payload = normalizePromotionPayload(req.body);

    if (payload.startDate || payload.endDate) {
      const currentPromotion = await Promotion.findById(req.params.id).lean();
      if (!currentPromotion) {
        return next(ApiError.notFound('Promotion not found'));
      }

      const dateError = validatePromotionDates({
        startDate: payload.startDate || currentPromotion.startDate,
        endDate: payload.endDate || currentPromotion.endDate,
      });

      if (dateError) {
        return next(ApiError.badRequest(dateError));
      }
    }

    const promotion = await Promotion.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!promotion) {
      return next(ApiError.notFound('Promotion not found'));
    }

    res.json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/disable promotion
// @route   DELETE /api/admin/promotions/:id
// @access  Admin
exports.deletePromotion = async (req, res, next) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!promotion) {
      return next(ApiError.notFound('Promotion not found'));
    }

    res.json({
      success: true,
      message: 'Promotion disabled successfully',
      data: promotion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply promotions on checkout preview
// @route   POST /api/checkout/apply-promotions
// @access  Private
exports.applyPromotionsPreview = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'title price stock isActive category');

    if (!cart || cart.items.length === 0) {
      return next(ApiError.badRequest('Cart is empty'));
    }

    const items = cart.items
      .filter((item) => item.product && item.product.isActive)
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
      }));

    const subtotal = items.reduce((sum, item) => sum + Number(item.product.price || 0) * Number(item.quantity || 0), 0);

    const promotionResult = await calculatePromotionsForItems({
      userId: req.user._id,
      items,
      subtotal,
    });

    const couponDiscount = Number(cart.appliedCoupon?.discountAmount || 0);
    const promotionDiscount = Number(promotionResult.promotionDiscount || 0);
    const totalDiscount = Math.min(subtotal, couponDiscount + promotionDiscount);

    res.json({
      success: true,
      data: {
        subtotal,
        couponDiscount,
        promotionDiscount,
        totalDiscount,
        finalSubtotal: Math.max(0, subtotal - totalDiscount),
        appliedPromotions: promotionResult.appliedPromotions,
        strategy: promotionResult.strategy,
      },
    });
  } catch (error) {
    next(error);
  }
};
