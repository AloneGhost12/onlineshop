const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/apiError');
const {
  ensureCouponUsable,
  calculateCouponDiscount,
  round2,
} = require('../utils/couponValidation');
const { getFraudBlockedMessage, trackCouponAttempt } = require('../utils/fraudDetection');

const normalizeCartItems = (cart) => {
  const validItems = cart.items.filter((item) => item.product && item.product.isActive);

  let totalPrice = 0;
  const items = validItems.map((item) => {
    const qty = Math.min(item.quantity, item.product.stock);
    const subtotal = item.product.price * qty;
    totalPrice += subtotal;

    return {
      _id: item._id,
      product: item.product,
      quantity: qty,
      subtotal,
    };
  });

  return {
    items,
    totalPrice: round2(totalPrice),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
};

const buildCartResponse = async (cart, userId) => {
  const { items, totalPrice, itemCount } = normalizeCartItems(cart);

  let discountAmount = 0;
  let coupon = null;

  if (cart.appliedCoupon && cart.appliedCoupon.coupon && totalPrice > 0) {
    const activeCoupon = await Coupon.findById(cart.appliedCoupon.coupon).select(
      'code discountType discountValue minOrderAmount maxDiscount expiryDate usageLimit usedCount isActive visibility allowedUsers'
    );

    try {
      ensureCouponUsable({
        coupon: activeCoupon,
        userId,
        subtotal: totalPrice,
      });

      discountAmount = calculateCouponDiscount({
        coupon: activeCoupon,
        subtotal: totalPrice,
      });

      coupon = {
        code: activeCoupon.code,
        discountType: activeCoupon.discountType,
        discountValue: activeCoupon.discountValue,
        discountAmount,
      };

      cart.appliedCoupon.discountAmount = discountAmount;
      await cart.save();
    } catch (error) {
      cart.appliedCoupon = undefined;
      await cart.save();
    }
  }

  return {
    _id: cart._id,
    items,
    totalPrice,
    discountAmount,
    finalPrice: round2(Math.max(0, totalPrice - discountAmount)),
    itemCount,
    coupon,
  };
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'title price comparePrice images stock isActive');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const data = await buildCartResponse(cart, req.user._id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return next(ApiError.badRequest('Product ID is required'));
    }

    // Validate product
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(ApiError.notFound('Product not found'));
    }

    if (product.stock < quantity) {
      return next(ApiError.badRequest(`Only ${product.stock} items available`));
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > product.stock) {
        return next(ApiError.badRequest(`Cannot add more. Only ${product.stock} available.`));
      }
      existingItem.quantity = newQty;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    cart.appliedCoupon = undefined;

    await cart.save();

    // Return populated cart
    await cart.populate('items.product', 'title price comparePrice images stock');

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return next(ApiError.badRequest('Quantity must be at least 1'));
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return next(ApiError.notFound('Cart not found'));
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return next(ApiError.notFound('Item not found in cart'));
    }

    // Check stock
    const product = await Product.findById(item.product);
    if (quantity > product.stock) {
      return next(ApiError.badRequest(`Only ${product.stock} available`));
    }

    item.quantity = quantity;
    cart.appliedCoupon = undefined;
    await cart.save();

    await cart.populate('items.product', 'title price comparePrice images stock');

    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
exports.removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return next(ApiError.notFound('Cart not found'));
    }

    cart.items = cart.items.filter(
      (item) => item._id.toString() !== req.params.itemId
    );
    cart.appliedCoupon = undefined;

    await cart.save();
    await cart.populate('items.product', 'title price comparePrice images stock');

    res.json({ success: true, message: 'Item removed', data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      cart.appliedCoupon = undefined;
      await cart.save();
    }

    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/apply-coupon
// @access  Private
exports.applyCoupon = async (req, res, next) => {
  const attemptedCode = String(req.body?.code || '').trim().toUpperCase();

  try {
    const { code } = req.body;

    if (!code) {
      return next(ApiError.badRequest('Coupon code is required'));
    }

    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'title price comparePrice images stock isActive');

    if (!cart || cart.items.length === 0) {
      return next(ApiError.badRequest('Cart is empty'));
    }

    const { totalPrice } = normalizeCartItems(cart);
    if (totalPrice <= 0) {
      return next(ApiError.badRequest('Cart total must be greater than zero'));
    }

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() }).select(
      'code discountType discountValue minOrderAmount maxDiscount expiryDate usageLimit usedCount isActive visibility allowedUsers'
    );

    ensureCouponUsable({
      coupon,
      userId: req.user._id,
      subtotal: totalPrice,
    });

    const discountAmount = calculateCouponDiscount({
      coupon,
      subtotal: totalPrice,
    });

    const fraudAttempt = await trackCouponAttempt({
      req,
      userId: req.user._id,
      code: attemptedCode,
      success: true,
    });

    if (fraudAttempt.userState?.requiresVerification) {
      return next(ApiError.forbidden(getFraudBlockedMessage()));
    }

    cart.appliedCoupon = {
      coupon: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      appliedAt: new Date(),
    };

    await cart.save();

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        totalPrice,
        finalPrice: round2(Math.max(0, totalPrice - discountAmount)),
      },
    });
  } catch (error) {
    if (attemptedCode) {
      try {
        const fraudAttempt = await trackCouponAttempt({
          req,
          userId: req.user?._id,
          code: attemptedCode,
          success: false,
          reason: error.message,
        });

        if (fraudAttempt.userState?.requiresVerification) {
          return next(ApiError.forbidden(getFraudBlockedMessage()));
        }
      } catch (trackingError) {
        // Preserve the original coupon error if fraud tracking fails.
      }
    }

    next(error);
  }
};
